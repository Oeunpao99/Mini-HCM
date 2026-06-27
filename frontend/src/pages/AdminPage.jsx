import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDownload,
  FiLogIn,
  FiMoreVertical,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import RequestDetail from "./requests/RequestDetail";

const standardHours = 8;
const pageSizeOptions = [5, 10, 20];
const chartColors = {
  present: "#22c55e",
  late: "#f97316",
  absent: "#ef4444",
};

const roleNames = {
  line_manager: "Team Attendance",
  department_head: "Department Attendance",
  management_hr: "Time & Attendance",
  payroll_officer: "Time & Attendance",
};

const dateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateForInput = (value) => dateKey(value || new Date());

const formatTime = (value) => {
  if (!value) return "-";
  if (/[AP]M/i.test(value)) return value;
  const [hour = "0", minute = "00"] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatHours = (value) => {
  const total = Number(value || 0);
  if (!total) return "-";
  const hours = Math.floor(total);
  const minutes = Math.round((total - hours) * 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

const percent = (value, total) => (total ? Math.round((value / total) * 10000) / 100 : 0);

const computeLateMinutes = (checkInTime) => {
  if (!checkInTime) return null;
  const [h, m] = checkInTime.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const total = h * 60 + m;
  const standard = 8 * 60;
  return Math.max(0, total - standard);
};

const computeEarlyLeaveMinutes = (checkOutTime) => {
  if (!checkOutTime) return null;
  const [h, m] = checkOutTime.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const total = h * 60 + m;
  const standard = 17 * 60;
  return Math.max(0, standard - total);
};

const formatMinutes = (minutes) => {
  if (minutes === null || minutes === undefined) return "-";
  if (minutes === 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const statusTone = (status) => {
  if (status === "on_time") return "bg-emerald-100 text-emerald-700";
  if (status === "late") return "bg-orange-100 text-orange-700";
  if (status === "leave") return "bg-blue-100 text-blue-700";
  return "bg-red-100 text-red-700";
};

const statusLabel = (status) => {
  if (status === "on_time") return "On Time";
  if (status === "late") return "Late";
  if (status === "leave") return "On Leave";
  return "Absent";
};

const hasScan = (record) => !!(record?.check_in_time || record?.check_out_time);

const isApprovedLeave = (request) =>
  ["leave", "permission"].includes(request?.type) && request?.status === "approved";

const numberFormat = (value) => Number(value || 0).toLocaleString();

const requestLeaveTypeLabel = (request) => {
  if (!request) return "-";
  if (request.type === "leave") {
    const labels = { annual: "Annual Leave", sick: "Sick Leave", maternity: "Maternity Leave", paternity: "Paternity Leave", marriage: "Marriage Leave", compassionate: "Compassionate Leave", unpaid: "Unpaid Leave", special: "Special Leave", business: "Business Leave" };
    return labels[request.leave_type] || request.leave_type || "Leave";
  }
  if (request.type === "permission") return "Permission";
  if (request.type === "flexible") return "Flexible Work";
  if (request.type === "ot") return "Overtime";
  return request.type || "Request";
};

const requestStatusBadgeClass = (status) => {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
};

const StatCard = ({ label, value, helper, icon: Icon, tone }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-4">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-[#111b4f]">{label}</p>
        <p className="mt-1 text-3xl font-extrabold leading-none text-[#111b4f]">{value}</p>
        {helper && <p className="mt-1 text-sm font-extrabold">{helper}</p>}
      </div>
    </div>
  </div>
);

const AdminPage = () => {
  const { role } = useAuth();
  const now = new Date();
  const [startDate, setStartDate] = useState(formatDateForInput(now));
  const [endDate, setEndDate] = useState(formatDateForInput(now));
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRequestUser, setSelectedRequestUser] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, reqRes, attRes, schedRes] = await Promise.all([
        api.get("/api/admin/users"),
        api.get("/api/requests/all"),
        api.get("/api/admin/all-attendance"),
        api.get("/api/shifts/schedules"),
      ]);
      setUsers(usersRes.data || []);
      setRequests(reqRes.data || []);
      setAttendance(attRes.data || []);
      setSchedules(schedRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, departmentFilter, statusFilter, startDate, endDate, pageSize]);

  const attendanceByUserDate = useMemo(() => {
    const map = new Map();
    attendance.forEach((record) => {
      map.set(`${record.user_id}:${dateKey(record.date)}`, record);
    });
    return map;
  }, [attendance]);

  const requestByUserDate = useMemo(() => {
    const map = new Map();
    requests.forEach((request) => {
      const key = `${request.user_id}:${dateKey(request.date)}`;
      if (!map.has(key) || isApprovedLeave(request)) {
        map.set(key, request);
      }
    });
    return map;
  }, [requests]);

  const scheduleByUserDate = useMemo(() => {
    const map = new Map();
    schedules.forEach((sched) => {
      map.set(`${sched.user_id}:${dateKey(sched.work_date)}`, sched);
    });
    return map;
  }, [schedules]);

  const rows = useMemo(() => {
    const sd = new Date(`${startDate}T00:00:00`);
    const ed = new Date(`${endDate}T00:00:00`);
    const dates = [];
    const current = new Date(sd);
    while (current <= ed) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    const allRows = [];
    for (const date of dates) {
      const key = dateKey(date);
      for (const user of users) {
        const record = attendanceByUserDate.get(`${user.id}:${key}`);
        const request = requestByUserDate.get(`${user.id}:${key}`);
        const schedule = scheduleByUserDate.get(`${user.id}:${key}`);
        if (record) {
          const present = hasScan(record);
          const status = isApprovedLeave(request)
            ? "leave"
            : present
              ? record?.is_late
                ? "late"
                : "on_time"
              : "absent";
          allRows.push({
            id: record.id,
            index: allRows.length + 1,
            user,
            record,
            request,
            schedule,
            status,
            workedHours: Number(record?.worked_hours || 0),
            location: present ? (record?.flexible_scan ? "Client Site" : "Office") : "-",
          });
        } else {
          allRows.push({
            id: `${user.id}:${key}`,
            index: allRows.length + 1,
            user,
            record: null,
            request,
            schedule,
            status: isApprovedLeave(request) ? "leave" : "absent",
            workedHours: 0,
            location: "-",
          });
        }
      }
    }
    return allRows;
  }, [attendanceByUserDate, requestByUserDate, scheduleByUserDate, users, startDate, endDate]);

  const departments = useMemo(
    () => [...new Set(users.map((user) => user.department).filter(Boolean))],
    [users],
  );
  const unitOptions = useMemo(
    () => [...new Set(
      users
        .filter((user) => departmentFilter === "all" || user.department === departmentFilter)
        .map((user) => user.sub_department)
        .filter(Boolean)
    )],
    [users, departmentFilter],
  );

  const filteredRows = rows.filter((row) => {
    const query = search.trim().toLowerCase();
    const searchable = `${row.user.name} ${row.user.emp_code} ${row.user.department} ${row.user.role}`.toLowerCase();
    const matchesSearch = !query || searchable.includes(query);
    const matchesDepartment = departmentFilter === "all" || row.user.department === departmentFilter;
    const matchesUnit = unitFilter === "all" || row.user.sub_department === unitFilter;
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    return matchesSearch && matchesDepartment && matchesUnit && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const summary = useMemo(() => {
    const total = [...new Set(filteredRows.map((row) => row.user.id))].length;
    const present = filteredRows.filter((row) => hasScan(row.record)).length;
    const late = filteredRows.filter((row) => row.status === "late").length;
    const leave = filteredRows.filter((row) => row.status === "leave").length;
    const absent = filteredRows.filter((row) => row.status === "absent").length;
    const overtime = filteredRows.filter((row) => row.workedHours > standardHours).length;
    const totalHours = filteredRows.reduce((sum, row) => sum + row.workedHours, 0);
    const onTime = filteredRows.filter((row) => row.status === "on_time").length;
    const missingCheckOut = filteredRows.filter((row) => row.record?.check_in_time && !row.record?.check_out_time).length;
    const avgCheckInRows = filteredRows.filter((row) => row.record?.check_in_time);
    const avgCheckOutRows = filteredRows.filter((row) => row.record?.check_out_time);
    return {
      present,
      late,
      leave,
      absent,
      overtime,
      onTime,
      missingCheckOut,
      total,
      totalHours,
      presentRate: percent(present, total),
      complianceRate: percent(onTime, total),
      avgCheckIn: averageScanTime(avgCheckInRows.map((row) => row.record.check_in_time)),
      avgCheckOut: averageScanTime(avgCheckOutRows.map((row) => row.record.check_out_time)),
    };
  }, [filteredRows]);

  const donutData = [
    { name: "On Time", value: summary.onTime, color: chartColors.present },
    { name: "Late", value: summary.late, color: chartColors.late },
    { name: "Absent", value: summary.absent, color: chartColors.absent },
  ];

  const deptAttendance = useMemo(() => {
    const deptMap = new Map();
    rows.forEach((row) => {
      const dept = row.user.department || "Unassigned";
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { department: dept, "On Time": 0, Late: 0, Absent: 0, Leave: 0, total: 0 });
      }
      const entry = deptMap.get(dept);
      entry.total++;
      if (row.status === "on_time") entry["On Time"]++;
      else if (row.status === "late") entry.Late++;
      else if (row.status === "absent") entry.Absent++;
      else if (row.status === "leave") entry.Leave++;
    });
    return Array.from(deptMap.values());
  }, [rows]);

  const exportCsv = () => {
    const headers = ["#", "Employee", "Department", "Unit", "Date", "Check-in", "Check-out", "Working Hours", "Status", "Location"];
    const lines = [
      headers.join(","),
      ...filteredRows.map((row) =>
        [
          row.index,
          row.user.name,
          row.user.department || "",
          row.user.sub_department || "",
          dateKey(row.record?.date),
          formatTime(row.record?.check_in_time),
          formatTime(row.record?.check_out_time),
          formatHours(row.workedHours),
          statusLabel(row.status),
          row.location,
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${startDate}-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-[#f5f8fc] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#111b4f]">{roleNames[role] || "Time & Attendance"}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Monitor employee attendance and working hours in real time
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 shadow-sm">
              <span className="text-xs text-slate-400">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-[130px] bg-transparent font-extrabold outline-none"
              />
            </label>
            <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 shadow-sm">
              <span className="text-xs text-slate-400">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-[130px] bg-transparent font-extrabold outline-none"
              />
            </label>
            <button type="button" onClick={load} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm" title="Refresh">
              <FiRefreshCw className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Total Employees" value={numberFormat(summary.total)} helper="Active Employees" icon={FiUsers} tone="bg-blue-600 text-white" />
          <StatCard label="Today&apos;s Attendance" value={numberFormat(summary.present)} helper={<span className="text-emerald-600">{summary.presentRate}%</span>} icon={FiCheckCircle} tone="bg-emerald-500 text-white" />
          <StatCard label="On Time" value={numberFormat(summary.onTime)} helper={<span className="text-emerald-600">{summary.presentRate}%</span>} icon={FiTrendingUp} tone="bg-emerald-600 text-white" />
          <StatCard label="Late Employees" value={numberFormat(summary.late)} helper={<span className="text-orange-600">{percent(summary.late, summary.total)}%</span>} icon={FiClock} tone="bg-orange-500 text-white" />
          <StatCard label="Absent Times" value={numberFormat(summary.absent)} helper={<span className="text-red-600">{percent(summary.absent, summary.total)}%</span>} icon={FiLogIn} tone="bg-red-500 text-white" />
          <StatCard label="Missing Check-In/Out" value={numberFormat(summary.missingCheckOut)} helper="Incomplete records" icon={FiAlertTriangle} tone="bg-amber-500 text-white" />
          <StatCard label="Employees on Leave" value={numberFormat(summary.leave)} helper="Currently on leave" icon={FiCalendar} tone="bg-blue-500 text-white" />

        </div>

        <div className="grid gap-4 xl:grid-cols-2">

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-extrabold text-[#111b4f]">Attendance by Department</h2>
            <div className="mt-5 h-[260px]">
              {deptAttendance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptAttendance} layout="vertical" margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontWeight: 700 }} />
                    <YAxis type="category" dataKey="department" tickLine={false} axisLine={false} tick={{ fill: "#111b4f", fontWeight: 700 }} width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="On Time" name="On Time" fill={chartColors.present} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Late" name="Late" fill={chartColors.late} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Absent" name="Absent" fill={chartColors.absent} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">No department data</div>
              )}
            </div>
          </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-extrabold text-[#111b4f]">Check-in / Check-out Overview</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-[190px_minmax(0,1fr)]">
              <div className="relative h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} innerRadius={62} outerRadius={92} paddingAngle={2} dataKey="value">
                      {donutData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-2xl font-extrabold text-[#111b4f]">{summary.total}</p>
                    <p className="text-xs font-bold text-slate-500">Total</p>
                  </div>
                </div>
              </div>
              <div className="grid content-center gap-3">
                <OverviewRow color="bg-emerald-500" label="On Time" value={summary.onTime} total={summary.total} />
                <OverviewRow color="bg-orange-500" label="Late" value={summary.late} total={summary.total} />
                <OverviewRow color="bg-red-500" label="Absent" value={summary.absent} total={summary.total} />
              </div>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#111b4f]">Attendance Records</h2>
              <p className="text-xs font-bold text-slate-400">{startDate} — {endDate}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 md:w-72">
                <FiSearch className="h-4 w-4 text-slate-400" aria-hidden />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-400" placeholder="Search employee..." />
              </label>
              <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none">
                <option value="all">All Departments</option>
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
              <select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none">
                <option value="all">All Units</option>
                {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none">
                <option value="all">All Status</option>
                <option value="on_time">On Time</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="leave">On Leave</option>
              </select>
              <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-extrabold text-white">
                <FiDownload className="h-4 w-4" aria-hidden />
                Export
              </button>
              <button type="button" onClick={load} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-700">
                <FiRefreshCw className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold uppercase text-[#111b4f]">
                <tr>
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Employee ID</th>
                  <th className="px-3 py-3">Employee</th>
                  <th className="px-3 py-3">Department</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-3 py-3">Position</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Check-In</th>
                  <th className="px-3 py-3">Check-Out</th>
                  <th className="px-3 py-3">Work Hours</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Attendance Adjustment</th>
                  <th className="px-3 py-3">Shift</th>
                  <th className="px-3 py-3">Late Min</th>
                  <th className="px-3 py-3">Early Leave</th>
                  <th className="px-3 py-3">OT Hours</th>
                  <th className="px-3 py-3">Approval</th>
                  <th className="px-3 py-3">Remarks</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={18} className="px-5 py-10 text-center font-bold text-slate-400">Loading attendance...</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={18} className="px-5 py-10 text-center font-bold text-slate-400">No attendance rows match the filters.</td></tr>
                ) : pageRows.map((row) => {
                  const lateMin = computeLateMinutes(row.record?.check_in_time);
                  const earlyMin = computeEarlyLeaveMinutes(row.record?.check_out_time);
                  const otHours = Math.max(0, row.workedHours - standardHours);
                  const isApproved = row.record?.manager_approved;
                  return (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-3 font-bold text-[#111b4f]">{row.index}</td>
                    <td className="px-3 py-3 font-mono font-semibold text-[#111b4f]">{row.user.emp_code || "-"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={row.user.name} />
                        <span className="font-extrabold text-[#111b4f]">{row.user.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#111b4f]">{row.user.department || "-"}</td>
                    <td className="px-3 py-3 font-semibold text-[#111b4f]">{row.user.sub_department || "-"}</td>
                    <td className="px-3 py-3 font-semibold text-[#111b4f]">{row.user.position || "-"}</td>
                    <td className="px-3 py-3 font-semibold text-[#111b4f]">{dateKey(row.record?.date)}</td>
                    <td className="px-3 py-3">
                      <div className={`font-extrabold ${row.status === "late" ? "text-orange-600" : "text-emerald-600"}`}>{formatTime(row.record?.check_in_time)}</div>
                      {row.status === "late" && row.record?.check_in_time && (
                        <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold leading-tight text-red-700">Late</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-extrabold text-emerald-600">{formatTime(row.record?.check_out_time)}</div>
                      {row.record?.is_early_checkout && row.record?.check_out_time && (
                        <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold leading-tight text-amber-700">Early</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-bold text-[#111b4f]">{formatHours(row.workedHours)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex min-w-20 justify-center rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {row.record?.requires_manager_approval ? (
                        <span className="text-xs font-semibold text-amber-700">{row.record?.needs_approval_reason || "Adjustment"}</span>
                      ) : row.request ? (
                        <span className="text-xs font-semibold text-slate-400">{requestLeaveTypeLabel(row.request)}</span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#111b4f]">{row.schedule?.shift_name || "-"}</td>
                    <td className="px-3 py-3 font-semibold text-[#111b4f]">{lateMin !== null && lateMin > 0 ? <span className="text-orange-600">{formatMinutes(lateMin)}</span> : lateMin === 0 ? <span className="text-emerald-600">0m</span> : "-"}</td>
                    <td className="px-3 py-3 font-semibold text-[#111b4f]">{earlyMin !== null && earlyMin > 0 ? <span className="text-orange-600">{formatMinutes(earlyMin)}</span> : earlyMin === 0 ? <span className="text-emerald-600">0m</span> : "-"}</td>
                    <td className="px-3 py-3 font-semibold text-[#111b4f]">{otHours > 0 ? <span className="text-violet-600">{formatHours(otHours)}</span> : "-"}</td>
                    <td className="px-3 py-3">
                      {row.record?.requires_manager_approval ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                          row.record?.manager_approved === true
                            ? "bg-emerald-100 text-emerald-700"
                            : row.record?.manager_approved === false
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}>
                          {row.record?.manager_approved === true
                            ? "Approved"
                            : row.record?.manager_approved === false
                              ? "Rejected"
                              : "Pending"}
                        </span>
                      ) : row.request?.status === "approved" ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-extrabold text-blue-700">On Leave</span>
                      ) : row.request?.status === "rejected" ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-extrabold text-red-700">Rejected</span>
                      ) : row.request?.status === "pending" ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-700">Pending</span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">-</span>
                      )}
                    </td>
                    <td className="max-w-[150px] truncate px-3 py-3 font-semibold text-[#111b4f]" title={row.record?.remark || ""}>{row.record?.remark || "-"}</td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" onClick={() => { setSelectedRequest(row.request); setSelectedRequestUser(row.user); }} className="grid h-8 w-8 place-items-center rounded-lg text-[#111b4f] hover:bg-slate-100" aria-label={`More actions for ${row.user.name}`}>
                        <FiMoreVertical className="h-4 w-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-[#111b4f]">
              Showing {filteredRows.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} entries
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-[#111b4f] disabled:opacity-40" disabled={page === 1}>
                <FiChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((pageNumber) => (
                <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-extrabold ${page === pageNumber ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-[#111b4f]"}`}>
                  {pageNumber}
                </button>
              ))}
              {totalPages > 5 && <span className="px-2 text-sm font-bold text-slate-400">...</span>}
              {totalPages > 5 && (
                <button type="button" onClick={() => setPage(totalPages)} className="h-10 min-w-10 rounded-lg border border-slate-200 px-3 text-sm font-extrabold text-[#111b4f]">
                  {totalPages}
                </button>
              )}
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-[#111b4f] disabled:opacity-40" disabled={page === totalPages}>
                <FiChevronRight className="h-4 w-4" aria-hidden />
              </button>
              <label className="ml-2 flex items-center gap-2 text-sm font-semibold text-[#111b4f]">
                Rows per page
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none">
                  {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>
          </div>
        </section>

        {summary.leave > 0 && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
            <span className="inline-flex items-center gap-2">
              <FiAlertCircle className="h-4 w-4" aria-hidden />
              {summary.leave} approved leave or permission record(s) are included in this range.
            </span>
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative w-[70vw] max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => { setSelectedRequest(null); setSelectedRequestUser(null); }}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-sm font-extrabold text-slate-500 hover:bg-slate-200"
            >
              &times;
            </button>
            <RequestDetail
              request={selectedRequest}
              user={selectedRequestUser}
              onCancel={() => {}}
            />
          </div>
        </div>
      )}
    </section>
  );
};

const averageScanTime = (times) => {
  const values = times
    .map((value) => {
      const [hour = "0", minute = "0"] = String(value || "").split(":");
      const total = Number(hour) * 60 + Number(minute);
      return Number.isFinite(total) ? total : null;
    })
    .filter((value) => value !== null);

  if (!values.length) return "-";
  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const hour = Math.floor(average / 60);
  const minute = average % 60;
  return formatTime(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`);
};

const OverviewRow = ({ color, label, value, total }) => (
  <div className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
    <div className="flex items-start justify-between gap-3">
      <div className="flex gap-3">
        <span className={`mt-1 h-3 w-3 rounded-full ${color}`} />
        <div>
          <p className="text-sm font-extrabold text-[#111b4f]">{label}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {numberFormat(value)} ({percent(value, total)}%)
          </p>
        </div>
      </div>
    </div>
  </div>
);

const Avatar = ({ name }) => {
  const initials = String(name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-extrabold text-[#111b4f]">
      {initials}
    </span>
  );
};

export default AdminPage;
