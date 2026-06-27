"use client";

import { useCallback, useEffect, useState } from "react";
import { User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  ShieldCheck,
  Calendar,
  BadgeCheck,
  Circle,
  Settings2,
  EyeOff,
  Eye,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmployeeResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
}

interface Filters {
  departments: string[];
  statuses: string[];
  roles: string[];
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, string> = {
    active:      "bg-green-100 text-green-700",
    inactive:    "bg-gray-100 text-gray-500",
    terminated:  "bg-red-100 text-red-600",
    resigned:    "bg-orange-100 text-orange-600",
    onleave:     "bg-yellow-100 text-yellow-700",
    "on leave":  "bg-yellow-100 text-yellow-700",
    probationary:"bg-blue-100 text-blue-600",
  };
  const cls = map[s] ?? "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <Circle className="w-1.5 h-1.5 fill-current" />
      {status ?? "—"}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = "md" }: { user: User; size?: "sm" | "md" | "lg" }) {
  const initials = [user.Firstname?.[0], user.Lastname?.[0]].filter(Boolean).join("").toUpperCase() || "?";
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-sm";
  if (user.profilePicture) {
    return <img src={user.profilePicture} alt={initials} className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-600 flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────
function EmployeeDrawer({
  employee,
  onClose,
  onVisibilityChange,
}: {
  employee: User;
  onClose: () => void;
  onVisibilityChange: (refId: string, hidden: boolean) => void;
}) {
  const fullName = [employee.Firstname, employee.Lastname].filter(Boolean).join(" ") || employee.ReferenceID;
  const [tab, setTab] = useState<"info" | "settings">("info");
  const [hidden, setHidden] = useState(employee._hidden ?? false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const handleToggleHidden = async (next: boolean) => {
    setSaving(true);
    setSaveMsg(null);
    try {
      if (next) {
        await fetch("/api/employees/visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference_id: employee.ReferenceID }),
        });
      } else {
        await fetch(`/api/employees/visibility?reference_id=${employee.ReferenceID}`, {
          method: "DELETE",
        });
      }
      setHidden(next);
      onVisibilityChange(employee.ReferenceID, next);
      setSaveMsg(next ? "Employee hidden from lists and counts." : "Employee is now visible.");
    } catch {
      setSaveMsg("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value?: string | null, icon?: React.ReactNode) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 text-gray-400 flex-shrink-0">{icon}</div>}
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm text-black font-medium">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <Avatar user={employee} size="lg" />
            <div>
              <h2 className="text-lg font-bold text-black leading-tight">{fullName}</h2>
              <p className="text-sm text-gray-500">{employee.Position || employee.Role || "—"}</p>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={employee.Status} />
                {hidden && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-white">
                    <EyeOff className="w-3 h-3" /> Hidden
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 px-6">
          {(["info", "settings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t
                  ? "border-black text-black"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "info" ? "Info" : (
                <span className="flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" /> Settings
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "info" ? (
            <div className="space-y-6">
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Identity</p>
                <div className="space-y-3">
                  {field("Reference ID",    employee.ReferenceID,   <BadgeCheck  className="w-4 h-4" />)}
                  {field("Username",        employee.userName,      <UserIcon    className="w-4 h-4" />)}
                  {field("Email",           employee.Email,         <Mail        className="w-4 h-4" />)}
                  {field("Other Email",     employee.OtherEmail,    <Mail        className="w-4 h-4" />)}
                  {field("Secondary Email", employee.SecondaryEmail,<Mail        className="w-4 h-4" />)}
                </div>
              </section>
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Contact</p>
                <div className="space-y-3">
                  {field("Contact Number", employee.ContactNumber, <Phone  className="w-4 h-4" />)}
                  {field("Another Number", employee.AnotherNumber, <Phone  className="w-4 h-4" />)}
                  {field("Address",        employee.Address,       <MapPin className="w-4 h-4" />)}
                  {field("Location",       employee.Location,      <MapPin className="w-4 h-4" />)}
                </div>
              </section>
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Employment</p>
                <div className="space-y-3">
                  {field("Company",    employee.Company,                          <Building2   className="w-4 h-4" />)}
                  {field("Department", employee.Department,                       <Building2   className="w-4 h-4" />)}
                  {field("Position",   employee.Position,                         <Briefcase   className="w-4 h-4" />)}
                  {field("Role",       employee.Role,                             <ShieldCheck className="w-4 h-4" />)}
                  {field("Manager",    employee.ManagerName || employee.Manager,  <UserIcon    className="w-4 h-4" />)}
                  {field("TSM",        employee.TSMName     || employee.TSM,      <UserIcon    className="w-4 h-4" />)}
                  {field("Status",     employee.Status)}
                  {field("Connection", employee.Connection)}
                  {field("Type of Sales", employee.type_of_sales)}
                </div>
              </section>
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Personal</p>
                <div className="space-y-3">
                  {field("Birthday", employee.Birthday, <Calendar className="w-4 h-4" />)}
                  {field("Gender",   employee.Gender)}
                </div>
              </section>
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">System</p>
                <div className="space-y-3">
                  {field("Registration Method", employee.registrationMethod)}
                  {field("Device ID",           employee.DeviceId)}
                  {field("Fingerprint Key",     employee.FingerprintKey)}
                  {field("2FA Enabled",  employee.twoFactorEnabled         ? "Yes" : "No")}
                  {field("Face Verify",  employee.faceVerificationEnabled   ? "Yes" : "No")}
                  {field("Created At",   employee.createdAt  ? new Date(employee.createdAt).toLocaleDateString("en-PH",  { year: "numeric", month: "long", day: "numeric" }) : undefined)}
                  {field("Last Login",   employee.LastLoginAt ? new Date(employee.LastLoginAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : undefined)}
                </div>
              </section>
            </div>
          ) : (
            /* ── Settings tab ───────────────────────────────────────────── */
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-black mb-1">Visibility</p>
                <p className="text-xs text-gray-500 mb-4">
                  Hidden employees are excluded from the Employee List, dashboard counts, and attendance stats. They are not deleted.
                </p>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={hidden}
                      disabled={saving}
                      onChange={(e) => handleToggleHidden(e.target.checked)}
                    />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-gray-900 transition-colors" />
                    <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">
                      {hidden ? "Hidden" : "Visible"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {hidden
                        ? "This employee is hidden from all lists and counts."
                        : "This employee appears in all lists and counts."}
                    </p>
                  </div>
                </label>

                {saveMsg && (
                  <p className={`mt-3 text-xs ${saveMsg.includes("Failed") ? "text-red-500" : "text-green-600"}`}>
                    {saveMsg}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [employees,  setEmployees]  = useState<User[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [filters,    setFilters]    = useState<Filters>({ departments: [], statuses: [], roles: [] });
  const [selected,   setSelected]   = useState<User | null>(null);

  // Filter / pagination state
  const [search,      setSearch]      = useState("");
  const [department,  setDepartment]  = useState("");
  const [status,      setStatus]      = useState("");
  const [role,        setRole]        = useState("");
  const [showHidden,  setShowHidden]  = useState(false);
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(25);

  // ── Load filter options once ──────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/employees/filters")
      .then((r) => r.json())
      .then(setFilters)
      .catch(() => {});
  }, []);

  // ── Fetch employees ───────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:       String(page),
        pageSize:   String(pageSize),
        ...(search      && { search }),
        ...(department  && { department }),
        ...(status      && { status }),
        ...(role        && { role }),
        ...(showHidden  && { showHidden: "1" }),
      });
      const res: EmployeeResponse = await fetch(`/api/employees?${params}`).then((r) => r.json());
      setEmployees(res.data);
      setTotal(res.total);
    } catch {
      setEmployees([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, department, status, role, showHidden]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, department, status, role, pageSize, showHidden]);

  // When visibility changes from the drawer, refresh the list
  const handleVisibilityChange = useCallback((_refId: string, _hidden: boolean) => {
    fetchEmployees();
  }, [fetchEmployees]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const Select = ({
    value, onChange, options, placeholder,
  }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-black bg-white min-w-[140px] focus:outline-none focus:ring-2 focus:ring-gray-300"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <>
      {selected && (
        <EmployeeDrawer
          employee={selected}
          onClose={() => setSelected(null)}
          onVisibilityChange={handleVisibilityChange}
        />
      )}

      <Card className="border-gray-200 flex flex-col flex-1 min-h-0">
        <CardHeader className="flex flex-col gap-3 pb-2 flex-shrink-0">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-black">
              Employee List
              {!loading && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({total.toLocaleString()})
                </span>
              )}
            </CardTitle>
            {/* Show hidden toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showHidden}
                  onChange={(e) => setShowHidden(e.target.checked)}
                />
                <div className="w-8 h-5 bg-gray-200 rounded-full peer-checked:bg-gray-800 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-3" />
              </div>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {showHidden ? "Showing hidden" : "Show hidden"}
              </span>
            </label>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search name, email, ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={department} onChange={setDepartment} options={filters.departments} placeholder="All Departments" />
            <Select value={status}     onChange={setStatus}     options={filters.statuses}    placeholder="All Statuses" />
            <Select value={role}       onChange={setRole}       options={filters.roles}       placeholder="All Roles" />

            {/* Clear */}
            {(search || department || status || role) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(""); setDepartment(""); setStatus(""); setRole(""); }}
                className="text-gray-400 hover:text-black"
              >
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Table */}
        <CardContent className="flex-1 min-h-0 overflow-auto p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              Loading employees…
            </div>
          ) : employees.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              No employees found.
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-12">#</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 min-w-[220px]">Employee</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 min-w-[160px]">Department</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 min-w-[140px]">Position</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 min-w-[120px]">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 min-w-[140px]">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 min-w-[100px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => {
                  const fullName = [emp.Firstname, emp.Lastname].filter(Boolean).join(" ") || emp.ReferenceID;
                  const rowNum   = (page - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={emp.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${emp._hidden ? "opacity-40" : ""}`}
                      onClick={() => setSelected(emp)}
                    >
                      <td className="px-4 py-3 text-gray-400">{rowNum}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={emp} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-black truncate">{fullName}</p>
                            <p className="text-xs text-gray-400 truncate">{emp.Email || emp.ReferenceID}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{emp.Department || "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{emp.Position   || "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{emp.Role       || "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{emp.ContactNumber || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={emp.Status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>

        {/* Pagination footer */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-gray-200 rounded px-2 py-1 text-sm text-black"
              >
                {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="p-2" onClick={() => setPage(1)}           disabled={page === 1}>
                <ChevronLeft className="w-3 h-3" /><ChevronLeft className="w-3 h-3 -ml-2" />
              </Button>
              <Button variant="outline" size="sm" className="p-2" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 text-sm font-medium text-black">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" className="p-2" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="p-2" onClick={() => setPage(totalPages)}   disabled={page === totalPages}>
                <ChevronRight className="w-3 h-3" /><ChevronRight className="w-3 h-3 -ml-2" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
