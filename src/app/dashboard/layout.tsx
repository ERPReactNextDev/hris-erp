"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  DollarSign,
  CalendarOff,
  ClipboardList,
  BarChart3,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  Building2,
  UserPlus,
  Briefcase,
  HeartPulse,
  GraduationCap,
  MessageSquare,
  FileText,
  Wrench,
} from "lucide-react";

// ─── Section divider ─────────────────────────────────────────────────────────
type NavItem =
  | { kind: "link";    label: string; href: string; icon: React.ElementType }
  | { kind: "group";   label: string; icon: React.ElementType; children: { label: string; href: string }[] }
  | { kind: "divider"; label: string };

const NAV: NavItem[] = [
  {
    kind: "link",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },

  // ── Workforce ──────────────────────────────────────────────────────────────
  { kind: "divider", label: "Workforce" },
  {
    kind: "group",
    label: "Employees",
    icon: Users,
    children: [
      { label: "Employee List",       href: "/dashboard/employees" },
      { label: "Departments",         href: "/dashboard/departments" },
      { label: "Positions",           href: "/dashboard/positions" },
    ],
  },
  {
    kind: "group",
    label: "Onboarding",
    icon: UserPlus,
    children: [
      { label: "New Hires",           href: "/dashboard/onboarding" },
      { label: "Checklists",          href: "/dashboard/onboarding/checklists" },
      { label: "Documents",           href: "/dashboard/onboarding/documents" },
    ],
  },

  // ── Time & Attendance ──────────────────────────────────────────────────────
  { kind: "divider", label: "Time & Attendance" },
  {
    kind: "group",
    label: "Attendance",
    icon: CalendarCheck,
    children: [
      { label: "Daily Logs",          href: "/dashboard/attendance" },
      { label: "Timesheet",           href: "/dashboard/timesheet" },
    ],
  },
  {
    kind: "group",
    label: "Leave",
    icon: CalendarOff,
    children: [
      { label: "Leave Requests",      href: "/dashboard/leave" },
      { label: "Leave Types",         href: "/dashboard/leave/types" },
      { label: "Leave Balance",       href: "/dashboard/leave/balance" },
    ],
  },

  // ── Payroll & Benefits ─────────────────────────────────────────────────────
  { kind: "divider", label: "Payroll & Benefits" },
  {
    kind: "group",
    label: "Payroll",
    icon: DollarSign,
    children: [
      { label: "Payroll Runs",        href: "/dashboard/payroll" },
      { label: "Cutoff Periods",      href: "/dashboard/timesheet" },
      { label: "Payslips",            href: "/dashboard/payroll/payslips" },
      { label: "Deductions",          href: "/dashboard/payroll/deductions" },
    ],
  },
  {
    kind: "group",
    label: "Benefits",
    icon: HeartPulse,
    children: [
      { label: "Benefit Plans",       href: "/dashboard/benefits" },
      { label: "Enrollments",         href: "/dashboard/benefits/enrollments" },
      { label: "Gov't Contributions", href: "/dashboard/benefits/government" },
    ],
  },

  // ── Performance & Development ──────────────────────────────────────────────
  { kind: "divider", label: "Development" },
  {
    kind: "group",
    label: "Performance",
    icon: Briefcase,
    children: [
      { label: "Evaluations",         href: "/dashboard/performance" },
      { label: "KPIs",                href: "/dashboard/performance/kpis" },
      { label: "Goals",               href: "/dashboard/performance/goals" },
    ],
  },
  {
    kind: "group",
    label: "Training",
    icon: GraduationCap,
    children: [
      { label: "Programs",            href: "/dashboard/training" },
      { label: "Schedules",           href: "/dashboard/training/schedules" },
      { label: "Certifications",      href: "/dashboard/training/certifications" },
    ],
  },

  // ── HR Operations ─────────────────────────────────────────────────────────
  { kind: "divider", label: "HR Operations" },
  {
    kind: "group",
    label: "Requests",
    icon: ClipboardList,
    children: [
      { label: "All Requests",        href: "/dashboard/requests" },
      { label: "Overtime",            href: "/dashboard/requests/overtime" },
      { label: "Official Business",   href: "/dashboard/requests/ob" },
      { label: "Document Requests",   href: "/dashboard/requests/documents" },
    ],
  },
  {
    kind: "group",
    label: "Recruitment",
    icon: FileText,
    children: [
      { label: "Job Postings",        href: "/dashboard/recruitment" },
      { label: "Applicants",          href: "/dashboard/recruitment/applicants" },
      { label: "Interviews",          href: "/dashboard/recruitment/interviews" },
    ],
  },
  {
    kind: "link",
    label: "Announcements",
    href: "/dashboard/announcements",
    icon: MessageSquare,
  },

  // ── Insights & Admin ──────────────────────────────────────────────────────
  { kind: "divider", label: "Insights & Admin" },
  {
    kind: "link",
    label: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    kind: "group",
    label: "Administration",
    icon: Building2,
    children: [
      { label: "Settings",            href: "/dashboard/settings" },
      { label: "Holidays",            href: "/dashboard/settings" },
      { label: "Roles & Permissions", href: "/dashboard/admin/roles" },
      { label: "Audit Logs",          href: "/dashboard/admin/audit" },
    ],
  },
  {
    kind: "link",
    label: "System",
    href: "/dashboard/system",
    icon: Wrench,
  },
];

const BOTTOM_NAV: NavItem[] = [
  { kind: "link", label: "Profile", href: "/dashboard/profile", icon: User },
];

// ─── Group item (collapsible) ─────────────────────────────────────────────────
function NavGroup({
  item,
  pathname,
  defaultOpen,
}: {
  item: Extract<NavItem, { kind: "group" }>;
  pathname: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = item.icon;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-sm">{item.label}</span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-white/50" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-white/50" />
        )}
      </button>

      {open && (
        <div className="ml-7 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
          {item.children.map((child) => {
            const isActive = pathname === child.href;
            return (
              <Link
                key={child.href + child.label}
                href={child.href}
                className={`block px-2 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-white/20 text-white font-medium"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // A group is "default open" if the current path matches one of its children
  const groupDefaultOpen = (item: Extract<NavItem, { kind: "group" }>) =>
    item.children.some((c) => pathname.startsWith(c.href));

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen h-screen overflow-hidden">
        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className="w-60 bg-gray-950 text-white flex flex-col flex-shrink-0 overflow-hidden">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-gray-950 text-xs font-black">HR</span>
              </div>
              <div>
                <p className="text-sm font-bold leading-none">HRIS</p>
                <p className="text-[10px] text-white/40 mt-0.5">Management System</p>
              </div>
            </div>
          </div>

          {/* Main nav — scrollable */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
            {NAV.map((item, idx) => {
              // ── Section divider ──────────────────────────────────────────
              if (item.kind === "divider") {
                return (
                  <div key={`divider-${idx}`} className="pt-4 pb-1 px-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                      {item.label}
                    </p>
                  </div>
                );
              }

              // ── Single link ──────────────────────────────────────────────
              if (item.kind === "link") {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                      isActive
                        ? "bg-white/20 text-white font-medium"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              }

              // ── Collapsible group ────────────────────────────────────────
              return (
                <NavGroup
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  defaultOpen={groupDefaultOpen(item)}
                />
              );
            })}
          </nav>

          {/* Bottom: profile + logout */}
          <div className="px-3 py-3 border-t border-white/10 flex-shrink-0 space-y-0.5">
            {BOTTOM_NAV.map((item) => {
              if (item.kind !== "link") return null;
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isActive
                      ? "bg-white/20 text-white font-medium"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}

            {/* User chip */}
            <div className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg bg-white/5">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold uppercase">
                  {user?.Firstname?.[0] ?? "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate leading-none">
                  {user?.Firstname} {user?.Lastname}
                </p>
                <p className="text-[10px] text-white/40 truncate mt-0.5">
                  {user?.Role ?? "User"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="text-white/40 hover:text-white transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50">
          <div className="flex-1 min-h-0 flex flex-col p-6 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
