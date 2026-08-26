"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

// ─── Permission rule shape ────────────────────────────────────────────────────
export interface PermissionRule {
  allowedModules:       string[] | null;
  allowedSubModules:    Record<string, string[]> | null;
  attendanceDeptFilter: string[] | null;
  excludedCompanies:    string[] | null;
  /** Whether the user can delete attendance records */
  canDeleteAttendance:  boolean;
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
    canDeleteAttendance:  false,
  },

  // Default — full access (fallback for any unmatched combination)
  "*::*": {
    allowedModules:       null,
    allowedSubModules:    null,
    attendanceDeptFilter: null,
    excludedCompanies:    null,
    canDeleteAttendance:  true,
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
