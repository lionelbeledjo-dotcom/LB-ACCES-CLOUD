-- ============ ADD is_active TO SERVICES ============
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ============ SECURITY ALERTS TABLE ============
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  code_id UUID REFERENCES public.client_access_codes(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_alerts_unresolved ON public.security_alerts(is_resolved, created_at DESC) WHERE NOT is_resolved;
CREATE INDEX IF NOT EXISTS idx_security_alerts_client ON public.security_alerts(client_id);
GRANT SELECT, UPDATE ON public.security_alerts TO authenticated;
GRANT ALL ON public.security_alerts TO service_role;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read alerts" ON public.security_alerts FOR SELECT TO authenticated
  USING (public.is_admin_or_agent(auth.uid()));
CREATE POLICY "staff resolve alerts" ON public.security_alerts FOR UPDATE TO authenticated
  USING (public.is_admin_or_agent(auth.uid()));

-- ============ ADD WHATSAPP MESSAGE TEMPLATES TABLE ============
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage templates" ON public.message_templates FOR ALL TO authenticated
  USING (public.is_admin_or_agent(auth.uid())) WITH CHECK (public.is_admin_or_agent(auth.uid()));
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED WHATSAPP TEMPLATE ============
INSERT INTO public.message_templates (name, content, description) VALUES
('welcome_access', 'Bonjour {{nom}}, votre accès {{service}} est prêt.

Connectez-vous ici : {{lien}}
Votre code d''accès : {{code}}

Merci de ne pas partager ce code.
Votre accès est valable jusqu''au {{date_expiration}}.

— LB Access Cloud', 'Message envoyé au client après attribution d''un accès')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.message_templates (name, content, description) VALUES
('renewal_reminder', 'Bonjour {{nom}}, votre accès {{service}} expire le {{date_expiration}}.

Pour renouveler, contactez-nous ou rendez-vous sur : {{lien}}
Code d''accès : {{code}}

— LB Access Cloud', 'Rappel de renouvellement envoyé avant expiration')
ON CONFLICT (name) DO NOTHING;

-- ============ SEED ADDITIONAL SERVICES ============
INSERT INTO public.services (name, category, description, default_slots, icon, instructions_template, is_active) VALUES
('Canva Pro', 'Design', 'Plateforme de design graphique professionnelle avec accès aux fonctionnalités premium.', 5, 'palette', 'Connectez-vous sur canva.com avec les identifiants fournis. Vous avez accès à toutes les fonctionnalités Pro.', TRUE),
('CapCut Pro', 'Montage vidéo', 'Éditeur vidéo professionnel avec effets premium, exports HD et fonctionnalités avancées.', 3, 'video', 'Connectez-vous sur capcut.com ou dans l''application CapCut avec les identifiants fournis.', TRUE)
ON CONFLICT DO NOTHING;

-- ============ IMPROVE LOGIN_ATTEMPTS WITH IP TRACKING ============
ALTER TABLE public.login_attempts ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT FALSE;
