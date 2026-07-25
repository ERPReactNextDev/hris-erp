"use client";

import { useCallback, useEffect, useState } from "react";
import { TaskLog } from "@/types";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download, Search, ChevronLeft, ChevronRight,
  Trash2, X, ZoomIn,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];

interface AttendanceResponse {
  data: TaskLog[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Photo lightbox ───────────────────────────────────────────────────────────
function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        onClick={onClose}
      >
        <X className="w-7 h-7" />
      </button>
      <img
        src={url}
        alt="Attendance photo"
        className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Confirm delete dialog ────────────────────────────────────────────────────
function ConfirmDialog({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-semibold text-black mb-2">Delete record?</h3>
        <p className="text-sm text-gray-500 mb-6">
          This will permanently remove the attendance entry. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const [logs,         setLogs]         = useState<TaskLog[]>([]);
  const [total,        setTotal]        = useState(0);
  const [isLoading,    setIsLoading]    = useState(true);

  const [typeOptions,   setTypeOptions]   = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate,    setStartDate]    = useState("");
  const [endDate,      setEndDate]      = useState("");
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(25);

  // Photo lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<TaskLog | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // ── Load filter options once ────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/attendance", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { setTypeOptions(d.types ?? []); setStatusOptions(d.statuses ?? []); })
      .catch(() => {});
  }, []);

  // ── Fetch records ───────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), pageSize: String(pageSize),
        ...(search       && { search }),
        ...(typeFilter   && { type: typeFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(startDate    && { startDate }),
        ...(endDate      && { endDate }),
      });
      const res: AttendanceResponse = await fetch(`/api/attendance?${params}`).then((r) => r.json());
      setLogs(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      console.error("Error fetching attendance:", e);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, typeFilter, statusFilter, startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter, startDate, endDate, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/attendance?id=${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      fetchLogs();
    } catch {
      /* silent — keep dialog open so user can retry */
    } finally {
      setDeleting(false);
    }
  };

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    const params = new URLSearchParams({
      page: "1", pageSize: "10000",
      ...(search       && { search }),
      ...(typeFilter   && { type: typeFilter }),
      ...(statusFilter && { status: statusFilter }),
      ...(startDate    && { startDate }),
      ...(endDate      && { endDate }),
    });
    const res: AttendanceResponse = await fetch(`/api/attendance?${params}`).then((r) => r.json());
    const all = res.data ?? [];
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Attendance");
    ws.columns = [
      { header: "Date & Time",        key: "date",      width: 22 },
      { header: "Fullname",           key: "fullname",  width: 26 },
      { header: "Email",              key: "email",     width: 30 },
      { header: "Type",               key: "type",      width: 16 },
      { header: "Status",             key: "status",    width: 16 },
      { header: "Remarks",            key: "remarks",   width: 30 },
      { header: "Location",           key: "location",  width: 40 },
      { header: "Site Visit Account", key: "siteVisit", width: 30 },
    ];
    all.forEach((log) => {
      ws.addRow({
        date:      log.date_created ? new Date(log.date_created as string).toLocaleString("en-PH") : "-",
        fullname:  log.Fullname  || "-",
        email:     log.Email     || "-",
        type:      log.Type      || "-",
        status:    log.Status    || "-",
        remarks:   log.Remarks   || "-",
        location:  log.DisplayLocation || log.Location || "-",
        siteVisit: log.SiteVisitAccount || "-",
      });
    });
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `attendance_${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  };

  const SelectFilter = ({
    value, onChange, options, placeholder,
  }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-black bg-white min-w-[130px] focus:outline-none focus:ring-2 focus:ring-gray-300"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const statusColor = (s?: string) => {
    const v = (s ?? "").toLowerCase();
    if (v === "approved"    || v === "logged in")    return "bg-green-100 text-green-800";
    if (v === "pending"     || v === "for approval") return "bg-yellow-100 text-yellow-800";
    if (v === "rejected"    || v === "logged out")   return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-700";
  };

  const hasFilters = search || typeFilter || statusFilter || startDate || endDate;

  return (
    <>
      {lightboxUrl && <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      {deleteTarget && (
        <ConfirmDialog
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      <Card className="border-gray-200 flex flex-col flex-1 min-h-0">
        <CardHeader className="flex flex-col gap-3 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-black">
              Attendance Records
              {!isLoading && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({total.toLocaleString()})
                </span>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
              <Download className="w-4 h-4 mr-2" />Export Excel
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search name, email, remarks…" value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <SelectFilter value={typeFilter}   onChange={setTypeFilter}   options={typeOptions}   placeholder="All Types" />
            <SelectFilter value={statusFilter} onChange={setStatusFilter} options={statusOptions} placeholder="All Statuses" />
            <div className="flex items-center gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
              <span className="text-gray-400 text-sm">–</span>
              <Input type="date" value={endDate}   onChange={(e) => setEndDate(e.target.value)}   className="w-36" />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-black"
                onClick={() => { setSearch(""); setTypeFilter(""); setStatusFilter(""); setStartDate(""); setEndDate(""); }}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 overflow-auto p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-400">No records found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50 sticky top-0 z-10">
                  <TableHead className="text-gray-500 font-medium px-4 py-3 whitespace-nowrap">Date & Time</TableHead>
                  <TableHead className="text-gray-500 font-medium px-4 py-3">Employee</TableHead>
                  <TableHead className="text-gray-500 font-medium px-4 py-3">Type</TableHead>
                  <TableHead className="text-gray-500 font-medium px-4 py-3">Status</TableHead>
                  <TableHead className="text-gray-500 font-medium px-4 py-3">Remarks</TableHead>
                  <TableHead className="text-gray-500 font-medium px-4 py-3">Location</TableHead>
                  <TableHead className="text-gray-500 font-medium px-4 py-3">Photo</TableHead>
                  <TableHead className="text-gray-500 font-medium px-4 py-3 w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {log.date_created
                        ? new Date(log.date_created as string).toLocaleString("en-PH", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit", hour12: true,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <p className="text-sm font-medium text-black leading-tight uppercase">{log.Fullname || "—"}</p>
                      <p className="text-xs text-gray-400">{log.Email || ""}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {log.Type ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                          {log.Type}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {log.Status ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(log.Status)}`}>
                          {log.Status}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 max-w-[180px] truncate">
                      {log.Remarks || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate">
                      {log.DisplayLocation || log.Location || "—"}
                    </TableCell>

                    {/* Photo cell — click to open lightbox */}
                    <TableCell className="px-4 py-3">
                      {log.PhotoURL ? (
                        <button
                          onClick={() => setLightboxUrl(log.PhotoURL!)}
                          className="relative group w-12 h-12 flex-shrink-0"
                          title="View full photo"
                        >
                          <img
                            src={log.PhotoURL}
                            alt="Photo"
                            className="w-12 h-12 object-cover rounded-lg border border-gray-200 group-hover:opacity-80 transition-opacity"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        </button>
                      ) : "—"}
                    </TableCell>

                    {/* Delete button */}
                    <TableCell className="px-4 py-3">
                      <button
                        onClick={() => setDeleteTarget(log)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Rows:</span>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-gray-200 rounded px-2 py-1 text-sm text-black">
                {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="p-2" onClick={() => setPage(1)}             disabled={page === 1}><ChevronLeft className="w-3 h-3" /><ChevronLeft className="w-3 h-3 -ml-2" /></Button>
              <Button variant="outline" size="sm" className="p-2" onClick={() => setPage((p) => p - 1)} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="px-3 text-sm font-medium text-black">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" className="p-2" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" className="p-2" onClick={() => setPage(totalPages)}   disabled={page === totalPages}><ChevronRight className="w-3 h-3" /><ChevronRight className="w-3 h-3 -ml-2" /></Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
