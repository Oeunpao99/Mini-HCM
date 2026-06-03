import RequestCard from "./RequestCard";

const ANNUAL_LEAVE = 18;
const SICK_LEAVE = 6;

const statusTabs = [
  ["all", "All"],
  ["approved", "Approved"],
  ["pending", "Requesting"],
  ["rejected", "Rejected"],
];

const LeaveMetric = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium leading-5 text-slate-400">{label}</p>
    <p className="mt-1 text-base font-extrabold text-slate-900">{value}</p>
  </div>
);

const LeaveInfo = ({ summary }) => (
  <section className="mb-3 rounded-[10px] border border-slate-200 bg-white px-5 py-5 shadow-[0_8px_22px_rgba(15,23,42,0.03)]">
    <h2 className="text-lg font-extrabold text-black">Leave info</h2>
    <div className="mt-3 grid grid-cols-3 gap-3">
      <div className="space-y-2">
        <LeaveMetric label="Allotted Annual Leave" value={ANNUAL_LEAVE} />
        <LeaveMetric label="Allotted Sick Leave" value={SICK_LEAVE} />
      </div>
      <div className="space-y-2 border-l border-slate-100 pl-3">
        <LeaveMetric label="Used Annual Leave" value={summary.usedAnnual} />
        <LeaveMetric label="Used Sick Leave" value={summary.usedSick} />
      </div>
      <div className="space-y-2 border-l border-slate-100 pl-3">
        <LeaveMetric
          label="Remaining Annual Leave"
          value={summary.remainingAnnual}
        />
        <LeaveMetric
          label="Remaining Sick Leave"
          value={summary.remainingSick}
        />
      </div>
    </div>
  </section>
);

const RequestList = ({
  assignedItems,
  filteredItemCount,
  leaveSummary,
  onCancel,
  onLoadMore,
  onOpenRequest,
  onStatusFilterChange,
  onUpdateAssigned,
  requestType,
  status,
  statusFilter,
  visibleCount,
  visibleItems,
}) => (
  <>
    {requestType === "leave" && <LeaveInfo summary={leaveSummary} />}

    <div className="flex gap-2 overflow-x-auto pb-3">
      {statusTabs.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onStatusFilterChange(value)}
          className={`h-9 shrink-0 rounded-lg px-5 text-sm font-medium ${
            statusFilter === value
              ? "bg-emerald-800 text-white"
              : "bg-[#f1f1f1] text-black hover:bg-slate-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>

    {status && (
      <p className="mb-3 text-sm font-semibold text-emerald-700">{status}</p>
    )}

    <section className="space-y-3">
      {visibleItems.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          onOpen={() => onOpenRequest(request)}
        >
          {request.status === "pending" && (
            <button
              type="button"
              className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
              onClick={() => onCancel(request.id)}
            >
              Cancel
            </button>
          )}
        </RequestCard>
      ))}

      {visibleItems.length === 0 && (
        <div className="rounded-[18px] border border-dashed border-slate-200 px-5 py-10 text-center">
          <p className="text-sm font-semibold text-slate-500">
            No requests found.
          </p>
        </div>
      )}
    </section>

    {visibleCount < filteredItemCount && (
      <button
        type="button"
        onClick={onLoadMore}
        className="mx-auto mt-9 block text-base font-medium text-emerald-800"
      >
        Load more
      </button>
    )}

    {assignedItems.length > 0 && (
      <section className="mt-8">
        <h2 className="text-base font-extrabold text-slate-950">
          Backup Requests Assigned To Me
        </h2>
        <div className="mt-3 space-y-3">
          {assignedItems.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              status={request.backup_status}
              onOpen={() => onOpenRequest(request)}
            >
              {request.backup_status === "pending" ? (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateAssigned(request.id, "approved")}
                    className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateAssigned(request.id, "rejected")}
                    className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </RequestCard>
          ))}
        </div>
      </section>
    )}
  </>
);

export default RequestList;
