import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
  );

// Columns we expose — never return Password, OTP secrets, etc.
const SAFE_COLUMNS = [
  "id", "ReferenceID", "Firstname", "Lastname", "Email", "userName",
  "Role", "Department", "Location", "Company", "Position", "Status",
  "ContactNumber", "AnotherNumber", "Address", "Birthday", "Gender",
  "Manager", "ManagerName", "TSM", "TSMName", "profilePicture",
  "createdAt", "updatedAt", "LastLoginAt", "Connection",
  "twoFactorEnabled", "faceVerificationEnabled", "registrationMethod",
  "OtherEmail", "SecondaryEmail", "TargetQuota", "type_of_sales",
  "spf_owner", "DeviceId", "FingerprintKey",
].join(", ");

// GET /api/employees
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search      = searchParams.get("search")?.trim()      ?? "";
    const department  = searchParams.get("department")?.trim()  ?? "";
    const status      = searchParams.get("status")?.trim()      ?? "";
    const role        = searchParams.get("role")?.trim()        ?? "";
    const showHidden  = searchParams.get("showHidden") === "1"; // admin override
    const page        = Math.max(1, parseInt(searchParams.get("page")     ?? "1"));
    const pageSize    = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25")));

    const supabase = getSupabase();

    // Fetch hidden reference IDs first
    const { data: hiddenRows } = await supabase
      .from("employee_visibility")
      .select("reference_id");
    const hiddenIds = (hiddenRows ?? []).map((r: { reference_id: string }) => r.reference_id);

    let query = supabase
      .from("users")
      .select(SAFE_COLUMNS, { count: "exact" });

    // Exclude manually hidden employees (unless admin requests them)
    if (!showHidden && hiddenIds.length > 0) {
      query = query.not("ReferenceID", "in", `(${hiddenIds.map((id) => `"${id}"`).join(",")})`);
    }

    // By default hide separated employees; only show when explicitly filtered
    if (!status) {
      query = query
        .not("Status", "ilike", "resigned")
        .not("Status", "ilike", "terminated");
    }

    if (search) {
      query = query.or(
        `Firstname.ilike.%${search}%,Lastname.ilike.%${search}%,Email.ilike.%${search}%,ReferenceID.ilike.%${search}%,userName.ilike.%${search}%`
      );
    }
    if (department) query = query.eq("Department", department);
    if (status)     query = query.eq("Status", status);
    if (role)       query = query.eq("Role", role);

    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;

    const { data, count, error } = await query
      .order("Lastname",  { ascending: true })
      .order("Firstname", { ascending: true })
      .range(from, to);

    if (error) throw error;

    // Build a plain object lookup for O(1) hidden checks (no Set — ES5 target)
    const hiddenLookup: Record<string, boolean> = {};
    for (let i = 0; i < hiddenIds.length; i++) {
      hiddenLookup[hiddenIds[i]] = true;
    }

    // Annotate each row — cast through unknown to satisfy strict typing
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    const annotated = rows.map((emp) => ({
      ...emp,
      _hidden: hiddenLookup[emp.ReferenceID as string] === true,
    }));

    return NextResponse.json({ data: annotated, total: count ?? 0, page, pageSize });
  } catch (error) {
    console.error("GET /api/employees:", error);
    return NextResponse.json({ data: [], total: 0, page: 1, pageSize: 25 }, { status: 500 });
  }
}

// GET /api/employees/filters — distinct values for dropdowns
// We handle this via a separate searchParam flag to keep it one route file
