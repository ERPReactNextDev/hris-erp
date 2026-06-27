import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
  );

// GET /api/payroll-cutoffs — list all cutoffs
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("payroll_cutoffs")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("GET /api/payroll-cutoffs:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST /api/payroll-cutoffs — create a new cutoff
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, start_date, end_date } = body;

    if (!label || !start_date || !end_date) {
      return NextResponse.json(
        { error: "label, start_date, and end_date are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("payroll_cutoffs")
      .insert([{ label, start_date, end_date }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/payroll-cutoffs:", error);
    return NextResponse.json({ error: "Failed to create cutoff." }, { status: 500 });
  }
}

// DELETE /api/payroll-cutoffs?id=<uuid> — remove a cutoff
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from("payroll_cutoffs")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/payroll-cutoffs:", error);
    return NextResponse.json({ error: "Failed to delete cutoff." }, { status: 500 });
  }
}
