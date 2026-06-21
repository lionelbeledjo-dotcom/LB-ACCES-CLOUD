import { createServerFn } from "@tanstack/react-start";

export const checkHasAnyUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true });
    return { hasUsers: (count ?? 0) > 0 };
  },
);
