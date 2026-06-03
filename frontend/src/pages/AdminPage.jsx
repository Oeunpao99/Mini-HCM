import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDownload,
  FiLogIn,
  FiMapPin,
  FiMoreVertical,
  FiRefreshCw,
  FiSearch,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

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

const formatReadableDate = (value) =>
  new Date(`${dateKey(value)}T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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

const getWeekDates = (selectedDate) => {
  const date = new Date(`${dateKey(selectedDate)}T00:00:00`);
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
};

const numberFormat = (value) => Number(value || 0).toLocaleString();

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
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, reqRes, attRes] = await Promise.all([
        api.get("/api/admin/users"),
        api.get("/api/requests/all"),
        api.get("/api/admin/all-attendance"),
      ]);
      setUsers(usersRes.data || []);
      setRequests(reqRes.data || []);
      setAttendance(attRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, departmentFilter, statusFilter, selectedDate, pageSize]);

  const selectedKey = dateKey(selectedDate);
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

  const rows = useMemo(() => {
    return users.map((user, index) => {
      const record = attendanceByUserDate.get(`${user.id}:${selectedKey}`);
      const request = requestByUserDate.get(`${user.id}:${selectedKey}`);
      const present = hasScan(record);
      const status = isApprovedLeave(request)
        ? "leave"
        : present
          ? record?.is_late
            ? "late"
            : "on_time"
          : "absent";
      return {
        id: user.id,
        index: index + 1,
        user,
        record,
        request,
        status,
        workedHours: Number(record?.worked_hours || 0),
        location: present ? (record?.flexible_scan ? "Client Site" : "Office") : "-",
      };
    });
  }, [attendanceByUserDate, requestByUserDate, selectedKey, users]);

  const departments = useMemo(
    () => [...new Set(users.map((user) => user.department).filter(Boolean))],
    [users],
  );

  const filteredRows = rows.filter((row) => {
    const query = search.trim().toLowerCase();
    const searchable = `${row.user.name} ${row.user.emp_code} ${row.user.department} ${row.user.role}`.toLowerCase();
    const matchesSearch = !query || searchable.includes(query);
    const matchesDepartment = departmentFilter === "all" || row.user.department === departmentFilter;
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const summary = useMemo(() => {
    const present = rows.filter((row) => hasScan(row.record)).length;
    const late = rows.filter((row) => row.status === "late").length;
    const leave = rows.filter((row) => row.status === "leave").length;
    const absent = rows.filter((row) => row.status === "absent").length;
    const overtime = rows.filter((row) => row.workedHours > standardHours).length;
    const totalHours = rows.reduce((sum, row) => sum + row.workedHours, 0);
    const avgCheckInRows = rows.filter((row) => row.record?.check_in_time);
    const avgCheckOutRows = rows.filter((row) => row.record?.check_out_time);
    return {
      present,
      late,
      leave,
      absent,
      overtime,
      totalHours,
      onTime: rows.filter((row) => row.status === "on_time").length,
      avgCheckIn: averageScanTime(avgCheckInRows.map((row) => row.record.check_in_time)),
      avgCheckOut: averageScanTime(avgCheckOutRows.map((row) => row.record.check_out_time)),
    };
  }, [rows]);

  const weeklyData = useMemo(() => {
    return getWeekDates(selectedDate).map((date) => {
      const key = dateKey(date);
      const dayRows = users.map((user) => {
        const record = attendanceByUserDate.get(`${user.id}:${key}`);
        const request = requestByUserDate.get(`${user.id}:${key}`);
        const present = hasScan(record);
        return {
          present,
          late: Boolean(record?.is_late),
          absent: !present && !isApprovedLeave(request),
        };
      });
      return {
        day: date.toLocaleDateString(undefined, { weekday: "short" }),
        present: dayRows.filter((row) => row.present).length,
        late: dayRows.filter((row) => row.late).length,
        absent: dayRows.filter((row) => row.absent).length,
      };
    });
  }, [attendanceByUserDate, requestByUserDate, selectedDate, users]);

  const donutData = [
    { name: "On Time", value: summary.onTime, color: chartColors.present },
    { name: "Late", value: summary.late, color: chartColors.late },
    { name: "Absent", value: summary.absent, color: chartColors.absent },
  ];

  const exportCsv = () => {
    const headers = ["#", "Employee", "Department", "Check-in", "Check-out", "Working Hours", "Status", "Location"];
    const lines = [
      headers.join(","),
      ...filteredRows.map((row) =>
        [
          row.index,
          row.user.name,
          row.user.department || "",
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
    link.download = `attendance-${selectedKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const moveDate = (days) => {
    const next = new Date(`${selectedKey}T00:00:00`);
    next.setDate(next.getDate() + days);
    setSelectedDate(formatDateForInput(next));
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
            <button type="button" onClick={() => moveDate(-1)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600">
              <FiChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm">
              <FiCalendar className="h-5 w-5 text-slate-500" aria-hidden />
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="bg-transparent font-extrabold outline-none"
              />
            </label>
            <button type="button" onClick={() => moveDate(1)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600">
              <FiChevronRight className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" onClick={load} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm" title="Refresh">
              <FiRefreshCw className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Employees" value={numberFormat(users.length)} helper="Active Employees" icon={FiUsers} tone="bg-blue-600 text-white" />
          <StatCard label="Present Today" value={numberFormat(summary.present)} helper={<span className="text-emerald-600">{percent(summary.present, users.length)}%</span>} icon={FiCheckCircle} tone="bg-emerald-500 text-white" />
          <StatCard label="Late Today" value={numberFormat(summary.late)} helper={<span className="text-orange-600">{percent(summary.late, users.length)}%</span>} icon={FiClock} tone="bg-orange-500 text-white" />
          <StatCard label="Absent Today" value={numberFormat(summary.absent)} helper={<span className="text-red-600">{percent(summary.absent, users.length)}%</span>} icon={FiLogIn} tone="bg-red-500 text-white" />
          <StatCard label="Overtime Today" value={numberFormat(summary.overtime)} helper="Employees" icon={FiClock} tone="bg-violet-600 text-white" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,1fr)_360px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-[#111b4f]">Attendance Summary</h2>
              <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">This Week</span>
            </div>
            <div className="mt-5 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#111b4f", fontWeight: 700 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontWeight: 700 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="present" name="Present" stroke={chartColors.present} strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="late" name="Late" stroke={chartColors.late} strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="absent" name="Absent" stroke={chartColors.absent} strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
                    <p className="text-2xl font-extrabold text-[#111b4f]">{users.length}</p>
                    <p className="text-xs font-bold text-slate-500">Total</p>
                  </div>
                </div>
              </div>
              <div className="grid content-center gap-3">
                <OverviewRow color="bg-emerald-500" label="On Time" value={summary.onTime} total={users.length} />
                <OverviewRow color="bg-orange-500" label="Late" value={summary.late} total={users.length} />
                <OverviewRow color="bg-red-500" label="Absent" value={summary.absent} total={users.length} />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-extrabold text-[#111b4f]">Today&apos;s Status</h2>
            <div className="mt-4 grid place-items-center">
              <ProgressRing value={percent(summary.onTime, users.length)} />
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              <StatusMetric icon={FiClock} label="Average Check-in Time" value={summary.avgCheckIn} />
              <StatusMetric icon={FiClock} label="Average Check-out Time" value={summary.avgCheckOut} />
              <StatusMetric icon={FiCalendar} label="Total Working Hours" value={formatHours(summary.totalHours)} />
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#111b4f]">Today&apos;s Attendance</h2>
              <p className="text-xs font-bold text-slate-400">{formatReadableDate(selectedDate)}</p>
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
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold uppercase text-[#111b4f]">
                <tr>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Check-in</th>
                  <th className="px-5 py-3">Check-out</th>
                  <th className="px-5 py-3">Working Hours</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-5 py-10 text-center font-bold text-slate-400">Loading attendance...</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-10 text-center font-bold text-slate-400">No attendance rows match the filters.</td></tr>
                ) : pageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-bold text-[#111b4f]">{row.index}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.user.name} />
                        <span className="font-extrabold text-[#111b4f]">{row.user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-[#111b4f]">{row.user.department || "-"}</td>
                    <td className={`px-5 py-3 font-extrabold ${row.status === "late" ? "text-orange-600" : "text-emerald-600"}`}>{formatTime(row.record?.check_in_time)}</td>
                    <td className="px-5 py-3 font-extrabold text-emerald-600">{formatTime(row.record?.check_out_time)}</td>
                    <td className="px-5 py-3 font-bold text-[#111b4f]">{formatHours(row.workedHours)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex min-w-24 justify-center rounded-full px-3 py-1.5 text-xs font-extrabold ${statusTone(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-[#111b4f]">
                      <span className="inline-flex items-center gap-1.5">
                        {row.location !== "-" && <FiMapPin className="h-4 w-4 text-slate-400" aria-hidden />}
                        {row.location}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-[#111b4f] hover:bg-slate-100" aria-label={`More actions for ${row.user.name}`}>
                        <FiMoreVertical className="h-5 w-5" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
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
              {summary.leave} approved leave or permission record(s) are included for this date.
            </span>
          </div>
        )}
      </div>
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

const ProgressRing = ({ value }) => {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  return (
    <div className="relative h-32 w-32">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="#22c55e"
          strokeLinecap="round"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-extrabold text-[#111b4f]">{Math.round(value)}%</p>
          <p className="text-xs font-bold text-slate-500">On-Time Rate</p>
        </div>
      </div>
    </div>
  );
};

const StatusMetric = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between gap-3 py-3">
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-slate-500" aria-hidden />
      <span className="text-sm font-bold text-[#111b4f]">{label}</span>
    </div>
    <span className="text-sm font-extrabold text-[#111b4f]">{value}</span>
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
