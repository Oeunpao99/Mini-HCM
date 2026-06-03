import {
  FiBriefcase,
  FiDollarSign,
  FiEdit2,
  FiFileText,
  FiTrendingUp,
  FiUser,
  FiX,
} from "react-icons/fi";
import { Avatar, formatContract, money, statusTone } from "./HrisCommon";

const detailTabs = [
  { id: "overview", label: "Overview", icon: FiUser },
  { id: "compensation", label: "Compensation", icon: FiDollarSign },
  { id: "movement", label: "Movement", icon: FiTrendingUp },
  { id: "payroll", label: "Payroll", icon: FiFileText },
  { id: "performance", label: "Performance", icon: FiBriefcase },
];

const InfoItem = ({ label, value }) => (
  <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
    <p className="text-xs font-extrabold uppercase text-slate-400">{label}</p>
    <p className="mt-1 break-words text-sm font-extrabold text-slate-900">{value || "-"}</p>
  </div>
);

const AmountItem = ({ label, value, tone = "text-slate-950" }) => (
  <div className="rounded-lg border border-slate-100 bg-white px-4 py-3">
    <p className="text-xs font-extrabold uppercase text-slate-400">{label}</p>
    <p className={`mt-1 text-xl font-extrabold ${tone}`}>${money(value)}</p>
  </div>
);

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const periodLabel = (row) =>
  new Date(Number(row.period_year), Number(row.period_month) - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

function EmployeeDetailDrawer({
  open,
  employee,
  tab,
  onTabChange,
  onClose,
  onEdit,
  canManageEmployees,
  canPayroll,
  payrollRows = [],
  performanceRows = [],
  historyRows = [],
  historyLoading,
}) {
  if (!open || !employee) return null;

  const latestPayroll = payrollRows[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25">
      <aside className="flex h-full w-full max-w-[900px] flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-5 border-b border-slate-100 px-7 py-6">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={employee.name} src={employee.profile_photo} size="h-16 w-16" />
            <div className="min-w-0">
              <p className="truncate text-2xl font-extrabold text-slate-950">{employee.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
                <span>{employee.emp_code || "-"}</span>
                <span>{employee.department || "-"}</span>
                <span>{employee.position || "-"}</span>
                <span className={`rounded-md px-2.5 py-1 text-xs font-extrabold ${statusTone(employee.status)}`}>
                  {formatContract(employee.status || "active")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canManageEmployees && (
              <button
                type="button"
                onClick={() => onEdit(employee)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20"
              >
                <FiEdit2 className="h-4 w-4" aria-hidden />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-md text-slate-700 hover:bg-slate-50"
              aria-label="Close employee details"
            >
              <FiX className="h-6 w-6" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto border-b border-slate-200 px-7">
          {detailTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-bold ${
                tab === id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          {tab === "overview" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoItem label="Employee ID" value={employee.emp_code} />
              <InfoItem label="Email" value={employee.email} />
              <InfoItem label="Phone" value={employee.phone} />
              <InfoItem label="Department" value={employee.department} />
              <InfoItem label="Subdepartment" value={employee.sub_department} />
              <InfoItem label="Position" value={employee.position} />
              <InfoItem label="Job Grade" value={employee.job_grade} />
              <InfoItem label="Role" value={formatContract(employee.role)} />
              <InfoItem label="Contract Type" value={formatContract(employee.contract_type)} />
              <InfoItem label="Start Date" value={formatDate(employee.contract_start_date)} />
              <InfoItem label="End Date" value={formatDate(employee.contract_end_date)} />
              <InfoItem label="Address" value={employee.address} />
            </div>
          )}

          {tab === "compensation" && (
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AmountItem label="Current Basic Salary" value={employee.basic_salary} />
                <InfoItem label="Bank Account" value={employee.bank_account} />
                <AmountItem label="Latest Gross Pay" value={latestPayroll?.gross_pay} />
                <AmountItem label="Latest Net Pay" value={latestPayroll?.net_pay} tone="text-emerald-700" />
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-extrabold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Basic</th>
                      <th className="px-4 py-3">Allowances</th>
                      <th className="px-4 py-3">Bonus</th>
                      <th className="px-4 py-3">Adjustment</th>
                      <th className="px-4 py-3">Deductions</th>
                      <th className="px-4 py-3">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {canPayroll && payrollRows.slice(0, 6).map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 font-extrabold text-slate-900">{periodLabel(row)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-600">${money(row.basic_salary)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-600">${money(Number(row.allowances || 0) + Number(row.benefits || 0))}</td>
                        <td className="px-4 py-3 font-semibold text-slate-600">${money(row.bonus)}</td>
                        <td className={`px-4 py-3 font-semibold ${Number(row.salary_adjustment || 0) < 0 ? "text-red-600" : "text-slate-600"}`}>${money(row.salary_adjustment)}</td>
                        <td className="px-4 py-3 font-semibold text-red-600">${money(Number(row.tax_deduction || 0) + Number(row.nssf_deduction || 0) + Number(row.other_deductions || 0))}</td>
                        <td className="px-4 py-3 font-extrabold text-slate-950">${money(row.net_pay)}</td>
                      </tr>
                    ))}
                    {(!canPayroll || payrollRows.length === 0) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm font-bold text-slate-400">
                          {canPayroll ? "No payroll records found for this employee." : "Payroll details are restricted."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "movement" && (
            <div className="grid gap-3">
              {historyLoading ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">Loading movement history...</div>
              ) : historyRows.length ? (
                historyRows.map((row) => (
                  <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-extrabold text-slate-950">{row.title}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{row.description || "-"}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">
                        {formatContract(row.event_type)} - {formatDate(row.effective_date)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                  No movement history yet. Salary, position, contract, and status edits will appear here.
                </div>
              )}
            </div>
          )}

          {tab === "payroll" && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-extrabold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Gross</th>
                    <th className="px-4 py-3">Net Pay</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {canPayroll && payrollRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-extrabold text-slate-900">{periodLabel(row)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600">${money(row.gross_pay)}</td>
                      <td className="px-4 py-3 font-extrabold text-slate-950">${money(row.net_pay)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">{formatContract(row.status)}</span>
                      </td>
                    </tr>
                  ))}
                  {(!canPayroll || payrollRows.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm font-bold text-slate-400">
                        {canPayroll ? "No payroll records found for this employee." : "Payroll details are restricted."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === "performance" && (
            <div className="grid gap-3 md:grid-cols-2">
              {performanceRows.map((review) => (
                <div key={review.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs font-extrabold uppercase text-slate-400">{review.review_period}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-3xl font-extrabold text-blue-700">{review.score}</p>
                    <span className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">{formatContract(review.status)}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-600">{formatContract(review.rating)}</p>
                  {review.comments && <p className="mt-2 text-sm font-semibold text-slate-500">{review.comments}</p>}
                </div>
              ))}
              {performanceRows.length === 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                  No performance reviews found for this employee.
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default EmployeeDetailDrawer;
