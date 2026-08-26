"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

// ─── Permission rule shape ────────────────────────────────────────────────────
export interface PermissionRule {
  /** Allowed top-level nav group/link labels. Null = show everything. */
  allowedModules: string[] | null;
  /** Allowed child link labels per module. Null = show all children. */
  allowedSubModules: Record<string, string[]> | null;
  /**
   * Departments to pre-filter attendance/timesheet views.
   * Null = no filter (see all).
   */
  attendanceDeptFilter: string[] | null;
  /**
   * Companies to EXCLUDE from attendance/timesheet views.
   * Null = no exclusion.
   */
  excludedCompanies: string[] | null;
}

// ─── Rules table ─────────────────────────────────────────────────────────────
// Key format: "Department::Role"  (case-insensitive match at runtime)
// Use "*" as a wildcard segment.  More-specific keys win.
const RULES: Record<string, PermissionRule> = {
  // Accounting dept + Super Admin role → restricted view
  "accounting::super admin": {
    allowedModules:       ["Attendance", "Administration"],
    allowedSubModules:    {
      "Attendance":     ["Daily Logs"],
      "Administration": ["Settings"],
    },
    attendanceDeptFilter: ["Sales", "Engineering"],
    excludedCompanies:    ["Buildchem Solutions"],
  },

  // Default — full access (fallback for any unmatched combination)
  "*::*": {
    allowedModules:       null,
    allowedSubModules:    null,
    attendanceDeptFilter: null,
    excludedCompanies:    null,
  },
};

function resolveRule(department: string | undefined, role: string | undefined): PermissionRule {
  const dept = (department ?? "").toLowerCase();
  const r    = (role       ?? "").toLowerCase();

  // Try exact match first
  const exact = RULES[`${dept}::${r}`];
  if (exact) return exact;

  // Try dept wildcard
  const deptWild = RULES[`${dept}::*`];
  if (deptWild) return deptWild;

  // Try role wildcard
  const roleWild = RULES[`*::${r}`];
  if (roleWild) return roleWild;

  // Fallback
  return RULES["*::*"];
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface PermissionsContextValue {
  rule: PermissionRule;
  canSeeModule:    (label: string) => boolean;
  canSeeSubModule: (module: string, label: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  rule:            RULES["*::*"],
  canSeeModule:    () => true,
  canSeeSubModule: () => true,
});

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const value = useMemo<PermissionsContextValue>(() => {
    const rule = resolveRule(user?.Department, user?.Role);

    const canSeeModule = (label: string) => {
      if (!rule.allowedModules) return true;
      return rule.allowedModules.includes(label);
    };

    const canSeeSubModule = (module: string, label: string) => {
      if (!rule.allowedSubModules) return true;
      const allowed = rule.allowedSubModules[module];
      if (!allowed) return true; // module not restricted
      return allowed.includes(label);
    };

    return { rule, canSeeModule, canSeeSubModule };
  }, [user?.Department, user?.Role]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
