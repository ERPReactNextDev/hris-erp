import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
  );

// GET /api/employees/visibility
// Returns array of ReferenceIDs that are hidden
export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from("employee_visibility")
      .select("reference_id, hidden_at, reason");
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("GET /api/employees/visibility:", e);
    return NextResponse.json([], { status: 500 });
  }
}

// POST /api/employees/visibility  { reference_id, reason? }  → hide
export async function POST(request: NextRequest) {
  try {
    const { reference_id, reason } = await request.json();
    if (!reference_id)
      return NextResponse.json({ error: "reference_id required" }, { status: 400 });

    const supabase = getSupabase();
    // upsert so re-hiding is idempotent
    const { data, error } = await supabase
      .from("employee_visibility")
      .upsert({ reference_id, reason: reason ?? null }, { onConflict: "reference_id" })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("POST /api/employees/visibility:", e);
    return NextResponse.json({ error: "Failed to hide employee" }, { status: 500 });
  }
}

// DELETE /api/employees/visibility?reference_id=XXX  → unhide
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get("reference_id");
    if (!id)
      return NextResponse.json({ error: "reference_id required" }, { status: 400 });

    const { error } = await getSupabase()
      .from("employee_visibility")
      .delete()
      .eq("reference_id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/employees/visibility:", e);
    return NextResponse.json({ error: "Failed to unhide employee" }, { status: 500 });
  }
}
