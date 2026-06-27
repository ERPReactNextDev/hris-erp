import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const today     = new Date();
    const todayStr  = today.toISOString().split("T")[0];
    const todayStart = `${todayStr}T00:00:00`;
    const todayEnd   = `${todayStr}T23:59:59`;

    // Day of week: 0 = Sunday. Get start of this work week (Monday).
    const dayOfWeek = today.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diffToMon);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const [
      { count: totalUsers },
      { count: todayLogs },
      { data: todayDistinct },
      { count: weekLogs },
      { data: holidays },
      { data: lateToday },
      { data: hiddenRows },
    ] = await Promise.all([
      // Total employees (excluding hidden)
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .not("Status", "ilike", "resigned")
        .not("Status", "ilike", "terminated"),

      // Raw log count today
      supabase
        .from("tasklog")
        .select("*", { count: "exact", head: true })
        .gte("date_created", todayStart)
        .lte("date_created", todayEnd),

      // Distinct employees present today
      supabase
        .from("tasklog")
        .select("ReferenceID")
        .gte("date_created", todayStart)
        .lte("date_created", todayEnd),

      // Total logs this week
      supabase
        .from("tasklog")
        .select("*", { count: "exact", head: true })
        .gte("date_created", `${weekStartStr}T00:00:00`),

      // Holidays this month (for reference)
      supabase
        .from("holidays")
        .select("date")
        .gte("date", `${todayStr.slice(0, 7)}-01`)
        .lte("date", todayStr),

      // Lates today: first log per person after 08:00
      supabase
        .from("tasklog")
        .select("ReferenceID, date_created")
        .gte("date_created", `${todayStr}T08:01:00`)
        .lte("date_created", todayEnd),

      // Hidden employees
      supabase
        .from("employee_visibility")
        .select("reference_id"),
    ]);

    const hiddenSet = new Set((hiddenRows ?? []).map((r: { reference_id: string }) => r.reference_id));

    const presentToday = new Set(
      (todayDistinct ?? [])
        .map((r) => r.ReferenceID)
        .filter((id) => !hiddenSet.has(id))
    ).size;

    // Count lates: first log per person, if that first log is after 08:00
    const firstLogPerUser = new Map<string, string>();
    lateToday?.forEach((r) => {
      if (hiddenSet.has(r.ReferenceID)) return;
      const existing = firstLogPerUser.get(r.ReferenceID);
      if (!existing || r.date_created < existing) {
        firstLogPerUser.set(r.ReferenceID, r.date_created);
      }
    });
    const lateCount = firstLogPerUser.size;

    return NextResponse.json({
      totalUsers:    totalUsers    ?? 0,
      presentToday:  presentToday  ?? 0,
      lateToday:     lateCount     ?? 0,
      weekActivity:  weekLogs      ?? 0,
      absentToday:   Math.max(0, (totalUsers ?? 0) - presentToday),
      holidaysThisMonth: holidays?.length ?? 0,
    });
  } catch (error) {
    console.error("dashboard-stats error:", error);
    return NextResponse.json({
      totalUsers: 0, presentToday: 0, lateToday: 0,
      weekActivity: 0, absentToday: 0, holidaysThisMonth: 0,
    });
  }
}
