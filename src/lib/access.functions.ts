import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public server functions for client access portal (no auth required).

const verifySchema = z.object({
  code: z.string().trim().min(4).max(32),
  contact: z.string().trim().max(120).optional().nullable(),
});

export const verifyAccessCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifySchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashAccessCode, signClientToken } = await import("./crypto.server");
    const hash = hashAccessCode(data.code);

    // Rate limiting: max 5 attempts per code hash in 15 minutes
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: recentAttempts } = await (supabaseAdmin as any)
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("code_hash", hash)
      .gte("attempted_at", fifteenMinAgo);

    if ((recentAttempts ?? 0) >= 5) {
      return { ok: false as const, error: "Trop de tentatives. Réessayez dans 15 minutes." };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("login_attempts").insert({ code_hash: hash });

    const { data: codeRow } = await supabaseAdmin
      .from("client_access_codes")
      .select("id, client_id, expires_at, is_active")
      .eq("code_hash", hash)
      .eq("is_active", true)
      .maybeSingle();

    // Generic failure to avoid enumeration
    const genericError = { ok: false as const, error: "Code invalide ou expiré." };

    if (!codeRow) {
      await supabaseAdmin.from("audit_logs").insert({
        action: "client_login_failed",
        metadata: { reason: "code_not_found" },
      });
      return genericError;
    }

    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      return { ok: false as const, error: "Ce code a expiré. Contactez le support." };
    }

    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("id, full_name, status, phone, email")
      .eq("id", codeRow.client_id)
      .maybeSingle();

    if (!client) return genericError;

    if (client.status === "suspendu") {
      return { ok: false as const, error: "Votre accès est suspendu. Contactez le support." };
    }

    // Optional contact verification (last 4 digits of phone OR email match)
    if (data.contact && data.contact.length > 0) {
      const c = data.contact.toLowerCase().replace(/\s+/g, "");
      const phoneTail = (client.phone || "").replace(/\D/g, "").slice(-4);
      const emailMatch = (client.email || "").toLowerCase() === c;
      const phoneMatch = phoneTail.length > 0 && c.endsWith(phoneTail);
      if (!emailMatch && !phoneMatch) {
        return genericError;
      }
    }

    await supabaseAdmin
      .from("client_access_codes")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", codeRow.id);

    await supabaseAdmin.from("audit_logs").insert({
      client_id: client.id,
      action: "client_login_success",
      metadata: { code_id: codeRow.id },
    });

    const token = signClientToken(client.id, codeRow.id);
    return { ok: true as const, token };
  });

const tokenSchema = z.object({ token: z.string().min(8) });

export const getClientSpace = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyClientToken } = await import("./crypto.server");
    const auth = verifyClientToken(data.token);
    if (!auth) return { ok: false as const, error: "Session expirée." };

    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("id, full_name, status, whatsapp, phone")
      .eq("id", auth.clientId)
      .maybeSingle();
    if (!client) return { ok: false as const, error: "Client introuvable." };

    const { data: profiles } = await supabaseAdmin
      .from("service_profiles")
      .select(`
        id, profile_number, profile_name, profile_pin, status, start_date, end_date, notes,
        service_account:service_accounts (
          id, account_label, login_email, renewal_date, status,
          service:services ( id, name, category, icon, instructions_template )
        )
      `)
      .eq("client_id", client.id)
      .in("status", ["occupe", "suspendu", "expire"]);

    return { ok: true as const, client, profiles: profiles || [] };
  });

const revealSchema = z.object({
  token: z.string().min(8),
  profileId: z.string().uuid(),
});

export const revealClientPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => revealSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyClientToken, decryptSecret } = await import("./crypto.server");
    const auth = verifyClientToken(data.token);
    if (!auth) return { ok: false as const, error: "Session expirée." };

    const { data: prof } = await supabaseAdmin
      .from("service_profiles")
      .select("id, client_id, service_account:service_accounts(encrypted_password)")
      .eq("id", data.profileId)
      .maybeSingle();

    if (!prof || prof.client_id !== auth.clientId) {
      return { ok: false as const, error: "Accès refusé." };
    }

    const enc = (prof.service_account as { encrypted_password?: string } | null)
      ?.encrypted_password;
    const password = enc ? decryptSecret(enc) : "";

    await supabaseAdmin.from("audit_logs").insert({
      client_id: auth.clientId,
      action: "client_credential_revealed",
      metadata: { profile_id: data.profileId },
    });

    return { ok: true as const, password };
  });

const supportSchema = z.object({
  token: z.string().min(8),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(2000),
});

export const submitSupportRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => supportSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyClientToken } = await import("./crypto.server");
    const auth = verifyClientToken(data.token);
    if (!auth) return { ok: false as const, error: "Session expirée." };

    const { error } = await supabaseAdmin.from("support_requests").insert({
      client_id: auth.clientId,
      subject: data.subject,
      message: data.message,
      status: "ouvert",
    });
    if (error) return { ok: false as const, error: "Envoi impossible." };

    await supabaseAdmin.from("audit_logs").insert({
      client_id: auth.clientId,
      action: "client_support_request",
      metadata: { subject: data.subject },
    });

    return { ok: true as const };
  });
