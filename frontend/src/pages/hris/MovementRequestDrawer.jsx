import { useEffect, useState } from "react";
import { FiSend, FiX } from "react-icons/fi";
import { Field, formatContract, inputClass, money } from "./HrisCommon";

const today = new Date().toISOString().slice(0, 10);

const defaultForm = {
  movement_type: "promotion",
  effective_date: today,
  proposed_position: "",
  proposed_department: "",
  proposed_sub_department: "",
  proposed_job_grade: "",
  proposed_salary: "",
  proposed_contract_type: "",
  proposed_status: "",
  reason: "",
};

function MovementRequestDrawer({
  open,
  employee,
  departments = [],
  subDepartments = [],
  positions = [],
  jobGrades = [],
  employmentStatuses = [],
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (open) {
      setForm({
        ...defaultForm,
        proposed_position: employee?.position || "",
        proposed_department: employee?.department || "",
        proposed_sub_department: employee?.sub_department || "",
        proposed_job_grade: employee?.job_grade || "",
      });
    }
  }, [employee, open]);

  if (!open || !employee) return null;

  const submit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      user_id: employee.user_id,
      proposed_salary: form.proposed_salary === "" ? null : Number(form.proposed_salary),
      proposed_position: form.proposed_position || null,
      proposed_department: form.proposed_department || null,
      proposed_sub_department: form.proposed_sub_department || null,
      proposed_job_grade: form.proposed_job_grade || null,
      proposed_contract_type: form.proposed_contract_type || null,
      proposed_status: form.proposed_status || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25">
      <aside className="flex h-full w-full max-w-[620px] flex-col bg-white shadow-2xl">
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-7">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-950">Request Movement</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{employee.name} - {employee.emp_code}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-md text-slate-700 hover:bg-slate-50"
            aria-label="Close movement request"
          >
            <FiX className="h-6 w-6" aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-7 py-7">
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600 md:grid-cols-2">
                <p>Current position: <span className="text-slate-950">{employee.position || "-"}</span></p>
                <p>Department: <span className="text-slate-950">{employee.department || "-"}</span></p>
                <p>Subdepartment: <span className="text-slate-950">{employee.sub_department || "-"}</span></p>
                <p>Job grade: <span className="text-slate-950">{employee.job_grade || "-"}</span></p>
                <p>Salary: <span className="text-slate-950">${money(employee.basic_salary)}</span></p>
                <p>Status: <span className="text-slate-950">{formatContract(employee.status || "active")}</span></p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Movement Type" required>
                  <select
                    className={inputClass}
                    value={form.movement_type}
                    onChange={(event) => setForm((current) => ({ ...current, movement_type: event.target.value }))}
                  >
                    <option value="promotion">Promotion</option>
                    <option value="transfer">Department Transfer</option>
                    <option value="sub_department_change">Subdepartment Change</option>
                    <option value="job_grade_change">Job Grade Change</option>
                    <option value="salary_increase">Salary Increase</option>
                    <option value="salary_change">Salary Change</option>
                    <option value="contract_change">Contract Change</option>
                    <option value="status_change">Status Change</option>
                  </select>
                </Field>
                <Field label="Effective Date" required>
                  <input
                    className={inputClass}
                    type="date"
                    value={form.effective_date}
                    onChange={(event) => setForm((current) => ({ ...current, effective_date: event.target.value }))}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Proposed Position">
                  <input
                    className={inputClass}
                    list="movement-positions"
                    value={form.proposed_position}
                    onChange={(event) => setForm((current) => ({ ...current, proposed_position: event.target.value }))}
                  />
                  <datalist id="movement-positions">
                    {positions.map((position) => (
                      <option key={position} value={position} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Proposed Department">
                  <input
                    className={inputClass}
                    list="movement-departments"
                    value={form.proposed_department}
                    onChange={(event) => setForm((current) => ({ ...current, proposed_department: event.target.value }))}
                  />
                  <datalist id="movement-departments">
                    {departments.map((department) => (
                      <option key={department} value={department} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Proposed Subdepartment">
                  <input
                    className={inputClass}
                    list="movement-sub-departments"
                    value={form.proposed_sub_department}
                    onChange={(event) => setForm((current) => ({ ...current, proposed_sub_department: event.target.value }))}
                  />
                  <datalist id="movement-sub-departments">
                    {subDepartments.map((subDepartment) => (
                      <option key={subDepartment} value={subDepartment} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Proposed Job Grade">
                  <select
                    className={inputClass}
                    value={form.proposed_job_grade}
                    onChange={(event) => setForm((current) => ({ ...current, proposed_job_grade: event.target.value }))}
                  >
                    <option value="">No change</option>
                    {jobGrades.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Proposed Salary">
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={`${money(employee.basic_salary)}`}
                    value={form.proposed_salary}
                    onChange={(event) => setForm((current) => ({ ...current, proposed_salary: event.target.value }))}
                  />
                </Field>
                <Field label="Proposed Contract">
                  <select
                    className={inputClass}
                    value={form.proposed_contract_type}
                    onChange={(event) => setForm((current) => ({ ...current, proposed_contract_type: event.target.value }))}
                  >
                    <option value="">No change</option>
                    <option value="permanent">Permanent</option>
                    <option value="contract">Contract</option>
                    <option value="probation">Probation</option>
                    <option value="part_time">Part Time</option>
                  </select>
                </Field>
                <Field label="Proposed Status">
                  <select
                    className={inputClass}
                    value={form.proposed_status}
                    onChange={(event) => setForm((current) => ({ ...current, proposed_status: event.target.value }))}
                  >
                    <option value="">No change</option>
                    {employmentStatuses.map((status) => (
                      <option key={status} value={status}>{formatContract(status)}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Reason">
                <textarea
                  className="min-h-28 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={form.reason}
                  onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-7 py-5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 min-w-32 rounded-md border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20"
            >
              <FiSend className="h-4 w-4" aria-hidden />
              Submit Request
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default MovementRequestDrawer;
