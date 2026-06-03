import { FiCalendar } from "react-icons/fi";
import RequestCard, {
  formatShortDate,
  getRequestDays,
  RequestMeta,
  statusLabel,
  WorkflowBadges,
} from "./RequestCard";

const requestTypeLabels = {
  leave: "Leave",
  permission: "Permission",
  flexible: "Flexible",
  ot: "Overtime",
};

const RequestDetail = ({ request, onCancel }) => {
  if (!request) return null;

  const days = getRequestDays(request);

  return (
    <section className="space-y-4 pb-8">
      <RequestCard request={request} status={request.status} />
      <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <h2 className="text-lg font-extrabold text-slate-950">
          Request information
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <RequestMeta
            label="Type"
            value={requestTypeLabels[request.type] || request.type}
          />
          <RequestMeta label="Status" value={statusLabel(request.status)} />
          <RequestMeta
            label="Date"
            value={formatShortDate(request.date)}
            icon={FiCalendar}
          />
          <RequestMeta
            label="Applied for"
            value={`${days} ${days === 1 ? "day" : "days"}`}
            icon={FiCalendar}
          />
        </div>
        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Reason
          </p>
          <p className="mt-2 whitespace-pre-line text-sm font-medium text-slate-800">
            {request.reason || "No reason provided"}
          </p>
        </div>
        <div className="mt-4">
          <WorkflowBadges request={request} />
        </div>
        {request.status === "pending" && (
          <button
            type="button"
            className="mt-5 h-11 rounded-xl bg-red-50 px-5 text-sm font-extrabold text-red-700"
            onClick={() => onCancel(request.id)}
          >
            Cancel request
          </button>
        )}
      </div>
    </section>
  );
};

export default RequestDetail;
