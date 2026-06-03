import { FiCalendar, FiFileText } from "react-icons/fi";

const requestTypeLabels = {
  leave: "Leave Request",
  permission: "Permission",
  flexible: "Flexible",
  ot: "Overtime",
};

const reasonMetaPrefixes = [
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

const stageLabels = [
  ["backup_status", "Backup"],
  ["line_manager_status", "Line Manager"],
  ["department_head_status", "Head Dept"],
  ["hr_status", "HR"],
];

const dateDiffDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.round((end - start) / 86400000) + 1);
};

export const statusClass = (status) => {
  if (status === "approved") return "bg-[#e8f2df] text-emerald-700";
  if (status === "rejected") return "bg-[#ffe1e4] text-red-600";
  if (status === "cancelled") return "bg-slate-100 text-slate-500";
  if (status === "skipped") return "bg-slate-50 text-slate-400";
  return "bg-amber-50 text-amber-700";
};

export const statusLabel = (status) => {
  if (status === "pending") return "Requesting";
  if (!status) return "-";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const matchesStatusFilter = (request, filter) => {
  if (filter === "all") return true;
  return request.status === filter;
};

export const formatShortDate = (value) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date
    .toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    })
    .replace(",", "");
};

const formatDayMonth = (value) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
};

const formatRequestTime = (value) => {
  if (!value) return "00h 00m";
  const [hour = "00", minute = "00"] = String(value).split(":");
  return `${hour.padStart(2, "0")}h ${minute.padStart(2, "0")}m`;
};

const getReasonValue = (reason, label) => {
  const line = String(reason || "")
    .split("\n")
    .find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line ? line.slice(label.length + 1).trim() : "";
};

export const getRequestDays = (request) => {
  const explicitDays = Number(getReasonValue(request.reason, "Days"));
  if (explicitDays > 0) return explicitDays;
  const endDate = getReasonValue(request.reason, "End date");
  return dateDiffDays(request.date, endDate || request.date) || 1;
};

const formatRequestRange = (request) => {
  const endDate = getReasonValue(request.reason, "End date");
  if (request.type === "leave") {
    return `${formatDayMonth(request.date)} -> ${formatDayMonth(
      endDate || request.date,
    )}`;
  }
  const start = `${formatShortDate(request.date)}, ${formatRequestTime(
    request.start_time,
  )}`;
  if (!endDate) return start;
  return `${start} -> ${formatShortDate(endDate)}, ${formatRequestTime(
    request.end_time,
  )}`;
};

const requestReasonPreview = (reason) => {
  const primary = String(reason || "")
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        line &&
        !reasonMetaPrefixes.some((prefix) =>
          line.toLowerCase().startsWith(prefix.toLowerCase()),
        ),
    );
  return primary || "No reason provided";
};

export const WorkflowBadges = ({ request }) => (
  <div className="flex flex-wrap gap-2">
    {stageLabels.map(([key, label]) => (
      <span
        key={key}
        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
          request[key],
        )}`}
      >
        {label}: {request[key] || "pending"}
      </span>
    ))}
  </div>
);

export const RequestMeta = ({ label, value, icon: Icon = FiFileText }) => (
  <div>
    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{label}</span>
    </div>
    <p className="mt-1 truncate text-sm font-extrabold text-slate-950">
      {value || "-"}
    </p>
  </div>
);

const RequestCard = ({
  request,
  onOpen,
  status = request.status,
  children,
}) => {
  const days = getRequestDays(request);
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold text-slate-950">
            {requestTypeLabels[request.type] || request.type}
          </h3>
          <p className="mt-1 truncate text-sm font-medium text-slate-500">
            {formatRequestRange(request)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium ${statusClass(
            status,
          )}`}
        >
          {statusLabel(status)}
        </span>
      </div>

      <div className="my-4 h-px bg-slate-100" />

      <div className="grid grid-cols-2 gap-5">
        <RequestMeta
          label="Reason"
          value={requestReasonPreview(request.reason)}
          icon={FiFileText}
        />
        <RequestMeta
          label="Applied for"
          value={`${days} ${days === 1 ? "day" : "days"}`}
          icon={FiCalendar}
        />
      </div>
    </>
  );

  return (
    <article className="rounded-[18px] border border-slate-200 bg-white px-5 py-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
      {onOpen ? (
        <button type="button" onClick={onOpen} className="block w-full text-left">
          {content}
        </button>
      ) : (
        content
      )}
      {children}
    </article>
  );
};

export default RequestCard;
