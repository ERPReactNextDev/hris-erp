import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
  );

/**
 * PATCH /api/profile
 * Body: { referenceId, currentPassword, newPassword }
 * Verifies the current password then updates to the new bcrypt hash.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { referenceId, currentPassword, newPassword } = await request.json();

    if (!referenceId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "referenceId, currentPassword, and newPassword are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Fetch the current hashed password
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("Password")
      .eq("ReferenceID", referenceId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Verify current password (supports both bcrypt and plain-text legacy)
    let match = false;
    try {
      match = await bcrypt.compare(currentPassword, user.Password);
    } catch {
      match = currentPassword === user.Password;
    }

    if (!match) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 }
      );
    }

    // Hash and save the new password
    const hashed = await bcrypt.hash(newPassword, 12);
    const { error: updateError } = await supabase
      .from("users")
      .update({ Password: hashed })
      .eq("ReferenceID", referenceId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/profile:", error);
    return NextResponse.json(
      { error: "Failed to update password." },
      { status: 500 }
    );
  }
}
