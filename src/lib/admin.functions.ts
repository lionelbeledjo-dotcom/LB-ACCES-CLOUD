import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// All admin/agent operations. RLS already enforces staff-only; we add audit + crypto.

async function logAudit(userId: string, action: string, meta: Record<string, unknown> = {}, clientId?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_logs").insert({
    user_id: userId,
    client_id: clientId ?? null,
    action,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: meta as any,
  });
}

// ---------- CLIENTS ----------
const clientUpsert = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  whatsapp: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().max(160).optional().nullable().or(z.literal("")),
  city: z.string().trim().max(80).optional().nullable(),
  status: z.enum(["actif", "en_attente_paiement", "expire_bientot", "suspendu", "expire"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const saveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => clientUpsert.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      full_name: data.full_name,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      email: data.email || null,
      city: data.city || null,
      status: data.status ?? "actif",
      notes: data.notes || null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("clients").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      await logAudit(context.userId, "client_updated", { id: data.id }, data.id);
      return { id: data.id };
    } else {
      const { data: ins, error } = await context.supabase
        .from("clients")
        .insert({ ...payload, created_by: context.userId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await logAudit(context.userId, "client_created", { id: ins.id }, ins.id);
      return { id: ins.id };
    }
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "client_deleted", { id: data.id });
    return { ok: true };
  });

// ---------- ACCESS CODES ----------
export const generateClientCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      client_id: z.string().uuid(),
      expires_at: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { hashAccessCode, generateAccessCode } = await import("./crypto.server");
    const { code, prefix } = generateAccessCode();
    // Invalidate previous active codes
    await context.supabase
      .from("client_access_codes")
      .update({ is_active: false })
      .eq("client_id", data.client_id)
      .eq("is_active", true);

    const { error } = await context.supabase.from("client_access_codes").insert({
      client_id: data.client_id,
      code_hash: hashAccessCode(code),
      code_prefix: prefix,
      expires_at: data.expires_at || null,
      is_active: true,
    });
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "access_code_generated", { client_id: data.client_id, prefix }, data.client_id);
    return { code }; // shown ONCE
  });

// ---------- SERVICES ----------
const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  category: z.string().trim().max(60).optional().nullable(),
  description: z.string().max(800).optional().nullable(),
  default_slots: z.number().int().min(1).max(50).default(5),
  icon: z.string().max(40).optional().nullable(),
  instructions_template: z.string().max(2000).optional().nullable(),
});

export const saveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => serviceSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name,
      category: data.category || null,
      description: data.description || null,
      default_slots: data.default_slots,
      icon: data.icon || null,
      instructions_template: data.instructions_template || null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("services").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("services").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "service_created", { id: ins.id });
    return { id: ins.id };
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("services").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- SERVICE ACCOUNTS ----------
const accountSchema = z.object({
  id: z.string().uuid().optional(),
  service_id: z.string().uuid(),
  account_label: z.string().trim().min(2).max(120),
  login_email: z.string().trim().email().max(160),
  password: z.string().max(200).optional(),
  recovery_email: z.string().email().max(160).optional().nullable().or(z.literal("")),
  renewal_date: z.string().optional().nullable(),
  status: z.enum(["disponible", "complet", "a_renouveler", "suspendu", "expire"]).default("disponible"),
  total_slots: z.number().int().min(1).max(50).default(5),
  notes: z.string().max(2000).optional().nullable(),
  internal_owner: z.string().max(120).optional().nullable(),
});

export const saveServiceAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => accountSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { encryptSecret } = await import("./crypto.server");
    const base = {
      service_id: data.service_id,
      account_label: data.account_label,
      login_email: data.login_email,
      recovery_email: data.recovery_email || null,
      renewal_date: data.renewal_date || null,
      status: data.status,
      total_slots: data.total_slots,
      notes: data.notes || null,
      internal_owner: data.internal_owner || null,
    };

    if (data.id) {
      const update: Record<string, unknown> = { ...base };
      if (data.password && data.password.length > 0) {
        update.encrypted_password = encryptSecret(data.password);
        update.last_rotation_date = new Date().toISOString().slice(0, 10);
      }
      const { error } = await context.supabase.from("service_accounts").update(update).eq("id", data.id);
      if (error) throw new Error(error.message);
      await logAudit(context.userId, "service_account_updated", { id: data.id });
      return { id: data.id };
    }

    const { data: ins, error } = await context.supabase
      .from("service_accounts")
      .insert({
        ...base,
        encrypted_password: data.password ? encryptSecret(data.password) : "",
        last_rotation_date: data.password ? new Date().toISOString().slice(0, 10) : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Create empty slots
    const rows = Array.from({ length: data.total_slots }, (_, i) => ({
      service_account_id: ins.id,
      profile_number: i + 1,
      status: "libre" as const,
    }));
    await context.supabase.from("service_profiles").insert(rows);

    await logAudit(context.userId, "service_account_created", { id: ins.id });
    return { id: ins.id };
  });

export const deleteServiceAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("service_accounts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revealAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ account_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { decryptSecret } = await import("./crypto.server");
    const { data: acc } = await context.supabase
      .from("service_accounts")
      .select("encrypted_password")
      .eq("id", data.account_id)
      .maybeSingle();
    if (!acc) throw new Error("Compte introuvable");
    await logAudit(context.userId, "admin_credential_revealed", { account_id: data.account_id });
    return { password: acc.encrypted_password ? decryptSecret(acc.encrypted_password) : "" };
  });

// ---------- PROFILES (slots) ----------
const profileUpdate = z.object({
  id: z.string().uuid(),
  profile_name: z.string().max(60).optional().nullable(),
  profile_pin: z.string().max(20).optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(["libre", "occupe", "suspendu", "expire"]).optional(),
  notes: z.string().max(800).optional().nullable(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profileUpdate.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) payload[k] = v === "" ? null : v;
    }
    const { error } = await context.supabase.from("service_profiles").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "profile_updated", { id, fields: Object.keys(payload) });
    return { ok: true };
  });

export const releaseProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("service_profiles")
      .update({ client_id: null, start_date: null, end_date: null, status: "libre", profile_name: null, profile_pin: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "profile_released", { id: data.id });
    return { ok: true };
  });

// ---------- PAYMENTS ----------
const paymentSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  profile_id: z.string().uuid().optional().nullable(),
  service_account_id: z.string().uuid().optional().nullable(),
  amount: z.number().min(0),
  currency: z.string().max(8).default("XOF"),
  payment_method: z.enum(["cash", "mobile_money", "virement", "carte", "autre"]),
  payment_date: z.string(),
  period_start: z.string().optional().nullable(),
  period_end: z.string().optional().nullable(),
  status: z.enum(["paye", "en_attente", "annule"]).default("paye"),
  notes: z.string().max(800).optional().nullable(),
});

export const savePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => paymentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, created_by: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("payments").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("payments").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await logAudit(context.userId, "payment_recorded", { id: ins.id, amount: data.amount }, data.client_id);
    return { id: ins.id };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- DEMO SEED ----------
export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { encryptSecret, hashAccessCode } = await import("./crypto.server");

    // Verify admin role
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Réservé aux administrateurs");

    // Get default services
    const { data: services } = await supabaseAdmin.from("services").select("id, name");
    const netflix = services?.find((s) => s.name === "Netflix");
    const prime = services?.find((s) => s.name === "Amazon Prime Video");
    if (!netflix || !prime) throw new Error("Services par défaut manquants");

    // Clients
    const demoClients = [
      { full_name: "Awa Diop", phone: "+221770000001", whatsapp: "+221770000001", email: "awa@example.com", city: "Dakar", status: "actif" },
      { full_name: "Moussa Ndiaye", phone: "+221770000002", whatsapp: "+221770000002", email: "moussa@example.com", city: "Thiès", status: "actif" },
      { full_name: "Fatou Sarr", phone: "+221770000003", whatsapp: "+221770000003", city: "Dakar", status: "expire_bientot" },
      { full_name: "Cheikh Ba", phone: "+221770000004", city: "Saint-Louis", status: "en_attente_paiement" },
      { full_name: "Aïcha Fall", phone: "+221770000005", whatsapp: "+221770000005", city: "Dakar", status: "actif" },
    ] as const;

    const { data: insertedClients } = await supabaseAdmin
      .from("clients")
      .insert(demoClients.map((c) => ({ ...c, created_by: context.userId })))
      .select("id, full_name");

    if (!insertedClients) throw new Error("Création clients échouée");

    // Generate codes
    const demoCodes: Record<string, string> = {};
    for (const c of insertedClients) {
      const code = `LB-DEMO${Math.floor(1000 + Math.random() * 9000)}-${c.full_name.slice(0, 2).toUpperCase()}`;
      demoCodes[c.full_name] = code;
      await supabaseAdmin.from("client_access_codes").insert({
        client_id: c.id,
        code_hash: hashAccessCode(code),
        code_prefix: code.split("-").slice(0, 2).join("-"),
        is_active: true,
      });
    }

    // Service accounts
    const accountsToInsert = [
      { service_id: netflix.id, account_label: "Netflix Premium #1", login_email: "lb.netflix1@example.com", total_slots: 5 },
      { service_id: netflix.id, account_label: "Netflix Premium #2", login_email: "lb.netflix2@example.com", total_slots: 5 },
      { service_id: prime.id, account_label: "Prime Video FR", login_email: "lb.prime@example.com", total_slots: 6 },
    ];

    const { data: insertedAccounts } = await supabaseAdmin
      .from("service_accounts")
      .insert(
        accountsToInsert.map((a) => ({
          ...a,
          encrypted_password: encryptSecret("DemoPassword123!"),
          renewal_date: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10),
          status: "disponible" as const,
          last_rotation_date: new Date().toISOString().slice(0, 10),
        })),
      )
      .select("id, total_slots, account_label");

    if (!insertedAccounts) throw new Error("Création comptes échouée");

    // Slots
    for (const acc of insertedAccounts) {
      const slots = Array.from({ length: acc.total_slots }, (_, i) => ({
        service_account_id: acc.id,
        profile_number: i + 1,
        status: "libre" as const,
      }));
      await supabaseAdmin.from("service_profiles").insert(slots);
    }

    // Assign a few profiles
    const { data: allSlots } = await supabaseAdmin
      .from("service_profiles")
      .select("id, service_account_id, profile_number")
      .order("service_account_id")
      .order("profile_number");

    if (allSlots && allSlots.length > 0) {
      const assignments = [
        { slot: allSlots[0], client: insertedClients[0], name: "Awa", pin: "1234" },
        { slot: allSlots[1], client: insertedClients[1], name: "Moussa", pin: "5678" },
        { slot: allSlots[5], client: insertedClients[2], name: "Fatou", pin: "0000" },
        { slot: allSlots[10], client: insertedClients[4], name: "Aicha", pin: "" },
      ];
      const end = new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      for (const a of assignments) {
        if (!a.slot) continue;
        await supabaseAdmin
          .from("service_profiles")
          .update({
            client_id: a.client.id,
            profile_name: a.name,
            profile_pin: a.pin || null,
            status: "occupe",
            start_date: today,
            end_date: end,
          })
          .eq("id", a.slot.id);
      }
    }

    // Payments
    await supabaseAdmin.from("payments").insert([
      { client_id: insertedClients[0].id, amount: 3000, currency: "XOF", payment_method: "mobile_money", payment_date: new Date().toISOString().slice(0, 10), status: "paye", period_start: new Date().toISOString().slice(0, 10), period_end: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) },
      { client_id: insertedClients[1].id, amount: 3000, currency: "XOF", payment_method: "cash", payment_date: new Date().toISOString().slice(0, 10), status: "paye" },
      { client_id: insertedClients[3].id, amount: 5000, currency: "XOF", payment_method: "virement", payment_date: new Date().toISOString().slice(0, 10), status: "en_attente" },
    ]);

    await logAudit(context.userId, "demo_seed_loaded", { clients: insertedClients.length });

    return { ok: true, codes: demoCodes };
  });
