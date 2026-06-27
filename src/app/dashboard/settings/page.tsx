"use client";

import { useState, useEffect } from "react";
import { Holiday } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch holidays from Supabase ──────────────────────────────────────────
  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/holidays");
      const data: Holiday[] = await res.json();
      setHolidays(data);
    } catch {
      setError("Failed to load holidays.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  // ── Add holiday ───────────────────────────────────────────────────────────
  const addHoliday = async () => {
    if (!newHolidayDate || !newHolidayName.trim()) {
      setError("Both date and name are required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newHolidayDate, name: newHolidayName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Save failed.");
      }
      setNewHolidayDate("");
      setNewHolidayName("");
      fetchHolidays();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete holiday ────────────────────────────────────────────────────────
  const deleteHoliday = async (id: string) => {
    try {
      await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch {
      setError("Failed to delete holiday.");
    }
  };

  const sortedHolidays = [...holidays].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-black">HRIS Settings</h1>

      {/* ── Holidays ──────────────────────────────────────────────────────── */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-black">
            Holidays
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Holiday Name
              </label>
              <Input
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                placeholder="e.g., New Year's Day"
                className="w-full"
                onKeyDown={(e) => e.key === "Enter" && addHoliday()}
              />
            </div>
            <div>
              <Button onClick={addHoliday} disabled={isSaving} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {isSaving ? "Saving…" : "Add Holiday"}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* List */}
          {isLoading ? (
            <p className="text-gray-500 text-sm py-4">Loading holidays…</p>
          ) : sortedHolidays.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-black font-medium">
                      Date
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-black font-medium">
                      Holiday Name
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-black font-medium w-24">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHolidays.map((holiday) => (
                    <tr key={holiday.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3">
                        {/* Parse as local date to avoid UTC-offset shift */}
                        {new Date(`${holiday.date}T00:00:00`).toLocaleDateString(
                          "en-PH",
                          { year: "numeric", month: "long", day: "numeric" }
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        {holiday.name}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteHoliday(holiday.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No holidays added yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Work Schedule Info ─────────────────────────────────────────────── */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-black">
            Work Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-700 space-y-1">
            <p>
              <strong>Work Days:</strong> Monday to Saturday
            </p>
            <p>
              <strong>Rest Day:</strong> Sunday only
            </p>
            <p>
              <strong>Regular Hours:</strong> 8:00 AM – 5:00 PM
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
