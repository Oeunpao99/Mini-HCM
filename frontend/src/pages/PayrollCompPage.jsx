import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  FiActivity,
  FiAlertCircle,
  FiAward,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiEdit2,
  FiFileText,
  FiGrid,
  FiPlus,
  FiRefreshCw,
  FiShield,
  FiTrash2,
  FiUserCheck,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { inputClass } from "./hris/HrisCommon";

const PAYROLL_CYCLES = ["Monthly", "Bi-Weekly", "Weekly"];
const BATCH_STATUSES = ["Draft", "Calculated", "Approved", "Paid", "Reversed"];
const PAYMENT_METHODS = ["Bank Transfer", "Cash"];
const SALARY_GRADES = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"];
const SALARY_BANDS = ["Low", "Medium", "High"];
const ALLOWANCE_TYPES = ["Transport", "Phone", "Meal", "Housing", "Position", "Other"];
const ADJUSTMENT_TYPES = ["Annual Increment", "Promotion Adjustment", "Market Adjustment", "Special Adjustment", "Probation Confirmation"];
const BENEFIT_TYPES = ["Health Insurance", "Accident Insurance", "Life Insurance", "Transportation Allowance", "Phone Allowance", "Meal Allowance", "Uniform Benefit", "Profit Sharing Bonus", "Performance Bonus", "Seniority Payment", "Wedding Gift", "Funeral Support", "Maternity Benefit", "Other Benefits"];
const BENEFIT_STATUSES = ["Active", "Pending Approval", "Approved", "Rejected", "Expired", "Suspended"];
const MOVEMENT_TYPES = ["Promotion", "Transfer", "Demotion", "Acting Assignment", "Salary Adjustment", "Reporting Line Change", "Employment Status Change"];
const MOVEMENT_STATUSES = ["Draft", "Pending Approval", "Approved", "Effective", "Rejected", "Cancelled"];
const SS_STATUSES = ["Draft", "Pending Approval", "Approved", "Paid", "Cancelled"];

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: FiGrid },
  { id: "payroll-processing", label: "Payroll Processing", icon: FiCreditCard },
  { id: "compensation", label: "Compensation Management", icon: FiDollarSign },
  { id: "benefits", label: "Benefits Management", icon: FiShield },
  { id: "seniority", label: "Seniority & Severance", icon: FiAward },
  { id: "movement", label: "Staff Movement", icon: FiRefreshCw },
];

const statusColor = (s) => {
  const m = {
    Draft: "bg-slate-100 text-slate-700", Calculated: "bg-blue-100 text-blue-700",
    Approved: "bg-emerald-100 text-emerald-700", Paid: "bg-green-100 text-green-700",
    Reversed: "bg-red-100 text-red-700", Active: "bg-emerald-100 text-emerald-700",
    "Pending Approval": "bg-amber-100 text-amber-700", Rejected: "bg-red-100 text-red-700",
    Effective: "bg-blue-100 text-blue-700", Cancelled: "bg-slate-100 text-slate-500",
    Expired: "bg-slate-100 text-slate-500", Suspended: "bg-orange-100 text-orange-700",
  };
  return m[s] || "bg-slate-100 text-slate-700";
};

const DashboardStatCard = ({ icon: Icon, label, value, helper, tone }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-[#6B7280]">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[#111827]">{value ?? 0}</p>
        {helper && <p className="mt-1 text-xs font-medium text-[#6B7280]">{helper}</p>}
      </div>
      <div className={`flex h-14 w-14 items-center justify-center rounded-lg ${tone || "bg-emerald-600 text-white"}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </div>
);

const Badge = ({ children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(children)}`}>{children}</span>
);

const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`flex h-12 items-center gap-1.5 border-b-2 px-4 text-sm font-semibold whitespace-nowrap transition-colors ${active ? "border-[#166534] text-[#166534]" : "border-transparent text-[#6B7280] hover:text-[#111827]"}`}>
    {children}
  </button>
);

const Table = ({ columns, data, onEdit, onDelete, onAction }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-[#6B7280] uppercase">
        <tr>
          {columns.map((c) => <th key={c.key} className="px-4 py-3">{c.label}</th>)}
          <th className="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {data.map((row, i) => (
          <tr key={row.id || i} className="hover:bg-slate-50">
            {columns.map((c) => (
              <td key={c.key} className="px-4 py-3">
                {c.render ? c.render(row) : row[c.key] ?? "-"}
              </td>
            ))}
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                {onAction && row.status === "Draft" && onAction({ ...row, _module: i }) && null}
                <button onClick={() => onEdit(row)} className="rounded-lg p-1.5 text-[#6B7280] hover:bg-slate-100 hover:text-[#166534]"><FiEdit2 className="h-4 w-4" /></button>
                <button onClick={() => onDelete(row.id)} className="rounded-lg p-1.5 text-[#6B7280] hover:bg-red-50 hover:text-red-600"><FiTrash2 className="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
        ))}
        {data.length === 0 && <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-[#6B7280]">No records found</td></tr>}
      </tbody>
    </table>
  </div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-[#111827]">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#6B7280] hover:bg-slate-100"><FiX className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
};

// ──── Payroll Processing ────

const Field = ({ label, type = "text", value, onChange, options = [], required = false }) => (
  <label className="grid gap-2 text-sm font-bold text-slate-700">
    <span>
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </span>
    {type === "select" ? (
      <select className={inputClass} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select {label}</option>
        {options.map((option) => {
          const optionValue = typeof option === "object" ? option.value : option;
          const optionLabel = typeof option === "object" ? option.label : option;
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
        })}
      </select>
    ) : (
      <input type={type} className={inputClass} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    )}
  </label>
);

const employeeOptionsFrom = (employees) => employees.map((employee) => ({
  value: employee.user_id ?? employee.id,
  label: `${employee.name} (${employee.emp_code})`,
}));

const emptyBatchForm = () => ({
  month: new Date().getMonth() + 1, year: new Date().getFullYear(),
  cycle: "Monthly", notes: "",
});

const emptyPayrollEmpForm = () => ({
  user_id: "", basic_salary: 0, working_days: 26, present_days: 26,
  absent_days: 0, leave_days: 0, late_deduction: 0,
  ot_hours: 0, ot_amount: 0, nssf: 0, tax: 0,
});

const PayrollProcessingView = ({ batches, onRefresh }) => {
  const [batchModal, setBatchModal] = useState(false);
  const [empModal, setEmpModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchForm, setBatchForm] = useState(emptyBatchForm());
  const [empForm, setEmpForm] = useState(emptyPayrollEmpForm());
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [payrollEmployees, setPayrollEmployees] = useState([]);

  useEffect(() => {
    api.get("/api/hris/employees?limit=500").then(({ data }) => setEmployeeOptions(data || [])).catch(() => {});
  }, []);

  const openBatchModal = () => { setBatchForm(emptyBatchForm()); setBatchModal(true); };
  const loadBatchEmployees = async (batch) => {
    setSelectedBatch(batch);
    const { data } = await api.get(`/api/payroll-comp/batches/${batch.id}/employees`);
    setPayrollEmployees(data || []);
  };
  const openEmpModal = (batch) => {
    setSelectedBatch(batch);
    setEditingEmpId(null);
    setEmpForm(emptyPayrollEmpForm());
    setEmpModal(true);
  };
  const openEditEmpModal = (row) => {
    setEditingEmpId(row.id);
    setEmpForm({
      user_id: row.user_id,
      basic_salary: Number(row.basic_salary || 0),
      working_days: Number(row.working_days || 0),
      present_days: Number(row.present_days || 0),
      absent_days: Number(row.absent_days || 0),
      leave_days: Number(row.leave_days || 0),
      late_deduction: Number(row.late_deduction || 0),
      ot_hours: Number(row.ot_hours || 0),
      ot_amount: Number(row.ot_amount || 0),
      nssf: Number(row.nssf || 0),
      tax: Number(row.tax || 0),
      allowances: row.allowances || null,
      other_deductions: row.other_deductions || null,
      payment_date: row.payment_date || null,
      payment_method: row.payment_method || null,
    });
    setEmpModal(true);
  };

  const saveBatch = async () => {
    await api.post("/api/payroll-comp/batches", batchForm);
    setBatchModal(false);
    onRefresh();
  };

  const saveEmp = async () => {
    if (editingEmpId) {
      await api.put(`/api/payroll-comp/payroll-employees/${editingEmpId}`, empForm);
    } else {
      await api.post(`/api/payroll-comp/batches/${selectedBatch.id}/employees`, empForm);
    }
    setEmpModal(false);
    if (selectedBatch) await loadBatchEmployees(selectedBatch);
    onRefresh();
  };

  const updateStatus = async (id, status) => {
    await api.put(`/api/payroll-comp/batches/${id}/status?status=${status}`);
    onRefresh();
  };

  const batchColumns = [
    { key: "batch_no", label: "Batch No" },
    { key: "month", label: "Month", render: (r) => `${r.month}/${r.year}` },
    { key: "cycle", label: "Cycle" },
    { key: "employee_count", label: "Employees" },
    { key: "total_net", label: "Net Total", render: (r) => `$${Number(r.total_net || 0).toLocaleString()}` },
    { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> },
  ];

  const empColumns = [
    { key: "employee_name", label: "Employee" },
    { key: "department", label: "Dept" },
    { key: "basic_salary", label: "Basic", render: (r) => `$${Number(r.basic_salary).toLocaleString()}` },
    { key: "gross_salary", label: "Gross", render: (r) => `$${Number(r.gross_salary).toLocaleString()}` },
    { key: "present_days", label: "Present" },
    { key: "ot_amount", label: "OT", render: (r) => `$${Number(r.ot_amount).toLocaleString()}` },
    { key: "net_salary", label: "Net", render: (r) => <span className="font-bold text-[#166534]">${Number(r.net_salary).toLocaleString()}</span> },
    { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#111827]">Payroll Batches</h3>
        <button onClick={openBatchModal} className="flex h-9 items-center gap-2 rounded-lg bg-[#166534] px-4 text-sm font-semibold text-white hover:bg-[#145226]"><FiPlus className="h-4 w-4" /> New Batch</button>
      </div>
      <Table columns={batchColumns} data={batches} onEdit={loadBatchEmployees} onDelete={async (id) => { await api.delete(`/api/payroll-comp/batches/${id}`); setSelectedBatch(null); setPayrollEmployees([]); onRefresh(); }} />
      {selectedBatch && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#111827]">Employees — {selectedBatch.batch_no}</h3>
            <div className="flex gap-2">
              {selectedBatch.status === "Draft" && <button onClick={() => updateStatus(selectedBatch.id, "Calculated")} className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><FiActivity className="h-4 w-4" /> Calculate</button>}
              {selectedBatch.status === "Calculated" && <button onClick={() => updateStatus(selectedBatch.id, "Approved")} className="flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"><FiCheckCircle className="h-4 w-4" /> Approve</button>}
              {selectedBatch.status === "Approved" && <button onClick={() => updateStatus(selectedBatch.id, "Paid")} className="flex h-9 items-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700"><FiCheckCircle className="h-4 w-4" /> Pay</button>}
              <button onClick={() => openEmpModal(selectedBatch)} className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-[#6B7280] hover:bg-slate-50"><FiUserPlus className="h-4 w-4" /> Add Employee</button>
            </div>
          </div>
          <Table columns={empColumns} data={payrollEmployees} onEdit={openEditEmpModal} onDelete={async (id) => { await api.delete(`/api/payroll-comp/payroll-employees/${id}`); await loadBatchEmployees(selectedBatch); onRefresh(); }} />
        </div>
      )}
      <Modal open={batchModal} onClose={() => setBatchModal(false)} title="New Payroll Batch">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Month" type="number" value={batchForm.month} onChange={(v) => setBatchForm({ ...batchForm, month: Number(v) })} />
          <Field label="Year" type="number" value={batchForm.year} onChange={(v) => setBatchForm({ ...batchForm, year: Number(v) })} />
          <Field label="Cycle" type="select" value={batchForm.cycle} onChange={(v) => setBatchForm({ ...batchForm, cycle: v })} options={PAYROLL_CYCLES} />
          <Field label="Notes" value={batchForm.notes} onChange={(v) => setBatchForm({ ...batchForm, notes: v })} />
        </div>
        <button onClick={saveBatch} className="mt-4 h-10 w-full rounded-lg bg-[#166534] text-sm font-semibold text-white hover:bg-[#145226]">Create Batch</button>
      </Modal>
      <Modal open={empModal} onClose={() => setEmpModal(false)} title={editingEmpId ? "Edit Employee Payroll" : "Add Employee to Payroll"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee" type="select" value={empForm.user_id} onChange={(v) => setEmpForm({ ...empForm, user_id: Number(v) })} options={employeeOptionsFrom(employeeOptions)} />
          <Field label="Basic Salary" type="number" value={empForm.basic_salary} onChange={(v) => setEmpForm({ ...empForm, basic_salary: Number(v) })} />
          <Field label="Working Days" type="number" value={empForm.working_days} onChange={(v) => setEmpForm({ ...empForm, working_days: Number(v) })} />
          <Field label="Present Days" type="number" value={empForm.present_days} onChange={(v) => setEmpForm({ ...empForm, present_days: Number(v) })} />
          <Field label="Absent Days" type="number" value={empForm.absent_days} onChange={(v) => setEmpForm({ ...empForm, absent_days: Number(v) })} />
          <Field label="Leave Days" type="number" value={empForm.leave_days} onChange={(v) => setEmpForm({ ...empForm, leave_days: Number(v) })} />
          <Field label="Late Deduction" type="number" value={empForm.late_deduction} onChange={(v) => setEmpForm({ ...empForm, late_deduction: Number(v) })} />
          <Field label="OT Hours" type="number" value={empForm.ot_hours} onChange={(v) => setEmpForm({ ...empForm, ot_hours: Number(v) })} />
          <Field label="OT Amount" type="number" value={empForm.ot_amount} onChange={(v) => setEmpForm({ ...empForm, ot_amount: Number(v) })} />
          <Field label="NSSF" type="number" value={empForm.nssf} onChange={(v) => setEmpForm({ ...empForm, nssf: Number(v) })} />
          <Field label="Tax" type="number" value={empForm.tax} onChange={(v) => setEmpForm({ ...empForm, tax: Number(v) })} />
          <Field label="Payment Date" type="date" value={empForm.payment_date || ""} onChange={(v) => setEmpForm({ ...empForm, payment_date: v || null })} />
          <Field label="Payment Method" type="select" value={empForm.payment_method || ""} onChange={(v) => setEmpForm({ ...empForm, payment_method: v || null })} options={PAYMENT_METHODS} />
        </div>
        <button onClick={saveEmp} className="mt-4 h-10 w-full rounded-lg bg-[#166534] text-sm font-semibold text-white hover:bg-[#145226]">{editingEmpId ? "Update Employee Payroll" : "Add Employee"}</button>
      </Modal>
    </div>
  );
};

// ──── Compensation ────

const emptyCompForm = () => ({
  user_id: "", salary_grade: "", salary_band: "", basic_salary: 0,
  allowance_type: "", allowance_amount: 0, benefit_package: "",
  adjustment_type: "", effective_date: "", new_salary: "", adjustment_reason: "", remarks: "",
});

const CompensationView = ({ compensations, onRefresh }) => {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyCompForm());
  const [editingId, setEditingId] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  useEffect(() => {
    api.get("/api/hris/employees?limit=500").then(({ data }) => setEmployeeOptions(data || [])).catch(() => {});
  }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyCompForm()); setModal(true); };
  const openEdit = (r) => { setEditingId(r.id); setForm(r); setModal(true); };

  const save = async () => {
    if (editingId) await api.put(`/api/payroll-comp/compensations/${editingId}`, form);
    else await api.post("/api/payroll-comp/compensations", form);
    setModal(false);
    onRefresh();
  };

  const columns = [
    { key: "employee_name", label: "Employee" },
    { key: "department", label: "Dept" },
    { key: "salary_grade", label: "Grade", render: (r) => r.salary_grade || "-" },
    { key: "basic_salary", label: "Basic", render: (r) => `$${Number(r.basic_salary).toLocaleString()}` },
    { key: "allowance_type", label: "Allowance", render: (r) => r.allowance_type || "-" },
    { key: "adjustment_type", label: "Adjustment", render: (r) => r.adjustment_type || "-" },
    { key: "approval_status", label: "Status", render: (r) => <Badge>{r.approval_status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={openCreate} className="flex h-9 items-center gap-2 rounded-lg bg-[#166534] px-4 text-sm font-semibold text-white hover:bg-[#145226]"><FiPlus className="h-4 w-4" /> Add Compensation</button></div>
      <Table columns={columns} data={compensations} onEdit={openEdit} onDelete={async (id) => { await api.delete(`/api/payroll-comp/compensations/${id}`); onRefresh(); }} />
      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? "Edit Compensation" : "New Compensation"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee" type="select" value={form.user_id} onChange={(v) => setForm({ ...form, user_id: Number(v) })} options={employeeOptionsFrom(employeeOptions)} />
          <Field label="Salary Grade" type="select" value={form.salary_grade} onChange={(v) => setForm({ ...form, salary_grade: v })} options={SALARY_GRADES} />
          <Field label="Salary Band" type="select" value={form.salary_band} onChange={(v) => setForm({ ...form, salary_band: v })} options={SALARY_BANDS} />
          <Field label="Basic Salary" type="number" value={form.basic_salary} onChange={(v) => setForm({ ...form, basic_salary: Number(v) })} />
          <Field label="Allowance Type" type="select" value={form.allowance_type} onChange={(v) => setForm({ ...form, allowance_type: v })} options={ALLOWANCE_TYPES} />
          <Field label="Allowance Amount" type="number" value={form.allowance_amount} onChange={(v) => setForm({ ...form, allowance_amount: Number(v) })} />
          <Field label="Adjustment Type" type="select" value={form.adjustment_type} onChange={(v) => setForm({ ...form, adjustment_type: v })} options={ADJUSTMENT_TYPES} />
          <Field label="Effective Date" type="date" value={form.effective_date} onChange={(v) => setForm({ ...form, effective_date: v })} />
          <Field label="New Salary" type="number" value={form.new_salary} onChange={(v) => setForm({ ...form, new_salary: Number(v) })} />
          <div className="col-span-2"><Field label="Adjustment Reason" value={form.adjustment_reason} onChange={(v) => setForm({ ...form, adjustment_reason: v })} /></div>
          <div className="col-span-2"><Field label="Remarks" value={form.remarks} onChange={(v) => setForm({ ...form, remarks: v })} /></div>
        </div>
        <button onClick={save} className="mt-4 h-10 w-full rounded-lg bg-[#166534] text-sm font-semibold text-white hover:bg-[#145226]">{editingId ? "Update" : "Create"}</button>
      </Modal>
    </div>
  );
};

// ──── Benefits ────

const emptyBenefitForm = () => ({
  user_id: "", benefit_type: "", benefit_name: "",
  effective_date: "", expiry_date: "", benefit_value: 0,
  status: "Active", remarks: "",
});

const BenefitsView = ({ benefits, onRefresh }) => {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyBenefitForm());
  const [editingId, setEditingId] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  useEffect(() => {
    api.get("/api/hris/employees?limit=500").then(({ data }) => setEmployeeOptions(data || [])).catch(() => {});
  }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyBenefitForm()); setModal(true); };
  const openEdit = (r) => { setEditingId(r.id); setForm(r); setModal(true); };

  const save = async () => {
    if (editingId) await api.put(`/api/payroll-comp/benefits/${editingId}`, form);
    else await api.post("/api/payroll-comp/benefits", form);
    setModal(false);
    onRefresh();
  };

  const columns = [
    { key: "employee_name", label: "Employee" },
    { key: "benefit_type", label: "Type" },
    { key: "benefit_name", label: "Name" },
    { key: "benefit_value", label: "Value", render: (r) => `$${Number(r.benefit_value).toLocaleString()}` },
    { key: "effective_date", label: "Start Date", render: (r) => r.effective_date || "-" },
    { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={openCreate} className="flex h-9 items-center gap-2 rounded-lg bg-[#166534] px-4 text-sm font-semibold text-white hover:bg-[#145226]"><FiPlus className="h-4 w-4" /> Assign Benefit</button></div>
      <Table columns={columns} data={benefits} onEdit={openEdit} onDelete={async (id) => { await api.delete(`/api/payroll-comp/benefits/${id}`); onRefresh(); }} />
      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? "Edit Benefit" : "New Benefit"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee" type="select" value={form.user_id} onChange={(v) => setForm({ ...form, user_id: Number(v) })} options={employeeOptionsFrom(employeeOptions)} />
          <Field label="Benefit Type" type="select" value={form.benefit_type} onChange={(v) => setForm({ ...form, benefit_type: v })} options={BENEFIT_TYPES} />
          <Field label="Benefit Name" value={form.benefit_name} onChange={(v) => setForm({ ...form, benefit_name: v })} />
          <Field label="Benefit Value" type="number" value={form.benefit_value} onChange={(v) => setForm({ ...form, benefit_value: Number(v) })} />
          <Field label="Effective Date" type="date" value={form.effective_date} onChange={(v) => setForm({ ...form, effective_date: v })} />
          <Field label="Expiry Date" type="date" value={form.expiry_date} onChange={(v) => setForm({ ...form, expiry_date: v })} />
          <Field label="Status" type="select" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={BENEFIT_STATUSES} />
          <div className="col-span-2"><Field label="Remarks" value={form.remarks} onChange={(v) => setForm({ ...form, remarks: v })} /></div>
        </div>
        <button onClick={save} className="mt-4 h-10 w-full rounded-lg bg-[#166534] text-sm font-semibold text-white hover:bg-[#145226]">{editingId ? "Update" : "Create"}</button>
      </Modal>
    </div>
  );
};

// ──── Seniority & Severance ────

const emptySSForm = () => ({
  user_id: "", payment_type: "Year-End Seniority", severance_type: "",
  join_date: "", years_of_service: 0, eligible_salary: 0,
  payment_amount: 0, payment_date: "", notes: "",
});

const SeniorityView = ({ seniorities, onRefresh }) => {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptySSForm());
  const [editingId, setEditingId] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  useEffect(() => {
    api.get("/api/hris/employees?limit=500").then(({ data }) => setEmployeeOptions(data || [])).catch(() => {});
  }, []);

  const openCreate = () => { setEditingId(null); setForm(emptySSForm()); setModal(true); };
  const openEdit = (r) => { setEditingId(r.id); setForm(r); setModal(true); };

  const save = async () => {
    if (editingId) await api.put(`/api/payroll-comp/seniority-severances/${editingId}`, form);
    else await api.post("/api/payroll-comp/seniority-severances", form);
    setModal(false);
    onRefresh();
  };

  const updateStatus = async (id, status) => { await api.put(`/api/payroll-comp/seniority-severances/${id}/status?status=${status}`); onRefresh(); };

  const columns = [
    { key: "employee_name", label: "Employee" },
    { key: "payment_type", label: "Type" },
    { key: "years_of_service", label: "Years", render: (r) => r.years_of_service ?? "-" },
    { key: "eligible_salary", label: "Eligible Salary", render: (r) => `$${Number(r.eligible_salary).toLocaleString()}` },
    { key: "payment_amount", label: "Amount", render: (r) => <span className="font-bold text-[#166534]">${Number(r.payment_amount).toLocaleString()}</span> },
    { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={openCreate} className="flex h-9 items-center gap-2 rounded-lg bg-[#166534] px-4 text-sm font-semibold text-white hover:bg-[#145226]"><FiPlus className="h-4 w-4" /> New Record</button></div>
      <Table columns={columns} data={seniorities} onEdit={openEdit} onDelete={async (id) => { await api.delete(`/api/payroll-comp/seniority-severances/${id}`); onRefresh(); }} />
      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? "Edit Record" : "New Seniority/Severance"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee" type="select" value={form.user_id} onChange={(v) => setForm({ ...form, user_id: Number(v) })} options={employeeOptionsFrom(employeeOptions)} />
          <Field label="Payment Type" type="select" value={form.payment_type} onChange={(v) => setForm({ ...form, payment_type: v })} options={["Mid-Year Seniority", "Year-End Seniority", "Outstanding Seniority", "Severance"]} />
          <Field label="Join Date" type="date" value={form.join_date} onChange={(v) => setForm({ ...form, join_date: v })} />
          <Field label="Eligible Salary" type="number" value={form.eligible_salary} onChange={(v) => setForm({ ...form, eligible_salary: Number(v) })} />
          <Field label="Payment Amount" type="number" value={form.payment_amount} onChange={(v) => setForm({ ...form, payment_amount: Number(v) })} />
          <Field label="Payment Date" type="date" value={form.payment_date} onChange={(v) => setForm({ ...form, payment_date: v })} />
          <div className="col-span-2"><Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} /></div>
        </div>
        <button onClick={save} className="mt-4 h-10 w-full rounded-lg bg-[#166534] text-sm font-semibold text-white hover:bg-[#145226]">{editingId ? "Update" : "Create"}</button>
      </Modal>
    </div>
  );
};

// ──── Staff Movement ────

const emptyMovementForm = () => ({
  user_id: "", movement_type: "", effective_date: "", reason: "",
  new_department: "", new_position: "", new_salary: "", remarks: "",
});

const MovementView = ({ movements, onRefresh }) => {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyMovementForm());
  const [editingId, setEditingId] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  useEffect(() => {
    api.get("/api/hris/employees?limit=500").then(({ data }) => setEmployeeOptions(data || [])).catch(() => {});
  }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyMovementForm()); setModal(true); };
  const openEdit = (r) => { setEditingId(r.id); setForm(r); setModal(true); };

  const save = async () => {
    if (editingId) await api.put(`/api/payroll-comp/movements/${editingId}`, form);
    else await api.post("/api/payroll-comp/movements", form);
    setModal(false);
    onRefresh();
  };

  const updateStatus = async (id, status) => { await api.put(`/api/payroll-comp/movements/${id}/status?status=${status}`); onRefresh(); };

  const columns = [
    { key: "movement_no", label: "No." },
    { key: "employee_name", label: "Employee" },
    { key: "movement_type", label: "Type" },
    { key: "current_position", label: "From", render: (r) => r.current_position || "-" },
    { key: "new_position", label: "To", render: (r) => r.new_position || "-" },
    { key: "effective_date", label: "Date" },
    { key: "approval_status", label: "Status", render: (r) => <Badge>{r.approval_status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={openCreate} className="flex h-9 items-center gap-2 rounded-lg bg-[#166534] px-4 text-sm font-semibold text-white hover:bg-[#145226]"><FiPlus className="h-4 w-4" /> New Movement</button></div>
      <Table columns={columns} data={movements} onEdit={openEdit} onDelete={async (id) => { await api.delete(`/api/payroll-comp/movements/${id}`); onRefresh(); }} />
      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? "Edit Movement" : "New Staff Movement"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee" type="select" value={form.user_id} onChange={(v) => setForm({ ...form, user_id: Number(v) })} options={employeeOptionsFrom(employeeOptions)} />
          <Field label="Movement Type" type="select" value={form.movement_type} onChange={(v) => setForm({ ...form, movement_type: v })} options={MOVEMENT_TYPES} />
          <Field label="Effective Date" type="date" value={form.effective_date} onChange={(v) => setForm({ ...form, effective_date: v })} />
          <Field label="New Department" value={form.new_department} onChange={(v) => setForm({ ...form, new_department: v })} />
          <Field label="New Position" value={form.new_position} onChange={(v) => setForm({ ...form, new_position: v })} />
          <Field label="New Salary" type="number" value={form.new_salary} onChange={(v) => setForm({ ...form, new_salary: Number(v) })} />
          <div className="col-span-2"><Field label="Reason" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} /></div>
          <div className="col-span-2"><Field label="Remarks" value={form.remarks} onChange={(v) => setForm({ ...form, remarks: v })} /></div>
        </div>
        <button onClick={save} className="mt-4 h-10 w-full rounded-lg bg-[#166534] text-sm font-semibold text-white hover:bg-[#145226]">{editingId ? "Update" : "Create"}</button>
      </Modal>
    </div>
  );
};

// ──── Main Page ────

const PayrollCompPage = () => {
  const location = useLocation();
  const initialTab = new URLSearchParams(location.search).get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState({});
  const [batches, setBatches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [compensations, setCompensations] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [seniorities, setSeniorities] = useState([]);
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab") || "dashboard";
    setActiveTab(tab);
  }, [location.search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "dashboard") {
        const { data } = await api.get("/api/payroll-comp/dashboard");
        setDashboard(data);
      } else if (activeTab === "payroll-processing") {
        const [b, e] = await Promise.all([
          api.get("/api/payroll-comp/batches"),
          api.get("/api/payroll-comp/batches/0/employees").catch(() => ({ data: [] })),
        ]);
        setBatches(b.data || []);
        setEmployees(e.data || []);
      } else if (activeTab === "compensation") {
        const { data } = await api.get("/api/payroll-comp/compensations");
        setCompensations(data || []);
      } else if (activeTab === "benefits") {
        const { data } = await api.get("/api/payroll-comp/benefits");
        setBenefits(data || []);
      } else if (activeTab === "seniority") {
        const { data } = await api.get("/api/payroll-comp/seniority-severances");
        setSeniorities(data || []);
      } else if (activeTab === "movement") {
        const { data } = await api.get("/api/payroll-comp/movements");
        setMovements(data || []);
      }
    } catch { } finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const dashboardCards = [
    { icon: FiDollarSign, label: "Total Payroll Cost", value: `$${Number(dashboard.total_payroll_cost).toLocaleString()}`, helper: "All batches", tone: "bg-emerald-600 text-white" },
    { icon: FiCreditCard, label: "Net Payroll Amount", value: `$${Number(dashboard.net_payroll_amount).toLocaleString()}`, helper: "Paid", tone: "bg-blue-600 text-white" },
    { icon: FiUserCheck, label: "Employees Paid", value: dashboard.employees_paid, helper: "This period", tone: "bg-teal-600 text-white" },
    { icon: FiClock, label: "Pending Payroll", value: dashboard.pending_payroll, helper: "Awaiting approval", tone: "bg-amber-600 text-white" },
    { icon: FiDollarSign, label: "Compensation Cost", value: `$${Number(dashboard.total_compensation_cost).toLocaleString()}`, helper: "Monthly", tone: "bg-purple-600 text-white" },
    { icon: FiAward, label: "Active Benefits", value: dashboard.active_benefits, helper: "Programs", tone: "bg-rose-600 text-white" },
    { icon: FiAlertCircle, label: "Pending Seniority", value: dashboard.pending_seniority, helper: "Awaiting approval", tone: "bg-orange-600 text-white" },
    { icon: FiRefreshCw, label: "Pending Movements", value: dashboard.pending_movements, helper: "Awaiting approval", tone: "bg-indigo-600 text-white" },
  ];

  const renderDashboard = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {dashboardCards.map((card, i) => <DashboardStatCard key={i} {...card} />)}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f5f7fb] px-4 py-5 md:px-6">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-[#111827]">
            Payroll, Compensation & Staff Movement
            {activeTab !== "dashboard" && (
              <span className="ml-2 text-lg font-semibold text-[#6B7280]">
                / {tabs.find((t) => t.id === activeTab)?.label || ""}
              </span>
            )}
          </h1>
        </div>

        <div className="flex gap-0 overflow-x-auto border-b border-slate-200">
          {tabs.map((tab) => (
            <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); window.history.replaceState(null, "", `?tab=${tab.id}`); }}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </TabButton>
          ))}
        </div>

        {loading && <p className="text-sm text-[#6B7280]">Loading...</p>}

        {!loading && activeTab === "dashboard" && renderDashboard()}
        {!loading && activeTab === "payroll-processing" && <PayrollProcessingView batches={batches} employees={employees} onRefresh={loadData} />}
        {!loading && activeTab === "compensation" && <CompensationView compensations={compensations} onRefresh={loadData} />}
        {!loading && activeTab === "benefits" && <BenefitsView benefits={benefits} onRefresh={loadData} />}
        {!loading && activeTab === "seniority" && <SeniorityView seniorities={seniorities} onRefresh={loadData} />}
        {!loading && activeTab === "movement" && <MovementView movements={movements} onRefresh={loadData} />}
      </div>
    </div>
  );
};

export default PayrollCompPage;
