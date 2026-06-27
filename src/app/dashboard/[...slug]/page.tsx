"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hammer } from "lucide-react";

// Map of known paths → human-readable module names
const MODULE_LABELS: Record<string, string> = {
  // Workforce
  "departments":                  "Departments",
  "positions":                    "Positions",
  "onboarding":                   "Onboarding — New Hires",
  "onboarding/checklists":        "Onboarding — Checklists",
  "onboarding/documents":         "Onboarding — Documents",

  // Leave
  "leave":                        "Leave Requests",
  "leave/types":                  "Leave Types",
  "leave/balance":                "Leave Balance",

  // Payroll
  "payroll":                      "Payroll Runs",
  "payroll/payslips":             "Payslips",
  "payroll/deductions":           "Deductions",

  // Benefits
  "benefits":                     "Benefit Plans",
  "benefits/enrollments":         "Benefit Enrollments",
  "benefits/government":          "Government Contributions",

  // Performance
  "performance":                  "Performance Evaluations",
  "performance/kpis":             "KPIs",
  "performance/goals":            "Goals",

  // Training
  "training":                     "Training Programs",
  "training/schedules":           "Training Schedules",
  "training/certifications":      "Certifications",

  // Requests
  "requests":                     "All Requests",
  "requests/overtime":            "Overtime Requests",
  "requests/ob":                  "Official Business Requests",
  "requests/documents":           "Document Requests",

  // Recruitment
  "recruitment":                  "Job Postings",
  "recruitment/applicants":       "Applicants",
  "recruitment/interviews":       "Interviews",

  // Other
  "announcements":                "Announcements",
  "reports":                      "Reports",
  "admin/roles":                  "Roles & Permissions",
  "admin/audit":                  "Audit Logs",
  "system":                       "System",
};

export default function ComingSoonPage() {
  const params = useParams();
  const router = useRouter();

  const slug   = Array.isArray(params.slug) ? params.slug : [params.slug ?? ""];
  const path   = slug.join("/");
  const label  = MODULE_LABELS[path] ?? slug.map((s) => s.replace(/-/g, " ")).join(" › ");
  const module = label.split("—")[0].split("›")[0].trim();

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 text-center px-6 py-20 select-none">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
        <Hammer className="w-9 h-9 text-gray-400" />
      </div>

      {/* Text */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{label}</h1>
      <p className="text-gray-500 text-sm max-w-xs leading-relaxed mb-8">
        This module is currently under development and will be available in a future release.
      </p>

      {/* Badge */}
      <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Coming Soon
      </span>

      {/* Back button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.back()}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Go back
      </Button>
    </div>
  );
}
