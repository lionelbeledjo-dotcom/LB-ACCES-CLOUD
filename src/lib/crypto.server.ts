import { createCipheriv, createDecipheriv, createHmac, randomBytes, createHash } from "node:crypto";

function getKey(): Buffer {
  const raw = process.env.CRED_ENCRYPTION_KEY;
  if (!raw) throw new Error("CRED_ENCRYPTION_KEY not configured");
  // Derive a 32-byte key from any-length secret
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  if (!stored) return "";
  const [v, ivB64, tagB64, encB64] = stored.split(":");
  if (v !== "v1" || !ivB64 || !tagB64 || !encB64) return "";
  try {
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const enc = Buffer.from(encB64, "base64");
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
}

export function hashAccessCode(code: string): string {
  const norm = code.trim().toUpperCase();
  return createHash("sha256").update(norm).digest("hex");
}

export function generateAccessCode(): { code: string; prefix: string } {
  // Format LB-XXXX-XX where X is alphanumeric
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) => {
    const b = randomBytes(n);
    let s = "";
    for (let i = 0; i < n; i++) s += alphabet[b[i] % alphabet.length];
    return s;
  };
  const mid = pick(4);
  const suf = pick(2);
  const code = `LB-${mid}-${suf}`;
  return { code, prefix: `LB-${mid}` };
}

const TOKEN_TTL_SECONDS = 60 * 30; // 30 min

export function signClientToken(clientId: string, codeId: string): string {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET not configured");
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${clientId}.${codeId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyClientToken(token: string): { clientId: string; codeId: string } | null {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 4) return null;
    const [clientId, codeId, expStr, sig] = parts;
    const payload = `${clientId}.${codeId}.${expStr}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
    if (expected !== sig) return null;
    if (parseInt(expStr, 10) < Math.floor(Date.now() / 1000)) return null;
    return { clientId, codeId };
  } catch {
    return null;
  }
}
