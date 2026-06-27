import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
  );

// GET /api/holidays — list all holidays
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .order("date", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("GET /api/holidays:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST /api/holidays — create a holiday
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, name } = body;

    if (!date || !name) {
      return NextResponse.json(
        { error: "date and name are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("holidays")
      .insert([{ date, name }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/holidays:", error);
    return NextResponse.json({ error: "Failed to create holiday." }, { status: 500 });
  }
}

// DELETE /api/holidays?id=<uuid> — remove a holiday
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("holidays").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/holidays:", error);
    return NextResponse.json({ error: "Failed to delete holiday." }, { status: 500 });
  }
}
