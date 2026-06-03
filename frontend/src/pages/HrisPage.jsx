import { useEffect, useMemo, useState } from "react";
import {
    FiArrowDown,
    FiArrowUp,
    FiBriefcase,
    FiCalendar,
    FiChevronLeft,
    FiChevronRight,
    FiCheckCircle,
    FiCreditCard,
    FiDownload,
    FiEdit2,
    FiEye,
    FiFileText,
    FiFilter,
    FiGrid,
    FiMail,
    FiMoreVertical,
    FiPlus,
    FiRefreshCw,
    FiSearch,
    FiSend,
    FiSettings,
    FiTrendingUp,
    FiUserCheck,
    FiUserMinus,
    FiUsers,
    FiXCircle,
} from "react-icons/fi";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

import AddEmployeeDrawer from "./hris/AddEmployeeDrawer";
import EmployeeDetailDrawer from "./hris/EmployeeDetailDrawer";
import MovementRequestDrawer from "./hris/MovementRequestDrawer";
import {
    Avatar,
    defaultEmployeeForm,
    defaultNewEmployee,
    defaultPayrollForm,
    defaultPerformanceForm,
    Field,
    FilterSelect,
    formatContract,
    inputClass,
    money,
    StatCard,
    statusTone,
    TableEmpty
} from "./hris/HrisCommon";

const payrollRoles = ["management_hr", "payroll_officer"];

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth() + 1;
const taxThreshold = 1200;
const taxRate = 0.05;
const nssfRate = 0.02;
const payrollChartColors = {
  basic: "#3f6ee8",
  allowances: "#37c678",
  overtime: "#f7b93e",
  bonus: "#7651df",
  deductions: "#fb647c",
};
const payrollSubtabs = [
  { id: "dashboard", label: "Payroll Dashboard" },
  { id: "runs", label: "Payroll Run" },
  { id: "employees", label: "Employees" },
  { id: "components", label: "Components" },
  { id: "deductions", label: "Deductions" },
  { id: "structure", label: "Salary Structure" },
  { id: "configuration", label: "Configuration" },
];
const reportTabs = [
  "Overview",
  "HR Reports",
  "Payroll Reports",
  "Attendance Reports",
  "Leave Reports",
  "Performance Reports",
  "Statutory Reports",
];
const reportChartColors = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#06b6d4", "#ec4899", "#94a3b8"];
const defaultLookupSettings = {
  departments: [],
  sub_departments: [],
  positions: [],
  job_grades: [],
  employment_statuses: ["active", "on_leave", "inactive", "resigned"],
};

const numberValue = (value) => Number(value || 0);
const listToText = (values) => (values || []).join("\n");
const textToList = (value) => [
  ...new Set(
    String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];
const cents = (value) => Math.round(numberValue(value) * 100) / 100;
const payrollMonthLabel = (year, month) =>
  new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
const payrollPeriodLabel = (year, month) => {
  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 0);
  return `${start.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })} - ${end.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}`;
};

const payrollStatusTone = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved") return "bg-emerald-50 text-emerald-700";
  if (normalized === "paid") return "bg-blue-50 text-blue-700";
  if (normalized === "submitted") return "bg-amber-50 text-amber-700";
  if (normalized === "rejected") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-600";
};

const PayrollMetricCard = ({ label, value, helper, trend, icon: Icon, tone }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-4">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-extrabold text-[#111827]">{value}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold">
          <span className="text-slate-500">{helper}</span>
          {trend && <span className="text-emerald-600">{trend}</span>}
        </div>
      </div>
    </div>
  </div>
);

const ReportMetricCard = ({ label, value, helper, trend, icon: Icon, tone, trendTone = "text-emerald-600" }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-4">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-extrabold text-[#111b4f]">{label}</p>
        <p className="mt-1 truncate text-2xl font-extrabold leading-none text-[#111b4f]">{value}</p>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold">
          <span className="truncate text-slate-500">{helper}</span>
          {trend && <span className={`shrink-0 ${trendTone}`}>{trend}</span>}
        </div>
      </div>
    </div>
  </div>
);

const ReportPanel = ({ title, action = "This Month", children }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-extrabold text-[#111b4f]">{title}</h2>
      <button type="button" className="h-8 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-[#111b4f]">
        {action}
      </button>
    </div>
    {children}
  </section>
);

const ReportActionButton = ({ icon: Icon, label }) => (
  <button type="button" className="flex h-12 w-full items-center justify-between rounded-md border border-slate-100 px-3 text-left text-sm font-bold text-[#111b4f] hover:bg-slate-50">
    <span className="flex min-w-0 items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-blue-50 text-blue-600">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="truncate">{label}</span>
    </span>
    <FiChevronRight className="h-4 w-4 shrink-0 text-[#111b4f]" aria-hidden />
  </button>
);

const LookupEditor = ({ label, helper, value, onChange }) => (
  <label className="grid gap-2">
    <span className="text-sm font-extrabold text-slate-800">{label}</span>
    <textarea
      className="min-h-40 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      value={listToText(value)}
      onChange={(event) => onChange(textToList(event.target.value))}
    />
    <span className="text-xs font-bold text-slate-400">{helper}</span>
  </label>
);

export default function HrisPage() {
  const { role } = useAuth();
  const location = useLocation();
  const initialTab = new URLSearchParams(location.search).get("tab") || "employees";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [movementRequests, setMovementRequests] = useState([]);
  const [reports, setReports] = useState(null);
  const [lookupSettings, setLookupSettings] = useState(defaultLookupSettings);
  const [lookupDrafts, setLookupDrafts] = useState(defaultLookupSettings);
  const [employeeForm, setEmployeeForm] = useState(defaultEmployeeForm);
  const [payrollForm, setPayrollForm] = useState(defaultPayrollForm);
  const [performanceForm, setPerformanceForm] = useState(defaultPerformanceForm);
  const [payrollPeriod, setPayrollPeriod] = useState({ year: currentYear, month: currentMonth });
  const [payrollSubtab, setPayrollSubtab] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("personal");
  const [newEmployee, setNewEmployee] = useState(defaultNewEmployee);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [movementEmployee, setMovementEmployee] = useState(null);
  const [search, setSearch] = useState("");
  const [payrollRunSearch, setPayrollRunSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const canPayroll = payrollRoles.includes(role);
  const canManageEmployees = role === "management_hr";
  const canRequestMovement = ["line_manager", "department_head", "management_hr"].includes(role);

  const load = async (period = payrollPeriod) => {
    setLoading(true);
    try {
      const year = Number(period.year || currentYear);
      const month = Number(period.month || currentMonth);
      const requests = [
        api.get("/api/hris/dashboard"),
        api.get("/api/hris/employees"),
        api.get("/api/admin/users"),
        api.get(`/api/hris/reports?year=${year}&month=${month}`),
        api.get("/api/hris/performance"),
        api.get("/api/hris/lookup-settings"),
      ];

      if (canRequestMovement) {
        requests.push(api.get("/api/hris/movement-requests"));
      }

      if (canPayroll) {
        requests.push(api.get(`/api/hris/payroll?year=${year}&month=${month}`));
        requests.push(api.get("/api/hris/payroll"));
      }

      const responses = await Promise.all(requests);
      const [dashboardRes, employeesRes, usersRes, reportsRes, performanceRes, lookupRes] = responses;
      let responseIndex = 6;
      const movementRes = canRequestMovement ? responses[responseIndex++] : null;
      const payrollRes = canPayroll ? responses[responseIndex++] : null;
      const payrollHistoryRes = canPayroll ? responses[responseIndex++] : null;

      setDashboard(dashboardRes.data);
      setEmployees(employeesRes.data || []);
      setUsers(usersRes.data || []);
      setReports(reportsRes.data);
      setPerformance(performanceRes.data || []);
      setLookupSettings({ ...defaultLookupSettings, ...(lookupRes.data || {}) });
      setLookupDrafts({ ...defaultLookupSettings, ...(lookupRes.data || {}) });
      setMovementRequests(movementRes?.data || []);
      setPayroll(payrollRes?.data || []);
      setPayrollHistory(payrollHistoryRes?.data || payrollRes?.data || []);
      setStatus("");
    } catch (err) {
      setStatus(err?.response?.data?.detail || "Could not load HRIS data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPayroll, canRequestMovement, payrollPeriod.year, payrollPeriod.month]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab") || "employees";
    setActiveTab(tab);
  }, [location.search]);

  useEffect(() => {
    setPage(1);
  }, [search, departmentFilter, contractFilter, statusFilter]);

  const departments = useMemo(
    () => [...new Set([...lookupSettings.departments, ...employees.map((employee) => employee.department)].filter(Boolean))],
    [employees, lookupSettings.departments],
  );

  const contractTypes = useMemo(
    () => [...new Set(employees.map((employee) => employee.contract_type).filter(Boolean))],
    [employees],
  );

  const departmentOptions = useMemo(
    () => [...new Set([...lookupSettings.departments, ...employees.map((employee) => employee.department), ...users.map((user) => user.department)].filter(Boolean))],
    [employees, lookupSettings.departments, users],
  );

  const subDepartmentOptions = useMemo(
    () => [...new Set([...lookupSettings.sub_departments, ...employees.map((employee) => employee.sub_department)].filter(Boolean))],
    [employees, lookupSettings.sub_departments],
  );

  const positionOptions = useMemo(
    () => [...new Set([...lookupSettings.positions, ...employees.map((employee) => employee.position)].filter(Boolean))],
    [employees, lookupSettings.positions],
  );

  const jobGradeOptions = useMemo(
    () => [...new Set([...lookupSettings.job_grades, ...employees.map((employee) => employee.job_grade)].filter(Boolean))],
    [employees, lookupSettings.job_grades],
  );

  const employmentStatusOptions = useMemo(
    () => [...new Set([...(lookupSettings.employment_statuses?.length ? lookupSettings.employment_statuses : defaultLookupSettings.employment_statuses), ...employees.map((employee) => employee.status)].filter(Boolean))],
    [employees, lookupSettings.employment_statuses],
  );

  const managerOptions = useMemo(
    () => users.filter((user) => ["line_manager", "department_head", "management_hr"].includes(user.role)),
    [users],
  );

  const visibleEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const searchable = [
        employee.name,
        employee.emp_code,
        employee.email,
        employee.phone,
        employee.department,
        employee.sub_department,
        employee.position,
        employee.job_grade,
      ].join(" ").toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesDepartment = departmentFilter === "all" || employee.department === departmentFilter;
      const matchesContract = contractFilter === "all" || employee.contract_type === contractFilter;
      const normalizedStatus = String(employee.status || "").toLowerCase().replaceAll("_", " ");
      const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;
      return matchesSearch && matchesDepartment && matchesContract && matchesStatus;
    });
  }, [contractFilter, departmentFilter, employees, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleEmployees.length / 10));
  const pageEmployees = visibleEmployees.slice((page - 1) * 10, page * 10);
  const activeCount = employees.filter((employee) => String(employee.status || "").toLowerCase() === "active").length;
  const leaveCount = employees.filter((employee) => String(employee.status || "").toLowerCase().includes("leave")).length;
  const inactiveCount = employees.filter((employee) => {
    const statusValue = String(employee.status || "").toLowerCase();
    return statusValue.includes("inactive") || statusValue.includes("resign");
  }).length;
  const payrollSummary = useMemo(() => {
    const totalGross = payroll.reduce((sum, row) => sum + numberValue(row.gross_pay), 0);
    const totalNet = payroll.reduce((sum, row) => sum + numberValue(row.net_pay), 0);
    const submitted = payroll.filter((row) => row.status === "submitted").length;
    const approved = payroll.filter((row) => row.status === "approved" || row.status === "paid").length;
    return { totalGross, totalNet, submitted, approved };
  }, [payroll]);
  const payrollDashboard = useMemo(() => {
    const rows = payroll;
    const totalPayroll = rows.reduce((sum, row) => sum + numberValue(row.net_pay), 0);
    const totalBasic = rows.reduce((sum, row) => sum + numberValue(row.basic_salary), 0);
    const allowances = rows.reduce((sum, row) => sum + numberValue(row.allowances) + numberValue(row.benefits), 0);
    const overtime = rows.reduce((sum, row) => sum + numberValue(row.overtime_amount), 0);
    const bonus = rows.reduce((sum, row) => sum + numberValue(row.bonus) + Math.max(numberValue(row.salary_adjustment), 0), 0);
    const deductions = rows.reduce((sum, row) => sum + numberValue(row.tax_deduction) + numberValue(row.nssf_deduction) + numberValue(row.other_deductions) + Math.max(numberValue(row.salary_adjustment) * -1, 0), 0);
    const grouped = new Map();
    payrollHistory.forEach((row) => {
      const key = `${row.period_year}-${String(row.period_month).padStart(2, "0")}`;
      const current = grouped.get(key) || {
        key,
        year: row.period_year,
        month: row.period_month,
        employees: new Set(),
        totalPayroll: 0,
        totalBasic: 0,
        allowances: 0,
        overtime: 0,
        bonus: 0,
        deductions: 0,
        statuses: [],
        records: [],
      };
      current.employees.add(row.user_id);
      current.totalPayroll += numberValue(row.net_pay);
      current.totalBasic += numberValue(row.basic_salary);
      current.allowances += numberValue(row.allowances) + numberValue(row.benefits);
      current.overtime += numberValue(row.overtime_amount);
      current.bonus += numberValue(row.bonus) + Math.max(numberValue(row.salary_adjustment), 0);
      current.deductions += numberValue(row.tax_deduction) + numberValue(row.nssf_deduction) + numberValue(row.other_deductions) + Math.max(numberValue(row.salary_adjustment) * -1, 0);
      current.statuses.push(row.status);
      current.records.push(row);
      grouped.set(key, current);
    });

    const runs = [...grouped.values()]
      .map((run) => {
        const statusSet = new Set(run.statuses);
        const status = statusSet.size === 1
          ? run.statuses[0]
          : run.statuses.every((statusValue) => ["approved", "paid"].includes(statusValue))
            ? "approved"
            : statusSet.has("submitted")
              ? "submitted"
              : statusSet.has("rejected")
                ? "rejected"
                : statusSet.has("draft")
                  ? "draft"
                  : "mixed";
        return {
          ...run,
          employees: run.employees.size,
          status,
        };
      })
      .sort((a, b) => (b.year - a.year) || (b.month - a.month));
    const trend = runs
      .slice(0, 6)
      .reverse()
      .map((run) => ({
        label: new Date(Number(run.year), Number(run.month) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        payroll: Math.round(run.totalPayroll),
      }));
    const costItems = [
      { name: "Basic Salary", value: totalBasic, color: payrollChartColors.basic },
      { name: "Allowances", value: allowances, color: payrollChartColors.allowances },
      { name: "Overtime", value: overtime, color: payrollChartColors.overtime },
      { name: "Bonus", value: bonus, color: payrollChartColors.bonus },
      { name: "Deductions", value: deductions, color: payrollChartColors.deductions },
    ].filter((item) => item.value > 0);
    return {
      totalPayroll,
      totalBasic,
      allowances,
      overtime,
      bonus,
      deductions,
      runs,
      trend,
      costItems,
    };
  }, [payroll, payrollHistory]);
  const payrollPreview = useMemo(() => {
    const gross = cents(
      numberValue(payrollForm.basic_salary)
      + numberValue(payrollForm.overtime_amount)
      + numberValue(payrollForm.allowances)
      + numberValue(payrollForm.bonus)
      + numberValue(payrollForm.benefits)
      + numberValue(payrollForm.salary_adjustment),
    );
    const nssf = payrollForm.auto_calculate_contributions
      ? cents(numberValue(payrollForm.basic_salary) * nssfRate)
      : numberValue(payrollForm.nssf_deduction);
    const tax = payrollForm.auto_calculate_contributions
      ? cents(gross >= taxThreshold ? gross * taxRate : 0)
      : numberValue(payrollForm.tax_deduction);
    const deductions = cents(tax + nssf + numberValue(payrollForm.other_deductions));
    return { gross, tax, nssf, deductions, net: cents(gross - deductions) };
  }, [payrollForm]);

  const reportDepartmentData = useMemo(() => {
    const source = reports?.headcount?.length ? reports.headcount : [];
    const fallback = new Map();
    employees.forEach((employee) => {
      const department = employee.department || "Unassigned";
      fallback.set(department, (fallback.get(department) || 0) + 1);
    });
    const rows = source.length
      ? source
      : [...fallback.entries()].map(([department, count]) => ({ department, count }));

    return rows
      .map((row, index) => ({
        name: row.department || "Unassigned",
        value: Number(row.count || 0),
        color: reportChartColors[index % reportChartColors.length],
      }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [employees, reports?.headcount]);

  const reportDashboard = useMemo(() => {
    const totalEmployees = dashboard?.total_employees ?? employees.length;
    const grossPay = payroll.reduce((sum, row) => sum + numberValue(row.gross_pay), 0);
    const netPay = payrollDashboard.totalPayroll || numberValue(reports?.payroll?.net_pay_total);
    const taxTotal = numberValue(reports?.payroll?.tax_total);
    const nssfTotal = numberValue(reports?.payroll?.nssf_total);
    const deductions = payrollDashboard.deductions || taxTotal + nssfTotal;
    const attendanceRecords = Number(reports?.attendance?.records || 0);
    const lateRecords = Number(reports?.attendance?.late || 0);
    const earlyLeaveRecords = Number(reports?.attendance?.early_leave || 0);
    const presentRecords = Math.max(0, attendanceRecords - lateRecords - earlyLeaveRecords);
    const attendanceRate = attendanceRecords
      ? Math.round((presentRecords / attendanceRecords) * 1000) / 10
      : 0;
    const completedTraining = Number(reports?.training?.completed || 0);
    const plannedTraining = Number(reports?.training?.planned || 0);
    const performanceAverage = performance.length
      ? Math.round(performance.reduce((sum, review) => sum + numberValue(review.score), 0) / performance.length)
      : 0;
    const trendStep = Math.max(1, Math.round(totalEmployees * 0.018));
    const trend = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Number(payrollPeriod.year), Number(payrollPeriod.month) - 6 + index, 1);
      return {
        label: date.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        headcount: Math.max(0, totalEmployees - (5 - index) * trendStep),
      };
    });
    const previousHeadcount = trend[4]?.headcount || 0;
    const attendanceData = [
      { name: "Present", value: presentRecords || Math.max(0, activeCount - leaveCount), color: "#16a34a" },
      { name: "Late", value: lateRecords, color: "#f59e0b" },
      { name: "Early Leave", value: earlyLeaveRecords, color: "#ef4444" },
      { name: "On Leave", value: leaveCount, color: "#2563eb" },
    ].filter((item) => item.value > 0);
    const leaveSummary = [
      { type: "Annual Leave", value: leaveCount || 0 },
      { type: "Sick Leave", value: Math.max(0, Math.round(leaveCount / 3)) },
      { type: "Special Leave", value: Math.max(0, Math.round(leaveCount / 4)) },
      { type: "Unpaid Leave", value: 0 },
    ];
    const overtimeEmployees = payroll
      .filter((row) => numberValue(row.overtime_amount) > 0)
      .sort((a, b) => numberValue(b.overtime_amount) - numberValue(a.overtime_amount))
      .slice(0, 5)
      .map((row) => ({
        name: row.employee_name,
        department: row.department || "-",
        hours: Math.round((numberValue(row.overtime_amount) / 8) * 10) / 10,
      }));

    return {
      totalEmployees,
      grossPay,
      netPay,
      deductions,
      attendanceRate,
      attendanceRecords,
      lateRecords,
      earlyLeaveRecords,
      presentRecords,
      completedTraining,
      plannedTraining,
      performanceAverage,
      trend,
      headcountGrowth: totalEmployees - previousHeadcount,
      attendanceData,
      leaveSummary,
      overtimeEmployees,
    };
  }, [
    activeCount,
    dashboard?.total_employees,
    employees.length,
    leaveCount,
    payroll,
    payrollDashboard.deductions,
    payrollDashboard.totalPayroll,
    payrollPeriod.month,
    payrollPeriod.year,
    performance,
    reports?.attendance?.early_leave,
    reports?.attendance?.late,
    reports?.attendance?.records,
    reports?.payroll?.net_pay_total,
    reports?.payroll?.nssf_total,
    reports?.payroll?.tax_total,
    reports?.training?.completed,
    reports?.training?.planned,
  ]);

  const reportPeriodEnd = new Date(Number(payrollPeriod.year), Number(payrollPeriod.month), 0);
  const reportGeneratedDate = reportPeriodEnd.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const reportPeriodName = payrollMonthLabel(payrollPeriod.year, payrollPeriod.month);
  const totalDepartmentEmployees = reportDepartmentData.reduce((sum, row) => sum + row.value, 0) || 1;

  const buildEmployeeChangeHistory = (previous, next) => {
    if (!previous) return [];

    const effectiveDate = new Date().toISOString().slice(0, 10);
    const changes = [];
    const previousSalary = numberValue(previous.basic_salary);
    const nextSalary = numberValue(next.basic_salary);

    if (previousSalary !== nextSalary) {
      const increase = nextSalary > previousSalary;
      changes.push({
        user_id: Number(next.user_id),
        event_type: increase ? "salary_increase" : "salary_change",
        title: increase ? "Salary increase" : "Salary changed",
        description: `Basic salary changed from $${money(previousSalary)} to $${money(nextSalary)}.`,
        effective_date: effectiveDate,
      });
    }

    if (String(previous.position || "") !== String(next.position || "")) {
      changes.push({
        user_id: Number(next.user_id),
        event_type: "promotion",
        title: "Position updated",
        description: `Position changed from ${previous.position || "-"} to ${next.position || "-"}.`,
        effective_date: effectiveDate,
      });
    }

    if (String(previous.sub_department || "") !== String(next.sub_department || "")) {
      changes.push({
        user_id: Number(next.user_id),
        event_type: "sub_department_change",
        title: "Subdepartment updated",
        description: `Subdepartment changed from ${previous.sub_department || "-"} to ${next.sub_department || "-"}.`,
        effective_date: effectiveDate,
      });
    }

    if (String(previous.job_grade || "") !== String(next.job_grade || "")) {
      changes.push({
        user_id: Number(next.user_id),
        event_type: "job_grade_change",
        title: "Job grade updated",
        description: `Job grade changed from ${previous.job_grade || "-"} to ${next.job_grade || "-"}.`,
        effective_date: effectiveDate,
      });
    }

    if (String(previous.contract_type || "") !== String(next.contract_type || "")) {
      changes.push({
        user_id: Number(next.user_id),
        event_type: "contract_change",
        title: "Contract updated",
        description: `Contract changed from ${formatContract(previous.contract_type)} to ${formatContract(next.contract_type)}.`,
        effective_date: effectiveDate,
      });
    }

    if (String(previous.status || "") !== String(next.status || "")) {
      changes.push({
        user_id: Number(next.user_id),
        event_type: "status_change",
        title: "Employment status updated",
        description: `Status changed from ${formatContract(previous.status)} to ${formatContract(next.status)}.`,
        effective_date: effectiveDate,
      });
    }

    return changes;
  };

  const saveEmployee = async (event) => {
    event.preventDefault();
    if (!canManageEmployees) return;

    const creatingNewAccount = !employeeForm.user_id;

    if (creatingNewAccount) {
      if (!newEmployee.first_name.trim() || !newEmployee.last_name.trim() || !newEmployee.email.trim()) {
        setStatus("First name, last name, and email are required");
        setDrawerTab("personal");
        return;
      }
      if (!newEmployee.department.trim() || !newEmployee.temporary_password.trim()) {
        setStatus("Department and temporary password are required");
        setDrawerTab("job");
        return;
      }
    }

    try {
      const movementRecords = creatingNewAccount ? [] : buildEmployeeChangeHistory(editingEmployee, employeeForm);

      if (creatingNewAccount) {
        await api.post("/api/hris/employees/new", {
          ...employeeForm,
          first_name: newEmployee.first_name,
          last_name: newEmployee.last_name,
          email: newEmployee.email,
          role: newEmployee.role,
          department: newEmployee.department,
          password: newEmployee.temporary_password,
          phone: newEmployee.phone || employeeForm.phone,
          address: newEmployee.address || employeeForm.address,
          profile_photo: newEmployee.profile_photo || null,
          manager_id: newEmployee.manager_id ? Number(newEmployee.manager_id) : null,
          basic_salary: Number(employeeForm.basic_salary || 0),
          contract_end_date: employeeForm.contract_end_date || null,
        });
      } else {
        await api.post("/api/hris/employees", {
          ...employeeForm,
          phone: newEmployee.phone || employeeForm.phone,
          address: newEmployee.address || employeeForm.address,
          profile_photo: newEmployee.profile_photo || null,
          user_id: Number(employeeForm.user_id),
          basic_salary: Number(employeeForm.basic_salary || 0),
          contract_end_date: employeeForm.contract_end_date || null,
        });
      }

      if (movementRecords.length) {
        await Promise.all(movementRecords.map((record) => api.post("/api/hris/employee-history", record)));
      }

      setEmployeeForm(defaultEmployeeForm);
      setNewEmployee(defaultNewEmployee);
      setEditingEmployee(null);
      setDrawerTab("personal");
      setDrawerOpen(false);
      setDetailEmployee(null);
      setStatus(
        creatingNewAccount
          ? "New staff account created"
          : movementRecords.length
            ? "Employee profile saved and movement history updated"
            : "Employee profile saved",
      );
      await load();
    } catch (err) {
      setStatus(err?.response?.data?.detail || "Could not save employee");
    }
  };

  const editEmployee = (employee) => {
    const [firstName = "", ...lastNameParts] = String(employee.name || "").split(" ");
    setEmployeeForm({
      user_id: employee.user_id,
      phone: employee.phone || "",
      address: employee.address || "",
      position: employee.position || "",
      sub_department: employee.sub_department || "",
      job_grade: employee.job_grade || "",
      contract_type: employee.contract_type || "permanent",
      contract_start_date: String(employee.contract_start_date || "2026-01-01").slice(0, 10),
      contract_end_date: employee.contract_end_date || "",
      basic_salary: String(employee.basic_salary || "900"),
      bank_account: employee.bank_account || "",
      status: employee.status || "active",
    });
    setNewEmployee({
      ...defaultNewEmployee,
      first_name: firstName,
      last_name: lastNameParts.join(" "),
      email: employee.email || "",
      phone: employee.phone || "",
      address: employee.address || "",
      profile_photo: employee.profile_photo || "",
    });
    setEditingEmployee(employee);
    setDrawerTab("job");
    setDrawerOpen(true);
  };

  const savePayroll = async (event) => {
    event.preventDefault();
    const nextPeriod = {
      year: Number(payrollForm.period_year || currentYear),
      month: Number(payrollForm.period_month || currentMonth),
    };
    await api.post("/api/hris/payroll", {
      ...payrollForm,
      user_id: Number(payrollForm.user_id),
      period_year: nextPeriod.year,
      period_month: nextPeriod.month,
      basic_salary: Number(payrollForm.basic_salary || 0),
      overtime_amount: Number(payrollForm.overtime_amount || 0),
      allowances: Number(payrollForm.allowances || 0),
      bonus: Number(payrollForm.bonus || 0),
      benefits: Number(payrollForm.benefits || 0),
      salary_adjustment: Number(payrollForm.salary_adjustment || 0),
      tax_deduction: Number(payrollForm.tax_deduction || 0),
      nssf_deduction: Number(payrollForm.nssf_deduction || 0),
      other_deductions: Number(payrollForm.other_deductions || 0),
      auto_calculate_contributions: Boolean(payrollForm.auto_calculate_contributions),
    });
    setPayrollPeriod(nextPeriod);
    setPayrollForm(defaultPayrollForm);
    setStatus("Payroll record saved");
    await load(nextPeriod);
  };

  const fillPayrollFromEmployee = (userId) => {
    const employee = employees.find((row) => String(row.user_id) === String(userId));
    setPayrollForm((form) => ({
      ...form,
      user_id: userId,
      basic_salary: employee ? String(employee.basic_salary || 0) : form.basic_salary,
      period_year: payrollPeriod.year,
      period_month: payrollPeriod.month,
    }));
  };

  const generatePayroll = async () => {
    const nextPeriod = {
      year: Number(payrollPeriod.year || currentYear),
      month: Number(payrollPeriod.month || currentMonth),
    };
    const { data } = await api.post("/api/hris/payroll/generate", {
      period_year: nextPeriod.year,
      period_month: nextPeriod.month,
      allowances: 0,
      bonus: 0,
      benefits: 0,
      salary_adjustment: 0,
      other_deductions: 0,
      status: "draft",
    });
    setStatus(data?.message || "Payroll generated");
    await load(nextPeriod);
  };

  const updatePayrollStatus = async (recordId, nextStatus) => {
    await api.post(`/api/hris/payroll/${recordId}/status`, { status: nextStatus });
    setStatus(`Payroll marked ${nextStatus}`);
    await load();
  };

  const updatePayrollRunStatus = async (run, nextStatus) => {
    const allowedCurrentStatuses = {
      submitted: ["draft", "rejected"],
      approved: ["submitted"],
      rejected: ["submitted"],
      paid: ["approved"],
    };
    const eligibleRecords = run.records.filter((record) =>
      allowedCurrentStatuses[nextStatus]?.includes(record.status),
    );

    if (!eligibleRecords.length) {
      setStatus(`No payroll records in this run can be marked ${nextStatus}`);
      return;
    }

    await Promise.all(
      eligibleRecords.map((record) =>
        api.post(`/api/hris/payroll/${record.id}/status`, { status: nextStatus }),
      ),
    );
    setPayrollPeriod({ year: Number(run.year), month: Number(run.month) });
    setStatus(`${eligibleRecords.length} payroll record(s) marked ${nextStatus}`);
    await load({ year: Number(run.year), month: Number(run.month) });
  };

  const openPayslip = (recordId) => {
    window.open(`${api.defaults.baseURL}/api/hris/payroll/payslip/${recordId}`, "_blank");
  };

  const savePerformance = async (event) => {
    event.preventDefault();
    await api.post("/api/hris/performance", {
      ...performanceForm,
      user_id: Number(performanceForm.user_id),
      score: Number(performanceForm.score || 0),
    });
    setPerformanceForm(defaultPerformanceForm);
    setStatus("Performance review saved");
    await load();
  };

  const exportBankFile = () => {
    window.open(`${api.defaults.baseURL}/api/hris/payroll/bank-export?year=${payrollPeriod.year}&month=${payrollPeriod.month}`, "_blank");
  };

  const openEmployeeDetail = async (employee) => {
    setDetailEmployee(employee);
    setDetailTab("overview");
    setEmployeeHistory([]);
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/api/hris/employee-history/${employee.user_id}`);
      setEmployeeHistory(data || []);
    } catch (err) {
      setStatus(err?.response?.data?.detail || "Could not load employee movement history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const movementSummary = (request) => {
    const changes = [];
    if (request.proposed_position && request.proposed_position !== request.current_position) {
      changes.push(`${request.current_position || "-"} -> ${request.proposed_position}`);
    }
    if (request.proposed_department && request.proposed_department !== request.current_department) {
      changes.push(`${request.current_department || "-"} -> ${request.proposed_department}`);
    }
    if (request.proposed_sub_department && request.proposed_sub_department !== request.current_sub_department) {
      changes.push(`${request.current_sub_department || "-"} -> ${request.proposed_sub_department}`);
    }
    if (request.proposed_job_grade && request.proposed_job_grade !== request.current_job_grade) {
      changes.push(`${request.current_job_grade || "-"} -> ${request.proposed_job_grade}`);
    }
    if (request.proposed_salary !== null && request.proposed_salary !== undefined && numberValue(request.proposed_salary) !== numberValue(request.current_salary)) {
      changes.push(`$${money(request.current_salary)} -> $${money(request.proposed_salary)}`);
    }
    if (request.proposed_contract_type && request.proposed_contract_type !== request.current_contract_type) {
      changes.push(`${formatContract(request.current_contract_type)} -> ${formatContract(request.proposed_contract_type)}`);
    }
    if (request.proposed_status && request.proposed_status !== request.current_status) {
      changes.push(`${formatContract(request.current_status)} -> ${formatContract(request.proposed_status)}`);
    }
    return changes.length ? changes.join("; ") : "-";
  };

  const submitMovementRequest = async (payload) => {
    try {
      await api.post("/api/hris/movement-requests", payload);
      setMovementEmployee(null);
      setStatus("Movement request submitted for HR review");
      await load();
    } catch (err) {
      setStatus(err?.response?.data?.detail || "Could not submit movement request");
    }
  };

  const reviewMovementRequest = async (requestId, nextStatus) => {
    try {
      await api.put(`/api/hris/movement-requests/${requestId}/review`, {
        status: nextStatus,
      });
      setStatus(nextStatus === "approved" ? "Movement request approved" : "Movement request rejected");
      await load();
    } catch (err) {
      setStatus(err?.response?.data?.detail || "Could not review movement request");
    }
  };

  const saveLookupSettings = async (event) => {
    event.preventDefault();
    if (!canManageEmployees) return;
    try {
      const { data } = await api.put("/api/hris/lookup-settings", lookupDrafts);
      setLookupSettings({ ...defaultLookupSettings, ...(data || {}) });
      setLookupDrafts({ ...defaultLookupSettings, ...(data || {}) });
      setStatus("HRIS lookup settings saved");
    } catch (err) {
      setStatus(err?.response?.data?.detail || "Could not save lookup settings");
    }
  };

  const openCreateDrawer = () => {
    setEmployeeForm(defaultEmployeeForm);
    setNewEmployee(defaultNewEmployee);
    setEditingEmployee(null);
    setDrawerTab("personal");
    setDrawerOpen(true);
  };

  const detailPayrollRows = useMemo(
    () => payrollHistory.filter((row) => String(row.user_id) === String(detailEmployee?.user_id)),
    [detailEmployee?.user_id, payrollHistory],
  );

  const detailPerformanceRows = useMemo(
    () => performance.filter((review) => String(review.user_id) === String(detailEmployee?.user_id)),
    [detailEmployee?.user_id, performance],
  );

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-[#f7f9fc] px-4 py-7 md:px-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        {status && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{status}</div>
        )}

        {activeTab === "employees" && (
          <>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-950">Employee Database</h1>
              <div className="mt-2 flex items-center gap-2 text-sm font-bold">
                <span className="text-blue-600">Dashboard</span>
                <FiChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                <span className="text-slate-500">Employee Database</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Employees" value={dashboard?.total_employees ?? employees.length} icon={FiUsers} tone="bg-blue-50 text-blue-600" />
              <StatCard label="Active Employees" value={dashboard?.active_profiles ?? activeCount} icon={FiUserCheck} tone="bg-emerald-50 text-emerald-600" />
              <StatCard label="On Leave" value={leaveCount} icon={FiUserMinus} tone="bg-amber-50 text-amber-600" />
              <StatCard label="Resigned/Inactive" value={inactiveCount} icon={FiUserMinus} tone="bg-red-50 text-red-600" />
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-4 xl:flex-row xl:items-end xl:justify-between">
                <label className="relative block w-full xl:max-w-md">
                  <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-md border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500" placeholder="Search by name, ID, email or phone..." />
                </label>

                <div className="flex flex-wrap items-end gap-3">
                  <FilterSelect label="Department" value={departmentFilter} onChange={setDepartmentFilter} options={[{ value: "all", label: "All Departments" }, ...departments.map((department) => ({ value: department, label: department }))]} />
                  <FilterSelect label="Employment Type" value={contractFilter} onChange={setContractFilter} options={[{ value: "all", label: "All Types" }, ...contractTypes.map((contract) => ({ value: contract, label: formatContract(contract) }))]} />
                  <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All Status" }, { value: "active", label: "Active" }, { value: "on leave", label: "On Leave" }, { value: "inactive", label: "Inactive" }]} />
                  <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><FiFilter className="h-4 w-4" aria-hidden />Filter</button>
                  <button type="button" onClick={openCreateDrawer} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20"><FiPlus className="h-5 w-5" aria-hidden />Add Employee</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1360px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-extrabold text-slate-600">
                    <tr>
                      <th className="px-5 py-4">Employee ID</th>
                      <th className="px-5 py-4">Name</th>
                      <th className="px-5 py-4">Department</th>
                      <th className="px-5 py-4">Subdepartment</th>
                      <th className="px-5 py-4">Position</th>
                      <th className="px-5 py-4">Job Grade</th>
                      <th className="px-5 py-4">Contract Type</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Phone</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageEmployees.length === 0 ? (
                      <TableEmpty loading={loading} colSpan={11} />
                    ) : (
                      pageEmployees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-4 font-bold text-slate-700">{employee.emp_code}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={employee.name} src={employee.profile_photo} />
                              <span className="font-extrabold text-slate-950">{employee.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-700">{employee.department || "-"}</td>
                          <td className="px-5 py-4 font-semibold text-slate-700">{employee.sub_department || "-"}</td>
                          <td className="px-5 py-4 font-semibold text-slate-700">{employee.position || "-"}</td>
                          <td className="px-5 py-4 font-semibold text-slate-700">{employee.job_grade || "-"}</td>
                          <td className="px-5 py-4 font-semibold text-slate-700">{formatContract(employee.contract_type)}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-md px-3 py-1.5 text-xs font-extrabold ${statusTone(employee.status)}`}>{formatContract(employee.status || "active")}</span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-700">{employee.email || "-"}</td>
                          <td className="px-5 py-4 font-semibold text-slate-700">{employee.phone || "-"}</td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => openEmployeeDetail(employee)} className="grid h-9 w-9 place-items-center rounded-md text-slate-700 hover:bg-slate-100" aria-label={`View ${employee.name}`}>
                                <FiEye className="h-4 w-4" aria-hidden />
                              </button>
                              <button type="button" onClick={() => editEmployee(employee)} className="grid h-9 w-9 place-items-center rounded-md text-slate-700 hover:bg-blue-50 hover:text-blue-700" aria-label={`Edit ${employee.name}`}>
                                <FiEdit2 className="h-4 w-4" aria-hidden />
                              </button>
                              {canRequestMovement && (
                                <button type="button" onClick={() => setMovementEmployee(employee)} className="grid h-9 w-9 place-items-center rounded-md text-slate-700 hover:bg-emerald-50 hover:text-emerald-700" aria-label={`Request movement for ${employee.name}`}>
                                  <FiTrendingUp className="h-4 w-4" aria-hidden />
                                </button>
                              )}
                              <button type="button" className="grid h-9 w-9 place-items-center rounded-md text-slate-700 hover:bg-slate-100" aria-label={`More actions for ${employee.name}`}>
                                <FiMoreVertical className="h-5 w-5" aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm font-semibold text-slate-500">Showing {visibleEmployees.length ? (page - 1) * 10 + 1 : 0} to {Math.min(page * 10, visibleEmployees.length)} of {visibleEmployees.length} entries</p>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40" disabled={page === 1} aria-label="Previous page"><FiChevronLeft className="h-4 w-4" aria-hidden /></button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`h-9 min-w-9 rounded-md border px-3 text-sm font-bold ${page === pageNumber ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                        {pageNumber}
                      </button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-sm font-bold text-slate-400">...</span>
                      <button type="button" onClick={() => setPage(totalPages)} className="h-9 min-w-9 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50">{totalPages}</button>
                    </>
                  )}
                  <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40" disabled={page === totalPages} aria-label="Next page"><FiChevronRight className="h-4 w-4" aria-hidden /></button>
                </div>
              </div>
            </div>
            {canRequestMovement && (
              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-950">Employee Movement Requests</h2>
                    <p className="text-sm font-semibold text-slate-500">Promotion, salary, transfer, contract, and status requests</p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">
                    {movementRequests.filter((request) => request.status === "pending").length} pending
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-extrabold uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Employee</th>
                        <th className="px-5 py-4">Type</th>
                        <th className="px-5 py-4">Requested Change</th>
                        <th className="px-5 py-4">Effective</th>
                        <th className="px-5 py-4">Requested By</th>
                        <th className="px-5 py-4">Status</th>
                        {canManageEmployees && <th className="px-5 py-4 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movementRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <p className="font-extrabold text-slate-950">{request.employee_name || "-"}</p>
                            <p className="text-xs font-bold text-slate-400">{request.employee_code || "-"}</p>
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-700">{formatContract(request.movement_type)}</td>
                          <td className="px-5 py-4 font-semibold text-slate-600">{movementSummary(request)}</td>
                          <td className="px-5 py-4 font-semibold text-slate-600">{String(request.effective_date || "").slice(0, 10) || "-"}</td>
                          <td className="px-5 py-4 font-semibold text-slate-600">{request.requested_by_name || "-"}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-md px-3 py-1.5 text-xs font-extrabold ${request.status === "approved" ? "bg-emerald-50 text-emerald-700" : request.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                              {formatContract(request.status)}
                            </span>
                          </td>
                          {canManageEmployees && (
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => reviewMovementRequest(request.id, "approved")} disabled={request.status !== "pending"} className="grid h-9 w-9 place-items-center rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40" title="Approve movement">
                                  <FiCheckCircle className="h-4 w-4" aria-hidden />
                                </button>
                                <button type="button" onClick={() => reviewMovementRequest(request.id, "rejected")} disabled={request.status !== "pending"} className="grid h-9 w-9 place-items-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40" title="Reject movement">
                                  <FiXCircle className="h-4 w-4" aria-hidden />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                      {movementRequests.length === 0 && (
                        <tr>
                          <td colSpan={canManageEmployees ? 7 : 6} className="px-5 py-10 text-center text-sm font-bold text-slate-400">
                            No employee movement requests yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === "payroll" && (canPayroll ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-[#111827]">Payroll Management</h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">Run payroll, review costs, approve records, and export payments</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex h-10 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 md:w-72">
                  <FiSearch className="h-4 w-4 text-slate-400" aria-hidden />
                  <input value={payrollRunSearch} onChange={(event) => setPayrollRunSearch(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-400" placeholder="Search payroll runs..." />
                </label>
                <button type="button" onClick={generatePayroll} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#4f46e5] px-4 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/20">
                  <FiPlus className="h-4 w-4" aria-hidden />
                  New Payroll Run
                </button>
              </div>
            </div>

            <div className="flex gap-8 border-b border-slate-200 bg-white px-4">
              {payrollSubtabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPayrollSubtab(tab.id)}
                  className={`h-12 border-b-2 px-1 text-sm font-extrabold ${payrollSubtab === tab.id ? "border-[#4f46e5] text-[#4f46e5]" : "border-transparent text-slate-700 hover:text-[#4f46e5]"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <FilterSelect label="Year" value={payrollPeriod.year} onChange={(value) => setPayrollPeriod((period) => ({ ...period, year: Number(value) }))} options={[currentYear - 1, currentYear, currentYear + 1].map((year) => ({ value: year, label: year }))} />
              <FilterSelect label="Month" value={payrollPeriod.month} onChange={(value) => setPayrollPeriod((period) => ({ ...period, month: Number(value) }))} options={Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: String(index + 1).padStart(2, "0") }))} />
              <button type="button" onClick={exportBankFile} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                <FiDownload className="h-4 w-4" aria-hidden />
                Bank File
              </button>
            </div>

            {payrollSubtab === "dashboard" && (
              <>
            <div className="grid gap-4 lg:grid-cols-4">
              <PayrollMetricCard label="Total Payroll" value={`$${money(payrollDashboard.totalPayroll)}`} helper="This month" trend="+12.5% vs last month" icon={FiCreditCard} tone="bg-blue-50 text-blue-600" />
              <PayrollMetricCard label="Total Employees" value={employees.length} helper="This month" trend={`${Math.max(0, employees.length - payroll.length)} pending`} icon={FiUsers} tone="bg-emerald-50 text-emerald-600" />
              <PayrollMetricCard label="Total Basic Salary" value={`$${money(payrollDashboard.totalBasic)}`} helper="This month" trend="+10.8% vs last month" icon={FiFileText} tone="bg-amber-50 text-amber-600" />
              <PayrollMetricCard label="Payroll Period" value={payrollMonthLabel(payrollPeriod.year, payrollPeriod.month)} helper={payrollPeriodLabel(payrollPeriod.year, payrollPeriod.month)} icon={FiCalendar} tone="bg-violet-50 text-violet-600" />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,1fr)]">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-extrabold text-[#111827]">Payroll Expenses Overview</h2>
                  <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none">
                    <option>6 Months</option>
                  </select>
                </div>
                <div className="mt-5 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={payrollDashboard.trend} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="payrollFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3f6ee8" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#3f6ee8" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#475569", fontWeight: 700 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#475569", fontWeight: 700 }} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                      <Tooltip formatter={(value) => [`$${money(value)}`, "Payroll"]} />
                      <Area type="monotone" dataKey="payroll" stroke="#2458e8" strokeWidth={3} fill="url(#payrollFill)" dot={{ r: 4, fill: "#2458e8" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-extrabold text-[#111827]">Payroll Cost Breakdown</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="relative h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={payrollDashboard.costItems} innerRadius={70} outerRadius={105} dataKey="value" paddingAngle={2}>
                          {payrollDashboard.costItems.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                      <div>
                        <p className="text-xs font-bold text-slate-500">Total</p>
                        <p className="mt-1 text-lg font-extrabold text-[#111827]">${money(payrollDashboard.totalPayroll)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid content-center gap-3">
                    {payrollDashboard.costItems.map((item) => (
                      <div key={item.name} className="flex items-start gap-3">
                        <span className="mt-1 h-3 w-3 rounded" style={{ backgroundColor: item.color }} />
                        <div>
                          <p className="text-sm font-extrabold text-slate-700">{item.name}</p>
                          <p className="text-sm font-semibold text-slate-500">${money(item.value)} ({payrollDashboard.totalPayroll ? money((item.value / payrollDashboard.totalPayroll) * 100) : "0.00"}%)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
              </>
            )}

            {["dashboard", "runs"].includes(payrollSubtab) && (
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-extrabold text-[#111827]">Payroll Runs</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                    <FiFilter className="h-4 w-4" aria-hidden />
                    Filter
                  </button>
                  <label className="flex h-10 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 md:w-72">
                    <FiSearch className="h-4 w-4 text-slate-400" aria-hidden />
                    <input value={payrollRunSearch} onChange={(event) => setPayrollRunSearch(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-400" placeholder="Search payroll runs..." />
                  </label>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-extrabold uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Run No.</th>
                      <th className="px-5 py-4">Payroll Period</th>
                      <th className="px-5 py-4">Employees</th>
                      <th className="px-5 py-4">Total Payroll</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Created By</th>
                      <th className="px-5 py-4">Created Date</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payrollDashboard.runs.filter((run) => {
                      const query = payrollRunSearch.trim().toLowerCase();
                      return !query || `${run.key} ${payrollPeriodLabel(run.year, run.month)} ${run.status}`.toLowerCase().includes(query);
                    }).slice(0, 5).map((run, index) => (
                      <tr key={run.key} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4 font-bold text-slate-700">PR-{run.year}-{String(index + 1).padStart(4, "0")}</td>
                        <td className="px-5 py-4 font-semibold text-slate-700">{payrollPeriodLabel(run.year, run.month)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-700">{run.employees}</td>
                        <td className="px-5 py-4 font-semibold text-slate-700">${money(run.totalPayroll)}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-md px-3 py-1.5 text-xs font-extrabold ${payrollStatusTone(run.status)}`}>
                            {formatContract(run.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700">HR Manager</td>
                        <td className="px-5 py-4 font-semibold text-slate-700">{payrollMonthLabel(run.year, run.month)}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setPayrollPeriod({ year: Number(run.year), month: Number(run.month) })} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" title="View run"><FiEye className="h-4 w-4" aria-hidden /></button>
                            {["draft", "rejected"].includes(run.status) && (
                              <button type="button" onClick={() => updatePayrollRunStatus(run, "submitted")} className="grid h-9 w-9 place-items-center rounded-md border border-amber-200 text-amber-700 hover:bg-amber-50" title="Submit run"><FiSend className="h-4 w-4" aria-hidden /></button>
                            )}
                            {run.status === "submitted" && (
                              <button type="button" onClick={() => updatePayrollRunStatus(run, "approved")} className="grid h-9 w-9 place-items-center rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50" title="Approve run"><FiCheckCircle className="h-4 w-4" aria-hidden /></button>
                            )}
                            {run.status === "submitted" && (
                              <button type="button" onClick={() => updatePayrollRunStatus(run, "rejected")} className="grid h-9 w-9 place-items-center rounded-md border border-red-200 text-red-700 hover:bg-red-50" title="Reject run"><FiXCircle className="h-4 w-4" aria-hidden /></button>
                            )}
                            {["approved", "paid"].includes(run.status) && (
                              <button type="button" onClick={() => window.open(`${api.defaults.baseURL}/api/hris/payroll/bank-export?year=${run.year}&month=${run.month}`, "_blank")} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" title="Download bank file"><FiDownload className="h-4 w-4" aria-hidden /></button>
                            )}
                            {run.status === "approved" && (
                              <button type="button" onClick={() => updatePayrollRunStatus(run, "paid")} className="grid h-9 w-9 place-items-center rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50" title="Mark paid"><FiCreditCard className="h-4 w-4" aria-hidden /></button>
                            )}
                            <button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" title="More actions"><FiMoreVertical className="h-4 w-4" aria-hidden /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {payrollDashboard.runs.length === 0 && (
                      <tr><td colSpan={8} className="px-5 py-10 text-center text-sm font-bold text-slate-400">No payroll runs yet. Start by creating a new payroll run.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm font-semibold text-slate-500">Showing 1 to {Math.min(5, payrollDashboard.runs.length)} of {payrollDashboard.runs.length} entries</p>
                <div className="flex items-center justify-end gap-2">
                  {[1, 2, 3].map((pageNumber) => (
                    <button key={pageNumber} type="button" className={`h-9 min-w-9 rounded-md border px-3 text-sm font-bold ${pageNumber === 1 ? "border-[#4f46e5] bg-[#4f46e5] text-white" : "border-slate-200 text-slate-700"}`}>{pageNumber}</button>
                  ))}
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600"><FiChevronRight className="h-4 w-4" aria-hidden /></button>
                </div>
              </div>
            </section>
            )}

            {payrollSubtab === "employees" && (
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-[#111827]">Employee Payroll Details</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{payrollPeriodLabel(payrollPeriod.year, payrollPeriod.month)}</p>
                </div>
                <label className="flex h-10 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 md:w-80">
                  <FiSearch className="h-4 w-4 text-slate-400" aria-hidden />
                  <input value={payrollRunSearch} onChange={(event) => setPayrollRunSearch(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-400" placeholder="Search employee payroll..." />
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1280px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-extrabold uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Employee</th>
                      <th className="px-5 py-4">Department</th>
                      <th className="px-5 py-4">Basic</th>
                      <th className="px-5 py-4">Overtime</th>
                      <th className="px-5 py-4">Allowances</th>
                      <th className="px-5 py-4">Bonus</th>
                      <th className="px-5 py-4">Benefits</th>
                      <th className="px-5 py-4">Adjustment</th>
                      <th className="px-5 py-4">Tax</th>
                      <th className="px-5 py-4">NSSF</th>
                      <th className="px-5 py-4">Other Ded.</th>
                      <th className="px-5 py-4">Gross</th>
                      <th className="px-5 py-4">Net Pay</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payroll.filter((row) => {
                      const query = payrollRunSearch.trim().toLowerCase();
                      return !query || `${row.employee_name} ${row.department} ${row.status}`.toLowerCase().includes(query);
                    }).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4 font-extrabold text-slate-900">{row.employee_name}</td>
                        <td className="px-5 py-4 font-semibold text-slate-600">{row.department || "-"}</td>
                        <td className="px-5 py-4 font-semibold text-slate-600">${money(row.basic_salary)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-600">${money(row.overtime_amount)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-600">${money(row.allowances)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-600">${money(row.bonus)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-600">${money(row.benefits)}</td>
                        <td className={`px-5 py-4 font-semibold ${numberValue(row.salary_adjustment) < 0 ? "text-red-600" : "text-slate-600"}`}>${money(row.salary_adjustment)}</td>
                        <td className="px-5 py-4 font-semibold text-red-600">${money(row.tax_deduction)}</td>
                        <td className="px-5 py-4 font-semibold text-red-600">${money(row.nssf_deduction)}</td>
                        <td className="px-5 py-4 font-semibold text-red-600">${money(row.other_deductions)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-700">${money(row.gross_pay)}</td>
                        <td className="px-5 py-4 font-extrabold text-slate-950">${money(row.net_pay)}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-md px-3 py-1.5 text-xs font-extrabold ${payrollStatusTone(row.status)}`}>{formatContract(row.status)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => openPayslip(row.id)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" title="View payslip"><FiEye className="h-4 w-4" aria-hidden /></button>
                            {["draft", "rejected"].includes(row.status) && <button type="button" onClick={() => updatePayrollStatus(row.id, "submitted")} className="grid h-9 w-9 place-items-center rounded-md border border-amber-200 text-amber-700 hover:bg-amber-50" title="Submit"><FiSend className="h-4 w-4" aria-hidden /></button>}
                            {row.status === "submitted" && <button type="button" onClick={() => updatePayrollStatus(row.id, "approved")} className="grid h-9 w-9 place-items-center rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50" title="Approve"><FiCheckCircle className="h-4 w-4" aria-hidden /></button>}
                            {row.status === "submitted" && <button type="button" onClick={() => updatePayrollStatus(row.id, "rejected")} className="grid h-9 w-9 place-items-center rounded-md border border-red-200 text-red-700 hover:bg-red-50" title="Reject"><FiXCircle className="h-4 w-4" aria-hidden /></button>}
                            {row.status === "approved" && <button type="button" onClick={() => updatePayrollStatus(row.id, "paid")} className="grid h-9 w-9 place-items-center rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50" title="Mark paid"><FiCreditCard className="h-4 w-4" aria-hidden /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {payroll.length === 0 && (
                      <tr><td colSpan={15} className="px-5 py-10 text-center text-sm font-bold text-slate-400">No employee payroll records for this period yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            )}

            {payrollSubtab === "components" && (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <PayrollMetricCard label="Basic Salary" value={`$${money(payrollDashboard.totalBasic)}`} helper="Recurring component" icon={FiFileText} tone="bg-blue-50 text-blue-600" />
                <PayrollMetricCard label="Allowances + Benefits" value={`$${money(payrollDashboard.allowances)}`} helper="Positive additions" icon={FiPlus} tone="bg-emerald-50 text-emerald-600" />
                <PayrollMetricCard label="Overtime" value={`$${money(payrollDashboard.overtime)}`} helper="Attendance-based" icon={FiRefreshCw} tone="bg-amber-50 text-amber-600" />
                <PayrollMetricCard label="Bonus / Positive Adjustments" value={`$${money(payrollDashboard.bonus)}`} helper="Manual additions" icon={FiCheckCircle} tone="bg-violet-50 text-violet-600" />
              </section>
            )}

            {payrollSubtab === "deductions" && (
              <section className="grid gap-4 md:grid-cols-3">
                <PayrollMetricCard label="Tax Deductions" value={`$${money(payroll.reduce((sum, row) => sum + numberValue(row.tax_deduction), 0))}`} helper="Auto or manual" icon={FiFileText} tone="bg-red-50 text-red-600" />
                <PayrollMetricCard label="NSSF Contributions" value={`$${money(payroll.reduce((sum, row) => sum + numberValue(row.nssf_deduction), 0))}`} helper="2% of basic salary" icon={FiCreditCard} tone="bg-blue-50 text-blue-600" />
                <PayrollMetricCard label="Other Deductions" value={`$${money(payroll.reduce((sum, row) => sum + numberValue(row.other_deductions), 0))}`} helper="Manual deductions" icon={FiXCircle} tone="bg-amber-50 text-amber-600" />
              </section>
            )}

            {payrollSubtab === "structure" && (
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-extrabold text-[#111827]">Salary Structure</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {employees.map((employee) => (
                    <div key={employee.user_id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                      <div>
                        <p className="font-extrabold text-slate-900">{employee.name}</p>
                        <p className="text-sm font-semibold text-slate-500">{employee.department || "-"} - {employee.position || "-"}</p>
                      </div>
                      <span className="font-extrabold text-slate-950">${money(employee.basic_salary)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {payrollSubtab === "configuration" && (
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-extrabold text-[#111827]">Payroll Configuration</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-500">Tax Rule</p>
                    <p className="mt-1 text-lg font-extrabold text-slate-950">{taxRate * 100}% when gross pay is at least ${money(taxThreshold)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-500">NSSF Rule</p>
                    <p className="mt-1 text-lg font-extrabold text-slate-950">{nssfRate * 100}% of basic salary</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-500">Overtime Rule</p>
                    <p className="mt-1 text-lg font-extrabold text-slate-950">Hours above 8/day at 1.5x hourly rate</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">Payroll records are available to HR management and payroll officers.</div>
        ))}

        {activeTab === "performance" && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="overflow-hidden rounded-lg bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <h2 className="text-lg font-extrabold text-slate-950">Performance Management</h2>
                <p className="text-sm font-semibold text-slate-400">KPI tracking and appraisal history</p>
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {performance.map((review) => (
                  <div key={review.id} className="rounded-lg border border-slate-100 p-4">
                    <p className="text-sm font-extrabold text-slate-950">{review.employee_name}</p>
                    <p className="mt-1 text-xs font-bold uppercase text-slate-400">{review.review_period}</p>
                    <div className="mt-4 flex items-end justify-between">
                      <p className="text-3xl font-extrabold text-blue-700">{review.score}</p>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{review.status}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{review.rating}</p>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={savePerformance} className="rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-950">Appraisal Review</h3>
              <div className="mt-4 grid gap-3">
                <Field label="Employee">
                  <select className={inputClass} value={performanceForm.user_id} onChange={(event) => setPerformanceForm((form) => ({ ...form, user_id: event.target.value }))} required>
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee.user_id} value={employee.user_id}>{employee.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Score">
                  <input className={inputClass} type="number" min="0" max="100" value={performanceForm.score} onChange={(event) => setPerformanceForm((form) => ({ ...form, score: event.target.value }))} />
                </Field>
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-extrabold text-white"><FiPlus className="h-4 w-4" aria-hidden />Save Review</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-[#111b4f]">Reports & Analytics</h1>
                <div className="mt-2 flex items-center gap-2 text-sm font-bold">
                  <span className="text-blue-600">Home</span>
                  <FiChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                  <span className="text-slate-500">Reports & Analytics</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-[#111b4f]">
                  <FiCalendar className="h-4 w-4 text-blue-600" aria-hidden />
                  <select
                    value={payrollPeriod.month}
                    onChange={(event) => setPayrollPeriod((period) => ({ ...period, month: Number(event.target.value) }))}
                    className="bg-transparent outline-none"
                  >
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {new Date(2026, index, 1).toLocaleDateString(undefined, { month: "long" })}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={payrollPeriod.year}
                    onChange={(event) => setPayrollPeriod((period) => ({ ...period, year: Number(event.target.value) }))}
                    className="w-20 bg-transparent outline-none"
                    aria-label="Report year"
                  />
                </div>
                <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-bold text-[#111b4f] hover:bg-slate-50">
                  <FiFilter className="h-4 w-4" aria-hidden />
                  Filter
                </button>
                <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-bold text-[#111b4f] hover:bg-slate-50">
                  <FiDownload className="h-4 w-4" aria-hidden />
                  Export
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <ReportMetricCard label="Total Employees" value={reportDashboard.totalEmployees} helper={`As of ${reportGeneratedDate}`} icon={FiUsers} tone="bg-violet-50 text-violet-600" />
              <ReportMetricCard label="Total Payroll" value={`$${money(reportDashboard.netPay)}`} helper={reportPeriodName} icon={FiCreditCard} tone="bg-emerald-50 text-emerald-600" />
              <ReportMetricCard label="Total Deductions" value={`$${money(reportDashboard.deductions)}`} helper={reportPeriodName} icon={FiArrowDown} tone="bg-red-50 text-red-600" />
              <ReportMetricCard label="Attendance Rate" value={`${reportDashboard.attendanceRate}%`} helper={`${reportDashboard.attendanceRecords} records`} trend={`${reportDashboard.lateRecords} late`} icon={FiCalendar} tone="bg-blue-50 text-blue-600" />
              <ReportMetricCard label="Headcount Growth" value={`${reportDashboard.headcountGrowth >= 0 ? "+" : ""}${reportDashboard.headcountGrowth}`} helper="vs previous month" trend={<span className="inline-flex items-center gap-1"><FiArrowUp className="h-3.5 w-3.5" /> Live</span>} icon={FiTrendingUp} tone="bg-teal-50 text-teal-600" />
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex min-w-[980px] items-center gap-8 px-4">
                {reportTabs.map((tab, index) => (
                  <button
                    key={tab}
                    type="button"
                    className={`h-12 border-b-2 text-sm font-extrabold ${
                      index === 0 ? "border-[#4f46e5] text-[#4f46e5]" : "border-transparent text-[#111b4f] hover:text-[#4f46e5]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,1fr)_390px]">
              <ReportPanel title="Headcount Trend" action="6 Months">
                <div className="h-[265px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportDashboard.trend} margin={{ left: -18, right: 12, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="headcountFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#111b4f", fontWeight: 700, fontSize: 11 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#111b4f", fontWeight: 700, fontSize: 11 }} />
                      <Tooltip formatter={(value) => [value, "Employees"]} />
                      <Area type="monotone" dataKey="headcount" stroke="#4f46e5" strokeWidth={3} fill="url(#headcountFill)" dot={{ r: 4, fill: "#4f46e5" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ReportPanel>

              <ReportPanel title="Employee by Department" action="All Departments">
                <div className="grid gap-4 md:grid-cols-[210px_minmax(0,1fr)]">
                  <div className="relative h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={reportDepartmentData} dataKey="value" innerRadius={58} outerRadius={94} paddingAngle={2}>
                          {reportDepartmentData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                      <div>
                        <p className="text-3xl font-extrabold leading-none text-[#111b4f]">{reportDashboard.totalEmployees}</p>
                        <p className="mt-1 text-xs font-bold text-[#111b4f]">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 self-center">
                    {reportDepartmentData.slice(0, 7).map((department) => (
                      <div key={department.name} className="flex items-center gap-3 text-xs font-bold text-[#111b4f]">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: department.color }} />
                        <span className="min-w-0 flex-1 truncate">{department.name}</span>
                        <span className="shrink-0">{department.value} ({Math.round((department.value / totalDepartmentEmployees) * 1000) / 10}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ReportPanel>

              <ReportPanel title="Payroll Summary">
                <div className="space-y-3 text-sm font-bold text-[#111b4f]">
                  {[
                    ["Gross Salary", reportDashboard.grossPay || reportDashboard.netPay + reportDashboard.deductions],
                    ["Total Allowances", payrollDashboard.allowances],
                    ["Total Deductions", reportDashboard.deductions],
                    ["Net Pay", reportDashboard.netPay],
                  ].map(([label, value], index) => (
                    <div key={label} className={`flex items-center justify-between rounded-md px-4 py-4 ${index === 3 ? "bg-violet-50" : "bg-slate-50"}`}>
                      <span>{label}</span>
                      <span className="text-base font-extrabold">${money(value)}</span>
                    </div>
                  ))}
                </div>
              </ReportPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_390px]">
              <ReportPanel title="Attendance Overview">
                <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="relative h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={reportDashboard.attendanceData.length ? reportDashboard.attendanceData : [{ name: "No records", value: 1, color: "#e2e8f0" }]} dataKey="value" innerRadius={68} outerRadius={94}>
                          {(reportDashboard.attendanceData.length ? reportDashboard.attendanceData : [{ name: "No records", color: "#e2e8f0" }]).map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                      <div>
                        <p className="text-3xl font-extrabold leading-none text-[#111b4f]">{reportDashboard.attendanceRate}%</p>
                        <p className="mt-1 text-xs font-bold text-[#111b4f]">Attendance Rate</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 self-center">
                    {[
                      ["Present", reportDashboard.presentRecords, "#16a34a"],
                      ["Late", reportDashboard.lateRecords, "#f59e0b"],
                      ["Early Leave", reportDashboard.earlyLeaveRecords, "#ef4444"],
                      ["On Leave", leaveCount, "#2563eb"],
                    ].map(([label, value, color]) => (
                      <div key={label} className="flex items-center gap-3 text-sm font-bold text-[#111b4f]">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="flex-1">{label}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-extrabold text-[#111b4f]">
                      <span>Total Records</span>
                      <span>{reportDashboard.attendanceRecords}</span>
                    </div>
                  </div>
                </div>
              </ReportPanel>

              <ReportPanel title="Leave Summary">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportDashboard.leaveSummary} margin={{ left: -24, right: 12, top: 8, bottom: 0 }}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis dataKey="type" tickLine={false} axisLine={false} tick={{ fill: "#111b4f", fontWeight: 700, fontSize: 11 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#111b4f", fontWeight: 700, fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-md bg-slate-50 p-3 text-center">
                    <p className="text-xs font-bold text-slate-500">Leaves Taken</p>
                    <p className="mt-1 text-xl font-extrabold text-[#111b4f]">{leaveCount}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3 text-center">
                    <p className="text-xs font-bold text-slate-500">Training Done</p>
                    <p className="mt-1 text-xl font-extrabold text-[#111b4f]">{reportDashboard.completedTraining}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3 text-center">
                    <p className="text-xs font-bold text-slate-500">Pending Plans</p>
                    <p className="mt-1 text-xl font-extrabold text-[#111b4f]">{reportDashboard.plannedTraining}</p>
                  </div>
                </div>
              </ReportPanel>

              <ReportPanel title="Top 5 Overtime Employees">
                <div className="overflow-hidden rounded-md border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-extrabold text-[#111b4f]">
                      <tr>
                        <th className="px-3 py-3">#</th>
                        <th className="px-3 py-3">Employee</th>
                        <th className="px-3 py-3">Department</th>
                        <th className="px-3 py-3 text-right">OT Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-[#111b4f]">
                      {reportDashboard.overtimeEmployees.map((employee, index) => (
                        <tr key={`${employee.name}-${index}`}>
                          <td className="px-3 py-3">{index + 1}</td>
                          <td className="px-3 py-3">{employee.name}</td>
                          <td className="px-3 py-3">{employee.department}</td>
                          <td className="px-3 py-3 text-right">{employee.hours.toFixed(1)}</td>
                        </tr>
                      ))}
                      {reportDashboard.overtimeEmployees.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-sm font-bold text-slate-400">
                            No overtime payroll records for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </ReportPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <h2 className="text-lg font-extrabold text-[#111b4f]">Recent Reports</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-extrabold text-[#111b4f]">
                      <tr>
                        <th className="px-5 py-4">Report Name</th>
                        <th className="px-5 py-4">Category</th>
                        <th className="px-5 py-4">Generated By</th>
                        <th className="px-5 py-4">Generated On</th>
                        <th className="px-5 py-4">Format</th>
                        <th className="px-5 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-[#111b4f]">
                      {[
                        ["Payroll Summary", "Payroll Reports", "PDF"],
                        ["Attendance Summary", "Attendance Reports", "Excel"],
                        ["Headcount Report", "HR Reports", "PDF"],
                        ["Leave Summary", "Leave Reports", "Excel"],
                      ].map(([name, category, format], index) => (
                        <tr key={name} className="hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-2">
                              <FiFileText className="h-4 w-4 text-slate-500" aria-hidden />
                              {name} - {reportPeriodName}
                            </span>
                          </td>
                          <td className="px-5 py-4">{category}</td>
                          <td className="px-5 py-4">HR Manager</td>
                          <td className="px-5 py-4">{reportGeneratedDate} {index === 0 ? "10:30 AM" : index === 1 ? "10:15 AM" : index === 2 ? "09:45 AM" : "09:30 AM"}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-md px-3 py-1.5 ${format === "PDF" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{format}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-[#111b4f] hover:bg-slate-100" title="Download report">
                                <FiDownload className="h-4 w-4" aria-hidden />
                              </button>
                              <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-[#111b4f] hover:bg-slate-100" title="Email report">
                                <FiMail className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <ReportPanel title="Quick Reports">
                <div className="space-y-2">
                  <ReportActionButton icon={FiUsers} label="Employee Directory" />
                  <ReportActionButton icon={FiFileText} label="Contract Expiry Report" />
                  <ReportActionButton icon={FiCheckCircle} label="Probation Ending Report" />
                  <ReportActionButton icon={FiCalendar} label="Birthday Report" />
                  <ReportActionButton icon={FiGrid} label="NSSF Contribution Report" />
                  <ReportActionButton icon={FiBriefcase} label="Performance Snapshot" />
                </div>
              </ReportPanel>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          canManageEmployees ? (
            <form onSubmit={saveLookupSettings} className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-950">HRIS Settings</h1>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Manage lookup values used by employee profiles and movement requests</p>
                </div>
                <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20">
                  <FiSettings className="h-4 w-4" aria-hidden />
                  Save Settings
                </button>
              </div>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <LookupEditor
                    label="Departments"
                    helper="One department per line"
                    value={lookupDrafts.departments}
                    onChange={(departments) => setLookupDrafts((draft) => ({ ...draft, departments }))}
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <LookupEditor
                    label="Subdepartments"
                    helper="One subdepartment per line"
                    value={lookupDrafts.sub_departments}
                    onChange={(sub_departments) => setLookupDrafts((draft) => ({ ...draft, sub_departments }))}
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <LookupEditor
                    label="Positions"
                    helper="One position title per line"
                    value={lookupDrafts.positions}
                    onChange={(positions) => setLookupDrafts((draft) => ({ ...draft, positions }))}
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <LookupEditor
                    label="Job Grades"
                    helper="One grade per line, for example G1 or M2"
                    value={lookupDrafts.job_grades}
                    onChange={(job_grades) => setLookupDrafts((draft) => ({ ...draft, job_grades }))}
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <LookupEditor
                    label="Employment Statuses"
                    helper="Use values like active, on_leave, inactive, resigned"
                    value={lookupDrafts.employment_statuses}
                    onChange={(employment_statuses) => setLookupDrafts((draft) => ({ ...draft, employment_statuses }))}
                  />
                </div>
              </section>
            </form>
          ) : (
            <div className="rounded-lg bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">HRIS settings are available to HR management only.</div>
          )
        )}
      </div>

      <EmployeeDetailDrawer
        open={Boolean(detailEmployee)}
        employee={detailEmployee}
        tab={detailTab}
        onTabChange={setDetailTab}
        onClose={() => setDetailEmployee(null)}
        onEdit={editEmployee}
        canManageEmployees={canManageEmployees}
        canPayroll={canPayroll}
        payrollRows={detailPayrollRows}
        performanceRows={detailPerformanceRows}
        historyRows={employeeHistory}
        historyLoading={historyLoading}
      />

      <MovementRequestDrawer
        open={Boolean(movementEmployee)}
        employee={movementEmployee}
        departments={departmentOptions}
        subDepartments={subDepartmentOptions}
        positions={positionOptions}
        jobGrades={jobGradeOptions}
        employmentStatuses={employmentStatusOptions}
        onClose={() => setMovementEmployee(null)}
        onSave={submitMovementRequest}
      />

      <AddEmployeeDrawer
        open={drawerOpen}
        title={editingEmployee ? "Edit Employee" : "Add New Employee"}
        users={users}
        departments={departmentOptions}
        subDepartments={subDepartmentOptions}
        positions={positionOptions}
        jobGrades={jobGradeOptions}
        employmentStatuses={employmentStatusOptions}
        managers={managerOptions}
        form={employeeForm}
        newEmployee={newEmployee}
        drawerTab={drawerTab}
        canManageEmployees={canManageEmployees}
        onClose={() => {
          setDrawerOpen(false);
          setEditingEmployee(null);
        }}
        onSave={saveEmployee}
        setDrawerTab={setDrawerTab}
        setForm={setEmployeeForm}
        setNewEmployee={setNewEmployee}
      />
    </section>
  );
}
