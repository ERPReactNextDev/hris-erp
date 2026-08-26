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
    const search    = searchParams.get("search")?.trim()    ?? "";
    const type      = searchParams.get("type")?.trim()      ?? "";
    const status    = searchParams.get("status")?.trim()    ?? "";
    const company   = searchParams.get("company")?.trim()   ?? "";
    const startDate = searchParams.get("startDate")?.trim() ?? "";
    const endDate   = searchParams.get("endDate")?.trim()   ?? "";
    // Comma-separated departments to restrict results (permission-based)
    const deptFilterParam     = searchParams.get("deptFilter")?.trim()      ?? "";
    // Comma-separated companies to exclude (permission-based)
    const excludeCompaniesParam = searchParams.get("excludeCompanies")?.trim() ?? "";
    const page      = Math.max(1, parseInt(searchParams.get("page")     ?? "1"));
    // Allow up to 50 000 rows for bulk internal fetches (timesheet, exports)
    const pageSize  = Math.min(50000, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25")));

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── Resolve company → ReferenceIDs (server-side) ──────────────────────
    let companyRefIds: string[] | null = null;
    if (company) {
      const { data: companyUsers } = await supabase
        .from("users")
        .select("ReferenceID")
        .ilike("Company", company);  // case-insensitive exact match
      companyRefIds = (companyUsers ?? [])
        .map((u: { ReferenceID: string }) => u.ReferenceID)
        .filter(Boolean);
      if (companyRefIds.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, pageSize });
      }
    }

    // ── Resolve excluded companies → ReferenceIDs to block ───────────────
    let excludedRefIds: string[] | null = null;
    if (excludeCompaniesParam) {
      const excCompanies = excludeCompaniesParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (excCompanies.length > 0) {
        const excIds: string[] = [];
        for (let i = 0; i < excCompanies.length; i++) {
          const { data: excUsers } = await supabase
            .from("users")
            .select("ReferenceID")
            .ilike("Company", excCompanies[i]);
          (excUsers ?? []).forEach((u: { ReferenceID: string }) => {
            if (u.ReferenceID) excIds.push(u.ReferenceID);
          });
        }
        excludedRefIds = excIds;
      }
    }

    // ── Resolve dept permission filter → ReferenceIDs ─────────────────────
    let deptRefIds: string[] | null = null;
    if (deptFilterParam) {
      const depts = deptFilterParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (depts.length > 0) {
        // Fetch ReferenceIDs for each allowed department
        const allDeptIds: string[] = [];
        for (let i = 0; i < depts.length; i++) {
          const { data: deptUsers } = await supabase
            .from("users")
            .select("ReferenceID")
            .ilike("Department", depts[i]);
          (deptUsers ?? []).forEach((u: { ReferenceID: string }) => {
            if (u.ReferenceID) allDeptIds.push(u.ReferenceID);
          });
        }
        deptRefIds = allDeptIds;
        if (deptRefIds.length === 0) {
          return NextResponse.json({ data: [], total: 0, page, pageSize });
        }
      }
    }

    // ── Build filtered query ──────────────────────────────────────────────
    let query = supabase
      .from("tasklog")
      .select("*", { count: "exact" })
      .order("date_created", { ascending: false });

    if (type)          query = query.eq("Type",   type);
    if (status)        query = query.eq("Status", status);
    if (startDate)     query = query.gte("date_created", startDate + "T00:00:00");
    if (endDate)       query = query.lte("date_created", endDate   + "T23:59:59");
    if (companyRefIds) query = query.in("ReferenceID", companyRefIds);

    // Exclude specific companies' employees
    if (excludedRefIds && excludedRefIds.length > 0) {
      query = query.not("ReferenceID", "in", `(${excludedRefIds.map((id) => `"${id}"`).join(",")})`);
    }

    // Apply permission-based dept filter — intersect with company filter if both active
    if (deptRefIds) {
      const allowed = companyRefIds
        ? deptRefIds.filter((id) => (companyRefIds as string[]).includes(id))
        : deptRefIds;
      if (allowed.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, pageSize });
      }
      query = query.in("ReferenceID", allowed);
    }
    if (search) {
      query = query.or(
        `ReferenceID.ilike.%${search}%,Email.ilike.%${search}%,Remarks.ilike.%${search}%,Location.ilike.%${search}%`
      );
    }

    // Paginate
    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;

    // For large bulk fetches, Supabase PostgREST caps at 1000 rows per request.
    // Fetch in 1000-row chunks and merge when pageSize > 1000.
    let taskLogs: Record<string, unknown>[] = [];
    let count: number | null = null;
    let taskLogError = null;

    if (pageSize <= 1000) {
      const result = await query.range(from, to);
      taskLogs = (result.data ?? []) as Record<string, unknown>[];
      count = result.count;
      taskLogError = result.error;
    } else {
      // First get the total count
      const countResult = await query.range(0, 0);
      count = countResult.count;
      taskLogError = countResult.error;

      if (!taskLogError) {
        // Fetch all rows in 1000-row chunks within the requested range
        const chunkSize = 1000;
        let chunkFrom = from;
        while (chunkFrom <= to) {
          const chunkTo = Math.min(chunkFrom + chunkSize - 1, to);
          const chunk = await query.range(chunkFrom, chunkTo);
          if (chunk.error) { taskLogError = chunk.error; break; }
          taskLogs = taskLogs.concat((chunk.data ?? []) as Record<string, unknown>[]);
          if ((chunk.data ?? []).length < chunkSize) break;
          chunkFrom += chunkSize;
        }
      }
    }

    if (taskLogError) throw taskLogError;
    if (!taskLogs || taskLogs.length === 0) return NextResponse.json({ data: [], total: count ?? 0, page, pageSize });

    // ── Resolve names + dept + company for this page's unique ReferenceIDs ──
    type LogRow = Record<string, unknown>;
    const logRows = taskLogs as LogRow[];

    const refIds: string[] = [];
    const refIdSeen: Record<string, boolean> = {};
    logRows.forEach((log) => {
      const refId = String(log.ReferenceID ?? "");
      if (refId && !refIdSeen[refId]) {
        refIdSeen[refId] = true;
        refIds.push(refId);
      }
    });

    interface UserInfo { fullname: string; department: string; company: string; }
    const userLookup: Record<string, UserInfo> = {};
    if (refIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("ReferenceID, Firstname, Lastname, Department, Company")
        .in("ReferenceID", refIds);

      (users ?? []).forEach((user) => {
        const fullName = ((user.Firstname || "") + " " + (user.Lastname || "")).trim();
        userLookup[user.ReferenceID] = {
          fullname:   fullName || user.ReferenceID,
          department: user.Department || "",
          company:    user.Company    || "",
        };
      });
    }

    // ── Process rows ──────────────────────────────────────────────────────
    const processedLogs = logRows.map((log) => {
      const refId = String(log.ReferenceID ?? "");
      let displayLocation = log.Location as string | undefined;
      if (!displayLocation && log.Latitude && log.Longitude) {
        displayLocation = String(log.Latitude) + ", " + String(log.Longitude);
      }
      const info = userLookup[refId];
      return {
        ...log,
        Fullname:        info ? info.fullname   : (refId || ""),
        Department:      info ? info.department : "",
        Company:         info ? info.company    : "",
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
        (log) => log.Fullname && String(log.Fullname).toLowerCase().includes(q)
      );
      // Merge: keep rows already matched by SQL OR matched by name
      const merged: typeof finalLogs = [];
      const seenIds: Record<string, boolean> = {};
      finalLogs.forEach((log) => {
        const k = String((log as Record<string, unknown>).id ?? "");
        if (!seenIds[k]) { seenIds[k] = true; merged.push(log); }
      });
      nameMatches.forEach((log) => {
        const k = String((log as Record<string, unknown>).id ?? "");
        if (!seenIds[k]) { seenIds[k] = true; merged.push(log); }
      });
      finalLogs  = merged;
      finalTotal = count ?? 0;
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
// Returns distinct Type, Status, and Company values — only for companies that
// actually have attendance records (joined from users via tasklog ReferenceIDs)
export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get distinct ReferenceIDs that have at least one tasklog entry
    const { data: refRows } = await supabase
      .from("tasklog")
      .select("ReferenceID")
      .not("ReferenceID", "is", null);

    // Collect unique ReferenceIDs
    const refSeen: Record<string, boolean> = {};
    const refIds: string[] = [];
    (refRows ?? []).forEach((r: { ReferenceID: string }) => {
      if (r.ReferenceID && !refSeen[r.ReferenceID]) {
        refSeen[r.ReferenceID] = true;
        refIds.push(r.ReferenceID);
      }
    });

    // Fetch company + type/status in parallel
    const [types, statuses, companyRows] = await Promise.all([
      supabase.from("tasklog").select("Type").not("Type", "is", null),
      supabase.from("tasklog").select("Status").not("Status", "is", null),
      refIds.length > 0
        ? supabase
            .from("users")
            .select("Company")
            .in("ReferenceID", refIds)
            .not("Company", "is", null)
        : Promise.resolve({ data: [] }),
    ]);

    return NextResponse.json({
      types:     uniqueVals(types.data     as Array<Record<string, unknown>>, "Type"),
      statuses:  uniqueVals(statuses.data  as Array<Record<string, unknown>>, "Status"),
      companies: uniqueVals(companyRows.data as Array<Record<string, unknown>>, "Company"),
    });
  } catch (error) {
    console.error("POST /api/attendance (meta):", error);
    return NextResponse.json({ types: [], statuses: [], companies: [] });
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
