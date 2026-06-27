import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Deduplicate an array of objects by a string key, return sorted string[]
function uniqueValues(arr: Array<Record<string, unknown>> | null, key: string): string[] {
  const seen: Record<string, boolean> = {};
  const result: string[] = [];
  const rows = arr != null ? arr : [];
  for (let i = 0; i < rows.length; i++) {
    const val = String(rows[i][key] != null ? rows[i][key] : "");
    if (val && !seen[val]) {
      seen[val] = true;
      result.push(val);
    }
  }
  result.sort();
  return result;
}

// GET /api/employees/filters
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const depts    = await supabase.from("users").select("Department").not("Department", "is", null);
    const statuses = await supabase.from("users").select("Status").not("Status", "is", null);
    const roles    = await supabase.from("users").select("Role").not("Role", "is", null);

    return NextResponse.json({
      departments: uniqueValues(depts.data,    "Department"),
      statuses:    uniqueValues(statuses.data, "Status"),
      roles:       uniqueValues(roles.data,    "Role"),
    });
  } catch (error) {
    console.error("GET /api/employees/filters:", error);
    return NextResponse.json({ departments: [], statuses: [], roles: [] });
  }
}
