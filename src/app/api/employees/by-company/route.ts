import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// GET /api/employees/by-company?company=<name>
// Returns array of ReferenceIDs belonging to that company
export async function GET(request: NextRequest) {
  try {
    const company = new URL(request.url).searchParams.get("company")?.trim() ?? "";
    if (!company) return NextResponse.json([]);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("users")
      .select("ReferenceID")
      .eq("Company", company);

    if (error) throw error;

    const ids = (data ?? []).map((r: { ReferenceID: string }) => r.ReferenceID).filter(Boolean);
    return NextResponse.json(ids);
  } catch (error) {
    console.error("GET /api/employees/by-company:", error);
    return NextResponse.json([]);
  }
}
