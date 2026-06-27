"use client";

import { useEffect, useState } from "react";
import { TaskLog } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "../../../components/ui/select";
import ExcelJS from "exceljs";

export default function AttendancePage() {
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<TaskLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchTaskLogs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/attendance');
        const data = await response.json();
        setTaskLogs(data || []);
        setFilteredLogs(data || []);
      } catch (error) {
        console.error("Error fetching task logs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaskLogs();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...taskLogs];

    // Search query (search fullname, email, location, remarks, site visit account)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        (log.Fullname?.toLowerCase().includes(query)) ||
        (log.Email?.toLowerCase().includes(query)) ||
        (log.Location?.toLowerCase().includes(query)) ||
        (log.Remarks?.toLowerCase().includes(query)) ||
        (log.SiteVisitAccount?.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(log => log.Type === typeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(log => log.Status === statusFilter);
    }

    // Date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(log => {
        if (!log.date_created) return false;
        const logDate = new Date(log.date_created);
        return logDate >= start && logDate <= end;
      });
    }

    setFilteredLogs(filtered);
  }, [taskLogs, searchQuery, typeFilter, statusFilter, startDate, endDate]);

  // Export to Excel
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Records');

    // Header row
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Fullname', key: 'fullname', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Remarks', key: 'remarks', width: 30 },
      { header: 'Location', key: 'location', width: 40 },
      { header: 'Site Visit Account', key: 'siteVisit', width: 30 },
    ];

    // Add rows
    filteredLogs.forEach(log => {
      worksheet.addRow({
        date: log.date_created ? new Date(log.date_created).toLocaleString() : '-',
        fullname: log.Fullname || '-',
        email: log.Email || '-',
        type: log.Type || '-',
        status: log.Status || '-',
        remarks: log.Remarks || '-',
        location: log.DisplayLocation || log.Location || '-',
        siteVisit: log.SiteVisitAccount || '-',
      });
    });

    // Style header
    worksheet.getRow(1).font = { bold: true };

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_records_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get unique types for select
  const types = Array.from(new Set(taskLogs.map(log => log.Type).filter(Boolean)));
  const typeOptions = types.map(t => ({ value: t || "", label: t || "" }));
  
  const statuses = Array.from(new Set(taskLogs.map(log => log.Status).filter(Boolean)));
  const statusOptions = statuses.map(s => ({ value: s || "", label: s || "" }));

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="text-black">Attendance Records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end justify-between">
          {/* Left Side: Search + Export */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Search</label>
              <Input
                type="text"
                placeholder="Search by name, email, location, remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-80"
              />
            </div>
            <Button onClick={handleExport} className="bg-black text-white hover:bg-gray-800">
              Export Excel
            </Button>
          </div>

          {/* Right Side: Type, Status, Start Date, End Date */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Type</label>
              <NativeSelect
                value={typeFilter}
                onValueChange={setTypeFilter}
                placeholder="All Types"
                options={typeOptions}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Status</label>
              <NativeSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                placeholder="All Status"
                options={statusOptions}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <p className="text-black p-6">Loading attendance records...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-black p-6">No attendance records found.</p>
          ) : (
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 hover:bg-transparent">
                    <TableHead className="text-black font-medium px-6 py-4">Date</TableHead>
                    <TableHead className="text-black font-medium px-6 py-4">Fullname</TableHead>
                    <TableHead className="text-black font-medium px-6 py-4">Type</TableHead>
                    <TableHead className="text-black font-medium px-6 py-4">Status</TableHead>
                    <TableHead className="text-black font-medium px-6 py-4">Remarks</TableHead>
                    <TableHead className="text-black font-medium px-6 py-4">Location</TableHead>
                    <TableHead className="text-black font-medium px-6 py-4">Photo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="border-b border-gray-200 hover:bg-transparent">
                      <TableCell className="text-black px-6 py-4">
                        {log.date_created
                          ? new Date(log.date_created).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-black px-6 py-4">{log.Fullname || "-"}</TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black text-white">
                          {log.Type || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.Status === 'Approved' || log.Status === 'Logged In'
                            ? 'bg-green-100 text-green-800'
                            : log.Status === 'Pending' || log.Status === 'For Approval'
                            ? 'bg-yellow-100 text-yellow-800'
                            : log.Status === 'Rejected' || log.Status === 'Logged Out'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {log.Status || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-black px-6 py-4">{log.Remarks || "-"}</TableCell>
                      <TableCell className="text-black px-6 py-4">{log.DisplayLocation || log.Location || "-"}</TableCell>
                      <TableCell className="px-6 py-4">
                        {log.PhotoURL ? (
                          <img 
                            src={log.PhotoURL} 
                            alt="Attendance Photo" 
                            className="w-24 h-24 object-cover rounded-lg border border-gray-200" 
                            loading="lazy"
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
