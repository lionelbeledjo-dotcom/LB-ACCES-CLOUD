import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supa = context.supabase;
    const today = new Date();
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);

    const [
      { count: totalClients },
      { count: activeClients },
      { count: suspendedClients },
      { count: totalAccounts },
      { data: profilesAll },
      { data: revenuePaid },
      { data: pendingPaymentsRows },
      { data: expSoon },
    ] = await Promise.all([
      supa.from("clients").select("*", { count: "exact", head: true }),
      supa.from("clients").select("*", { count: "exact", head: true }).eq("status", "actif"),
      supa.from("clients").select("*", { count: "exact", head: true }).eq("status", "suspendu"),
      supa.from("service_accounts").select("*", { count: "exact", head: true }),
      supa.from("service_profiles").select("status"),
      supa
        .from("payments")
        .select("amount, payment_date")
        .eq("status", "paye")
        .gte("payment_date", new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().slice(0, 10)),
      supa.from("payments").select("amount").eq("status", "en_attente"),
      supa
        .from("service_profiles")
        .select("id, end_date, client:clients(full_name), service_account:service_accounts(account_label, service:services(name))")
        .not("end_date", "is", null)
        .lte("end_date", in7)
        .gte("end_date", todayStr)
        .eq("status", "occupe")
        .order("end_date", { ascending: true })
        .limit(10),
    ]);

    const occupied = (profilesAll || []).filter((p) => p.status === "occupe").length;
    const free = (profilesAll || []).filter((p) => p.status === "libre").length;

    // Monthly revenue (last 6 months)
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = 0;
    }
    for (const r of revenuePaid || []) {
      const key = (r.payment_date as string).slice(0, 7);
      if (key in months) months[key] += Number(r.amount);
    }
    const monthlyRevenue = Object.entries(months).map(([month, amount]) => ({ month, amount }));
    const pendingAmount = (pendingPaymentsRows || []).reduce((s, p) => s + Number(p.amount), 0);
    const currentMonth = monthlyRevenue[monthlyRevenue.length - 1]?.amount ?? 0;

    return {
      totals: {
        totalClients: totalClients || 0,
        activeClients: activeClients || 0,
        suspendedClients: suspendedClients || 0,
        totalAccounts: totalAccounts || 0,
        occupiedProfiles: occupied,
        freeProfiles: free,
        currentMonthRevenue: currentMonth,
        pendingAmount,
      },
      monthlyRevenue,
      expiringSoon: expSoon || [],
    };
  });
