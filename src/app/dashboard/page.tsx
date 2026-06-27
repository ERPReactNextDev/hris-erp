"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CalendarDays,
  Activity,
} from "lucide-react";

interface DashboardStats {
  totalUsers:        number;
  presentToday:      number;
  absentToday:       number;
  lateToday:         number;
  weekActivity:      number;
  holidaysThisMonth: number;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent: string; // tailwind bg color class for the icon bubble
  loading: boolean;
}

function StatCard({ icon, label, value, sub, accent, loading }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`${accent} p-3 rounded-xl flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium truncate">{label}</p>
        <p className="text-3xl font-bold text-black mt-0.5 leading-none">
          {loading ? (
            <span className="inline-block w-10 h-7 bg-gray-100 rounded animate-pulse" />
          ) : (
            value
          )}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats,   setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard-stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const attendanceRate =
    stats && stats.totalUsers > 0
      ? Math.round((stats.presentToday / stats.totalUsers) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* ── Greeting ────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-black">
          Good {getGreeting()},{" "}
          <span className="text-black">{user?.Firstname ?? "there"}</span> 👋
        </h2>
        <p className="text-gray-500 text-sm mt-1">{today}</p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-600" />}
          label="Total Employees"
          value={stats?.totalUsers ?? 0}
          sub="registered in the system"
          accent="bg-blue-50"
          loading={loading}
        />
        <StatCard
          icon={<UserCheck className="w-5 h-5 text-green-600" />}
          label="Present Today"
          value={stats?.presentToday ?? 0}
          sub={`${attendanceRate}% attendance rate`}
          accent="bg-green-50"
          loading={loading}
        />
        <StatCard
          icon={<UserX className="w-5 h-5 text-red-500" />}
          label="Absent Today"
          value={stats?.absentToday ?? 0}
          sub="no check-in recorded"
          accent="bg-red-50"
          loading={loading}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-orange-500" />}
          label="Late Today"
          value={stats?.lateToday ?? 0}
          sub="first log after 8:00 AM"
          accent="bg-orange-50"
          loading={loading}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-purple-600" />}
          label="This Week's Logs"
          value={stats?.weekActivity ?? 0}
          sub="total check-ins since Monday"
          accent="bg-purple-50"
          loading={loading}
        />
        <StatCard
          icon={<CalendarDays className="w-5 h-5 text-indigo-600" />}
          label="Holidays This Month"
          value={stats?.holidaysThisMonth ?? 0}
          sub="up to today"
          accent="bg-indigo-50"
          loading={loading}
        />
      </div>

      {/* ── Attendance progress bar ──────────────────────────────────────────── */}
      {!loading && stats && stats.totalUsers > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Today's Attendance
            </span>
            <span className="text-sm font-bold text-black">
              {stats.presentToday} / {stats.totalUsers}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{stats.presentToday} present</span>
            <span>{stats.absentToday} absent</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
