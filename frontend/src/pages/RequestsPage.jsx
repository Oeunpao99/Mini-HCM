import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiArrowDown,
  FiArrowUp,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiClock,
  FiDownload,
  FiEdit2,
  FiEye,
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiUsers,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import {
  Bar,
  BarChart,
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
  ["maternity", "Maternity Leave"],
  ["paternity", "Paternity Leave"],
  ["marriage", "Marriage Leave"],
  ["compassionate", "Compassionate Leave"],
  ["unpaid", "Unpaid Leave"],
  ["special", "Special Leave"],
  ["business", "Business Leave"],
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
  late: "Late Request Form",
};

const requestListTitles = {
  leave: "Leave Management",
  permission: "Permission Requests",
  flexible: "Flexible Requests",
  ot: "Overtime Requests",
};
const requestTypeDefinitions = [
  { key: "leave", label: "Leave", tab: "Leave", color: "#1f7aff", tone: "bg-blue-100 text-blue-700" },
  { key: "permission", label: "Permission", tab: "Permission", color: "#f59e0b", tone: "bg-orange-100 text-orange-700" },
  { key: "late", label: "Late", tab: "Late", color: "#ff0000", tone: "bg-red-100 text-red-700" },
  { key: "ot", label: "Overtime", tab: "Overtime", color: "#8b5cf6", tone: "bg-violet-100 text-violet-700" },
  { key: "flexible", label: "Flexible Work", tab: "Flexible Work", color: "#22c55e", tone: "bg-emerald-100 text-emerald-700" },
];

const ANNUAL_LEAVE = 18;
const SICK_LEAVE = 6;
const MATERNITY_LEAVE = 0;
const PATERNITY_LEAVE = 0;
const MARRIAGE_LEAVE = 0;
const COMPASSIONATE_LEAVE = 0;
const UNPAID_LEAVE = 0;
const SPECIAL_LEAVE = 0;
const BUSINESS_LEAVE = 0;
const defaultLeaveEntitlements = {
  annual: ANNUAL_LEAVE,
  sick: SICK_LEAVE,
  maternity: MATERNITY_LEAVE,
  paternity: PATERNITY_LEAVE,
  marriage: MARRIAGE_LEAVE,
  compassionate: COMPASSIONATE_LEAVE,
  unpaid: UNPAID_LEAVE,
  special: SPECIAL_LEAVE,
  business: BUSINESS_LEAVE,
};
const leaveEntitlementFields = leaveTypes.map(([key, label]) => ({ key, label }));
const managementRoles = ["line_manager", "department_head", "management_hr", "payroll_officer"];
const leaveTypeColors = {
  annual: "#1f7aff",
  sick: "#22c55e",
  maternity: "#ec4899",
  paternity: "#8b5cf6",
  marriage: "#f43f5e",
  compassionate: "#f59e0b",
  unpaid: "#64748b",
  special: "#f59e0b",
  business: "#0ea5e9",
};
const suggestedLeaveTabs = [
  {
    group: "Leave Request",
    items: ["Leave Calendar", "Request History"],
  },
  {
    group: "Leave Balance",
    items: ["Entitlement", "Leave Taken", "Remaining Balance"],
  },
  {
    group: "Approval Management",
    items: ["Pending Requests", "Approved Requests", "Rejected Requests"],
  },
  {
    group: "Leave Calendar",
    items: ["Team Leave Calendar", "Department Leave Calendar", "Company Leave Calendar"],
  },
  {
    group: "Leave Reports",
    items: ["Leave Summary Report", "Leave Balance Report", "Leave Utilization Report", "Monthly Attendance Report"],
  },
];
const otDashboardTabs = ["Dashboard", "Overtime", "Reports"];
const approvalStageDefinitions = [
  { key: "backup", statusKey: "backup_status", label: "Backup Person", helper: "Optional handover confirmation from the selected backup employee." },
  { key: "line_manager", statusKey: "line_manager_status", label: "Line Manager", helper: "Direct manager approval for team staffing and workload." },
  { key: "department_head", statusKey: "department_head_status", label: "Department Head", helper: "Department-level approval before HR final review." },
  { key: "management_hr", statusKey: "hr_status", label: "HR", helper: "Final HR compliance and record confirmation." },
];
const defaultApprovalFlow = approvalStageDefinitions.map((stage) => stage.key);

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-[#f8f8f8] px-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-700";

const textAreaClass =
  "min-h-[72px] w-full rounded-lg border border-slate-300 bg-[#f8f8f8] px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-emerald-700";

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
    "Half day:",
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
    "Remarks:",
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
  if (value.includes("maternity")) return "bg-pink-100 text-pink-700";
  if (value.includes("paternity")) return "bg-violet-100 text-violet-700";
  if (value.includes("marriage")) return "bg-rose-100 text-rose-700";
  if (value.includes("compassionate")) return "bg-amber-100 text-amber-700";
  if (value.includes("unpaid")) return "bg-slate-100 text-slate-700";
  if (value.includes("special")) return "bg-orange-100 text-orange-700";
  if (value.includes("business")) return "bg-sky-100 text-sky-700";
  return "bg-blue-100 text-blue-700";
};

const leaveStatusTone = (status) => {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "paid") return "bg-blue-100 text-blue-700";
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
    <span className="text-xs font-bold text-black">
      {required ? "* " : ""}
      {label}
    </span>
    <div className="mt-1">{children}</div>
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
    <FiCalendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-800" />
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
    <FiClock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-800" />
  </div>
);

const AttachmentField = ({ attachment, onChange, label = "Attachment" }) => (
  <FieldShell label={label}>
    <label className="grid h-10 cursor-pointer place-items-center rounded-lg border border-emerald-800 bg-white px-3 text-center text-sm font-medium text-black hover:bg-emerald-50">
      {attachment ? attachment.name : "Attach File"}
      <input
        type="file"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
    </label>
  </FieldShell>
);

const ReadOnlyField = ({ value, placeholder = "Auto" }) => (
  <input
    className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-600`}
    value={value || ""}
    placeholder={placeholder}
    readOnly
  />
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
    <div className="mt-3 rounded-lg border border-slate-200 p-3">
      <h3 className="mb-2 text-sm font-extrabold text-black">Back Up User</h3>
      <div className="relative">
        <input
          className={`${inputClass} pr-12`}
          value={backupSearch}
          onChange={(event) => setBackupSearch(event.target.value)}
          placeholder="Search User"
        />
        <FiSearch className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
      <p className="mt-1 text-xs font-medium text-black">
        Minimum 4 characters required
      </p>

      {(backupSearch.length >= 4 || selectedBackup) && (
        <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filteredBackupOptions.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                setSelectedBackupId(String(user.id));
                setBackupSearch(`${user.name} (${user.emp_code})`);
              }}
              className={`block w-full px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 ${
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
  half_day: false,
  reason: "",
  remarks: "",
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
  const { role, empCode, name, userId, department } = useAuth();
  const isManagement = managementRoles.includes(role);
  const [form, setForm] = useState(initialForm);
  const [attachment, setAttachment] = useState(null);
  const [items, setItems] = useState([]);
  const [leaveEntitlements, setLeaveEntitlements] = useState([]);
  const [entitlementDrafts, setEntitlementDrafts] = useState({});
  const [entitlementSavingId, setEntitlementSavingId] = useState(null);
  const [assignedItems, setAssignedItems] = useState([]);
  const [backupOptions, setBackupOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaveTab, setLeaveTab] = useState("Request History");
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
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(6);
  const [deptFilter, setDeptFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const requestType = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    return type && requestTitles[type] ? type : "";
  }, [location.search]);

  const load = async () => {
    const [requestRes, assignedRes, backupRes, usersRes, flowRes, entitlementRes] = await Promise.all([
      isManagement ? api.get("/api/requests/all") : api.get("/api/requests/my"),
      api.get("/api/requests/assigned-to-me").catch(() => ({ data: [] })),
      api.get("/api/requests/backup-options").catch(() => ({ data: [] })),
      isManagement ? api.get("/api/admin/users").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      isManagement ? api.get("/api/requests/approval-flow").catch(() => ({ data: { stages: defaultApprovalFlow } })) : Promise.resolve({ data: { stages: defaultApprovalFlow } }),
      api.get("/api/requests/leave-entitlements").catch(() => ({ data: [] })),
    ]);
    setItems(requestRes.data);
    setAssignedItems(assignedRes.data);
    setBackupOptions(backupRes.data);
    setUsers(usersRes.data || []);
    setApprovalFlow(Array.isArray(flowRes.data?.stages) && flowRes.data.stages.length ? flowRes.data.stages : defaultApprovalFlow);
    setLeaveEntitlements(entitlementRes.data || []);
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

    const entitlement =
      leaveEntitlements.find((row) => Number(row.user_id) === Number(userId)) ||
      leaveEntitlements[0] ||
      defaultLeaveEntitlements;

    const typeMap = Object.fromEntries(
      leaveEntitlementFields.map(({ key }) => [
        key,
        { used: 0, total: Number(entitlement[key] ?? defaultLeaveEntitlements[key]) },
      ]),
    );

    approvedLeaves.forEach((request) => {
      const lt = String(request.leave_type || "annual").toLowerCase();
      const days = getRequestDays(request);
      if (typeMap[lt]) typeMap[lt].used += days;
    });

    const summary = {};
    for (const [key, val] of Object.entries(typeMap)) {
      summary[`total${key.charAt(0).toUpperCase() + key.slice(1)}`] = val.total;
      summary[`used${key.charAt(0).toUpperCase() + key.slice(1)}`] = val.used;
      summary[`remaining${key.charAt(0).toUpperCase() + key.slice(1)}`] = Math.max(0, val.total - val.used).toFixed(2);
    }
    return summary;
  }, [items, leaveEntitlements, userId]);

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
  const entitlementByUserId = useMemo(
    () => new Map(leaveEntitlements.map((row) => [Number(row.user_id), row])),
    [leaveEntitlements],
  );
  const getUserEntitlements = (userId) => ({
    ...defaultLeaveEntitlements,
    ...(entitlementByUserId.get(Number(userId)) || {}),
  });
  const formUser = currentUser || {
    id: Number(userId),
    emp_code: empCode,
    name,
    department,
  };
  const formLeaveBalance = useMemo(() => {
    const currentYear = String(new Date().getFullYear());
    const activeUserId = currentUser?.id || Number(userId);
    const source = activeUserId
      ? items.filter((request) => Number(request.user_id) === Number(activeUserId))
      : items;
    const approvedLeaves = source.filter(
      (request) =>
        request.type === "leave" &&
        request.status === "approved" &&
        String(request.date || "").startsWith(currentYear),
    );
    const taken = approvedLeaves.reduce((sum, request) => sum + getRequestDays(request), 0);
    return {
      entitlement: getUserEntitlements(activeUserId).annual,
      taken,
      remaining: Math.max(0, getUserEntitlements(activeUserId).annual - taken),
    };
  }, [currentUser, entitlementByUserId, items, userId]);
  const nextLeaveRequestNo = useMemo(() => {
    const maxId = items.reduce((max, request) => Math.max(max, Number(request.id) || 0), 0);
    return `LR-${String(maxId + 1).padStart(5, "0")}`;
  }, [items]);

  useEffect(() => {
    const nextDrafts = {};
    const sourceUsers = users.length ? users : formUser.id ? [formUser] : [];
    sourceUsers.forEach((user) => {
      if (!user?.id) return;
      nextDrafts[user.id] = getUserEntitlements(user.id);
    });
    setEntitlementDrafts(nextDrafts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveEntitlements, users, formUser.id]);

  const departmentOptions = useMemo(
    () => [...new Set(users.map((user) => user.department).filter(Boolean))],
    [users],
  );
  const unitOptions = useMemo(
    () => [...new Set(
      users
        .filter((user) => deptFilter === "all" || user.department === deptFilter)
        .map((user) => user.sub_department)
        .filter(Boolean)
    )],
    [users, deptFilter],
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
        const matchesDept = deptFilter === "all" || row.user?.department === deptFilter;
        const matchesUnit = unitFilter === "all" || row.user?.sub_department === unitFilter;
        if (!matchesDept || !matchesUnit) return false;
        if (!query) return true;
        return `${row.user?.name || ""} ${row.user?.department || ""} ${requestTypeLabel(row.request.type)} ${row.detail || ""} ${row.request.status || ""}`
          .toLowerCase()
          .includes(query);
      });
  }, [leaveSearch, deptFilter, unitFilter, managementRequests, userById]);

  const filteredManagementRequests = useMemo(() => {
    const query = leaveSearch.trim().toLowerCase();
    return managementRequests.filter((request) => {
      const user = userById.get(request.user_id);
      const searchable = `${user?.name || ""} ${user?.department || ""} ${requestTypeLabel(request.type)} ${requestDetailLabel(request)} ${request.status || ""}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = statusFilter === "all" || matchesStatusFilter(request, statusFilter);
      const matchesDept = deptFilter === "all" || user?.department === deptFilter;
      const matchesUnit = unitFilter === "all" || user?.sub_department === unitFilter;
      return matchesSearch && matchesStatus && matchesDept && matchesUnit;
    });
  }, [leaveSearch, statusFilter, deptFilter, unitFilter, managementRequests, userById]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesDept = deptFilter === "all" || user.department === deptFilter;
      const matchesUnit = unitFilter === "all" || user.sub_department === unitFilter;
      return matchesDept && matchesUnit;
    });
  }, [users, deptFilter, unitFilter]);

  const managementStats = useMemo(() => {
    const [year, month] = leaveMonth.split("-").map(Number);
    const scope = requestType === "ot"
      ? filteredManagementRequests.filter((r) => r.type === "ot")
      : requestType === "leave"
        ? filteredManagementRequests.filter((r) => r.type !== "ot")
        : filteredManagementRequests;
    const selectedMonthRequests = scope.filter((request) => monthKey(request.date) === leaveMonth);
    const leaveRequests = filteredManagementRequests.filter((request) => request.type === "leave");
    const today = todayKey();
    const approved = selectedMonthRequests.filter((request) => request.status === "approved");
    const pending = scope.filter((request) => request.status === "pending");
    const rejected = selectedMonthRequests.filter((request) => request.status === "rejected");
    const onLeaveToday = leaveRequests.filter((request) => request.status === "approved" && isDateInRequest(request, today));
    const pendingOtHours = filteredManagementRequests
      .filter((request) => request.type === "ot" && request.status === "pending")
      .reduce((sum, request) => sum + Number(getReasonValue(request.reason, "Hour work") || 0), 0);
    const usedAnnual = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "annual").includes("annual"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const usedSick = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "").includes("sick"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const usedMaternity = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "").includes("maternity"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const usedPaternity = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "").includes("paternity"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const usedMarriage = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "").includes("marriage"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const usedCompassionate = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "").includes("compassionate"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const usedUnpaid = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "").includes("unpaid"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const usedSpecial = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "").includes("special"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const usedBusiness = leaveRequests
      .filter((request) => request.status === "approved" && String(request.leave_type || "").includes("business"))
      .reduce((sum, request) => sum + getRequestDays(request), 0);
    const usersForTotals = filteredUsers.length ? filteredUsers : [{ id: currentUser?.id || Number(userId) }];
    const sumEntitlement = (key) =>
      usersForTotals.reduce((sum, row) => sum + Number(getUserEntitlements(row.id)[key] || 0), 0);
    const totalAnnual = sumEntitlement("annual");
    const totalSick = sumEntitlement("sick");
    const totalMaternity = sumEntitlement("maternity");
    const totalPaternity = sumEntitlement("paternity");
    const totalMarriage = sumEntitlement("marriage");
    const totalCompassionate = sumEntitlement("compassionate");
    const totalUnpaid = sumEntitlement("unpaid");
    const totalSpecial = sumEntitlement("special");
    const totalBusiness = sumEntitlement("business");
    const balanceData = [
      { name: "Annual Leave", value: Math.max(0, totalAnnual - usedAnnual), color: leaveTypeColors.annual },
      { name: "Sick Leave", value: Math.max(0, totalSick - usedSick), color: leaveTypeColors.sick },
      { name: "Maternity Leave", value: Math.max(0, totalMaternity - usedMaternity), color: leaveTypeColors.maternity },
      { name: "Paternity Leave", value: Math.max(0, totalPaternity - usedPaternity), color: leaveTypeColors.paternity },
      { name: "Marriage Leave", value: Math.max(0, totalMarriage - usedMarriage), color: leaveTypeColors.marriage },
      { name: "Compassionate Leave", value: Math.max(0, totalCompassionate - usedCompassionate), color: leaveTypeColors.compassionate },
      { name: "Unpaid Leave", value: Math.max(0, totalUnpaid - usedUnpaid), color: leaveTypeColors.unpaid },
      { name: "Special Leave", value: Math.max(0, totalSpecial - usedSpecial), color: leaveTypeColors.special },
      { name: "Business Leave", value: Math.max(0, totalBusiness - usedBusiness), color: leaveTypeColors.business },
    ];
    const totalUsed = usedAnnual + usedSick + usedMaternity + usedPaternity + usedMarriage + usedCompassionate + usedUnpaid + usedSpecial + usedBusiness;
    const totalEntitlement = totalAnnual + totalSick + totalMaternity + totalPaternity + totalMarriage + totalCompassionate + totalUnpaid + totalSpecial + totalBusiness;
    const leaveUtilizationRate = totalEntitlement > 0 ? Math.round((totalUsed / totalEntitlement) * 100) : 0;

    const leaveByDepartment = [];
    const deptLeaveMap = new Map();
    leaveRequests.filter((r) => r.status === "approved").forEach((r) => {
      const u = userById.get(r.user_id);
      const dept = u?.department || "Unassigned";
      const days = getRequestDays(r);
      deptLeaveMap.set(dept, (deptLeaveMap.get(dept) || 0) + days);
    });
    deptLeaveMap.forEach((days, dept) => leaveByDepartment.push({ department: dept, days: Math.round(days * 10) / 10 }));

    const lowBalanceEmployees = filteredUsers.filter((u) => {
      const entitlements = getUserEntitlements(u.id);
      const annualEntitle = Number(entitlements.annual || 0);
      const userLeaveRequests = leaveRequests.filter((r) => r.user_id === u.id && r.status === "approved" && String(r.leave_type || "annual").includes("annual"));
      const used = userLeaveRequests.reduce((sum, r) => sum + getRequestDays(r), 0);
      const remaining = annualEntitle - used;
      return remaining < 3 && remaining >= 0;
    }).length;

    const trend = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(year, month - 6 + index, 1);
      const key = monthKey(date);
      const rows = scope.filter((request) => monthKey(request.date) === key);
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

    const otRequests = filteredManagementRequests.filter((r) => r.type === "ot");
    const totalOtHours = otRequests
      .filter((r) => r.status === "approved" || r.status === "pending")
      .reduce((sum, r) => sum + Number(getReasonValue(r.reason, "Hour work") || 0), 0);
    const approvedOtHours = otRequests
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + Number(getReasonValue(r.reason, "Hour work") || 0), 0);
    const pendingOtCount = otRequests.filter((r) => r.status === "pending").length;
    const approvedOtCount = otRequests.filter((r) => r.status === "approved").length;
    const rejectedOtCount = otRequests.filter((r) => r.status === "rejected").length;
    const paidOtCount = otRequests.filter((r) => r.status === "paid").length;
    const paidOtHours = otRequests
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + Number(getReasonValue(r.reason, "Hour work") || 0), 0);
    const hourlyRate = 10;
    const otCostSummary = (approvedOtHours * hourlyRate).toFixed(2);

    const otByDepartment = [];
    const deptMap = new Map();
    otRequests.filter((r) => r.status === "approved").forEach((r) => {
      const user = userById.get(r.user_id);
      const dept = user?.department || "Unassigned";
      const hours = Number(getReasonValue(r.reason, "Hour work") || 0);
      deptMap.set(dept, (deptMap.get(dept) || 0) + hours);
    });
    deptMap.forEach((hours, dept) => otByDepartment.push({ department: dept, hours: Math.round(hours * 10) / 10 }));

    const topOtEmployees = [];
    const empMap = new Map();
    otRequests.filter((r) => r.status === "approved").forEach((r) => {
      const uid = r.user_id;
      const hours = Number(getReasonValue(r.reason, "Hour work") || 0);
      empMap.set(uid, (empMap.get(uid) || 0) + hours);
    });
    empMap.forEach((hours, uid) => {
      const u = userById.get(uid);
      topOtEmployees.push({ user_id: uid, name: u?.name || `Employee #${uid}`, hours: Math.round(hours * 10) / 10 });
    });
    topOtEmployees.sort((a, b) => b.hours - a.hours);

    const monthlyOtTrend = Array.from({ length: 12 }, (_, index) => {
      const d = new Date(year, index, 1);
      const key = monthKey(d);
      const rows = otRequests.filter((r) => monthKey(r.date) === key);
      const totalHours = rows.reduce((sum, r) => sum + Number(getReasonValue(r.reason, "Hour work") || 0), 0);
      return {
        month: d.toLocaleDateString(undefined, { month: "short" }),
        hours: Math.round(totalHours * 10) / 10,
        count: rows.length,
      };
    });

    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      onLeaveToday: onLeaveToday.length,
      pendingOtHours,
      totalBalance: balanceData.reduce((sum, item) => sum + item.value, 0),
      balanceData,
      leaveUtilizationRate,
      leaveByDepartment,
      lowBalanceEmployees,
      annualLeaveBalance: Math.max(0, totalAnnual - usedAnnual),
      typeData,
      trend,
      selectedMonthRequests,
      otByDepartment,
      topOtEmployees,
      monthlyOtTrend,
      totalOtHours: Math.round(totalOtHours * 10) / 10,
      approvedOtHours: Math.round(approvedOtHours * 10) / 10,
      pendingOtCount,
      approvedOtCount,
      rejectedOtCount,
      paidOtCount,
      paidOtHours: Math.round(paidOtHours * 10) / 10,
      otCostSummary,
    };
  }, [leaveMonth, filteredManagementRequests, requestType, userById, filteredUsers, entitlementByUserId, currentUser, userId]);

  const days = useMemo(
    () => dateDiffDays(form.start_date, form.end_date),
    [form.end_date, form.start_date],
  );
  const leaveTotalDays = form.half_day ? 0.5 : days;

  useEffect(() => {
    setStatusFilter("all");
    setVisibleCount(6);
    setSelectedRequestId(null);
    setShowForm(false);
    setLeaveTab(requestType === "ot" ? "Dashboard" : "Request History");
  }, [requestType]);

  useEffect(() => {
    setVisibleCount(6);
  }, [statusFilter]);

  const updateForm = (patch) => {
    setForm((previous) => ({ ...previous, ...patch }));
  };

  const updateEntitlementDraft = (targetUserId, key, value) => {
    setEntitlementDrafts((previous) => ({
      ...previous,
      [targetUserId]: {
        ...defaultLeaveEntitlements,
        ...(previous[targetUserId] || {}),
        [key]: value,
      },
    }));
  };

  const saveLeaveEntitlement = async (targetUserId) => {
    const draft = {
      ...defaultLeaveEntitlements,
      ...(entitlementDrafts[targetUserId] || {}),
    };
    const payload = {
      user_id: Number(targetUserId),
      ...Object.fromEntries(
        leaveEntitlementFields.map(({ key }) => [key, Number(draft[key]) || 0]),
      ),
    };

    setEntitlementSavingId(targetUserId);
    setActionFeedback(null);
    try {
      const { data } = await api.put(`/api/requests/leave-entitlements/${targetUserId}`, payload);
      setLeaveEntitlements((previous) => {
        const others = previous.filter((row) => Number(row.user_id) !== Number(targetUserId));
        return [...others, data];
      });
      setStatus("Leave entitlement updated");
      setActionFeedback({ type: "success", message: "Leave entitlement updated" });
      window.setTimeout(() => setActionFeedback(null), 2600);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || "Could not update leave entitlement";
      setStatus(message);
      setActionFeedback({ type: "danger", message });
      window.setTimeout(() => setActionFeedback(null), 3200);
    } finally {
      setEntitlementSavingId(null);
    }
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

    if (form.type === "late") {
      return {
        type: "late",
        date: form.start_date,
        start_time: "",
        end_time: "",
        backup_user_id: null,
        reason: [
          form.reason,
          `Shift: ${form.start_shift || "-"}`,
          `Late minutes: ${form.permission_duration || "-"}`,
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
          `Days: ${leaveTotalDays}`,
          `Half day: ${form.half_day ? "Yes" : "No"}`,
          form.remarks ? `Remarks: ${form.remarks}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      admin_remarks: form.remarks || null,
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

  const markAsPaid = async (id) => {
    setActionLoadingId(id);
    try {
      await api.put("/api/requests/mark-paid", { request_id: id });
      await load();
    } catch (err) {
      setStatus(err?.response?.data?.detail || err.message || "Could not mark OT as paid");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openForm = () => {
    setSelectedRequestId(null);
    setStatus("");
    setShowTypeSelector(true);
  };

  const selectRequestType = (type) => {
    setForm((previous) => ({ ...previous, type }));
    setShowTypeSelector(false);
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
      <section className="rounded-lg border border-slate-200 p-3">
        <h3 className="mb-3 text-sm font-extrabold text-black">Employee Information</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <FieldShell label="Employee ID" required>
            <ReadOnlyField value={formUser.emp_code} placeholder="Employee reference" />
          </FieldShell>
          <FieldShell label="Employee Name" required>
            <ReadOnlyField value={formUser.name} placeholder="Employee name" />
          </FieldShell>
          <FieldShell label="Department" required>
            <ReadOnlyField value={formUser.department} placeholder="Employee department" />
          </FieldShell>
        </div>
      </section>

      <section className="mt-3 rounded-lg border border-slate-200 p-3">
        <h3 className="mb-3 text-sm font-extrabold text-black">Leave Information</h3>
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          <FieldShell label="Leave Request No." required>
            <ReadOnlyField value={nextLeaveRequestNo} placeholder="System-generated request number" />
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
              onChange={(value) =>
                updateForm({
                  end_date: value,
                  return_date: form.return_date || nextDate(value),
                })
              }
              required
            />
          </FieldShell>
          <FieldShell label="Total Days" required>
            <ReadOnlyField value={leaveTotalDays || ""} placeholder="Calculated leave days" />
          </FieldShell>
          <FieldShell label="Half Day">
            <label className="flex h-10 items-center justify-between rounded-lg border border-slate-300 bg-[#f8f8f8] px-3 text-sm font-medium text-slate-900">
              <span>{form.half_day ? "Yes" : "No"}</span>
              <input
                type="checkbox"
                checked={form.half_day}
                onChange={(event) => updateForm({ half_day: event.target.checked })}
                className="h-4 w-4 accent-emerald-800"
              />
            </label>
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
          <FieldShell label="End Shift" required>
            <SelectField
              value={form.end_shift}
              onChange={(value) => updateForm({ end_shift: value })}
              placeholder="Select a Shift"
              options={shiftOptions}
              required
            />
          </FieldShell>
          <FieldShell label="Reason" required className="col-span-2">
            <textarea
              className={textAreaClass}
              placeholder="Leave reason"
              value={form.reason}
              onChange={(event) => updateForm({ reason: event.target.value })}
              required
            />
          </FieldShell>
        </div>
      </section>

      <section className="mt-3 rounded-lg border border-slate-200 p-3">
        <h3 className="mb-3 text-sm font-extrabold text-black">Leave Balance</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <FieldShell label="Leave Entitlement">
            <ReadOnlyField value={`${formLeaveBalance.entitlement} days`} placeholder="Annual entitlement" />
          </FieldShell>
          <FieldShell label="Leave Taken">
            <ReadOnlyField value={`${formLeaveBalance.taken} days`} placeholder="Used leave days" />
          </FieldShell>
          <FieldShell label="Remaining Balance">
            <ReadOnlyField value={`${formLeaveBalance.remaining} days`} placeholder="Available leave balance" />
          </FieldShell>
        </div>
      </section>

      <section className="mt-3 rounded-lg border border-slate-200 p-3">
        <h3 className="mb-3 text-sm font-extrabold text-black">Attachment</h3>
        <AttachmentField
          attachment={attachment}
          onChange={setAttachment}
          label="Supporting Document"
        />
      </section>

      <BackupUserField
        backupOptions={backupOptions}
        backupSearch={backupSearch}
        setBackupSearch={setBackupSearch}
        selectedBackupId={form.backup_user_id}
        setSelectedBackupId={(value) => updateForm({ backup_user_id: value })}
      />

      <section className="mt-3 rounded-lg border border-slate-200 p-3">
        <h3 className="mb-3 text-sm font-extrabold text-black">Remarks</h3>
        <FieldShell label="Remarks">
          <textarea
            className={textAreaClass}
            placeholder="Additional comments"
            value={form.remarks}
            onChange={(event) => updateForm({ remarks: event.target.value })}
          />
        </FieldShell>
      </section>
    </>
  );

  const renderPermissionForm = () => (
    <>
      <h2 className="mb-3 text-base font-extrabold text-black">
        Permission Form
      </h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
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
      <h2 className="mb-3 text-base font-extrabold text-black">
        Flexible Request
      </h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
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

  const renderLateForm = () => (
    <>
      <h2 className="mb-3 text-base font-extrabold text-black">Late Arrival Form</h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        <FieldShell label="Date" required>
          <input type="date" value={form.start_date} onChange={(event) => setForm((previous) => ({ ...previous, start_date: event.target.value }))} className={inputClass} />
        </FieldShell>
        <FieldShell label="Shift" required>
          <select value={form.start_shift} onChange={(event) => setForm((previous) => ({ ...previous, start_shift: event.target.value }))} className={inputClass}>
            <option value="">Select shift</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="night">Night</option>
          </select>
        </FieldShell>
        <FieldShell label="Late Minutes" required>
          <input type="number" min="1" value={form.permission_duration} onChange={(event) => setForm((previous) => ({ ...previous, permission_duration: event.target.value }))} className={inputClass} placeholder="Minutes late" />
        </FieldShell>
      </div>
      <FieldShell label="Reason" required className="mt-3">
        <textarea value={form.reason} onChange={(event) => setForm((previous) => ({ ...previous, reason: event.target.value }))} className={inputClass} rows={2} placeholder="Reason for being late..." />
      </FieldShell>
    </>
  );

  const renderActiveForm = () => {
    if (form.type === "permission") return renderPermissionForm();
    if (form.type === "flexible") return renderFlexibleForm();
    if (form.type === "ot") return renderOvertimeForm();
    if (form.type === "late") return renderLateForm();
    return renderLeaveForm();
  };

  if (isManagement) {
    const exportCsv = () => {
      const headers = ["#", "Employee", "Department", "Unit", "Type", "Detail", "Date Range", "Reason", "Status"];
      const lines = [
        headers.join(","),
        ...managementRows.map((row, index) =>
          [
            index + 1,
            row.user?.name || "",
            row.user?.department || "",
            row.user?.sub_department || "",
            requestTypeLabel(row.request.type),
            row.detail,
            row.range,
            row.reason,
            row.request.status,
          ]
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(","),
        ),
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `requests-${leaveMonth}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    };

    const totalMonth = Math.max(managementStats.selectedMonthRequests.length, 1);
    const withoutOt = (rows) => requestType === "leave" ? rows.filter((r) => r.request.type !== "ot") : rows;
    const rowsForTab = (tab) => {
      const leaveRows = managementRows.filter((row) => row.request.type === "leave");
      if (tab === "Request History") return leaveRows;
      if (tab === "Pending Requests") return leaveRows.filter((row) => row.request.status === "pending");
      if (tab === "Approved Requests" || tab === "Leave Taken") return leaveRows.filter((row) => row.request.status === "approved");
      if (tab === "Rejected Requests") return leaveRows.filter((row) => row.request.status === "rejected");
      if (tab.includes("Calendar")) return leaveRows.filter((row) => row.request.status === "approved");
      if (tab.includes("Report") || tab === "Entitlement" || tab === "Remaining Balance") return leaveRows;
      if (tab === "All Requests") return withoutOt(managementRows);
      if (tab === "My Team Requests") return withoutOt(managementRows.filter((row) => row.request.status === "pending"));
      if (requestType === "ot") return managementRows.filter((row) => row.request.type === "ot");
      const type = requestTypeDefinitions.find((item) => item.tab === tab)?.key;
      if (type) return managementRows.filter((row) => row.request.type === type);
      return withoutOt(managementRows);
    };

    const dashboardTabs = requestType === "ot" ? otDashboardTabs : suggestedLeaveTabs.flatMap((group) => group.items);

    const openLeaveRequestForm = () => {
      setLeaveTab("New Leave Request");
      selectRequestType("leave");
    };

    const renderManagementTable = (tab, title = tab) => (
      <LeaveRequestsTable
        rows={rowsForTab(tab)}
        search={leaveSearch}
        setSearch={setLeaveSearch}
        onOpen={openRequest}
        onUpdate={updateRequest}
        onMarkPaid={markAsPaid}
        title={title}
        recentlyUpdatedId={recentlyUpdatedId}
        actionLoadingId={actionLoadingId}
        actorRole={role}
        currentUserId={currentUser?.id}
        approvalFlow={approvalFlow}
      />
    );

    return (
      <>
      <section className="min-h-[calc(100vh-4rem)] bg-[#f6f8fd] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
              <button type="button" onClick={openForm} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#5b21e8] px-4 text-sm font-extrabold text-white shadow-lg shadow-violet-700/20">
                <FiPlus className="h-4 w-4" aria-hidden />
                New Request
              </button>
              <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
                <FiCalendar className="h-4 w-4 text-slate-500" aria-hidden />
                <input type="month" value={leaveMonth} onChange={(event) => setLeaveMonth(event.target.value)} className="bg-transparent outline-none" />
              </label>
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

          {showTypeSelector && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowTypeSelector(false)}>
              <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold text-[#11164a]">New Request</h2>
                  <button type="button" onClick={() => setShowTypeSelector(false)} className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100">
                    <FiX className="h-5 w-5" aria-hidden />
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: "leave", label: "Leave", icon: FiCalendar, desc: "Annual, sick, or other leave", color: "hover:border-blue-300", iconColor: "text-blue-600" },
                    { key: "permission", label: "Permission", icon: FiClock, desc: "Short-time permission request", color: "hover:border-amber-300", iconColor: "text-amber-600" },
                    { key: "late", label: "Late", icon: FiAlertCircle, desc: "Late arrival request", color: "hover:border-red-300", iconColor: "text-red-600" },
                    { key: "flexible", label: "Flexible Work", icon: FiRefreshCw, desc: "Flexible work arrangement", color: "hover:border-emerald-300", iconColor: "text-emerald-600" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => selectRequestType(item.key)}
                        className={`flex items-center gap-4 rounded-xl border border-slate-200 p-5 text-left transition ${item.color} hover:shadow-md`}
                      >
                        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-100 ${item.iconColor}`}>
                          <Icon className="h-6 w-6" aria-hidden />
                        </span>
                        <div>
                          <p className="text-lg font-extrabold text-[#11164a]">{item.label}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {showForm && (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#11164a]">{requestTitles[form.type]}</h2>
                <button type="button" onClick={() => setShowForm(false)} className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100">
                  <FiX className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <form onSubmit={create}>
                {renderActiveForm()}
                <button className="mt-3 h-10 rounded-lg bg-[#5b21e8] px-4 text-sm font-extrabold text-white">Submit Request</button>
              </form>
            </section>
          )}

          {!showForm && (
            <>
              {requestType === "ot" && (
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                  <LeaveStatCard label="Total OT Hours" value={`${managementStats.totalOtHours}h`} helper="All overtime hours" icon={FiClock} tone="bg-violet-600 text-white" />
                  <LeaveStatCard label="Pending OT Requests" value={managementStats.pendingOtCount} helper="Awaiting approval" icon={FiClock} tone="bg-amber-500 text-white" />
                  <LeaveStatCard label="Approved OT Requests" value={managementStats.approvedOtCount} helper={`${managementStats.approvedOtHours}h approved`} icon={FiBarChart2} tone="bg-emerald-600 text-white" />
                  <LeaveStatCard label="Rejected OT Requests" value={managementStats.rejectedOtCount} helper="Rejected overtime" icon={FiXCircle} tone="bg-rose-500 text-white" />
                  <LeaveStatCard label="Paid OT" value={`${managementStats.paidOtHours}h`} helper={`${managementStats.paidOtCount} requests`} icon={FiCheckCircle} tone="bg-blue-600 text-white" />
                  <LeaveStatCard label="OT Cost Summary" value={`$${managementStats.otCostSummary}`} helper="Estimated approved cost" icon={FiUsers} tone="bg-teal-600 text-white" />
                </div>
              )}

              {requestType === "leave" && (
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                  <LeaveStatCard label="Employees on Leave Today" value={managementStats.onLeaveToday} helper="Current employees on leave" icon={FiUsers} tone="bg-violet-600 text-white" />
                  <LeaveStatCard label="Leave Requests Pending Approval" value={managementStats.pending} helper="Awaiting approval" icon={FiClock} tone="bg-amber-500 text-white" />
                  <LeaveStatCard label="Approved Leave Requests" value={managementStats.approved} helper="Approved leave applications" icon={FiCheckCircle} tone="bg-emerald-600 text-white" />
                  <LeaveStatCard label="Rejected Leave Requests" value={managementStats.rejected} helper="Rejected applications" icon={FiXCircle} tone="bg-rose-500 text-white" />
                  <LeaveStatCard label="Leave Utilization Rate" value={`${managementStats.leaveUtilizationRate}%`} helper="Leave usage percentage" icon={FiBarChart2} tone="bg-blue-600 text-white" />
                  <LeaveStatCard label="Annual Leave Balance Summary" value={managementStats.annualLeaveBalance} helper="Remaining leave balances" icon={FiCalendar} tone="bg-teal-600 text-white" />
                  <LeaveStatCard label="Leave by Department" value={managementStats.leaveByDepartment.length} helper="Leave distribution by department" icon={FiUsers} tone="bg-indigo-600 text-white" />
                  <LeaveStatCard label="Monthly Leave Trend" value={`${managementStats.trend.length} months`} helper="Leave utilization trend" icon={FiBarChart2} tone="bg-cyan-600 text-white" />
                  <LeaveStatCard label="Employees with Low Leave Balance" value={managementStats.lowBalanceEmployees} helper="Remaining balance alert" icon={FiAlertCircle} tone="bg-rose-500 text-white" />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <FiFilter className="h-4 w-4" />
                  <span>Filter:</span>
                </div>
                <select value={deptFilter} onChange={(event) => setDeptFilter(event.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none">
                  <option value="all">All Departments</option>
                  {departmentOptions.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                </select>
                <select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none">
                  <option value="all">All Units</option>
                  {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
                <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600">
                  <FiSearch className="h-4 w-4 text-slate-400" aria-hidden />
                  <input value={leaveSearch} onChange={(event) => setLeaveSearch(event.target.value)} className="w-40 bg-transparent outline-none placeholder:text-slate-400" placeholder="Search staff name..." />
                </label>
              </div>

              {requestType === "ot" ? (
                <div className="flex gap-8 overflow-x-auto border-b border-slate-200 bg-white px-4">
                  {dashboardTabs.map((tab) => (
                    <button key={tab} type="button" onClick={() => setLeaveTab(tab)} className={`h-12 border-b-2 px-1 text-sm font-extrabold ${leaveTab === tab ? "border-[#5b21e8] text-[#5b21e8]" : "border-transparent text-slate-700 hover:text-[#5b21e8]"}`}>
                      {tab}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 px-3 py-2 min-w-max">
                    {suggestedLeaveTabs.map((group, gi) => (
                      <div key={group.group} className="flex items-center gap-1">
                        {gi > 0 && <div className="mx-1 h-5 w-px bg-slate-200" />}
                        {group.items.map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={tab === "New Leave Request" ? openLeaveRequestForm : () => setLeaveTab(tab)}
                            className={`h-7 shrink-0 rounded-md px-2.5 text-[11px] font-extrabold ${
                              leaveTab === tab
                                ? "bg-[#166432] text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100 hover:text-[#166432]"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {leaveTab === "Dashboard" && (
                requestType === "ot" ? (
                  <>
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_360px]">
                      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-extrabold text-[#11164a]">OT by Department</h2>
                        <div className="mt-4 h-[260px]">
                          {managementStats.otByDepartment.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={managementStats.otByDepartment} layout="vertical" margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontWeight: 700 }} />
                                <YAxis type="category" dataKey="department" tickLine={false} axisLine={false} tick={{ fill: "#11164a", fontWeight: 700 }} width={100} />
                                <Tooltip />
                                <Bar dataKey="hours" name="Hours" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">No OT data</div>
                          )}
                        </div>
                      </section>

                      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-extrabold text-[#11164a]">Monthly OT Trend</h2>
                        <div className="mt-4 h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={managementStats.monthlyOtTrend || []} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
                              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#11164a", fontWeight: 700 }} />
                              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontWeight: 700 }} />
                              <Tooltip />
                              <Line type="monotone" dataKey="hours" name="OT Hours" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </section>

                      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-extrabold text-[#11164a]">Top OT Employees</h2>
                        <div className="mt-4 space-y-3">
                          {managementStats.topOtEmployees.length > 0 ? managementStats.topOtEmployees.slice(0, 5).map((emp, i) => (
                            <div key={emp.user_id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0">
                              <div className="flex items-center gap-3">
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-sm font-extrabold text-[#5b21e8]">{i + 1}</span>
                                <span className="text-sm font-bold text-[#11164a]">{emp.name}</span>
                              </div>
                              <span className="text-sm font-extrabold text-[#11164a]">{emp.hours}h</span>
                            </div>
                          )) : <p className="text-sm font-bold text-slate-400">No OT records</p>}
                        </div>
                      </section>
                    </div>

                    <div className="flex flex-col gap-4">
                        <LeaveRequestsTable
                          rows={rowsForTab("Dashboard")}
                          search={leaveSearch}
                          setSearch={setLeaveSearch}
                          onOpen={openRequest}
                          onUpdate={updateRequest}
                          onMarkPaid={markAsPaid}
                          title="OT Requests"
                          recentlyUpdatedId={recentlyUpdatedId}
                          actionLoadingId={actionLoadingId}
                          actorRole={role}
                          currentUserId={currentUser?.id}
                          approvalFlow={approvalFlow}
                        />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-4 xl:grid-cols-2">
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
                    </div>

                    <div className="flex flex-col gap-4">
                      <LeaveRequestsTable
                        rows={rowsForTab("Dashboard")}
                        search={leaveSearch}
                        setSearch={setLeaveSearch}
                        onOpen={openRequest}
                        onUpdate={updateRequest}
                        onMarkPaid={markAsPaid}
                        title="Recent Requests"
                        recentlyUpdatedId={recentlyUpdatedId}
                        actionLoadingId={actionLoadingId}
                        actorRole={role}
                        currentUserId={currentUser?.id}
                        approvalFlow={approvalFlow}
                      />
                    </div>
                  </>
                )
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

              {leaveTab === "Entitlement" && (
                <LeaveEntitlementPanel
                  users={filteredUsers}
                  drafts={entitlementDrafts}
                  onDraftChange={updateEntitlementDraft}
                  onSave={saveLeaveEntitlement}
                  savingId={entitlementSavingId}
                  canEdit={["line_manager", "department_head", "management_hr"].includes(role)}
                />
              )}

              {leaveTab === "Remaining Balance" && (
                <LeaveBalancePanel
                  balanceData={managementStats.balanceData}
                  mode={leaveTab}
                  totalBalance={managementStats.totalBalance}
                  usersCount={filteredUsers.length}
                />
              )}

              {leaveTab.includes("Calendar") && (
                <LeaveCalendarPanel
                  rows={rowsForTab(leaveTab)}
                  scope={leaveTab}
                  month={leaveMonth}
                />
              )}

              {leaveTab === "Monthly Attendance Report" ? (
                <MonthlyAttendanceReport
                  users={users}
                  userById={userById}
                  leaveRequests={items.filter((r) => r.type === "leave")}
                  month={leaveMonth}
                />
              ) : leaveTab.includes("Report") && (
                <LeaveReportPanel
                  rows={rowsForTab(leaveTab)}
                  tab={leaveTab}
                  stats={managementStats}
                  onExport={exportCsv}
                />
              )}

              {(["Request History", "Pending Requests", "Approved Requests", "Rejected Requests", "Leave Taken"].includes(leaveTab) || (requestType === "ot" && leaveTab !== "Dashboard" && leaveTab !== "Settings")) && (
                renderManagementTable(leaveTab)
              )}

            </>
          )}
        </div>
      </section>

      {selectedRequest && (() => {
        const selectedUser = userById.get(selectedRequest.user_id);
        const currentYear = String(new Date().getFullYear());
        const userLeaves = items.filter(
          (r) => r.user_id === selectedRequest.user_id && r.type === "leave" && r.status === "approved" && String(r.date || "").startsWith(currentYear)
        );
        const usedAnnual = userLeaves.reduce((sum, r) => {
          const isSick = String(`${r.leave_type || ""} ${r.reason || ""}`).toLowerCase().includes("sick");
          return isSick ? sum : sum + getRequestDays(r);
        }, 0);
        const selectedEntitlement = getUserEntitlements(selectedRequest.user_id).annual;
        const remaining = Math.max(0, selectedEntitlement - usedAnnual);
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setSelectedRequestId(null)}>
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setSelectedRequestId(null)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
              <FiX className="h-5 w-5" />
            </button>
            <RequestDetail request={selectedRequest} onCancel={cancelPending} user={selectedUser} entitlement={selectedEntitlement} taken={usedAnnual} remaining={remaining} />
          </div>
        </div>
        );
      })()}
    </>
    );
  }

  return (
    <>
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
              {showTypeSelector
                ? "New Request"
                : showForm
                  ? requestTitles[form.type] || requestTitles.leave
                  : pageTitle}
            </h1>
            <button
              type="button"
              onClick={showForm || showTypeSelector ? () => { setShowForm(false); setShowTypeSelector(false); } : openForm}
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
          {showTypeSelector && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowTypeSelector(false)}>
              <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-black">New Request</h2>
                  <button type="button" onClick={() => setShowTypeSelector(false)} className="grid h-8 w-8 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid gap-3">
                  {[
                    { key: "leave", label: "Leave", icon: FiCalendar, iconColor: "text-blue-600" },
                    { key: "permission", label: "Permission", icon: FiClock, iconColor: "text-amber-600" },
                    { key: "late", label: "Late", icon: FiAlertCircle, iconColor: "text-red-600" },
                    { key: "flexible", label: "Flexible Work", icon: FiRefreshCw, iconColor: "text-emerald-600" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => selectRequestType(item.key)}
                        className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-300 hover:shadow-md"
                      >
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 ${item.iconColor}`}>
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="text-base font-extrabold text-black">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {showForm && (
            <form onSubmit={create} className="pb-8">
              {renderActiveForm()}
              <div className="my-3 h-px bg-slate-200" />
              <button className="h-10 w-full rounded-lg bg-emerald-800 text-sm font-extrabold text-white">
                Submit
              </button>
              {status && (
                <p className="mt-3 text-sm font-semibold text-emerald-700">
                  {status}
                </p>
              )}
            </form>
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

    {selectedRequest && (() => {
      const selectedUser = userById.get(selectedRequest.user_id);
      const currentYear = String(new Date().getFullYear());
      const userLeaves = items.filter(
        (r) => r.user_id === selectedRequest.user_id && r.type === "leave" && r.status === "approved" && String(r.date || "").startsWith(currentYear)
      );
      const usedAnnual = userLeaves.reduce((sum, r) => {
        const isSick = String(`${r.leave_type || ""} ${r.reason || ""}`).toLowerCase().includes("sick");
        return isSick ? sum : sum + getRequestDays(r);
      }, 0);
      const selectedEntitlement = getUserEntitlements(selectedRequest.user_id).annual;
      const remaining = Math.max(0, selectedEntitlement - usedAnnual);
      return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setSelectedRequestId(null)}>
        <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setSelectedRequestId(null)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
            <FiX className="h-5 w-5" />
          </button>
          <RequestDetail request={selectedRequest} onCancel={cancelPending} user={selectedUser} entitlement={selectedEntitlement} taken={usedAnnual} remaining={remaining} />
        </div>
      </div>
      );
    })()}
    </>
  );
};

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

const LeaveEntitlementPanel = ({ users, drafts, onDraftChange, onSave, savingId, canEdit }) => {
  const [editingUser, setEditingUser] = useState(null);
  const editingDraft = editingUser
    ? { ...defaultLeaveEntitlements, ...(drafts[editingUser.id] || {}) }
    : null;

  const totalDays = (userId) => {
    const draft = { ...defaultLeaveEntitlements, ...(drafts[userId] || {}) };
    return leaveEntitlementFields.reduce((sum, field) => sum + Number(draft[field.key] || 0), 0);
  };

  const saveEditingUser = async () => {
    if (!editingUser) return;
    await onSave(editingUser.id);
    setEditingUser(null);
  };

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-extrabold text-[#11164a]">Employee Leave Entitlement</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Review employee information and use the edit action to adjust leave amounts.
          </p>
          {!canEdit && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
              Only HR and managers can edit leave entitlements.
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-extrabold uppercase text-[#11164a]">
              <tr>
                <th className="px-5 py-4">Employee ID</th>
                <th className="px-5 py-4">Employee Name</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Unit</th>
                <th className="px-5 py-4">Total Leave Days</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-extrabold text-[#11164a]">{user.emp_code || "-"}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-xs font-extrabold text-[#11164a]">
                        {String(user.name || "U").split(" ").map((part) => part[0]).join("").slice(0, 2)}
                      </span>
                      <span className="font-extrabold text-[#11164a]">{user.name || "-"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-600">{user.department || "-"}</td>
                  <td className="px-5 py-4 font-semibold text-slate-600">{user.sub_department || "-"}</td>
                  <td className="px-5 py-4 font-extrabold text-[#11164a]">{totalDays(user.id)}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setEditingUser(user)}
                      disabled={!canEdit}
                      className="inline-grid h-9 w-9 place-items-center rounded-md text-[#11164a] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Edit leave entitlement"
                      aria-label={`Edit leave entitlement for ${user.name}`}
                    >
                      <FiEdit2 className="h-4 w-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm font-bold text-slate-400">
                    No employees found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingUser && editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setEditingUser(null)}>
          <div className="mx-4 max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#11164a]">Edit Leave Entitlement</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {editingUser.name} / {editingUser.emp_code || "-"} / {editingUser.department || "-"}
                </p>
              </div>
              <button type="button" onClick={() => setEditingUser(null)} className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
                <FiX className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {leaveEntitlementFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-xs font-extrabold uppercase text-slate-500">{field.label}</span>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    step="0.5"
                    value={editingDraft[field.key] ?? 0}
                    onChange={(event) => onDraftChange(editingUser.id, field.key, event.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-[#11164a] outline-none focus:border-[#5b21e8]"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingUser(null)} className="h-10 rounded-md border border-slate-200 px-5 text-sm font-extrabold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditingUser}
                disabled={savingId === editingUser.id}
                className="h-10 rounded-md bg-[#5b21e8] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {savingId === editingUser.id ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const LeaveBalancePanel = ({ balanceData, mode, totalBalance, usersCount }) => {
  const entitlementRows = [
    ["Annual Leave", usersCount * ANNUAL_LEAVE, leaveTypeColors.annual],
    ["Sick Leave", usersCount * SICK_LEAVE, leaveTypeColors.sick],
    ["Maternity Leave", usersCount * MATERNITY_LEAVE, leaveTypeColors.maternity],
    ["Paternity Leave", usersCount * PATERNITY_LEAVE, leaveTypeColors.paternity],
    ["Marriage Leave", usersCount * MARRIAGE_LEAVE, leaveTypeColors.marriage],
    ["Compassionate Leave", usersCount * COMPASSIONATE_LEAVE, leaveTypeColors.compassionate],
    ["Unpaid Leave", usersCount * UNPAID_LEAVE, leaveTypeColors.unpaid],
    ["Special Leave", usersCount * SPECIAL_LEAVE, leaveTypeColors.special],
    ["Business Leave", usersCount * BUSINESS_LEAVE, leaveTypeColors.business],
  ];
  const rows = mode === "Entitlement"
    ? entitlementRows.map(([name, value, color]) => ({ name, value, color }))
    : balanceData;
  const totalValue = rows.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[#11164a]">{mode}</h2>
          <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">
            {usersCount} employees
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {rows.map((item) => (
            <div key={item.name} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <p className="text-sm font-extrabold text-[#11164a]">{item.name}</p>
                </div>
                <p className="text-xl font-extrabold text-[#11164a]">{item.value}</p>
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {mode === "Entitlement" ? "Total entitlement days" : "Remaining available days"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-[#11164a]">Balance Mix</h2>
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rows} innerRadius={60} outerRadius={96} dataKey="value" paddingAngle={2}>
                {rows.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="text-center text-sm font-bold text-slate-500">
          {mode === "Entitlement" ? "Total entitlement" : "Total remaining balance"}: {mode === "Entitlement" ? totalValue : totalBalance}
        </p>
      </div>
    </section>
  );
};

const LeaveCalendarPanel = ({ rows, scope, month }) => {
  const monthRows = rows
    .filter((row) => monthKey(row.request.date) === month)
    .sort((a, b) => String(a.request.date).localeCompare(String(b.request.date)));

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-[#11164a]">{scope}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{monthLabel(month)}</p>
        </div>
        <span className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-extrabold text-blue-700">
          {monthRows.length} approved leave records
        </span>
      </div>
      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
        {monthRows.map((row) => (
          <article key={row.request.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-[#11164a]">{row.user?.name || `Employee #${row.request.user_id}`}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{row.user?.department || "Unassigned"} / {row.user?.sub_department || "-"}</p>
              </div>
              <span className={`rounded-md px-2.5 py-1 text-xs font-extrabold ${leaveTypeTone(row.request.leave_type)}`}>
                {formatLeaveType(row.request.leave_type || "annual")}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400">Leave Date</p>
                <p className="mt-1 font-extrabold text-[#11164a]">{row.range}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400">Duration</p>
                <p className="mt-1 font-extrabold text-[#11164a]">{row.unit}</p>
              </div>
            </div>
          </article>
        ))}
        {monthRows.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm font-bold text-slate-400">
            No approved leave in this calendar scope.
          </div>
        )}
      </div>
    </section>
  );
};

const LeaveReportPanel = ({ rows, tab, stats, onExport }) => {
  const approvedRows = rows.filter((row) => row.request.status === "approved");
  const totalTaken = approvedRows.reduce((sum, row) => sum + getRequestDays(row.request), 0);
  const utilization = Math.round((totalTaken / Math.max(totalTaken + stats.totalBalance, 1)) * 100);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <LeaveStatCard label="Approved Leave Days" value={totalTaken} helper="Selected filters" icon={FiCheckCircle} tone="bg-emerald-600 text-white" />
        <LeaveStatCard label="Remaining Balance" value={stats.totalBalance} helper="Across all employees" icon={FiCalendar} tone="bg-blue-600 text-white" />
        <LeaveStatCard label="Utilization" value={`${utilization}%`} helper="Approved days vs available pool" icon={FiBarChart2} tone="bg-orange-500 text-white" />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-extrabold text-[#11164a]">{tab}</h2>
          <button type="button" onClick={onExport} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#5b21e8] px-4 text-sm font-extrabold text-white">
            <FiDownload className="h-4 w-4" aria-hidden />
            Export CSV
          </button>
        </div>
        <div className="mt-5 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.trend} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
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
    </section>
  );
};

const LeaveRequestsTable = ({ rows, search, setSearch, onOpen, onUpdate, onMarkPaid, title, recentlyUpdatedId, actionLoadingId, actorRole, currentUserId, approvalFlow }) => (
  <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
      <h2 className="text-sm font-extrabold text-[#11164a]">{title}</h2>
      <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600">
        <FiSearch className="h-3 w-3 text-slate-400" aria-hidden />
        <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-32 bg-transparent outline-none placeholder:text-slate-400" placeholder="Search..." />
      </label>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-left text-xs">
        <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-[#11164a]">
          <tr>
            <th className="px-3 py-2 w-8">#</th>
            <th className="px-3 py-2">EID</th>
            <th className="px-3 py-2">Employee</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Details</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Unit</th>
            <th className="px-3 py-2">Reason</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Pending On</th>
            <th className="px-3 py-2">Applied</th>
            <th className="px-3 py-2 text-right">View</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.slice(0, 8).map(({ request, user, detail, range, unit, reason }, index) => {
            const pendingStage = getPendingApprovalStage(request, approvalFlow);
            const canApprove = canCurrentUserApprove(request, actorRole, currentUserId, approvalFlow);
            const isWaitingOnSomeoneElse = request.status === "pending" && pendingStage && !canApprove;
            return (
            <tr key={request.id} className={`${recentlyUpdatedId === request.id ? "animate-leave-row bg-emerald-50/80" : "hover:bg-slate-50/70"}`}>
              <td className="px-3 py-2 text-center font-bold text-[#11164a]">{index + 1}</td>
              <td className="px-3 py-2 font-semibold text-[#11164a]">{user?.emp_code || "-"}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-extrabold text-[#11164a]">
                    {String(user?.name || "U").split(" ").map((part) => part[0]).join("").slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-[#11164a]">{user?.name || `#${request.user_id}`}</p>
                    <p className="text-[10px] font-semibold text-slate-500">{user?.department || "-"}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2">
                <span className={`rounded px-2 py-1 text-[10px] font-extrabold ${requestTypeTone(request.type)}`}>{requestTypeLabel(request.type)}</span>
              </td>
              <td className="px-3 py-2 font-semibold text-[#11164a]">{detail}</td>
              <td className="px-3 py-2 font-semibold text-[#11164a]">{range}</td>
              <td className="px-3 py-2 font-semibold text-[#11164a]">{unit}</td>
              <td className="px-3 py-2 max-w-[120px] truncate font-semibold text-[#11164a]">{reason}</td>
              <td className="px-3 py-2">
                <span className={`rounded px-2 py-1 text-[10px] font-extrabold ${leaveStatusTone(request.status)}`}>{statusDisplay(request.status)}</span>
              </td>
              <td className="px-3 py-2">
                <span className={`rounded px-2 py-1 text-[10px] font-extrabold ${pendingStage ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-400"}`}>
                  {pendingStage?.label || "-"}
                </span>
              </td>
              <td className="px-3 py-2 font-semibold text-slate-600">{formatDate(request.date)}</td>
              <td className="px-3 py-2">
                <div className="flex justify-end gap-1">
                  <button type="button" onClick={() => onOpen(request)} className="grid h-7 w-7 place-items-center rounded-md text-[#11164a] hover:bg-slate-100" title="View">
                    <FiEye className="h-3.5 w-3.5" aria-hidden />
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
                  {request.status === "approved" && request.type === "ot" && actorRole === "management_hr" && (
                    <button
                      type="button"
                      onClick={() => onMarkPaid?.(request.id)}
                      disabled={actionLoadingId === request.id}
                      className="rounded bg-blue-100 px-2 py-1 text-[10px] font-extrabold text-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {actionLoadingId === request.id ? "Saving..." : "Mark as Paid"}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={12} className="px-3 py-6 text-center text-xs font-bold text-slate-400">No requests found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
    <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
      <p className="text-xs font-semibold text-[#11164a]">1-{Math.min(8, rows.length)} of {rows.length}</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3].map((page) => (
          <button key={page} type="button" className={`h-6 min-w-6 rounded border px-1.5 text-[11px] font-bold ${page === 1 ? "border-[#5b21e8] bg-[#5b21e8] text-white" : "border-slate-200 text-slate-700"}`}>{page}</button>
        ))}
      </div>
    </div>
  </section>
);

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const leaveCodeMap = {
  annual: "AL", sick: "SL", maternity: "ML", paternity: "PL",
  marriage: "MRL", compassionate: "CL", unpaid: "UPL",
  special: "SPL", business: "BL",
};

const halfLeaveCodeMap = {
  annual: "HAL", sick: "HSL", maternity: "HML", paternity: "HPL",
  marriage: "HMRL", compassionate: "HCL", unpaid: "HUPL",
  special: "HSPL", business: "HBL",
};

const MonthlyAttendanceReport = ({ users, userById, leaveRequests, month }) => {
  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const firstDay = new Date(year, monthNum - 1, 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    date: i + 1,
    dayName: dayNames[(firstDay + i) % 7],
    key: `${year}-${String(monthNum).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
  }));

  const getLeaveForEmployee = (userId, dateKey) => {
    return leaveRequests.find((r) =>
      r.user_id === userId &&
      r.status === "approved" &&
      dateKey >= r.date &&
      dateKey <= (r.reason?.includes("End date") ?
        r.reason.match(/End date[:\s]*(\d{4}-\d{2}-\d{2})/)?.[1] || r.date : r.date)
    );
  };

  const countLeaveType = (userId, typeKey) => {
    return leaveRequests.filter((r) =>
      r.user_id === userId &&
      r.status === "approved" &&
      String(r.leave_type || "annual").toLowerCase().includes(typeKey)
    ).reduce((sum, r) => sum + getRequestDays(r), 0);
  };

  const sortedUsers = [...users].sort((a, b) => (a.department || "").localeCompare(b.department || ""));

  return (
    <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="min-w-[1800px] p-4">
        <h2 className="mb-4 text-lg font-extrabold text-[#11164a]">
          Monthly Attendance Report - {monthLabel(month)}
        </h2>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-200 px-2 py-1.5 font-extrabold text-[#11164a]" rowSpan={2}>#</th>
              <th className="border border-slate-200 px-2 py-1.5 font-extrabold text-[#11164a]" rowSpan={2}>EID</th>
              <th className="border border-slate-200 px-2 py-1.5 font-extrabold text-[#11164a]" rowSpan={2}>Employee Name</th>
              <th className="border border-slate-200 px-2 py-1.5 font-extrabold text-[#11164a]" rowSpan={2}>Department</th>
              <th className="border border-slate-200 px-2 py-1.5 font-extrabold text-[#11164a]" rowSpan={2}>Position</th>
              <th className="border border-slate-200 px-2 py-1.5 font-extrabold text-[#11164a]" colSpan={daysInMonth}>Daily Attendance</th>
              <th className="border border-slate-200 px-2 py-1.5 font-extrabold text-[#11164a]" rowSpan={2}>Actual Working Days</th>
              <th className="border border-slate-200 px-2 py-1.5 font-extrabold text-[#11164a]" colSpan={11}>Leave Details</th>
              <th className="border border-slate-200 px-2 py-1.5 font-extrabold text-[#11164a]" rowSpan={2}>Total Leave</th>
            </tr>
            <tr className="bg-slate-50">
              {days.map((d) => (
                <th key={d.key} className={`border border-slate-200 px-1 py-1 text-center text-[10px] font-bold ${d.dayName === "Sat" || d.dayName === "Sun" ? "text-red-400" : "text-[#11164a]"}`}>
                  {d.dayName}<br/>{d.date}
                </th>
              ))}
              {["UPL","HUPL","SL","HSL","SPL","HSPL","AL","HAL","ML","CL","HCL"].map((code) => (
                <th key={code} className="border border-slate-200 px-1 py-1 text-center text-[10px] font-bold text-[#11164a]">{code}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user, idx) => {
              const startDate = user.contract_start_date || "-";
              const pos = user.position || "-";
              const dept = user.department || "-";
              let actualWorkingDays = 0;
              const leaveCounts = { UPL:0, HUPL:0, SL:0, HSL:0, SPL:0, HSPL:0, AL:0, HAL:0, ML:0, CL:0, HCL:0 };
              let totalLeaveDays = 0;

              return (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="border border-slate-200 px-2 py-1 text-center font-bold text-[#11164a]">{idx + 1}</td>
                  <td className="border border-slate-200 px-2 py-1 font-semibold text-[#11164a]">{user.emp_code || "-"}</td>
                  <td className="border border-slate-200 px-2 py-1 font-semibold text-[#11164a]">{user.name || "-"}</td>
                  <td className="border border-slate-200 px-2 py-1 text-slate-600">{dept}</td>
                  <td className="border border-slate-200 px-2 py-1 text-slate-600">{pos}</td>
                  {days.map((d) => {
                    const leave = getLeaveForEmployee(user.id, d.key);
                    const isWeekend = d.dayName === "Sun";
                    if (leave) {
                      const code = leave.half_day ? (halfLeaveCodeMap[leave.leave_type] || "LV") : (leaveCodeMap[leave.leave_type] || "LV");
                      const fullCode = leave.half_day ? (halfLeaveCodeMap[leave.leave_type] || "LV") : (leaveCodeMap[leave.leave_type] || "LV");
                      if (leaveCounts[fullCode] !== undefined) leaveCounts[fullCode]++;
                      totalLeaveDays++;
                      return (
                        <td key={d.key} className={`border border-slate-200 px-1 py-1 text-center text-[10px] font-bold ${
                          leave.half_day ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"
                        }`}>{code}</td>
                      );
                    }
                    if (!isWeekend) actualWorkingDays++;
                    return (
                      <td key={d.key} className={`border border-slate-200 px-1 py-1 text-center text-[10px] ${
                        isWeekend ? "bg-slate-100 text-slate-300" : "text-slate-400"
                      }`}>{isWeekend ? "W" : ""}</td>
                    );
                  })}
                  <td className="border border-slate-200 px-2 py-1 text-center font-bold text-[#11164a]">{actualWorkingDays}</td>
                  {["UPL","HUPL","SL","HSL","SPL","HSPL","AL","HAL","ML","CL","HCL"].map((code) => (
                    <td key={code} className="border border-slate-200 px-2 py-1 text-center font-semibold text-slate-700">{leaveCounts[code] || 0}</td>
                  ))}
                  <td className="border border-slate-200 px-2 py-1 text-center font-bold text-[#11164a]">{totalLeaveDays}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RequestsPage;
