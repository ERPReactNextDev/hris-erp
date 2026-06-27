"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";

// ─── Small field display ──────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-0.5">{label}</p>
      <p className="font-medium text-black">{value || "–"}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  // ── Change-password form state ──────────────────────────────────────────────
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(false);

    if (!currentPw || !newPw || !confirmPw) {
      setError("All fields are required.");
      return;
    }
    if (newPw.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("New passwords do not match.");
      return;
    }
    if (newPw === currentPw) {
      setError("New password must differ from the current one.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceId:     user?.ReferenceID,
          currentPassword: currentPw,
          newPassword:     newPw,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Update failed.");

      setSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Profile info ──────────────────────────────────────────────────── */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-black">
            <User className="w-5 h-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="First Name"      value={user?.Firstname} />
            <Field label="Last Name"       value={user?.Lastname} />
            <Field label="Email"           value={user?.Email} />
            <Field label="Username"        value={user?.userName} />
            <Field label="Role"            value={user?.Role} />
            <Field label="Department"      value={user?.Department} />
            <Field label="Position"        value={user?.Position} />
            <Field label="Contact Number"  value={user?.ContactNumber} />
          </div>
        </CardContent>
      </Card>

      {/* ── Change password ───────────────────────────────────────────────── */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-black">
            <KeyRound className="w-5 h-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current password */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Current Password
            </label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 6 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm new password */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                className="pr-10"
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          {success && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Password updated successfully.
            </div>
          )}

          <Button
            onClick={handleChangePassword}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? "Saving…" : "Update Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
