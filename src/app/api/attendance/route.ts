import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Module-level helper — no Set/Map (ES5 target)
function uniqueVals(rows: Array<Record<string, unknown>> | null, key: string): string[] {
  var seen: Record<string, boolean> = {};
  var out: string[] = [];
  (rows ?? []).forEach(function(r) {
    var v = String(r[key] != null ? r[key] : "");
    if (v && !seen[v]) { seen[v] = true; out.push(v); }
  });
  out.sort();
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search     = searchParams.get("search")?.trim()     ?? "";
    const type       = searchParams.get("type")?.trim()       ?? "";
    const status     = searchParams.get("status")?.trim()     ?? "";
    const startDate  = searchParams.get("startDate")?.trim()  ?? "";
    const endDate    = searchParams.get("endDate")?.trim()    ?? "";
    const page       = Math.max(1, parseInt(searchParams.get("page")     ?? "1"));
    const pageSize   = Math.min(250, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25")));

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── Build filtered query ──────────────────────────────────────────────
    let query = supabase
      .from("tasklog")
      .select("*", { count: "exact" })
      .order("date_created", { ascending: false });

    if (type)      query = query.eq("Type",   type);
    if (status)    query = query.eq("Status", status);
    if (startDate) query = query.gte("date_created", startDate + "T00:00:00");
    if (endDate)   query = query.lte("date_created", endDate   + "T23:59:59");
    if (search) {
      // Search by ReferenceID or Email (server-side); name search done after join
      query = query.or(
        `ReferenceID.ilike.%${search}%,Email.ilike.%${search}%,Remarks.ilike.%${search}%,Location.ilike.%${search}%`
      );
    }

    // Paginate
    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;
    const { data: taskLogs, count, error: taskLogError } = await query.range(from, to);

    if (taskLogError) throw taskLogError;
    if (!taskLogs)    return NextResponse.json({ data: [], total: 0, page, pageSize });

    // ── Resolve names for this page's unique ReferenceIDs ────────────────
    const refIds: string[] = [];
    const refIdSeen: Record<string, boolean> = {};
    taskLogs.forEach((log) => {
      if (log.ReferenceID && !refIdSeen[log.ReferenceID]) {
        refIdSeen[log.ReferenceID] = true;
        refIds.push(log.ReferenceID);
      }
    });

    const userLookup: Record<string, string> = {};
    if (refIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("ReferenceID, Firstname, Lastname")
        .in("ReferenceID", refIds);

      (users ?? []).forEach((user) => {
        const fullName = ((user.Firstname || "") + " " + (user.Lastname || "")).trim();
        userLookup[user.ReferenceID] = fullName || user.ReferenceID;
      });
    }

    // ── Process rows ──────────────────────────────────────────────────────
    const processedLogs = taskLogs.map((log) => {
      let displayLocation = log.Location;
      if (!displayLocation && log.Latitude && log.Longitude) {
        displayLocation = log.Latitude + ", " + log.Longitude;
      }
      return {
        ...log,
        Fullname:        userLookup[log.ReferenceID] || log.ReferenceID,
        DisplayLocation: displayLocation,
      };
    });

    // If searching by name, filter after name resolution and re-slice
    // (name search can't be done in SQL — return the page with a note)
    // For full name search we do a secondary pass only on the current page
    let finalLogs = processedLogs;
    let finalTotal = count ?? 0;

    if (search) {
      const q = search.toLowerCase();
      const nameMatches = finalLogs.filter(
        (log) => log.Fullname && log.Fullname.toLowerCase().includes(q)
      );
      // Merge: keep rows already matched by SQL OR matched by name
      const merged: typeof finalLogs = [];
      const seenIds: Record<number, boolean> = {};
      finalLogs.forEach((log) => { if (!seenIds[log.id]) { seenIds[log.id] = true; merged.push(log); } });
      nameMatches.forEach((log) => { if (!seenIds[log.id]) { seenIds[log.id] = true; merged.push(log); } });
      finalLogs  = merged;
      finalTotal = count ?? 0; // total count is approximate when name-searching
    }

    return NextResponse.json({
      data:     finalLogs,
      total:    finalTotal,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("GET /api/attendance:", error);
    return NextResponse.json({ data: [], total: 0, page: 1, pageSize: 25 }, { status: 500 });
  }
}

// ── Filters endpoint (/api/attendance — POST) ─────────────────────────────────
// Returns distinct Type and Status values for dropdowns
export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const [types, statuses] = await Promise.all([
      supabase.from("tasklog").select("Type").not("Type",   "is", null),
      supabase.from("tasklog").select("Status").not("Status", "is", null),
    ]);

    return NextResponse.json({
      types:    uniqueVals(types.data    as Array<Record<string, unknown>>,    "Type"),
      statuses: uniqueVals(statuses.data as Array<Record<string, unknown>>,    "Status"),
    });
  } catch (error) {
    console.error("POST /api/attendance (meta):", error);
    return NextResponse.json({ types: [], statuses: [] });
  }
}

// ── DELETE /api/attendance?id=<id> ───────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from("tasklog").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/attendance:", error);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}
