import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// GET /api/employees/filters
// Returns distinct Department, Status, Role values for filter dropdowns
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const [depts, statuses, roles] = await Promise.all([
      supabase.from("users").select("Department").not("Department", "is", null),
      supabase.from("users").select("Status").not("Status", "is", null),
      supabase.from("users").select("Role").not("Role", "is", null),
    ]);

    const unique = <T extends Record<string, unknown>>(arr: T[] | null, key: keyof T): string[] =>
      Array.from(new Set((arr ?? []).map((r) => String(r[key])).filter(Boolean))).sort();

    return NextResponse.json({
      departments: unique(depts.data, "Department"),
      statuses:    unique(statuses.data, "Status"),
      roles:       unique(roles.data, "Role"),
    });
  } catch (error) {
    console.error("GET /api/employees/filters:", error);
    return NextResponse.json({ departments: [], statuses: [], roles: [] });
  }
}
