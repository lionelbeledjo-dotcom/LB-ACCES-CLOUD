-- Security hardening: revoke direct access to encrypted_password column
-- Only service_role (server functions) should read/write this column

REVOKE ALL ON public.service_accounts FROM authenticated;
GRANT SELECT (id, service_id, account_label, login_email, recovery_email, renewal_date, status, total_slots, notes, internal_owner, last_rotation_date, created_at, updated_at) ON public.service_accounts TO authenticated;
GRANT INSERT (id, service_id, account_label, login_email, encrypted_password, recovery_email, renewal_date, status, total_slots, notes, internal_owner, last_rotation_date) ON public.service_accounts TO authenticated;
GRANT UPDATE (service_id, account_label, login_email, encrypted_password, recovery_email, renewal_date, status, total_slots, notes, internal_owner, last_rotation_date) ON public.service_accounts TO authenticated;
GRANT DELETE ON public.service_accounts TO authenticated;

-- Ensure service_role keeps full access
GRANT ALL ON public.service_accounts TO service_role;

-- Add rate limiting hint: limit failed login attempts tracking
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hint TEXT
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_hash ON public.login_attempts(code_hash, attempted_at DESC);
GRANT INSERT ON public.login_attempts TO service_role;
GRANT SELECT ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
