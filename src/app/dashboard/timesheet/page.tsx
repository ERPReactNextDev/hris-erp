"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TaskLog, PayrollCutoff, Holiday } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Settings2,
  Plus,
  Trash2,
  X,
  Check,
  Download,
  Search,
} from "lucide-react";

// ─── Date helpers ─────────────────────────────────────────────────────────────
const formatDate = (date: Date) => date.toISOString().split("T")[0];

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d;
};

// ─── Time helpers ─────────────────────────────────────────────────────────────
const calculateRegularHours = (
  loginTimeStr: string | Date,
  logoutTimeStr: string | Date
) => {
  const loginDate = new Date(loginTimeStr);
  const logoutDate = new Date(logoutTimeStr);
  const startTime = new Date(loginDate);
  startTime.setHours(8, 0, 0, 0);
  const endTime = new Date(loginDate);
  endTime.setHours(17, 0, 0, 0);
  const actualStart = loginDate > startTime ? loginDate : startTime;
  const actualEnd = logoutDate < endTime ? logoutDate : endTime;
  const diffMins = Math.max(
    0,
    Math.floor((actualEnd.getTime() - actualStart.getTime()) / 60000)
  );
  return { hours: Math.floor(diffMins / 60), minutes: diffMins % 60 };
};

const formatDuration = (duration: { hours: number; minutes: number } | null) => {
  if (!duration) return "0.00";
  return (duration.hours + duration.minutes / 60).toFixed(2);
};

// ─── Types ────────────────────────────────────────────────────────────────────
type DayStatus = "present" | "absent" | "sunday" | "no-record" | "holiday";
type ViewMode = "weekly" | "custom" | "cutoff";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Cutoff Manager Modal ─────────────────────────────────────────────────────
interface CutoffManagerProps {
  cutoffs: PayrollCutoff[];
  activeCutoffId: string | null;
  onSelect: (cutoff: PayrollCutoff) => void;
  onClose: () => void;
  onRefresh: () => void;
}

function CutoffManager({
  cutoffs,
  activeCutoffId,
  onSelect,
  onClose,
  onRefresh,
}: CutoffManagerProps) {
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!label.trim() || !startDate || !endDate) {
      setError("All fields are required.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date must be before end date.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/payroll-cutoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          start_date: startDate,
          end_date: endDate,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Save failed.");
      }
      setLabel("");
      setStartDate("");
      setEndDate("");
      onRefresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/payroll-cutoffs?id=${id}`, { method: "DELETE" });
      onRefresh();
    } catch {
      /* silent */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">Payroll Cutoffs</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase mb-3">
            New cutoff period
          </p>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Label (e.g. June 1–15 2026)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs text-gray-500">Start Date</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs text-gray-500">End Date</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={saving}
              className="self-end"
            >
              <Plus className="w-4 h-4 mr-1" />
              {saving ? "Saving…" : "Save Cutoff"}
            </Button>
          </div>
        </div>

        <div className="px-6 py-4 max-h-72 overflow-y-auto">
          {cutoffs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No cutoffs saved yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cutoffs.map((c) => (
                <li
                  key={c.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                    activeCutoffId === c.id
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  onClick={() => onSelect(c)}
                >
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        activeCutoffId === c.id ? "text-white" : "text-black"
                      }`}
                    >
                      {c.label}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${
                        activeCutoffId === c.id ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      {c.start_date} → {c.end_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeCutoffId === c.id && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c.id);
                      }}
                      className={`hover:opacity-70 transition-opacity ${
                        activeCutoffId === c.id ? "text-gray-300" : "text-gray-400"
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TimesheetPage() {
  const router = useRouter();

  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState(formatDate(getStartOfWeek(new Date())));
  const [endDate, setEndDate] = useState(formatDate(addDays(getStartOfWeek(new Date()), 14)));

  const [cutoffs, setCutoffs] = useState<PayrollCutoff[]>([]);
  const [activeCutoff, setActiveCutoff] = useState<PayrollCutoff | null>(null);
  const [showCutoffManager, setShowCutoffManager] = useState(false);

  const [holidays, setHolidays] = useState<string[]>([]);

  // Search + pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Fetch holidays ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/holidays")
      .then((r) => r.json())
      .then((data: Holiday[]) => setHolidays(data.map((h) => h.date)))
      .catch(() => {});
  }, []);

  // ── Fetch cutoffs + auto-select the one covering today ─────────────────────
  const fetchCutoffs = async () => {
    try {
      const res = await fetch("/api/payroll-cutoffs");
      const data: PayrollCutoff[] = await res.json();
      setCutoffs(data);

      // Auto-select the cutoff whose range contains today (first match wins)
      const today = formatDate(new Date());
      const current = data.find(
        (c) => today >= c.start_date && today <= c.end_date
      );
      if (current) {
        setActiveCutoff(current);
        setViewMode("cutoff");
      }
    } catch {}
  };
  useEffect(() => { fetchCutoffs(); }, []);

  // ── Fetch attendance ────────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/attendance");
        setTaskLogs((await res.json()) || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, []);

  const handleSelectCutoff = (cutoff: PayrollCutoff) => {
    setActiveCutoff(cutoff);
    setViewMode("cutoff");
    setShowCutoffManager(false);
    setPage(1);
  };

  // ── Date list ───────────────────────────────────────────────────────────────
  const getDates = (): Date[] => {
    if (viewMode === "weekly") {
      const start = getStartOfWeek(new Date(currentDate));
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const rangeStart =
      viewMode === "cutoff" && activeCutoff ? activeCutoff.start_date : startDate;
    const rangeEnd =
      viewMode === "cutoff" && activeCutoff ? activeCutoff.end_date : endDate;
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    const dates: Date[] = [];
    let cur = new Date(start);
    while (cur <= end) {
      dates.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    return dates;
  };
  const dates = getDates();

  // ── Group logs ──────────────────────────────────────────────────────────────
  const groupLogsByUserAndDate = () => {
    const userMap = new Map<
      string,
      Map<string, { login?: string | Date; logout?: string | Date }>
    >();
    taskLogs.forEach((log) => {
      if (!log.date_created) return;
      const logDate = new Date(log.date_created as string | Date);
      const dateKey = formatDate(logDate);
      const userKey = log.ReferenceID;
      if (!userMap.has(userKey)) userMap.set(userKey, new Map());
      const dateLogs = userMap.get(userKey)!;
      if (!dateLogs.has(dateKey)) dateLogs.set(dateKey, {});
      const dayLogs = dateLogs.get(dateKey)!;
      if (!dayLogs.login || new Date(log.date_created as string | Date) < new Date(dayLogs.login))
        dayLogs.login = log.date_created;
      if (!dayLogs.logout || new Date(log.date_created as string | Date) > new Date(dayLogs.logout))
        dayLogs.logout = log.date_created;
    });
    return userMap;
  };
  const userLogs = groupLogsByUserAndDate();

  // ── Total per user ──────────────────────────────────────────────────────────
  const calculateUserTotal = (
    userLogMap: Map<string, { login?: string | Date; logout?: string | Date }>
  ) => {
    let totalMins = 0;
    dates.forEach((date) => {
      const dateKey = formatDate(date);
      const dayLogs = userLogMap?.get(dateKey);
      if (!date.getDay() || holidays.includes(dateKey)) return;
      if (dayLogs?.login && dayLogs?.logout) {
        const h = calculateRegularHours(dayLogs.login, dayLogs.logout);
        totalMins += h.hours * 60 + h.minutes;
      }
    });
    return { hours: Math.floor(totalMins / 60), minutes: totalMins % 60 };
  };

  // ── All unique users ────────────────────────────────────────────────────────
  const allUsers = Array.from(new Set(taskLogs.map((l) => l.ReferenceID))).map(
    (refId) => {
      const log = taskLogs.find((l) => l.ReferenceID === refId);
      return { id: refId, name: log?.Fullname || refId || "Unknown" };
    }
  );

  // ── Filtered + paginated ────────────────────────────────────────────────────
  const filteredUsers = allUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [search]);

  // ── Date range label ────────────────────────────────────────────────────────
  const getDateRangeText = () => {
    const opts: Intl.DateTimeFormatOptions = {
      month: "short", day: "numeric", year: "numeric",
    };
    if (viewMode === "weekly") {
      const s = getStartOfWeek(new Date(currentDate));
      return `${s.toLocaleDateString("en-PH", opts)} – ${addDays(s, 6).toLocaleDateString("en-PH", opts)}`;
    }
    if (viewMode === "cutoff" && activeCutoff) return activeCutoff.label;
    return `${new Date(startDate).toLocaleDateString("en-PH", opts)} – ${new Date(endDate).toLocaleDateString("en-PH", opts)}`;
  };

  // ── Excel export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "HRIS";
    const ws = wb.addWorksheet("Timesheet");

    // Header row
    const headerRow = ["Employee", ...dates.map((d) => formatDate(d)), "Total Hours"];
    ws.addRow(headerRow);
    const hRow = ws.getRow(1);
    hRow.font = { bold: true };
    hRow.fill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
    hRow.alignment = { horizontal: "center" };
    hRow.getCell(1).alignment = { horizontal: "left" };

    // Data rows — export ALL filtered users (not just current page)
    filteredUsers.forEach((user) => {
      const userLogMap = userLogs.get(user.id);
      const rowData: (string | number)[] = [user.name];

      dates.forEach((date) => {
        const dateKey = formatDate(date);
        const isSunday = date.getDay() === 0;
        const isHoliday = holidays.includes(dateKey);
        const dayLogs = userLogMap?.get(dateKey);

        if (isSunday) { rowData.push("Sunday"); return; }
        if (isHoliday) { rowData.push("Holiday"); return; }
        if (dayLogs?.login && dayLogs?.logout) {
          const h = calculateRegularHours(dayLogs.login, dayLogs.logout);
          rowData.push(parseFloat(formatDuration(h)));
        } else if (dayLogs) {
          rowData.push("Absent");
        } else {
          rowData.push("-");
        }
      });

      const total = userLogMap ? calculateUserTotal(userLogMap) : { hours: 0, minutes: 0 };
      rowData.push(parseFloat(formatDuration(total)));
      ws.addRow(rowData);
    });

    // Column widths
    ws.getColumn(1).width = 28;
    for (let i = 2; i <= dates.length + 1; i++) ws.getColumn(i).width = 13;
    ws.getColumn(dates.length + 2).width = 14;

    // Download
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet_${getDateRangeText().replace(/\s/g, "_")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {showCutoffManager && (
        <CutoffManager
          cutoffs={cutoffs}
          activeCutoffId={activeCutoff?.id ?? null}
          onSelect={handleSelectCutoff}
          onClose={() => setShowCutoffManager(false)}
          onRefresh={fetchCutoffs}
        />
      )}

      <Card className="border-gray-200 flex flex-col flex-1 min-h-0">
        {/* ── Card Header ─────────────────────────────────────────────────── */}
        <CardHeader className="flex flex-col gap-3 pb-2 flex-shrink-0">
          {/* Row 1: title + view toggles */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-xl font-semibold text-black">
              Timesheet
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => { setViewMode("weekly"); setPage(1); }}
              >
                Weekly
              </Button>
              <Button
                variant={viewMode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => { setViewMode("custom"); setPage(1); }}
              >
                Custom
              </Button>
              <Button
                variant={viewMode === "cutoff" ? "default" : "outline"}
                size="sm"
                onClick={() => setShowCutoffManager(true)}
              >
                <Settings2 className="w-4 h-4 mr-1" />
                Cutoffs
                {activeCutoff && viewMode === "cutoff" && (
                  <span className="ml-1.5 bg-white/20 text-xs rounded px-1">
                    {activeCutoff.label}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Row 2: navigation / range */}
          <div className="flex items-center gap-3">
            {viewMode === "weekly" ? (
              <>
                <Button
                  variant="outline"
                  className="p-2"
                  onClick={() => { setCurrentDate(addDays(currentDate, -7)); setPage(1); }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-base font-medium text-black min-w-[280px] text-center">
                  {getDateRangeText()}
                </span>
                <Button
                  variant="outline"
                  className="p-2"
                  onClick={() => { setCurrentDate(addDays(currentDate, 7)); setPage(1); }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            ) : viewMode === "custom" ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Start Date</span>
                  <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">End Date</span>
                  <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-base font-medium text-black">
                  {activeCutoff ? activeCutoff.label : "No cutoff selected"}
                </span>
                {activeCutoff && (
                  <span className="text-sm text-gray-500">
                    ({activeCutoff.start_date} → {activeCutoff.end_date})
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowCutoffManager(true)}>
                  Change
                </Button>
              </div>
            )}
          </div>

          {/* Row 3: search + export */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search employee…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardHeader>

        {/* ── Card Body ───────────────────────────────────────────────────── */}
        <CardContent className="flex-1 min-h-0 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">Loading timesheet…</p>
            </div>
          ) : viewMode === "cutoff" && !activeCutoff ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-gray-500">No cutoff selected.</p>
              <Button onClick={() => setShowCutoffManager(true)}>
                <Settings2 className="w-4 h-4 mr-2" />
                Manage Cutoffs
              </Button>
            </div>
          ) : (
            <div className="w-full min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 sticky top-0 z-10">
                    <th className="border border-gray-300 px-6 py-4 text-left text-black font-medium min-w-[200px] sticky left-0 bg-gray-50 z-20">
                      Employee
                    </th>
                    {dates.map((date, idx) => {
                      const isSunday = date.getDay() === 0;
                      const isHoliday = holidays.includes(formatDate(date));
                      return (
                        <th
                          key={idx}
                          className={`border border-gray-300 px-4 py-4 text-center text-black font-medium min-w-[120px] ${
                            isSunday || isHoliday ? "bg-gray-100" : ""
                          }`}
                        >
                          <div className="text-xs text-gray-500 mb-1">
                            {date.toLocaleDateString("en-PH", { weekday: "short" })}
                          </div>
                          <div className="text-lg">{date.getDate()}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {isSunday ? "Sunday" : isHoliday ? "Holiday" : ""}
                          </div>
                        </th>
                      );
                    })}
                    <th className="border border-gray-300 px-6 py-4 text-center text-black font-medium min-w-[120px] bg-gray-100 sticky right-0 z-20">
                      <div className="text-xs text-gray-500 mb-1">Total</div>
                      <div className="text-sm">Hours</div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pagedUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={dates.length + 2}
                        className="py-12 text-center text-gray-400"
                      >
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    pagedUsers.map((user) => {
                      const userLogMap = userLogs.get(user.id)!;
                      const totalHours = calculateUserTotal(userLogMap);
                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/dashboard/timesheet/${user.id}`)}
                        >
                          <td className="border border-gray-300 px-6 py-4 font-medium text-black sticky left-0 bg-white z-10">
                            {user.name}
                          </td>
                          {dates.map((date, dateIdx) => {
                            const dateKey = formatDate(date);
                            const isSunday = date.getDay() === 0;
                            const isHoliday = holidays.includes(dateKey);
                            const dayLogs = userLogMap?.get(dateKey);
                            const regularHours =
                              dayLogs?.login && dayLogs?.logout
                                ? calculateRegularHours(dayLogs.login, dayLogs.logout)
                                : null;
                            const dayStatus: DayStatus = isSunday
                              ? "sunday"
                              : isHoliday
                              ? "holiday"
                              : dayLogs?.login && dayLogs?.logout
                              ? "present"
                              : dayLogs
                              ? "absent"
                              : "no-record";
                            return (
                              <td
                                key={dateIdx}
                                className={`border border-gray-300 px-4 py-3 min-w-[120px] text-center ${
                                  isSunday || isHoliday ? "bg-gray-50" : ""
                                }`}
                              >
                                {dayStatus === "present" ? (
                                  <span className="text-sm font-medium text-gray-700">
                                    {formatDuration(regularHours)}
                                  </span>
                                ) : dayStatus === "absent" ? (
                                  <span className="text-xs text-red-500 font-medium">Absent</span>
                                ) : dayStatus === "sunday" ? (
                                  <span className="text-xs text-gray-400">Sunday</span>
                                ) : dayStatus === "holiday" ? (
                                  <span className="text-xs text-blue-400 font-medium">Holiday</span>
                                ) : (
                                  <span className="text-gray-300 text-xs">–</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="border border-gray-300 px-4 py-3 min-w-[120px] text-center bg-gray-50 font-semibold text-black sticky right-0 z-10">
                            {formatDuration(totalHours)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* ── Pagination Footer ────────────────────────────────────────────── */}
        {!isLoading && !(viewMode === "cutoff" && !activeCutoff) && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-gray-300 rounded px-2 py-1 text-sm text-black"
              >
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span>
                {filteredUsers.length === 0
                  ? "0 employees"
                  : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredUsers.length)} of ${filteredUsers.length}`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="p-2"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-3 h-3" />
                <ChevronLeft className="w-3 h-3 -ml-2" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="p-2"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 text-sm text-black font-medium">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="p-2"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="p-2"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-3 h-3" />
                <ChevronRight className="w-3 h-3 -ml-2" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
