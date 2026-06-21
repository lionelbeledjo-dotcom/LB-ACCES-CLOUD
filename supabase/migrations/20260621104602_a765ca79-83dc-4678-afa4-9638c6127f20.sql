
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'agent');
CREATE TYPE public.client_status AS ENUM ('actif','en_attente_paiement','expire_bientot','suspendu','expire');
CREATE TYPE public.account_status AS ENUM ('disponible','complet','a_renouveler','suspendu','expire');
CREATE TYPE public.profile_slot_status AS ENUM ('libre','occupe','suspendu','expire');
CREATE TYPE public.payment_method AS ENUM ('cash','mobile_money','virement','carte','autre');
CREATE TYPE public.payment_status AS ENUM ('paye','en_attente','annule');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES (admins/agents) ============
CREATE TABLE public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_profiles TO authenticated;
GRANT ALL ON public.admin_profiles TO service_role;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.admin_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.admin_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.admin_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_admin_profiles_updated BEFORE UPDATE ON public.admin_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_agent(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','agent'));
$$;

-- Trigger: first user becomes admin, others become agent
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.admin_profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN assigned_role := 'admin'; ELSE assigned_role := 'agent'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  city TEXT,
  status public.client_status NOT NULL DEFAULT 'actif',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage clients" ON public.clients FOR ALL TO authenticated
  USING (public.is_admin_or_agent(auth.uid())) WITH CHECK (public.is_admin_or_agent(auth.uid()));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CLIENT ACCESS CODES (hashed) ============
CREATE TABLE public.client_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  code_prefix TEXT NOT NULL, -- e.g. "LB-8429" first part for admin display
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX idx_access_codes_client ON public.client_access_codes(client_id);
CREATE INDEX idx_access_codes_active ON public.client_access_codes(is_active) WHERE is_active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_access_codes TO authenticated;
GRANT ALL ON public.client_access_codes TO service_role;
ALTER TABLE public.client_access_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage codes" ON public.client_access_codes FOR ALL TO authenticated
  USING (public.is_admin_or_agent(auth.uid())) WITH CHECK (public.is_admin_or_agent(auth.uid()));

-- ============ SERVICES ============
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  default_slots INT NOT NULL DEFAULT 5,
  icon TEXT,
  instructions_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage services" ON public.services FOR ALL TO authenticated
  USING (public.is_admin_or_agent(auth.uid())) WITH CHECK (public.is_admin_or_agent(auth.uid()));
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SERVICE ACCOUNTS ============
CREATE TABLE public.service_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  account_label TEXT NOT NULL,
  login_email TEXT NOT NULL,
  encrypted_password TEXT NOT NULL DEFAULT '',
  recovery_email TEXT,
  renewal_date DATE,
  status public.account_status NOT NULL DEFAULT 'disponible',
  total_slots INT NOT NULL DEFAULT 5,
  notes TEXT,
  internal_owner TEXT,
  last_rotation_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_accounts TO authenticated;
GRANT ALL ON public.service_accounts TO service_role;
ALTER TABLE public.service_accounts ENABLE ROW LEVEL SECURITY;
-- staff can read account metadata; password reveal happens via server fn (audit)
CREATE POLICY "staff manage accounts" ON public.service_accounts FOR ALL TO authenticated
  USING (public.is_admin_or_agent(auth.uid())) WITH CHECK (public.is_admin_or_agent(auth.uid()));
CREATE TRIGGER trg_service_accounts_updated BEFORE UPDATE ON public.service_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SERVICE PROFILES (slots) ============
CREATE TABLE public.service_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_account_id UUID NOT NULL REFERENCES public.service_accounts(id) ON DELETE CASCADE,
  profile_number INT NOT NULL,
  profile_name TEXT,
  profile_pin TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  status public.profile_slot_status NOT NULL DEFAULT 'libre',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_account_id, profile_number)
);
CREATE INDEX idx_profiles_client ON public.service_profiles(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_profiles TO authenticated;
GRANT ALL ON public.service_profiles TO service_role;
ALTER TABLE public.service_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage profiles" ON public.service_profiles FOR ALL TO authenticated
  USING (public.is_admin_or_agent(auth.uid())) WITH CHECK (public.is_admin_or_agent(auth.uid()));
CREATE TRIGGER trg_service_profiles_updated BEFORE UPDATE ON public.service_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.service_profiles(id) ON DELETE SET NULL,
  service_account_id UUID REFERENCES public.service_accounts(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE,
  period_end DATE,
  status public.payment_status NOT NULL DEFAULT 'paye',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_client ON public.payments(client_id);
CREATE INDEX idx_payments_date ON public.payments(payment_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.is_admin_or_agent(auth.uid())) WITH CHECK (public.is_admin_or_agent(auth.uid()));
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SUPPORT REQUESTS ============
CREATE TABLE public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ouvert',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_requests TO authenticated;
GRANT ALL ON public.support_requests TO service_role;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read support" ON public.support_requests FOR SELECT TO authenticated
  USING (public.is_admin_or_agent(auth.uid()));
CREATE POLICY "staff update support" ON public.support_requests FOR UPDATE TO authenticated
  USING (public.is_admin_or_agent(auth.uid()));
-- inserts happen from server fn with service role (public client requests)
CREATE TRIGGER trg_support_updated BEFORE UPDATE ON public.support_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin_or_agent(auth.uid()));

-- ============ SEED SERVICES ============
INSERT INTO public.services (name, category, description, default_slots, icon, instructions_template) VALUES
('Netflix', 'Streaming', 'Plateforme de streaming vidéo premium.', 5, 'tv', 'Connectez-vous sur netflix.com, sélectionnez votre profil et entrez le PIN si demandé.'),
('Amazon Prime Video', 'Streaming', 'Films, séries et originaux Amazon.', 6, 'play', 'Rendez-vous sur primevideo.com, choisissez votre profil et profitez du contenu.'),
('Service personnalisé', 'Autre', 'Modèle pour un service sur-mesure.', 1, 'package', 'Suivez les instructions communiquées par votre conseiller.');
