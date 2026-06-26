import {
  formatRequestTime,
  formatShortDate,
  getRequestDays,
  reasonMetaPrefixes,
  statusClass,
  statusLabel,
} from "./RequestCard";

const requestTypeLabels = {
  leave: "Leave",
  permission: "Permission",
  flexible: "Flexible Work",
  ot: "Overtime",
};

const approvalStatusClass = (value) => {
  if (value === "approved") return "bg-emerald-100 text-emerald-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  if (value === "skipped") return "bg-slate-100 text-slate-400";
  return "bg-amber-50 text-amber-700";
};

const approvalStatusLabel = (value) => {
  if (!value || value === "pending") return "Pending";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const SectionTitle = ({ children }) => (
  <div className="border-b border-slate-200 pb-2">
    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{children}</p>
  </div>
);

const FieldRow = ({ label, value, className = "font-extrabold text-slate-950" }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-sm font-semibold text-slate-500">{label}</span>
    <span className={`text-right text-sm ${className}`}>{value ?? "-"}</span>
  </div>
);

const Badge = ({ value, colorClass }) => (
  <span className={`rounded-md px-2.5 py-0.5 text-xs font-extrabold ${colorClass || "bg-slate-100 text-slate-600"}`}>
    {approvalStatusLabel(value)}
  </span>
);

const getReasonValue = (reason, label) => {
  const line = String(reason || "")
    .split("\n")
    .find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line ? line.slice(label.length + 1).trim() : "";
};

const getMetaData = (reason) => {
  const lines = String(reason || "").split("\n").map((l) => l.trim());
  return lines.filter((line) =>
    reasonMetaPrefixes.some((p) => line.toLowerCase().startsWith(p.toLowerCase()))
  );
};

const getPrimaryReason = (reason) => {
  const lines = String(reason || "").split("\n").map((l) => l.trim());
  return lines.filter(
    (line) => line && !reasonMetaPrefixes.some((p) => line.toLowerCase().startsWith(p.toLowerCase()))
  ).join("\n") || "No reason provided";
};

const formatLeaveType = (request) => {
  if (request.type === "leave") {
    const labels = { annual: "Annual Leave", sick: "Sick Leave", maternity: "Maternity Leave", paternity: "Paternity Leave", marriage: "Marriage Leave", compassionate: "Compassionate Leave", unpaid: "Unpaid Leave", special: "Special Leave", business: "Business Leave" };
    return labels[request.leave_type] || request.leave_type || "Leave";
  }
  return requestTypeLabels[request.type] || request.type;
};

const RequestDetail = ({ request, onCancel, user, entitlement, taken, remaining }) => {
  if (!request) return null;

  const days = getRequestDays(request);
  const endDate = getReasonValue(request.reason, "End date");
  const duration = getReasonValue(request.reason, "Duration");
  const halfDayValue = getReasonValue(request.reason, "Half day");
  const requesterRemarks = getReasonValue(request.reason, "Remarks");
  const isHalfDay = halfDayValue
    ? halfDayValue.toLowerCase() === "yes"
    : duration?.toLowerCase() === "half_day";
  const metaLines = getMetaData(request.reason);
  const primaryReason = getPrimaryReason(request.reason);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-slate-950">
            {requestTypeLabels[request.type] || "Request"} #{request.id}
          </h2>
          <p className="mt-0.5 text-sm font-medium text-slate-500">
            {formatShortDate(request.date)}{endDate ? ` - ${formatShortDate(endDate)}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium ${statusClass(request.status)}`}>
          {statusLabel(request.status)}
        </span>
      </div>

      {/* Employee Information */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle>Employee Information</SectionTitle>
        <div className="mt-3 space-y-2.5">
          <FieldRow label="Employee ID" value={user?.emp_code || `#${request.user_id}`} />
          <FieldRow label="Employee Name" value={user?.name || `Employee #${request.user_id}`} />
          <FieldRow label="Department" value={user?.department || "-"} />
        </div>
      </div>

      {request.type === "ot" ? (
        /* OT Information */
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <SectionTitle>OT Information</SectionTitle>
          <div className="mt-3 space-y-2.5">
            <FieldRow label="OT Request No." value={`#${request.id}`} />
            <FieldRow label="Date" value={formatShortDate(request.date)} />
            <FieldRow label="Start Time" value={getReasonValue(request.reason, "Start time") || formatRequestTime(request.start_time)} />
            <FieldRow label="End Time" value={getReasonValue(request.reason, "End time") || formatRequestTime(request.end_time)} />
            <FieldRow label="Hours Worked" value={`${Number(getReasonValue(request.reason, "Hour work") || 0).toFixed(1)}h`} />
            {metaLines.length > 0 && (
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
                {metaLines.filter((l) => !l.toLowerCase().startsWith("hour work")).map((line) => {
                  const [key, ...rest] = line.split(":");
                  return (
                    <div key={line}>
                      <p className="text-[11px] font-semibold uppercase text-slate-400">{key.trim()}</p>
                      <p className="text-sm font-extrabold text-slate-800">{rest.join(":").trim()}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="border-t border-slate-100 pt-2.5">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Reason</p>
              <p className="whitespace-pre-line text-sm font-extrabold text-slate-950">{primaryReason}</p>
            </div>
          </div>
        </div>
      ) : (
        /* Leave Information */
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <SectionTitle>Leave Information</SectionTitle>
          <div className="mt-3 space-y-2.5">
            <FieldRow label="Leave Request No." value={`#${request.id}`} />
            <FieldRow label="Leave Type" value={formatLeaveType(request)} />
            <FieldRow label="Start Date" value={formatShortDate(request.date)} />
            <FieldRow label="End Date" value={endDate ? formatShortDate(endDate) : formatShortDate(request.date)} />
            <FieldRow label="Total Days" value={`${days} ${days === 1 ? "day" : "days"}`} />
            <FieldRow label="Half Day" value={isHalfDay ? "Yes" : "No"} />
            <div className="border-t border-slate-100 pt-2.5">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Reason</p>
              <p className="whitespace-pre-line text-sm font-extrabold text-slate-950">{primaryReason}</p>
            </div>
            {metaLines.length > 0 && (
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
                {metaLines.filter((l) => {
                  const key = l.split(":")[0].trim().toLowerCase();
                  return !["end date", "return date", "days", "duration", "half day", "remarks", "start shift", "end shift"].includes(key);
                }).map((line) => {
                  const [key, ...rest] = line.split(":");
                  return (
                    <div key={line}>
                      <p className="text-[11px] font-semibold uppercase text-slate-400">{key.trim()}</p>
                      <p className="text-sm font-extrabold text-slate-800">{rest.join(":").trim()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave Balance (only for leave requests) */}
      {request.type !== "ot" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <SectionTitle>Leave Balance</SectionTitle>
          <div className="mt-3 space-y-2.5">
            <FieldRow label="Leave Entitlement" value={`${entitlement ?? 18} days`} />
            <FieldRow label="Leave Taken" value={`${taken ?? 0} days`} />
            <FieldRow label="Remaining Balance" value={`${remaining ?? 18} days`} className={`text-right text-sm font-extrabold ${(remaining ?? 0) <= 0 ? "text-red-600" : "text-emerald-600"}`} />
          </div>
        </div>
      )}

      {/* Approval */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle>Approval</SectionTitle>
        <div className="mt-3 space-y-2.5">
          <FieldRow label="Line Manager" value={<Badge value={request.line_manager_status} colorClass={approvalStatusClass(request.line_manager_status)} />} />
          <FieldRow label="Department Head" value={<Badge value={request.department_head_status} colorClass={approvalStatusClass(request.department_head_status)} />} />
          <FieldRow label="HR" value={<Badge value={request.hr_status} colorClass={approvalStatusClass(request.hr_status)} />} />
          <div className="border-t border-slate-100 pt-2.5">
            <FieldRow label="Final Status" value={<Badge value={request.status} colorClass={statusClass(request.status)} />} />
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle>Remarks</SectionTitle>
        <p className="mt-3 whitespace-pre-line text-sm font-extrabold text-slate-950">
          {request.admin_remarks || requesterRemarks || "No remarks"}
        </p>
      </div>

      {request.status === "pending" && (
        <button
          type="button"
          className="h-11 w-full rounded-xl bg-red-50 px-5 text-sm font-extrabold text-red-700"
          onClick={() => onCancel(request.id)}
        >
          Cancel request
        </button>
      )}
    </div>
  );
};

export default RequestDetail;
