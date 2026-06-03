import { useEffect, useMemo, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiClock,
  FiEye,
  FiFilter,
  FiPlus,
  FiSave,
  FiSearch,
  FiUsers,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocation, useNavigate } from "react-router-dom";
import { getRequestDays, matchesStatusFilter } from "./requests/RequestCard";
import RequestDetail from "./requests/RequestDetail";
import RequestList from "./requests/RequestList";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const leaveTypes = [
  ["annual", "Annual Leave"],
  ["sick", "Sick Leave"],
  ["special", "Special Leave"],
  ["maternity", "Maternity Leave"],
  ["bereavement", "Bereavement Leave"],
  ["compensatory", "Compensatory Leave"],
  ["unpaid", "Unpaid Leave"],
];

const shiftOptions = [
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["full_day", "Full Day"],
  ["night", "Night"],
];

const requestTitles = {
  leave: "Leave Request Form",
  permission: "Permission Request Form",
  flexible: "Flexible Request Form",
  ot: "Overtime Request Form",
};

const requestListTitles = {
  leave: "Leave Requests",
  permission: "Permission Requests",
  flexible: "Flexible Requests",
  ot: "Overtime Requests",
};
const requestTypeDefinitions = [
  { key: "leave", label: "Leave", tab: "Leave", color: "#1f7aff", tone: "bg-blue-100 text-blue-700" },
  { key: "permission", label: "Permission", tab: "Permission", color: "#f59e0b", tone: "bg-orange-100 text-orange-700" },
  { key: "ot", label: "Overtime", tab: "Overtime", color: "#8b5cf6", tone: "bg-violet-100 text-violet-700" },
  { key: "flexible", label: "Flexible Work", tab: "Flexible Work", color: "#22c55e", tone: "bg-emerald-100 text-emerald-700" },
];

const ANNUAL_LEAVE = 18;
const SICK_LEAVE = 6;
const SPECIAL_LEAVE = 6;
const UNPAID_LEAVE = 5;
const managementRoles = ["line_manager", "department_head", "management_hr", "payroll_officer"];
const leaveTypeColors = {
  annual: "#1f7aff",
  sick: "#22c55e",
  special: "#f59e0b",
  unpaid: "#8b5cf6",
};
const requestDashboardTabs = ["Dashboard", "All Requests", "Leave", "Permission", "Overtime", "Flexible Work", "My Team Requests", "Reports", "Settings"];
const approvalStageDefinitions = [
  { key: "backup", statusKey: "backup_status", label: "Backup Person", helper: "Optional handover confirmation from the selected backup employee." },
  { key: "line_manager", statusKey: "line_manager_status", label: "Line Manager", helper: "Direct manager approval for team staffing and workload." },
  { key: "department_head", statusKey: "department_head_status", label: "Department Head", helper: "Department-level approval before HR final review." },
  { key: "management_hr", statusKey: "hr_status", label: "HR", helper: "Final HR compliance and record confirmation." },
];
const defaultApprovalFlow = approvalStageDefinitions.map((stage) => stage.key);

const inputClass =
  "h-14 w-full rounded-xl border border-slate-300 bg-[#f8f8f8] px-5 text-base font-medium text-slate-900 outline-none focus:border-emerald-700";

const textAreaClass =
  "min-h-[112px] w-full rounded-xl border border-slate-300 bg-[#f8f8f8] px-5 py-4 text-base font-medium text-slate-900 outline-none focus:border-emerald-700";

const todayKey = () => new Date().toISOString().slice(0, 10);

const dateDiffDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.round((end - start) / 86400000) + 1);
};

const nextDate = (value) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

const monthKey = (value) => {
  const date = value instanceof Date ? value : value ? new Date(`${value}T00:00:00`) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (key) => {
  const [year, month] = String(key).split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

const getReasonValue = (reason, label) => {
  const line = String(reason || "")
    .split("\n")
    .find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line ? line.slice(label.length + 1).trim() : "";
};

const requestReasonPreview = (reason) => {
  const metaPrefixes = [
    "Start shift:",
    "End shift:",
    "End date:",
    "Return date:",
    "Days:",
    "Shift:",
    "Duration:",
    "Request type:",
    "Flexible type:",
    "Project:",
    "Customer:",
    "Address:",
    "Phone:",
    "OT type:",
    "OT status:",
    "Hour work:",
  ];
  return String(reason || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !metaPrefixes.some((prefix) => line.toLowerCase().startsWith(prefix.toLowerCase()))) || "No reason provided";
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const formatLeaveType = (value) => {
  const type = String(value || "annual").replaceAll("_", " ");
  return type.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const requestTypeLabel = (type) =>
  requestTypeDefinitions.find((item) => item.key === type)?.label || statusDisplay(type || "request");

const requestTypeTone = (type) =>
  requestTypeDefinitions.find((item) => item.key === type)?.tone || "bg-slate-100 text-slate-600";

const requestTypeColor = (type) =>
  requestTypeDefinitions.find((item) => item.key === type)?.color || "#64748b";

const formatRequestTime = (value) => {
  if (!value) return "-";
  const [hour = "00", minute = "00"] = String(value).split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
};

const requestDateRange = (request) => {
  const endDate = getReasonValue(request.reason, "End date") || request.date;
  if (request.type === "leave") return `${formatDate(request.date)} - ${formatDate(endDate)}`;
  if (request.type === "permission") return `${formatDate(request.date)}, ${formatRequestTime(request.start_time)} - ${formatRequestTime(request.end_time)}`;
  if (request.type === "ot") {
    const start = getReasonValue(request.reason, "Start time") || request.start_time;
    const end = getReasonValue(request.reason, "End time") || request.end_time;
    return `${formatDate(request.date)}, ${formatRequestTime(start)} - ${formatRequestTime(end)}`;
  }
  return `${formatDate(request.date)}, ${formatRequestTime(request.start_time)} - ${formatRequestTime(request.end_time)}`;
};

const requestDetailLabel = (request) => {
  if (request.type === "leave") return formatLeaveType(request.leave_type || "annual");
  if (request.type === "ot") return getReasonValue(request.reason, "Project") || getReasonValue(request.reason, "Customer") || "Overtime work";
  if (request.type === "flexible") return getReasonValue(request.reason, "Flexible type") || getReasonValue(request.reason, "Request type") || "Flexible work";
  return getReasonValue(request.reason, "Duration") || "Permission";
};

const requestUnitValue = (request) => {
  if (request.type === "leave") {
    const days = getRequestDays(request);
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  if (request.type === "ot") return `${Number(getReasonValue(request.reason, "Hour work") || 0).toFixed(1)}h`;
  return request.start_time && request.end_time ? "Timed" : "-";
};

const leaveTypeTone = (type) => {
  const value = String(type || "").toLowerCase();
  if (value.includes("sick")) return "bg-emerald-100 text-emerald-700";
  if (value.includes("special")) return "bg-orange-100 text-orange-700";
  if (value.includes("unpaid")) return "bg-violet-100 text-violet-700";
  return "bg-blue-100 text-blue-700";
};

const leaveStatusTone = (status) => {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "cancelled") return "bg-slate-100 text-slate-500";
  return "bg-amber-100 text-amber-700";
};

const statusDisplay = (status) => {
  if (!status) return "-";
  return String(status).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getOrderedApprovalStages = (flow = defaultApprovalFlow) => {
  const selected = Array.isArray(flow) && flow.length ? flow : defaultApprovalFlow;
  const ordered = selected
    .map((key) => approvalStageDefinitions.find((stage) => stage.key === key))
    .filter(Boolean);
  const missing = approvalStageDefinitions.filter((stage) => !selected.includes(stage.key));
  return [...ordered, ...missing];
};

const getPendingApprovalStage = (request, flow = defaultApprovalFlow) => {
  if (!request || request.status !== "pending") return null;
  return getOrderedApprovalStages(flow).find((stage) => request[stage.statusKey] === "pending") || null;
};

const canCurrentUserApprove = (request, actorRole, currentUserId, flow = defaultApprovalFlow) => {
  const stage = getPendingApprovalStage(request, flow);
  if (!stage) return false;
  if (stage.key === "backup") return Number(request.backup_user_id) === Number(currentUserId);
  return stage.key === actorRole;
};

const isDateInRequest = (request, targetDate) => {
  const start = new Date(`${request.date}T00:00:00`);
  const endValue = getReasonValue(request.reason, "End date") || request.date;
  const end = new Date(`${endValue}T00:00:00`);
  const target = new Date(`${targetDate}T00:00:00`);
  return target >= start && target <= end;
};

const LeaveStatCard = ({ label, value, helper, icon: Icon, tone }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-4">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#151b4f]">{label}</p>
        <p className="mt-1 text-3xl font-extrabold leading-none text-[#151b4f]">{value}</p>
        {helper && <p className="mt-2 text-sm font-semibold text-slate-500">{helper}</p>}
      </div>
    </div>
  </div>
);

const FieldShell = ({ label, required, className = "", children }) => (
  <label className={`block ${className}`}>
    <span className="text-base font-medium text-black">
      {required ? "* " : ""}
      {label}
    </span>
    <div className="mt-2">{children}</div>
  </label>
);

const SelectField = ({ value, onChange, placeholder, options, required }) => (
  <select
    className={inputClass}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    required={required}
  >
    <option value="">{placeholder}</option>
    {options.map(([optionValue, label]) => (
      <option key={optionValue} value={optionValue}>
        {label}
      </option>
    ))}
  </select>
);

const DateField = ({ value, onChange, required }) => (
  <div className="relative">
    <input
      className={`${inputClass} pr-12`}
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
    />
    <FiCalendar className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-800" />
  </div>
);

const TimeField = ({ value, onChange, required }) => (
  <div className="relative">
    <input
      className={`${inputClass} pr-12`}
      type="time"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
    />
    <FiClock className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-800" />
  </div>
);

const AttachmentField = ({ attachment, onChange, label = "Attachment" }) => (
  <FieldShell label={label}>
    <label className="grid h-14 cursor-pointer place-items-center rounded-xl border border-emerald-800 bg-white px-4 text-center text-base font-medium text-black hover:bg-emerald-50">
      {attachment ? attachment.name : "Attach File"}
      <input
        type="file"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
    </label>
  </FieldShell>
);

const BackupUserField = ({
  backupOptions,
  backupSearch,
  setBackupSearch,
  selectedBackupId,
  setSelectedBackupId,
}) => {
  const selectedBackup = backupOptions.find(
    (user) => String(user.id) === String(selectedBackupId),
  );
  const filteredBackupOptions = backupOptions.filter((user) => {
    const query = backupSearch.trim().toLowerCase();
    if (query.length < 4) return true;
    return `${user.name} ${user.emp_code}`.toLowerCase().includes(query);
  });

  return (
    <div className="mt-5">
      <h3 className="text-lg font-extrabold text-black">Back Up User</h3>
      <div className="relative mt-3">
        <input
          className={`${inputClass} pr-12`}
          value={backupSearch}
          onChange={(event) => setBackupSearch(event.target.value)}
          placeholder="Search User"
        />
        <FiSearch className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
      </div>
      <p className="mt-3 text-sm font-medium text-black">
        Minimum 4 characters required
      </p>

      {(backupSearch.length >= 4 || selectedBackup) && (
        <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {filteredBackupOptions.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                setSelectedBackupId(String(user.id));
                setBackupSearch(`${user.name} (${user.emp_code})`);
              }}
              className={`block w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 ${
                String(selectedBackupId) === String(user.id)
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-700"
              }`}
            >
              {user.name} ({user.emp_code})
            </button>
          ))}
          {filteredBackupOptions.length === 0 && (
            <p className="px-4 py-3 text-sm font-semibold text-slate-400">
              No user found
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const initialForm = {
  type: "leave",
  leave_type: "",
  backup_user_id: "",
  start_date: "",
  end_date: "",
  start_shift: "",
  end_shift: "",
  return_date: "",
  reason: "",
  permission_date: "",
  permission_shift: "",
  permission_duration: "",
  flexible_request_type: "",
  flexible_type: "",
  flexible_shift: "",
  project: "",
  customer: "",
  address: "",
  ot_project: "",
  ot_customer: "",
  ot_phone: "",
  ot_type: "",
  ot_status: "",
  ot_activity: "",
  ot_start_time: "",
  ot_end_time: "",
  ot_hour_work: "",
};

const RequestsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, empCode } = useAuth();
  const isManagement = managementRoles.includes(role);
  const [form, setForm] = useState(initialForm);
  const [attachment, setAttachment] = useState(null);
  const [items, setItems] = useState([]);
  const [assignedItems, setAssignedItems] = useState([]);
  const [backupOptions, setBackupOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaveTab, setLeaveTab] = useState("Dashboard");
  const [leaveSearch, setLeaveSearch] = useState("");
  const [leaveMonth, setLeaveMonth] = useState(monthKey());
  const [approvalFlow, setApprovalFlow] = useState(defaultApprovalFlow);
  const [flowSaving, setFlowSaving] = useState(false);
  const [backupSearch, setBackupSearch] = useState("");
  const [status, setStatus] = useState("");
  const [actionFeedback, setActionFeedback] = useState(null);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(6);
  const requestType = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    return type && requestTitles[type] ? type : "";
  }, [location.search]);

  const load = async () => {
    const [requestRes, assignedRes, backupRes, usersRes, flowRes] = await Promise.all([
      isManagement ? api.get("/api/requests/all") : api.get("/api/requests/my"),
      api.get("/api/requests/assigned-to-me").catch(() => ({ data: [] })),
      api.get("/api/requests/backup-options").catch(() => ({ data: [] })),
      isManagement ? api.get("/api/admin/users").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      isManagement ? api.get("/api/requests/approval-flow").catch(() => ({ data: { stages: defaultApprovalFlow } })) : Promise.resolve({ data: { stages: defaultApprovalFlow } }),
    ]);
    setItems(requestRes.data);
    setAssignedItems(assignedRes.data);
    setBackupOptions(backupRes.data);
    setUsers(usersRes.data || []);
    setApprovalFlow(Array.isArray(flowRes.data?.stages) && flowRes.data.stages.length ? flowRes.data.stages : defaultApprovalFlow);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManagement]);

  useEffect(() => {
    setForm((previous) => ({
      ...previous,
      type: requestType || "leave",
    }));
  }, [requestType]);

  const pageTitle = requestType
    ? requestListTitles[requestType]
    : "Requests";

  const filteredItems = useMemo(
    () =>
      requestType
        ? items.filter((request) => request.type === requestType)
        : items,
    [items, requestType],
  );

  const visibleItems = useMemo(
    () =>
      filteredItems
        .filter((request) => matchesStatusFilter(request, statusFilter))
        .slice(0, visibleCount),
    [filteredItems, statusFilter, visibleCount],
  );

  const filteredItemCount = useMemo(
    () =>
      filteredItems.filter((request) =>
        matchesStatusFilter(request, statusFilter),
      ).length,
    [filteredItems, statusFilter],
  );

  const filteredAssignedItems = useMemo(
    () =>
      requestType
        ? assignedItems.filter((request) => request.type === requestType)
        : assignedItems,
    [assignedItems, requestType],
  );

  const leaveSummary = useMemo(() => {
    const currentYear = String(new Date().getFullYear());
    const approvedLeaves = items.filter(
      (request) =>
        request.type === "leave" &&
        request.status === "approved" &&
        String(request.date || "").startsWith(currentYear),
    );

    return approvedLeaves.reduce(
      (summary, request) => {
        const days = getRequestDays(request);
        const isSick = String(
          `${request.leave_type || ""} ${request.reason || ""}`,
        )
          .toLowerCase()
          .includes("sick");
        const usedAnnual = isSick ? summary.usedAnnual : summary.usedAnnual + days;
        const usedSick = isSick ? summary.usedSick + days : summary.usedSick;

        return {
          usedAnnual,
          usedSick,
          remainingAnnual: Math.max(0, ANNUAL_LEAVE - usedAnnual).toFixed(2),
          remainingSick: Math.max(0, SICK_LEAVE - usedSick).toFixed(2),
        };
      },
      {
        usedAnnual: 0,
        usedSick: 0,
        remainingAnnual: ANNUAL_LEAVE.toFixed(2),
        remainingSick: SICK_LEAVE.toFixed(2),
      },
    );
  }, [items]);

  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) return null;
    return (
      filteredAssignedItems.find(
        (request) => request.id === selectedRequestId,
      ) ||
      filteredItems.find((request) => request.id === selectedRequestId) ||
      null
    );
  }, [filteredAssignedItems, filteredItems, selectedRequestId]);

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );
  const currentUser = useMemo(
    () => users.find((user) => String(user.emp_code) === String(empCode)) || null,
    [empCode, users],
  );

  const managementRequests = useMemo(
    () => items,
    [items],
  );

  const managementRows = useMemo(() => {
    const query = leaveSearch.trim().toLowerCase();
    return managementRequests
      .map((request) => {
        const user = userById.get(request.user_id);
        return {
          request,
          user,
          detail: requestDetailLabel(request),
          range: requestDateRange(request),
          unit: requestUnitValue(request),
          reason: requestReasonPreview(request.reason),
        };
      })
      .filter((row) => {
        if (!query) return true;
        return `${row.user?.name || ""} ${row.user?.department || ""} ${requestTypeLabel(row.request.type)} ${row.detail || ""} ${row.request.status || ""}`
          .toLowerCase()
          .includes(query);
      });
  }, [leaveSearch, managementRequests, userById]);

  const managementStats = useMemo(() => {
    const [year, month] = leaveMonth.split("-").map(Number);
    const selectedMonthRequests = managementRequests.filter((request) => monthKey(request.date) === leaveMonth);
    const leaveRequests = managementRequests.filter((request) => request.type === "leave");
    const today = todayKey();
    const approved = selectedMonthRequests.filter((request) => request.status === "approved");
    const pending = managementRequests.filter((request) => request.status === "pending");
    const rejected = selectedMonthRequests.filter((request) => request.status === "rejected");
    const onLeaveToday = leaveRequests.filter((request) => request.status === "approved" && isDateInRequest(request, today));
    const pendingOtHours = managementRequests
      .filter((request) => request.type === "ot" && request.status === "pending")
      .reduce((sum, request) => sum + Number(getReasonValue(request.reason, "Hour work") || 0), 0);
    const usedAnnual = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "annual").includes("annual"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const usedSick = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "").includes("sick"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const usedSpecial = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "").includes("special"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const usedUnpaid = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "").includes("unpaid"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const totalAnnual = Math.max(users.length, 1) * ANNUAL_LEAVE;
    const totalSick = Math.max(users.length, 1) * SICK_LEAVE;
    const totalSpecial = Math.max(users.length, 1) * SPECIAL_LEAVE;
    const totalUnpaid = Math.max(users.length, 1) * UNPAID_LEAVE;
    const balanceData = [
      { name: "Annual Leave", value: Math.max(0, totalAnnual - usedAnnual), color: leaveTypeColors.annual },
      { name: "Sick Leave", value: Math.max(0, totalSick - usedSick), color: leaveTypeColors.sick },
      { name: "Special Leave", value: Math.max(0, totalSpecial - usedSpecial), color: leaveTypeColors.special },
      { name: "Unpaid Leave", value: Math.max(0, totalUnpaid - usedUnpaid), color: leaveTypeColors.unpaid },
    ];
    const trend = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(year, month - 6 + index, 1);
      const key = monthKey(date);
      const rows = managementRequests.filter((request) => monthKey(request.date) === key);
      return {
        label: date.toLocaleDateString(undefined, { month: "short" }),
        Approved: rows.filter((request) => request.status === "approved").length,
        Pending: rows.filter((request) => request.status === "pending").length,
        Rejected: rows.filter((request) => request.status === "rejected").length,
      };
    });
    const typeData = requestTypeDefinitions.map((item) => ({
      name: item.label,
      value: selectedMonthRequests.filter((request) => request.type === item.key).length,
      color: item.color,
    }));
    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      onLeaveToday: onLeaveToday.length,
      pendingOtHours,
      totalBalance: balanceData.reduce((sum, item) => sum + item.value, 0),
      balanceData,
      typeData,
      trend,
      selectedMonthRequests,
    };
  }, [leaveMonth, managementRequests, users.length]);

  const days = useMemo(
    () => dateDiffDays(form.start_date, form.end_date),
    [form.end_date, form.start_date],
  );

  useEffect(() => {
    setStatusFilter("all");
    setVisibleCount(6);
    setSelectedRequestId(null);
    setShowForm(false);
  }, [requestType]);

  useEffect(() => {
    setVisibleCount(6);
  }, [statusFilter]);

  const updateForm = (patch) => {
    setForm((previous) => ({ ...previous, ...patch }));
  };

  const submitPayload = () => {
    if (form.type === "permission") {
      return {
        type: "permission",
        date: form.permission_date,
        start_time: form.permission_duration || "",
        end_time: "",
        backup_user_id: form.backup_user_id
          ? Number(form.backup_user_id)
          : null,
        reason: [
          form.reason,
          `Shift: ${form.permission_shift || "-"}`,
          `Duration: ${form.permission_duration || "-"}`,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }

    if (form.type === "flexible") {
      return {
        type: "flexible",
        date: form.start_date,
        start_time: "",
        end_time: "",
        backup_user_id: form.backup_user_id
          ? Number(form.backup_user_id)
          : null,
        reason: [
          form.reason,
          `Request type: ${form.flexible_request_type || "-"}`,
          `Flexible type: ${form.flexible_type || "-"}`,
          `End date: ${form.end_date || "-"}`,
          `Days: ${days}`,
          `Shift: ${form.flexible_shift || "-"}`,
          `Project: ${form.project || "-"}`,
          `Customer: ${form.customer || "-"}`,
          `Address: ${form.address || "-"}`,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }

    if (form.type === "ot") {
      return {
        type: "ot",
        date: todayKey(),
        start_time: form.ot_start_time || "",
        end_time: form.ot_end_time || "",
        backup_user_id: form.backup_user_id
          ? Number(form.backup_user_id)
          : null,
        reason: [
          form.ot_activity,
          `Project: ${form.ot_project || "-"}`,
          `Customer: ${form.ot_customer || "-"}`,
          `Phone: ${form.ot_phone || "-"}`,
          `OT type: ${form.ot_type || "-"}`,
          `OT status: ${form.ot_status || "-"}`,
          `Hour work: ${form.ot_hour_work || "-"}`,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }

    const returnDate = form.return_date || nextDate(form.end_date);
    return {
      type: "leave",
      leave_type: form.leave_type,
      backup_user_id: form.backup_user_id ? Number(form.backup_user_id) : null,
      date: form.start_date,
      start_time: "",
      end_time: "",
      reason: [
        form.reason,
        `Start shift: ${form.start_shift || "-"}`,
        `End shift: ${form.end_shift || "-"}`,
        `End date: ${form.end_date || "-"}`,
        `Return date: ${returnDate || "-"}`,
        `Days: ${days}`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  };

  const create = async (event) => {
    event.preventDefault();
    try {
      const payload = submitPayload();

      if (attachment) {
        const fd = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          fd.append(key, value ?? "");
        });
        fd.append("attachment", attachment);
        await api.post("/api/requests/create", fd);
      } else {
        await api.post("/api/requests/create", payload);
      }

      setStatus(`${requestTitles[form.type]} submitted`);
      setForm((previous) => ({ ...initialForm, type: previous.type }));
      setBackupSearch("");
      setAttachment(null);
      setShowForm(false);
      await load();
    } catch (err) {
      setStatus(err?.response?.data?.detail || err.message || "Submit failed");
    }
  };

  const cancelPending = async (id) => {
    await api.put("/api/requests/cancel", { request_id: id });
    await load();
  };

  const updateRequest = async (id, nextStatus) => {
    const isApproved = nextStatus === "approved";
    setActionLoadingId(id);
    setActionFeedback(null);
    try {
      await api.put("/api/requests/status", {
        request_id: id,
        status: nextStatus,
        admin_remarks: "Reviewed",
      });
      const message = isApproved ? "Leave request approved" : "Leave request rejected";
      setStatus(message);
      setRecentlyUpdatedId(id);
      setActionFeedback({
        type: isApproved ? "success" : "danger",
        message,
      });
      await load();
      window.setTimeout(() => setRecentlyUpdatedId(null), 1600);
      window.setTimeout(() => setActionFeedback(null), 2600);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || "Could not update request";
      setStatus(message);
      setActionFeedback({ type: "danger", message });
      window.setTimeout(() => setActionFeedback(null), 3200);
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleApprovalStage = (stageKey) => {
    setApprovalFlow((previous) => {
      if (previous.includes(stageKey)) {
        return previous.filter((key) => key !== stageKey);
      }
      return [...previous, stageKey];
    });
  };

  const moveApprovalStage = (stageKey, direction) => {
    setApprovalFlow((previous) => {
      const index = previous.indexOf(stageKey);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= previous.length) return previous;
      const updated = [...previous];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated;
    });
  };

  const saveApprovalFlow = async () => {
    setFlowSaving(true);
    setActionFeedback(null);
    try {
      const { data } = await api.put("/api/requests/approval-flow", { stages: approvalFlow });
      setApprovalFlow(Array.isArray(data.stages) ? data.stages : approvalFlow);
      setStatus("Approval flow updated");
      setActionFeedback({ type: "success", message: "Approval flow updated" });
      window.setTimeout(() => setActionFeedback(null), 2600);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || "Could not update approval flow";
      setStatus(message);
      setActionFeedback({ type: "danger", message });
      window.setTimeout(() => setActionFeedback(null), 3200);
    } finally {
      setFlowSaving(false);
    }
  };

  const openRequest = (request) => {
    setSelectedRequestId(request.id);
    setShowForm(false);
  };

  const openForm = () => {
    setSelectedRequestId(null);
    setStatus("");
    setShowForm(true);
  };

  const goBack = () => {
    if (showForm) {
      setShowForm(false);
      return;
    }
    if (selectedRequestId) {
      setSelectedRequestId(null);
      return;
    }
    navigate(-1);
  };

  const renderLeaveForm = () => (
    <>
      <h2 className="mb-4 text-xl font-extrabold text-black">Leave Duration</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <FieldShell label="Start Date" required>
          <DateField
            value={form.start_date}
            onChange={(value) => updateForm({ start_date: value })}
            required
          />
        </FieldShell>
        <FieldShell label="Start Shift" required>
          <SelectField
            value={form.start_shift}
            onChange={(value) => updateForm({ start_shift: value })}
            placeholder="Select a Shift"
            options={shiftOptions}
            required
          />
        </FieldShell>
        <FieldShell label="End Date" required>
          <DateField
            value={form.end_date}
            onChange={(value) =>
              updateForm({
                end_date: value,
                return_date: form.return_date || nextDate(value),
              })
            }
            required
          />
        </FieldShell>
        <FieldShell label="End Shift" required>
          <SelectField
            value={form.end_shift}
            onChange={(value) => updateForm({ end_shift: value })}
            placeholder="Select a Shift"
            options={shiftOptions}
            required
          />
        </FieldShell>
        <FieldShell label="Days" required>
          <input className={inputClass} value={days} readOnly />
        </FieldShell>
        <FieldShell label="Return Date" required>
          <DateField
            value={form.return_date}
            onChange={(value) => updateForm({ return_date: value })}
            required
          />
        </FieldShell>
        <FieldShell label="Leave Type" required>
          <SelectField
            value={form.leave_type}
            onChange={(value) => updateForm({ leave_type: value })}
            placeholder="Leave Type"
            options={leaveTypes}
            required
          />
        </FieldShell>
        <AttachmentField attachment={attachment} onChange={setAttachment} />
      </div>
      <BackupUserField
        backupOptions={backupOptions}
        backupSearch={backupSearch}
        setBackupSearch={setBackupSearch}
        selectedBackupId={form.backup_user_id}
        setSelectedBackupId={(value) => updateForm({ backup_user_id: value })}
      />
      <FieldShell label="Reason" required className="mt-4">
        <textarea
          className={textAreaClass}
          placeholder="Reason..."
          value={form.reason}
          onChange={(event) => updateForm({ reason: event.target.value })}
          required
        />
      </FieldShell>
    </>
  );

  const renderPermissionForm = () => (
    <>
      <h2 className="mb-4 text-xl font-extrabold text-black">
        Permission Form
      </h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <FieldShell label="Request Date" required>
          <DateField
            value={form.permission_date}
            onChange={(value) => updateForm({ permission_date: value })}
            required
          />
        </FieldShell>
        <FieldShell label="Shift" required>
          <SelectField
            value={form.permission_shift}
            onChange={(value) => updateForm({ permission_shift: value })}
            placeholder="Select a Shift"
            options={shiftOptions}
            required
          />
        </FieldShell>
        <FieldShell label="Duration" required>
          <TimeField
            value={form.permission_duration}
            onChange={(value) => updateForm({ permission_duration: value })}
            required
          />
        </FieldShell>
        <AttachmentField attachment={attachment} onChange={setAttachment} />
      </div>
      <BackupUserField
        backupOptions={backupOptions}
        backupSearch={backupSearch}
        setBackupSearch={setBackupSearch}
        selectedBackupId={form.backup_user_id}
        setSelectedBackupId={(value) => updateForm({ backup_user_id: value })}
      />
      <FieldShell label="Reason" required className="mt-4">
        <textarea
          className={textAreaClass}
          placeholder="Reason..."
          value={form.reason}
          onChange={(event) => updateForm({ reason: event.target.value })}
          required
        />
      </FieldShell>
    </>
  );

  const renderFlexibleForm = () => (
    <>
      <h2 className="mb-4 text-xl font-extrabold text-black">
        Flexible Request
      </h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <FieldShell label="Request Type" required>
          <SelectField
            value={form.flexible_request_type}
            onChange={(value) => updateForm({ flexible_request_type: value })}
            placeholder="Select a Type"
            options={[
              ["late", "Late In"],
              ["early", "Early Out"],
              ["remote", "Remote Work"],
            ]}
            required
          />
        </FieldShell>
        <FieldShell label="Flexible Type" required>
          <SelectField
            value={form.flexible_type}
            onChange={(value) => updateForm({ flexible_type: value })}
            placeholder="Select a Flexible Type"
            options={[
              ["temporary", "Temporary"],
              ["project", "Project"],
              ["personal", "Personal"],
            ]}
            required
          />
        </FieldShell>
        <FieldShell label="Start Date" required>
          <DateField
            value={form.start_date}
            onChange={(value) => updateForm({ start_date: value })}
            required
          />
        </FieldShell>
        <FieldShell label="End Date" required>
          <DateField
            value={form.end_date}
            onChange={(value) => updateForm({ end_date: value })}
            required
          />
        </FieldShell>
        <FieldShell label="Days" required>
          <input
            className={inputClass}
            value={days || ""}
            readOnly
            placeholder="Days"
          />
        </FieldShell>
        <FieldShell label="Shift" required>
          <SelectField
            value={form.flexible_shift}
            onChange={(value) => updateForm({ flexible_shift: value })}
            placeholder="Select a Shift"
            options={shiftOptions}
            required
          />
        </FieldShell>
        <FieldShell label="Project" required>
          <input
            className={inputClass}
            value={form.project}
            onChange={(event) => updateForm({ project: event.target.value })}
            placeholder="Project's Name"
            required
          />
        </FieldShell>
        <FieldShell label="Customer" required>
          <input
            className={inputClass}
            value={form.customer}
            onChange={(event) => updateForm({ customer: event.target.value })}
            placeholder="Name"
            required
          />
        </FieldShell>
        <FieldShell label="Address" required className="col-span-2">
          <input
            className={inputClass}
            value={form.address}
            onChange={(event) => updateForm({ address: event.target.value })}
            placeholder="Location url"
            required
          />
        </FieldShell>
      </div>
      <FieldShell label="Reason" required className="mt-4">
        <textarea
          className={textAreaClass}
          placeholder="Reasons..."
          value={form.reason}
          onChange={(event) => updateForm({ reason: event.target.value })}
          required
        />
      </FieldShell>
    </>
  );

  const renderOvertimeForm = () => (
    <>
      <h2 className="mb-4 text-xl font-extrabold text-black">Overtime Form</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <FieldShell label="Project Name" required>
          <input
            className={inputClass}
            value={form.ot_project}
            onChange={(event) => updateForm({ ot_project: event.target.value })}
            placeholder="Project name"
            required
          />
        </FieldShell>
        <FieldShell label="Customer Name" required>
          <input
            className={inputClass}
            value={form.ot_customer}
            onChange={(event) =>
              updateForm({ ot_customer: event.target.value })
            }
            placeholder="Customer name"
            required
          />
        </FieldShell>
        <FieldShell label="Phone Number" required>
          <input
            className={inputClass}
            value={form.ot_phone}
            onChange={(event) => updateForm({ ot_phone: event.target.value })}
            placeholder="Phone number"
            required
          />
        </FieldShell>
        <FieldShell label="OT Type" required>
          <SelectField
            value={form.ot_type}
            onChange={(value) => updateForm({ ot_type: value })}
            placeholder="Select type"
            options={[
              ["weekday", "Weekday"],
              ["weekend", "Weekend"],
              ["holiday", "Holiday"],
            ]}
            required
          />
        </FieldShell>
        <FieldShell label="OT Status" required>
          <SelectField
            value={form.ot_status}
            onChange={(value) => updateForm({ ot_status: value })}
            placeholder="Select status"
            options={[
              ["planned", "Planned"],
              ["urgent", "Urgent"],
              ["completed", "Completed"],
            ]}
            required
          />
        </FieldShell>
        <AttachmentField
          attachment={attachment}
          onChange={setAttachment}
          label="Reference"
        />
        <FieldShell label="Activity" required className="col-span-2">
          <textarea
            className={textAreaClass}
            placeholder="Describe the activity"
            value={form.ot_activity}
            onChange={(event) =>
              updateForm({ ot_activity: event.target.value })
            }
            required
          />
        </FieldShell>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-xl font-extrabold text-black">OT Items</h3>
        <button
          type="button"
          className="text-base font-semibold text-emerald-800"
        >
          + Add Item
        </button>
      </div>
      <div className="mt-4 rounded-xl border border-slate-300 p-4">
        <h4 className="text-lg font-extrabold text-black">Item 1</h4>
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
          <FieldShell label="Start Time" required>
            <TimeField
              value={form.ot_start_time}
              onChange={(value) => updateForm({ ot_start_time: value })}
              required
            />
          </FieldShell>
          <FieldShell label="End Time" required>
            <TimeField
              value={form.ot_end_time}
              onChange={(value) => updateForm({ ot_end_time: value })}
              required
            />
          </FieldShell>
          <FieldShell label="Hour Work" required>
            <SelectField
              value={form.ot_hour_work}
              onChange={(value) => updateForm({ ot_hour_work: value })}
              placeholder="Select type"
              options={[
                ["1", "1 hour"],
                ["2", "2 hours"],
                ["3", "3 hours"],
                ["4", "4 hours"],
              ]}
              required
            />
          </FieldShell>
          <FieldShell label="Total OT Hours">
            <div
              className={`${inputClass} flex items-center gap-2 text-emerald-800`}
            >
              <FiClock className="h-4 w-4" />
              <span>{form.ot_hour_work ? `${form.ot_hour_work}h` : "-"}</span>
            </div>
          </FieldShell>
        </div>
      </div>
    </>
  );

  const renderActiveForm = () => {
    if (form.type === "permission") return renderPermissionForm();
    if (form.type === "flexible") return renderFlexibleForm();
    if (form.type === "ot") return renderOvertimeForm();
    return renderLeaveForm();
  };

  if (isManagement) {
    const upcomingHolidays = [
      ["Visak Bochea Day", "12 May 2025"],
      ["Royal Ploughing Ceremony", "14 May 2025"],
      ["International Children's Day", "01 Jun 2025"],
      ["King's Birthday", "14 Jun 2025"],
    ];
    const totalMonth = Math.max(managementStats.selectedMonthRequests.length, 1);
    const rowsForTab = (tab) => {
      if (tab === "My Team Requests") return managementRows.filter((row) => row.request.status === "pending");
      const type = requestTypeDefinitions.find((item) => item.tab === tab)?.key;
      if (type) return managementRows.filter((row) => row.request.type === type);
      return managementRows;
    };

    return (
      <section className="min-h-[calc(100vh-4rem)] bg-[#f6f8fd] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-[#11164a]">Request Management</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">Home &gt; Request Management &gt; Dashboard</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={openForm} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#5b21e8] px-4 text-sm font-extrabold text-white shadow-lg shadow-violet-700/20">
                <FiPlus className="h-4 w-4" aria-hidden />
                New Request
              </button>
              <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
                <FiCalendar className="h-4 w-4 text-slate-500" aria-hidden />
                <input type="month" value={leaveMonth} onChange={(event) => setLeaveMonth(event.target.value)} className="bg-transparent outline-none" />
              </label>
            </div>
          </div>

          {actionFeedback && (
            <div className={`fixed right-6 top-20 z-50 flex max-w-sm items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm font-extrabold shadow-2xl animate-leave-toast ${actionFeedback.type === "success" ? "border-emerald-100 text-emerald-700" : "border-red-100 text-red-700"}`}>
              <span className={`grid h-9 w-9 place-items-center rounded-full ${actionFeedback.type === "success" ? "bg-emerald-100" : "bg-red-100"}`}>
                {actionFeedback.type === "success" ? <FiCheckCircle className="h-5 w-5" aria-hidden /> : <FiXCircle className="h-5 w-5" aria-hidden />}
              </span>
              <span>{actionFeedback.message}</span>
            </div>
          )}

          {status && <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 animate-fade-in">{status}</div>}

          {showForm && (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-[#11164a]">{requestTitles[form.type]}</h2>
                <button type="button" onClick={() => setShowForm(false)} className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100">
                  <FiX className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <form onSubmit={create}>
                {renderActiveForm()}
                <button className="mt-5 h-12 rounded-lg bg-[#5b21e8] px-6 text-sm font-extrabold text-white">Submit Request</button>
              </form>
            </section>
          )}

          {!showForm && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <LeaveStatCard label="Total Requests" value={managementStats.selectedMonthRequests.length} helper={monthLabel(leaveMonth)} icon={FiCalendar} tone="bg-violet-600 text-white" />
                <LeaveStatCard label="Pending Requests" value={managementStats.pending} helper="Awaiting current approver" icon={FiClock} tone="bg-emerald-600 text-white" />
                <LeaveStatCard label="Approved This Month" value={managementStats.approved} helper="All request types" icon={FiBarChart2} tone="bg-orange-500 text-white" />
                <LeaveStatCard label="Rejected This Month" value={managementStats.rejected} helper="All request types" icon={FiXCircle} tone="bg-rose-500 text-white" />
                <LeaveStatCard label="Pending OT Hours" value={managementStats.pendingOtHours.toFixed(1)} helper="Overtime awaiting approval" icon={FiUsers} tone="bg-blue-600 text-white" />
              </div>

              <div className="flex gap-8 overflow-x-auto border-b border-slate-200 bg-white px-4">
                {requestDashboardTabs.map((tab) => (
                  <button key={tab} type="button" onClick={() => setLeaveTab(tab)} className={`h-12 border-b-2 px-1 text-sm font-extrabold ${leaveTab === tab ? "border-[#5b21e8] text-[#5b21e8]" : "border-transparent text-slate-700 hover:text-[#5b21e8]"}`}>
                    {tab}
                  </button>
                ))}
              </div>

              {leaveTab === "Dashboard" && (
                <>
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_360px]">
                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <h2 className="text-lg font-extrabold text-[#11164a]">Request Type Overview</h2>
                      <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="relative h-[240px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={managementStats.typeData} innerRadius={70} outerRadius={105} dataKey="value" paddingAngle={2}>
                                {managementStats.typeData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                            <div>
                              <p className="text-3xl font-extrabold text-[#11164a]">{managementStats.selectedMonthRequests.length}</p>
                              <p className="text-sm font-bold text-[#11164a]">Requests</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid content-center gap-4">
                          {managementStats.typeData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-sm font-bold text-[#11164a]">{item.name}</span>
                              </div>
                              <span className="text-sm font-extrabold text-[#11164a]">{item.value} requests</span>
                            </div>
                          ))}
                          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="font-extrabold text-[#11164a]">On Leave Today</span>
                            <span className="font-extrabold text-[#11164a]">{managementStats.onLeaveToday}</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-[#11164a]">Request Summary</h2>
                        <span className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">This Year</span>
                      </div>
                      <div className="mt-4 h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={managementStats.trend} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#11164a", fontWeight: 700 }} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontWeight: 700 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="Approved" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="Rejected" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-[#11164a]">Request Statistics</h2>
                        <span className="text-xs font-bold text-[#5b21e8]">This Month</span>
                      </div>
                      <div className="mt-4 space-y-4 text-sm font-bold text-[#11164a]">
                        <StatLine label="Total Requests" value={managementStats.selectedMonthRequests.length} />
                        <StatLine label="Approved" value={`${managementStats.approved} (${((managementStats.approved / totalMonth) * 100).toFixed(1)}%)`} tone="text-emerald-600" />
                        <StatLine label="Pending" value={`${managementStats.selectedMonthRequests.filter((item) => item.status === "pending").length} (${((managementStats.selectedMonthRequests.filter((item) => item.status === "pending").length / totalMonth) * 100).toFixed(1)}%)`} tone="text-orange-500" />
                        <StatLine label="Rejected" value={`${managementStats.rejected} (${((managementStats.rejected / totalMonth) * 100).toFixed(1)}%)`} tone="text-red-500" />
                      </div>
                    </section>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <LeaveRequestsTable
                      rows={managementRows}
                      search={leaveSearch}
                      setSearch={setLeaveSearch}
                      onOpen={openRequest}
                      onUpdate={updateRequest}
                      title="Recent Requests"
                      recentlyUpdatedId={recentlyUpdatedId}
                      actionLoadingId={actionLoadingId}
                      actorRole={role}
                      currentUserId={currentUser?.id}
                      approvalFlow={approvalFlow}
                    />
                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-[#11164a]">Upcoming Public Holidays</h2>
                        <span className="text-xs font-bold text-[#5b21e8]">View Calendar</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {upcomingHolidays.map(([name, date]) => (
                          <div key={name} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0">
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-md bg-violet-100 text-[#5b21e8]"><FiCalendar className="h-4 w-4" /></span>
                              <span className="text-sm font-extrabold text-[#11164a]">{name}</span>
                            </div>
                            <span className="text-xs font-bold text-[#5b21e8]">{date}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </>
              )}

              {leaveTab === "Settings" && (
                <ApprovalFlowSettings
                  flow={approvalFlow}
                  onToggleStage={toggleApprovalStage}
                  onMoveStage={moveApprovalStage}
                  onSave={saveApprovalFlow}
                  saving={flowSaving}
                  canEdit={role === "management_hr"}
                />
              )}

              {leaveTab !== "Dashboard" && leaveTab !== "Settings" && (
                <LeaveRequestsTable
                  rows={rowsForTab(leaveTab)}
                  search={leaveSearch}
                  setSearch={setLeaveSearch}
                  onOpen={openRequest}
                  onUpdate={updateRequest}
                  title={leaveTab}
                  recentlyUpdatedId={recentlyUpdatedId}
                  actionLoadingId={actionLoadingId}
                  actorRole={role}
                  currentUserId={currentUser?.id}
                  approvalFlow={approvalFlow}
                />
              )}

              {selectedRequest && (
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-extrabold text-[#11164a]">Request Detail</h2>
                    <button type="button" onClick={() => setSelectedRequestId(null)} className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100"><FiX className="h-5 w-5" /></button>
                  </div>
                  <RequestDetail request={selectedRequest} onCancel={cancelPending} />
                </section>
              )}
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#3b3b3b] md:bg-white">
      <div className="mx-auto min-h-screen w-full max-w-[512px] bg-white pb-24 shadow-2xl md:max-w-none md:shadow-none">
        <header className="sticky top-0 z-10 bg-white">
          <div className="flex h-16 items-center gap-5 px-6">
            <button
              type="button"
              onClick={goBack}
              className="-ml-3 grid h-10 w-10 shrink-0 place-items-center rounded-full text-black hover:bg-slate-100"
              aria-label="Go back"
            >
              <FiChevronLeft className="h-7 w-7" aria-hidden />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold text-black">
              {showForm
                ? requestTitles[form.type] || requestTitles.leave
                : selectedRequest
                  ? "Request Detail"
                  : pageTitle}
            </h1>
            <button
              type="button"
              onClick={showForm ? () => setShowForm(false) : openForm}
              className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-black hover:bg-slate-100"
              aria-label={showForm ? "Close form" : "Add new request"}
            >
              {showForm ? (
                <FiX className="h-6 w-6" aria-hidden />
              ) : (
                <FiPlus className="h-6 w-6" aria-hidden />
              )}
            </button>
          </div>
        </header>

        <main className="px-6 pt-2">
          {showForm && (
            <form onSubmit={create} className="pb-8">
              {renderActiveForm()}
              <div className="my-5 h-px bg-slate-200" />
              <button className="h-14 w-full rounded-xl bg-emerald-800 text-lg font-extrabold text-white">
                Submit
              </button>
              {status && (
                <p className="mt-3 text-sm font-semibold text-emerald-700">
                  {status}
                </p>
              )}
            </form>
          )}

          {!showForm && selectedRequest && (
            <RequestDetail request={selectedRequest} onCancel={cancelPending} />
          )}

          {!showForm && !selectedRequest && (
            <RequestList
              assignedItems={filteredAssignedItems}
              filteredItemCount={filteredItemCount}
              leaveSummary={leaveSummary}
              onCancel={cancelPending}
              onLoadMore={() => setVisibleCount((count) => count + 6)}
              onOpenRequest={openRequest}
              onStatusFilterChange={setStatusFilter}
              onUpdateAssigned={updateRequest}
              requestType={requestType}
              status={status}
              statusFilter={statusFilter}
              visibleCount={visibleCount}
              visibleItems={visibleItems}
            />
          )}
        </main>
      </div>
    </div>
  );
};

const StatLine = ({ label, value, tone = "text-[#11164a]" }) => (
  <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0">
    <span>{label}</span>
    <span className={`font-extrabold ${tone}`}>{value}</span>
  </div>
);

const ApprovalFlowSettings = ({ flow, onToggleStage, onMoveStage, onSave, saving, canEdit }) => {
  const selected = Array.isArray(flow) ? flow : defaultApprovalFlow;
  const orderedStages = getOrderedApprovalStages(selected);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-[#11164a]">Approval Flow Settings</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            New requests will follow the enabled stages in this order.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!canEdit || saving || selected.length === 0}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#5b21e8] px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          title={canEdit ? "Save approval flow" : "Only HR can change approval flow"}
        >
          <FiSave className="h-4 w-4" aria-hidden />
          {saving ? "Saving..." : "Save Flow"}
        </button>
      </div>

      {!canEdit && (
        <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          Only Management HR can edit this approval flow.
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {orderedStages.map((stage) => {
          const isEnabled = selected.includes(stage.key);
          const orderIndex = selected.indexOf(stage.key);
          return (
            <article key={stage.key} className={`rounded-lg border p-4 ${isEnabled ? "border-violet-100 bg-violet-50/50" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`grid h-8 min-w-8 place-items-center rounded-md text-sm font-extrabold ${isEnabled ? "bg-[#5b21e8] text-white" : "bg-slate-200 text-slate-500"}`}>
                      {isEnabled ? orderIndex + 1 : "-"}
                    </span>
                    <h3 className="text-base font-extrabold text-[#11164a]">{stage.label}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${isEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                      {isEnabled ? "Enabled" : "Skipped"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{stage.helper}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onMoveStage(stage.key, -1)}
                    disabled={!canEdit || !isEnabled || orderIndex === 0}
                    className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Move up"
                  >
                    <FiArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveStage(stage.key, 1)}
                    disabled={!canEdit || !isEnabled || orderIndex === selected.length - 1}
                    className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Move down"
                  >
                    <FiArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>

              <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-[#11164a]">
                <span>Use this approval stage</span>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  disabled={!canEdit}
                  onChange={() => onToggleStage(stage.key)}
                  className="h-5 w-5 accent-[#5b21e8] disabled:cursor-not-allowed"
                />
              </label>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const LeaveRequestsTable = ({ rows, search, setSearch, onOpen, onUpdate, title, recentlyUpdatedId, actionLoadingId, actorRole, currentUserId, approvalFlow }) => (
  <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
      <h2 className="text-lg font-extrabold text-[#11164a]">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-10 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 md:w-72">
          <FiSearch className="h-4 w-4 text-slate-400" aria-hidden />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-slate-400" placeholder="Search by employee..." />
        </label>
        <button type="button" className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700">
          <FiFilter className="h-4 w-4" aria-hidden />
          Filter
        </button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-extrabold uppercase text-[#11164a]">
          <tr>
            <th className="px-5 py-4">Employee</th>
            <th className="px-5 py-4">Request Type</th>
            <th className="px-5 py-4">Details</th>
            <th className="px-5 py-4">Date / Time</th>
            <th className="px-5 py-4">Unit</th>
            <th className="px-5 py-4">Reason</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Pending On</th>
            <th className="px-5 py-4">Applied On</th>
            <th className="px-5 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.slice(0, 8).map(({ request, user, detail, range, unit, reason }) => {
            const pendingStage = getPendingApprovalStage(request, approvalFlow);
            const canApprove = canCurrentUserApprove(request, actorRole, currentUserId, approvalFlow);
            const isWaitingOnSomeoneElse = request.status === "pending" && pendingStage && !canApprove;
            return (
            <tr key={request.id} className={`${recentlyUpdatedId === request.id ? "animate-leave-row bg-emerald-50/80" : "hover:bg-slate-50/70"}`}>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-200 text-xs font-extrabold text-[#11164a]">
                    {String(user?.name || "U").split(" ").map((part) => part[0]).join("").slice(0, 2)}
                  </span>
                  <div>
                    <p className="font-extrabold text-[#11164a]">{user?.name || `Employee #${request.user_id}`}</p>
                    <p className="text-xs font-semibold text-slate-500">{user?.department || "-"}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <span className={`rounded-md px-3 py-1.5 text-xs font-extrabold ${requestTypeTone(request.type)}`}>{requestTypeLabel(request.type)}</span>
              </td>
              <td className="px-5 py-4 font-semibold text-[#11164a]">{detail}</td>
              <td className="px-5 py-4 font-semibold text-[#11164a]">{range}</td>
              <td className="px-5 py-4 font-semibold text-[#11164a]">{unit}</td>
              <td className="px-5 py-4 font-semibold text-[#11164a]">{reason}</td>
              <td className="px-5 py-4">
                <span className={`rounded-md px-3 py-1.5 text-xs font-extrabold ${leaveStatusTone(request.status)}`}>{statusDisplay(request.status)}</span>
              </td>
              <td className="px-5 py-4">
                <span className={`rounded-md px-3 py-1.5 text-xs font-extrabold ${pendingStage ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                  {pendingStage?.label || "-"}
                </span>
              </td>
              <td className="px-5 py-4 font-semibold text-slate-600">{formatDate(request.date)}</td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => onOpen(request)} className="grid h-9 w-9 place-items-center rounded-md text-[#11164a] hover:bg-slate-100" title="View request">
                    <FiEye className="h-4 w-4" aria-hidden />
                  </button>
                  {request.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => onUpdate(request.id, "approved")}
                        disabled={!canApprove || actionLoadingId === request.id}
                        title={isWaitingOnSomeoneElse ? `Waiting for ${pendingStage.label}` : "Approve request"}
                        className="rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-extrabold text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {actionLoadingId === request.id ? "Saving..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdate(request.id, "rejected")}
                        disabled={!canApprove || actionLoadingId === request.id}
                        title={isWaitingOnSomeoneElse ? `Waiting for ${pendingStage.label}` : "Reject request"}
                        className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-extrabold text-red-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {actionLoadingId === request.id ? "Saving..." : "Reject"}
                      </button>
                      {isWaitingOnSomeoneElse && (
                        <span className="self-center text-xs font-bold text-slate-400">Waiting</span>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={10} className="px-5 py-10 text-center text-sm font-bold text-slate-400">No requests found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
      <p className="text-sm font-semibold text-[#11164a]">Showing 1 to {Math.min(8, rows.length)} of {rows.length} requests</p>
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((page) => (
          <button key={page} type="button" className={`h-8 min-w-8 rounded-md border px-2 text-sm font-bold ${page === 1 ? "border-[#5b21e8] bg-[#5b21e8] text-white" : "border-slate-200 text-slate-700"}`}>{page}</button>
        ))}
      </div>
    </div>
  </section>
);

export default RequestsPage;
