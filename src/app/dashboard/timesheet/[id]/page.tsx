"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TaskLog, PayrollCutoff, Holiday } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (date: Date) => date.toISOString().split("T")[0];

const getTime = (d: string | Date | undefined) => {
  if (!d) return "--:--";
  return new Date(d).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const toMins = (h: number, m: number) => h * 60 + m;

/** Minutes after 08:00 (positive = late) */
const calcLate = (login: string | Date | undefined) => {
  if (!login) return null;
  const d = new Date(login);
  const mins = (d.getHours() - 8) * 60 + d.getMinutes();
  return mins > 0 ? { hours: Math.floor(mins / 60), minutes: mins % 60 } : null;
};

/** Minutes before 17:00 (positive = undertime) */
const calcUndertime = (logout: string | Date | undefined) => {
  if (!logout) return null;
  const d = new Date(logout);
  const mins = (17 - d.getHours()) * 60 - d.getMinutes();
  return mins > 0 ? { hours: Math.floor(mins / 60), minutes: mins % 60 } : null;
};

/** Minutes after 18:00 (positive = overtime) */
const calcOvertime = (logout: string | Date | undefined) => {
  if (!logout) return null;
  const d = new Date(logout);
  const mins = (d.getHours() - 18) * 60 + d.getMinutes();
  return mins > 0 ? { hours: Math.floor(mins / 60), minutes: mins % 60 } : null;
};

/** Credited hours capped 08:00–17:00 */
const calcRegular = (login: string | Date, logout: string | Date) => {
  const li = new Date(login);
  const lo = new Date(logout);
  const start = new Date(li); start.setHours(8, 0, 0, 0);
  const end   = new Date(li); end.setHours(17, 0, 0, 0);
  const mins = Math.max(
    0,
    Math.floor(
      (Math.min(lo.getTime(), end.getTime()) - Math.max(li.getTime(), start.getTime())) / 60000
    )
  );
  return { hours: Math.floor(mins / 60), minutes: mins % 60 };
};

const fmt = (d: { hours: number; minutes: number } | null) => {
  if (!d) return "0.00";
  return (d.hours + d.minutes / 60).toFixed(2);
};

const fmtHM = (d: { hours: number; minutes: number } | null) => {
  if (!d) return "0h 0m";
  return `${d.hours}h ${d.minutes}m`;
};

// ─── Timeline bar component ───────────────────────────────────────────────────
// Renders a horizontal 08:00–19:00 bar with colored segments.
function TimelineBar({
  login,
  logout,
}: {
  login?: string | Date;
  logout?: string | Date;
}) {
  if (!login || !logout) return null;

  const BAR_START = 8 * 60;   // 08:00 in minutes
  const BAR_END   = 19 * 60;  // 19:00 in minutes
  const RANGE     = BAR_END - BAR_START;

  const WORK_END  = 17 * 60;  // 17:00
  const OT_START  = 18 * 60;  // 18:00

  const li = new Date(login);
  const lo = new Date(logout);
  const liMins = li.getHours() * 60 + li.getMinutes();
  const loMins = lo.getHours() * 60 + lo.getMinutes();

  const pct = (m: number) =>
    `${(((Math.min(Math.max(m, BAR_START), BAR_END) - BAR_START) / RANGE) * 100).toFixed(2)}%`;

  // Segments: late (red), regular (green), undertime gap (gray), overtime (purple)
  const segments: { left: string; width: string; color: string; label: string }[] = [];

  const lateEnd   = Math.min(liMins, WORK_END);
  const regStart  = Math.max(liMins, 8 * 60);
  const regEnd    = Math.min(loMins, WORK_END);
  const otStart   = Math.max(loMins, OT_START);

  // Late bar (08:00 → login if login > 08:00)
  if (liMins > 8 * 60) {
    const l = pct(8 * 60);
    const w = `${(((Math.min(liMins, WORK_END) - 8 * 60) / RANGE) * 100).toFixed(2)}%`;
    segments.push({ left: l, width: w, color: "bg-red-400", label: "Late" });
  }

  // Regular work segment
  if (regEnd > regStart) {
    segments.push({ left: pct(regStart), width: `${(((regEnd - regStart) / RANGE) * 100).toFixed(2)}%`, color: "bg-green-400", label: "Regular" });
  }

  // Undertime: logout before 17:00 → dotted gap shown differently (we mark the gap)
  if (loMins < WORK_END) {
    const w = `${(((WORK_END - loMins) / RANGE) * 100).toFixed(2)}%`;
    segments.push({ left: pct(loMins), width: w, color: "bg-orange-300 opacity-50", label: "Undertime" });
  }

  // Overtime (after 18:00)
  if (loMins > OT_START) {
    const w = `${(((Math.min(loMins, BAR_END) - OT_START) / RANGE) * 100).toFixed(2)}%`;
    segments.push({ left: pct(OT_START), width: w, color: "bg-purple-400", label: "Overtime" });
  }

  const hours = ["8AM", "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM"];

  return (
    <div className="mt-3">
      {/* Bar */}
      <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
        {segments.map((s, i) => (
          <div
            key={i}
            className={`absolute top-0 h-full rounded-sm ${s.color}`}
            style={{ left: s.left, width: s.width }}
            title={s.label}
          />
        ))}
        {/* Login marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-gray-800 z-10"
          style={{ left: pct(liMins) }}
          title={`Login: ${getTime(login)}`}
        />
        {/* Logout marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-blue-800 z-10"
          style={{ left: pct(loMins) }}
          title={`Logout: ${getTime(logout)}`}
        />
      </div>

      {/* Tick labels */}
      <div className="flex justify-between mt-1">
        {hours.map((h) => (
          <span key={h} className="text-[9px] text-gray-400">{h}</span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        {[
          { color: "bg-green-400", label: "Regular" },
          { color: "bg-red-400",   label: "Late" },
          { color: "bg-orange-300 opacity-50", label: "Undertime" },
          { color: "bg-purple-400", label: "Overtime" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${l.color}`} />
            <span className="text-xs text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Attendance type helpers ──────────────────────────────────────────────────

/**
 * Derive the "day type" from all logs on a given day.
 * - If ANY log has Type === "Client Visit" → exempt (not counted at all)
 * - If ANY log has Type === "Site Visit"   → present (required, counts normally)
 * - Otherwise                              → regular (use login/logout)
 */
type DayType = "regular" | "client-visit" | "site-visit";

const getDayType = (logs: TaskLog[]): DayType => {
  const types = logs.map((l) => (l.Type ?? "").trim().toLowerCase());
  if (types.some((t) => t === "client visit"))  return "client-visit";
  if (types.some((t) => t === "site visit"))    return "site-visit";
  return "regular";
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TimesheetDetailPage() {
  const params    = useParams();
  const router    = useRouter();
  const userId    = params.id as string;

  const [taskLogs,    setTaskLogs]    = useState<TaskLog[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [userName,    setUserName]    = useState("");
  const [holidays,    setHolidays]    = useState<string[]>([]);
  const [cutoffs,     setCutoffs]     = useState<PayrollCutoff[]>([]);
  const [activeCutoff, setActiveCutoff] = useState<PayrollCutoff | null>(null);

  // ── Load holidays ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/holidays")
      .then((r) => r.json())
      .then((data: Holiday[]) => setHolidays(data.map((h) => h.date)))
      .catch(() => {});
  }, []);

  // ── Load cutoffs + auto-select current ────────────────────────────────────
  useEffect(() => {
    fetch("/api/payroll-cutoffs")
      .then((r) => r.json())
      .then((data: PayrollCutoff[]) => {
        setCutoffs(data);
        const today = formatDate(new Date());
        const cur = data.find((c) => today >= c.start_date && today <= c.end_date);
        if (cur) setActiveCutoff(cur);
      })
      .catch(() => {});
  }, []);

  // ── Load attendance ────────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      try {
        const res  = await fetch("/api/attendance");
        const data: TaskLog[] = await res.json();
        const mine = data.filter((l) => l.ReferenceID === userId);
        setTaskLogs(mine);
        if (mine.length > 0) setUserName(mine[0].Fullname || mine[0].ReferenceID || "");
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [userId]);

  // ── Group logs by date ─────────────────────────────────────────────────────
  const groupByDate = () => {
    const map = new Map<string, { login?: TaskLog; logout?: TaskLog; all: TaskLog[] }>();
    taskLogs.forEach((log) => {
      if (!log.date_created) return;
      const key = formatDate(new Date(log.date_created as string | Date));
      if (!map.has(key)) map.set(key, { all: [] });
      const day = map.get(key)!;
      day.all.push(log);
      const t = new Date(log.date_created as string | Date).getTime();
      if (!day.login  || t < new Date(day.login.date_created  as string | Date).getTime()) day.login  = log;
      if (!day.logout || t > new Date(day.logout.date_created as string | Date).getTime()) day.logout = log;
    });
    return map;
  };

  const dateLogs    = groupByDate();

  // Filter to cutoff range if available, otherwise show all
  const visibleDates = Array.from(dateLogs.keys())
    .filter((k) => {
      if (!activeCutoff) return true;
      return k >= activeCutoff.start_date && k <= activeCutoff.end_date;
    })
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // ── Cutoff-level summary stats ─────────────────────────────────────────────
  let totalLateCount   = 0;
  let totalLateMins    = 0;
  let totalOTMins      = 0;
  let totalUTMins      = 0;
  let totalRegMins     = 0;
  let presentDays      = 0;
  let absentDays       = 0;

  // Build all working days in the cutoff range
  const cutoffDays: string[] = [];
  if (activeCutoff) {
    let cur = new Date(activeCutoff.start_date);
    const end = new Date(activeCutoff.end_date);
    while (cur <= end) {
      const k = formatDate(cur);
      const isSunday  = cur.getDay() === 0;
      const isHoliday = holidays.includes(k);
      if (!isSunday && !isHoliday) cutoffDays.push(k);
      cur = new Date(cur.getTime() + 86400000);
    }
  }

  visibleDates.forEach((k) => {
    const isSunday  = new Date(k).getDay() === 0;
    const isHoliday = holidays.includes(k);
    if (isSunday || isHoliday) return;

    const day = dateLogs.get(k)!;
    if (day.login && day.logout) {
      presentDays++;
      const late = calcLate(day.login.date_created);
      const ot   = calcOvertime(day.logout.date_created);
      const ut   = calcUndertime(day.logout.date_created);
      const reg  = calcRegular(day.login.date_created!, day.logout.date_created!);

      if (late) { totalLateCount++; totalLateMins += toMins(late.hours, late.minutes); }
      if (ot)   totalOTMins += toMins(ot.hours, ot.minutes);
      if (ut)   totalUTMins += toMins(ut.hours, ut.minutes);
      totalRegMins += toMins(reg.hours, reg.minutes);
    }
  });

  if (activeCutoff) {
    const today = formatDate(new Date());
    absentDays = cutoffDays.filter(
      (k) => k <= today && !dateLogs.has(k)
    ).length;
  }

  const minsToHM = (m: number) => ({ hours: Math.floor(m / 60), minutes: m % 60 });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pb-6">
      {/* Back + title */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-black">
            {isLoading ? "Loading…" : `${userName}'s Timesheet`}
          </h1>
          {activeCutoff && (
            <p className="text-sm text-gray-500 mt-0.5">
              Cutoff: {activeCutoff.label} &nbsp;·&nbsp; {activeCutoff.start_date} → {activeCutoff.end_date}
            </p>
          )}
        </div>

        {/* Cutoff selector */}
        {cutoffs.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-500">Period:</span>
            <select
              className="border border-gray-300 rounded px-3 py-1.5 text-sm text-black"
              value={activeCutoff?.id ?? ""}
              onChange={(e) => {
                const c = cutoffs.find((x) => x.id === e.target.value) ?? null;
                setActiveCutoff(c);
              }}
            >
              <option value="">All dates</option>
              {cutoffs.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Loading…</p>
        </div>
      ) : (
        <>
          {/* ── Cutoff summary cards ───────────────────────────────────────── */}
          {activeCutoff && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 flex-shrink-0">
              {[
                {
                  icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
                  label: "Present",
                  value: `${presentDays}d`,
                  sub: `of ${cutoffDays.filter(k => k <= formatDate(new Date())).length} working days`,
                  color: "text-green-600",
                },
                {
                  icon: <XCircle className="w-5 h-5 text-red-400" />,
                  label: "Absent",
                  value: `${absentDays}d`,
                  sub: "working days missed",
                  color: "text-red-500",
                },
                {
                  icon: <AlertCircle className="w-5 h-5 text-red-500" />,
                  label: "Late",
                  value: `${totalLateCount}×`,
                  sub: fmtHM(minsToHM(totalLateMins)),
                  color: "text-red-600",
                },
                {
                  icon: <TrendingUp className="w-5 h-5 text-purple-500" />,
                  label: "Overtime",
                  value: fmtHM(minsToHM(totalOTMins)),
                  sub: "after 6:00 PM",
                  color: "text-purple-600",
                },
                {
                  icon: <TrendingDown className="w-5 h-5 text-orange-400" />,
                  label: "Undertime",
                  value: fmtHM(minsToHM(totalUTMins)),
                  sub: "before 5:00 PM",
                  color: "text-orange-500",
                },
                {
                  icon: <CalendarDays className="w-5 h-5 text-blue-500" />,
                  label: "Total Hours",
                  value: fmt(minsToHM(totalRegMins)),
                  sub: "credited hours",
                  color: "text-blue-600",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2">
                    {stat.icon}
                    <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
                  </div>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-gray-400">{stat.sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Per-day cards ─────────────────────────────────────────────── */}
          <div className="space-y-4">
            {visibleDates.length === 0 && (
              <p className="text-center text-gray-400 py-16">No attendance records for this period.</p>
            )}
            {visibleDates.map((dateKey) => {
              const day       = dateLogs.get(dateKey)!;
              const isSunday  = new Date(dateKey).getDay() === 0;
              const isHoliday = holidays.includes(dateKey);
              const late      = calcLate(day.login?.date_created);
              const ot        = calcOvertime(day.logout?.date_created);
              const ut        = calcUndertime(day.logout?.date_created);
              const reg       = day.login?.date_created && day.logout?.date_created
                ? calcRegular(day.login.date_created, day.logout.date_created)
                : null;

              const sortedLogs = [...day.all].sort((a, b) =>
                new Date(a.date_created as string | Date).getTime() -
                new Date(b.date_created as string | Date).getTime()
              );

              return (
                <Card key={dateKey} className={`border-gray-200 ${isSunday || isHoliday ? "bg-gray-50" : ""}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-black flex flex-wrap items-center gap-2">
                      {new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-PH", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                      })}
                      {isSunday  && <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Sunday</span>}
                      {isHoliday && <span className="text-xs font-normal text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Holiday</span>}
                      {late      && <span className="text-xs font-normal text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Late {fmtHM(late)}</span>}
                      {ot        && <span className="text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">OT {fmtHM(ot)}</span>}
                      {ut        && <span className="text-xs font-normal text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">UT {fmtHM(ut)}</span>}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Mini stat row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Regular", value: fmt(reg), color: reg ? "text-black" : "text-gray-400" },
                        { label: "Late",      value: fmt(late), color: late ? "text-red-600" : "text-gray-400" },
                        { label: "Overtime",  value: fmt(ot),   color: ot   ? "text-purple-600" : "text-gray-400" },
                        { label: "Undertime", value: fmt(ut),   color: ut   ? "text-orange-500" : "text-gray-400" },
                      ].map((s) => (
                        <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-0.5">{s.label}</div>
                          <div className={`text-lg font-semibold ${s.color}`}>{s.value}h</div>
                        </div>
                      ))}
                    </div>

                    {/* Login / logout row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-gray-100 rounded-lg p-3 flex items-center gap-3">
                        <Clock className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-gray-500">Login</div>
                          <div className="font-semibold text-black">{getTime(day.login?.date_created)}</div>
                        </div>
                      </div>
                      <div className="border border-gray-100 rounded-lg p-3 flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-gray-500">Logout</div>
                          <div className="font-semibold text-black">{getTime(day.logout?.date_created)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline bar */}
                    {day.login?.date_created && day.logout?.date_created && (
                      <TimelineBar login={day.login.date_created} logout={day.logout.date_created} />
                    )}

                    {/* Activity log */}
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-black list-none flex items-center gap-1 select-none">
                        <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                        All activities ({sortedLogs.length})
                      </summary>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              {["Time", "Type", "Status", "Remarks", "Location"].map((h) => (
                                <th key={h} className="border border-gray-200 px-3 py-2 text-left text-black font-medium">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sortedLogs.map((log, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="border border-gray-200 px-3 py-2 whitespace-nowrap">
                                  {getTime(log.date_created)}
                                </td>
                                <td className="border border-gray-200 px-3 py-2">{log.Type || "–"}</td>
                                <td className="border border-gray-200 px-3 py-2">{log.Status || "–"}</td>
                                <td className="border border-gray-200 px-3 py-2">{log.Remarks || "–"}</td>
                                <td className="border border-gray-200 px-3 py-2">
                                  {log.DisplayLocation || log.Location || "–"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
