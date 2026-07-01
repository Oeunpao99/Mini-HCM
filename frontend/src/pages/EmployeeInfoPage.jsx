import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  FiAlertCircle,
  FiEdit2,
  FiFileText,
  FiFolder,
  FiGrid,
  FiPlus,
  FiTrash2,
  FiUser,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import api from "../services/api";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: FiGrid },
  { id: "personal", label: "Personal Information", icon: FiUser },
  { id: "profile", label: "Master Employee Profile", icon: FiUserCheck },
  { id: "org-structure", label: "Organization Structure", icon: FiFolder },
  { id: "documents", label: "Document Management", icon: FiFileText },
];

const statusColor = (s) => {
  const m = {
    Active: "bg-emerald-100 text-emerald-700", Expired: "bg-red-100 text-red-700",
    Archived: "bg-slate-100 text-slate-500", Inactive: "bg-slate-100 text-slate-500",
  };
  return m[s] || "bg-slate-100 text-slate-700";
};

const Badge = ({ children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(children)}`}>{children}</span>
);

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

const Table = ({ columns, data, onEdit, onDelete }) => (
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
              <td key={c.key} className="px-4 py-3">{c.render ? c.render(row) : row[c.key] ?? "-"}</td>
            ))}
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                {onEdit && <button onClick={() => onEdit(row)} className="rounded-lg p-1.5 text-[#6B7280] hover:bg-slate-100 hover:text-[#166534]"><FiEdit2 className="h-4 w-4" /></button>}
                {onDelete && <button onClick={() => onDelete(row.id)} className="rounded-lg p-1.5 text-[#6B7280] hover:bg-red-50 hover:text-red-600"><FiTrash2 className="h-4 w-4" /></button>}
              </div>
            </td>
          </tr>
        ))}
        {data.length === 0 && <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-[#6B7280]">No records found</td></tr>}
      </tbody>
    </table>
  </div>
);

const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`flex h-12 items-center gap-1.5 border-b-2 px-4 text-sm font-semibold whitespace-nowrap transition-colors ${active ? "border-[#166534] text-[#166534]" : "border-transparent text-[#6B7280] hover:text-[#111827]"}`}>
    {children}
  </button>
);

const inputClass =
  "h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#166534] focus:ring-2 focus:ring-emerald-100";

const Field = ({ label, type = "text", value, onChange, options = [], required = false }) => (
  <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
    <span>
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </span>
    {type === "select" ? (
      <select className={inputClass} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select...</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    ) : (
      <input
        className={inputClass}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    )}
  </label>
);

const normalizePayload = (source, fields, numberFields = []) => {
  const numberSet = new Set(numberFields);
  return fields.reduce((payload, field) => {
    const value = source[field];
    if (numberSet.has(field)) {
      const defaultsToZero = ["basic_salary", "children_count", "headcount_budget"].includes(field);
      payload[field] = value === "" || value === null || value === undefined ? (defaultsToZero ? 0 : null) : Number(value);
    } else if (value === "") {
      payload[field] = null;
    } else {
      payload[field] = value ?? null;
    }
    return payload;
  }, {});
};

// ──── Personal Information ────

const personalFields = [
  "name_khmer",
  "gender",
  "date_of_birth",
  "place_of_birth",
  "marital_status",
  "nationality",
  "phone",
  "personal_email",
  "address",
  "permanent_address",
  "national_id",
  "id_issue_date",
  "id_expiry_date",
  "passport_no",
  "passport_expiry_date",
  "emergency_contact_name",
  "emergency_contact_relation",
  "emergency_contact_phone",
  "spouse_name",
  "children_count",
  "bank_name",
  "bank_account_name",
  "bank_account",
  "profile_photo",
];

const PersonalInfoView = ({ employees, onRefresh }) => {
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [modal, setModal] = useState(false);

  const openEdit = (emp) => { setEditId(emp.user_id); setForm(emp); setModal(true); };

  const save = async () => {
    await api.put(
      `/api/employee-info/employees/${editId}/personal-info`,
      normalizePayload(form, personalFields, ["children_count"])
    );
    setModal(false);
    onRefresh();
  };

  const columns = [
    { key: "emp_code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "gender", label: "Gender" },
    { key: "phone", label: "Phone" },
    { key: "national_id", label: "National ID", render: (r) => r.national_id || "-" },
    { key: "marital_status", label: "Marital", render: (r) => r.marital_status || "-" },
    { key: "nationality", label: "Nationality", render: (r) => r.nationality || "-" },
  ];

  return (
    <div className="space-y-4">
      <Table columns={columns} data={employees} onEdit={openEdit} />
      <Modal open={modal} onClose={() => setModal(false)} title="Edit Personal Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name (Khmer)" value={form.name_khmer} onChange={(v) => setForm({ ...form, name_khmer: v })} />
          <Field label="Gender" type="select" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} options={["Male", "Female"]} />
          <Field label="Date of Birth" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} />
          <Field label="Place of Birth" value={form.place_of_birth} onChange={(v) => setForm({ ...form, place_of_birth: v })} />
          <Field label="Marital Status" type="select" value={form.marital_status} onChange={(v) => setForm({ ...form, marital_status: v })} options={["Single", "Married", "Divorced"]} />
          <Field label="Nationality" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Personal Email" value={form.personal_email} onChange={(v) => setForm({ ...form, personal_email: v })} />
          <div className="col-span-2"><Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} /></div>
          <div className="col-span-2"><Field label="Permanent Address" value={form.permanent_address} onChange={(v) => setForm({ ...form, permanent_address: v })} /></div>
          <Field label="National ID" value={form.national_id} onChange={(v) => setForm({ ...form, national_id: v })} />
          <Field label="ID Issue Date" type="date" value={form.id_issue_date} onChange={(v) => setForm({ ...form, id_issue_date: v })} />
          <Field label="ID Expiry Date" type="date" value={form.id_expiry_date} onChange={(v) => setForm({ ...form, id_expiry_date: v })} />
          <Field label="Passport No" value={form.passport_no} onChange={(v) => setForm({ ...form, passport_no: v })} />
          <Field label="Passport Expiry" type="date" value={form.passport_expiry_date} onChange={(v) => setForm({ ...form, passport_expiry_date: v })} />
          <Field label="Emergency Contact" value={form.emergency_contact_name} onChange={(v) => setForm({ ...form, emergency_contact_name: v })} />
          <Field label="Emergency Relation" value={form.emergency_contact_relation} onChange={(v) => setForm({ ...form, emergency_contact_relation: v })} />
          <Field label="Emergency Phone" value={form.emergency_contact_phone} onChange={(v) => setForm({ ...form, emergency_contact_phone: v })} />
          <Field label="Spouse Name" value={form.spouse_name} onChange={(v) => setForm({ ...form, spouse_name: v })} />
          <Field label="Children" type="number" value={form.children_count} onChange={(v) => setForm({ ...form, children_count: Number(v) })} />
          <Field label="Bank Name" value={form.bank_name} onChange={(v) => setForm({ ...form, bank_name: v })} />
          <Field label="Bank Account Name" value={form.bank_account_name} onChange={(v) => setForm({ ...form, bank_account_name: v })} />
          <Field label="Bank Account No" value={form.bank_account} onChange={(v) => setForm({ ...form, bank_account: v })} />
        </div>
        <button onClick={save} className="mt-4 h-10 w-full rounded-lg bg-[#166534] text-sm font-semibold text-white hover:bg-[#145226]">Save</button>
      </Modal>
    </div>
  );
};

// ──── Master Employee Profile ────

const EMPLOYMENT_TYPES = ["Probation", "Full-Time", "Part-Time", "Internship", "Contract"];
const EMPLOYMENT_STATUSES = ["Active", "Resigned", "Terminated", "Suspended", "Long Sick Leave", "Maternity Leave"];
const EMPLOYEE_CATEGORIES = ["Local", "Expatriate", "Consultant", "Intern"];
const emptyEmployeeForm = () => ({
  first_name: "",
  last_name: "",
  email: "",
  password: "staff123",
  role: "staff",
  department: "",
  phone: "",
  address: "",
  position: "",
  sub_department: "",
  job_grade: "",
  contract_type: "Full-Time",
  contract_start_date: "",
  contract_end_date: "",
  basic_salary: 0,
  bank_account: "",
  profile_photo: "",
  status: "Active",
});
const createEmployeeFields = [
  "first_name",
  "last_name",
  "email",
  "password",
  "role",
  "department",
  "phone",
  "address",
  "position",
  "sub_department",
  "job_grade",
  "contract_type",
  "contract_start_date",
  "contract_end_date",
  "basic_salary",
  "bank_account",
  "profile_photo",
  "status",
];
const profileFields = [
  "join_date",
  "confirmation_date",
  "probation_end_date",
  "contract_type",
  "employment_status",
  "contract_start_date",
  "contract_end_date",
  "resignation_date",
  "department",
  "sub_department",
  "position",
  "job_grade",
  "job_level",
  "supervisor_id",
  "department_head_id",
  "work_email",
  "extension_no",
  "workstation",
  "basic_salary",
  "payroll_group",
  "cost_center",
  "employee_category",
];

const MasterProfileView = ({ employees, onRefresh }) => {
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [modal, setModal] = useState(false);

  const openEdit = (emp) => { setEditId(emp.user_id); setForm(emp); setModal(true); };

  const save = async () => {
    await api.put(
      `/api/employee-info/employees/${editId}/profile`,
      normalizePayload(form, profileFields, ["basic_salary", "supervisor_id", "department_head_id"])
    );
    setModal(false);
    onRefresh();
  };

  const columns = [
    { key: "emp_code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "department", label: "Dept", render: (r) => r.department || "-" },
    { key: "position", label: "Position", render: (r) => r.position || "-" },
    { key: "contract_type", label: "Type" },
    { key: "employment_status", label: "Status", render: (r) => <Badge>{r.employment_status}</Badge> },
    { key: "join_date", label: "Joined" },
  ];

  return (
    <div className="space-y-4">
      <Table columns={columns} data={employees} onEdit={openEdit} />
      <Modal open={modal} onClose={() => setModal(false)} title="Edit Employment Profile">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Join Date" type="date" value={form.join_date} onChange={(v) => setForm({ ...form, join_date: v })} />
          <Field label="Confirmation Date" type="date" value={form.confirmation_date} onChange={(v) => setForm({ ...form, confirmation_date: v })} />
          <Field label="Probation End Date" type="date" value={form.probation_end_date} onChange={(v) => setForm({ ...form, probation_end_date: v })} />
          <Field label="Contract Type" type="select" value={form.contract_type} onChange={(v) => setForm({ ...form, contract_type: v })} options={EMPLOYMENT_TYPES} />
          <Field label="Employment Status" type="select" value={form.employment_status} onChange={(v) => setForm({ ...form, employment_status: v })} options={EMPLOYMENT_STATUSES} />
          <Field label="Employee Category" type="select" value={form.employee_category} onChange={(v) => setForm({ ...form, employee_category: v })} options={EMPLOYEE_CATEGORIES} />
          <Field label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
          <Field label="Sub Department" value={form.sub_department} onChange={(v) => setForm({ ...form, sub_department: v })} />
          <Field label="Position" value={form.position} onChange={(v) => setForm({ ...form, position: v })} />
          <Field label="Job Grade" value={form.job_grade} onChange={(v) => setForm({ ...form, job_grade: v })} />
          <Field label="Job Level" type="select" value={form.job_level} onChange={(v) => setForm({ ...form, job_level: v })} options={["Staff", "Senior", "Supervisor", "Manager", "Director", "VP", "C-Level"]} />
          <Field label="Work Email" value={form.work_email} onChange={(v) => setForm({ ...form, work_email: v })} />
          <Field label="Extension No" value={form.extension_no} onChange={(v) => setForm({ ...form, extension_no: v })} />
          <Field label="Workstation" value={form.workstation} onChange={(v) => setForm({ ...form, workstation: v })} />
          <Field label="Basic Salary" type="number" value={form.basic_salary} onChange={(v) => setForm({ ...form, basic_salary: Number(v) })} />
          <Field label="Payroll Group" value={form.payroll_group} onChange={(v) => setForm({ ...form, payroll_group: v })} />
          <Field label="Cost Center" value={form.cost_center} onChange={(v) => setForm({ ...form, cost_center: v })} />
        </div>
        <button onClick={save} className="mt-4 h-10 w-full rounded-lg bg-[#166534] text-sm font-semibold text-white hover:bg-[#145226]">Save</button>
      </Modal>
    </div>
  );
};

// ──── Organization Structure ────

const emptyDeptForm = () => ({ code: "", name: "", parent_id: "", department_head_id: "", effective_date: "", status: "Active" });
const emptyPosForm = () => ({ code: "", title: "", job_level: "", grade: "", department_id: "", reports_to_id: "", headcount_budget: 0, status: "Active" });
const deptFields = ["code", "name", "parent_id", "department_head_id", "effective_date", "status"];
const posFields = ["code", "title", "job_level", "grade", "department_id", "reports_to_id", "headcount_budget", "effective_date", "status"];

const OrgStructureView = ({ departments, positions, onRefresh }) => {
  const [deptModal, setDeptModal] = useState(false);
  const [posModal, setPosModal] = useState(false);
  const [deptForm, setDeptForm] = useState(emptyDeptForm());
  const [posForm, setPosForm] = useState(emptyPosForm());
  const [editDeptId, setEditDeptId] = useState(null);
  const [editPosId, setEditPosId] = useState(null);

  const openDept = (r) => {
    if (r) { setEditDeptId(r.id); setDeptForm(r); } else { setEditDeptId(null); setDeptForm(emptyDeptForm()); }
    setDeptModal(true);
  };
  const openPos = (r) => {
    if (r) { setEditPosId(r.id); setPosForm(r); } else { setEditPosId(null); setPosForm(emptyPosForm()); }
    setPosModal(true);
  };

  const saveDept = async () => {
    const payload = normalizePayload(deptForm, deptFields, ["parent_id", "department_head_id"]);
    if (editDeptId) await api.put(`/api/employee-info/departments/${editDeptId}`, payload);
    else await api.post("/api/employee-info/departments", payload);
    setDeptModal(false);
    onRefresh();
  };
  const savePos = async () => {
    const payload = normalizePayload(posForm, posFields, ["department_id", "reports_to_id", "headcount_budget"]);
    if (editPosId) await api.put(`/api/employee-info/positions/${editPosId}`, payload);
    else await api.post("/api/employee-info/positions", payload);
    setPosModal(false);
    onRefresh();
  };

  const deptColumns = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "parent_name", label: "Parent", render: (r) => r.parent_name || "-" },
    { key: "head_name", label: "Head", render: (r) => r.head_name || "-" },
    { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> },
  ];
  const posColumns = [
    { key: "code", label: "Code" },
    { key: "title", label: "Title" },
    { key: "job_level", label: "Level", render: (r) => r.job_level || "-" },
    { key: "department_name", label: "Dept", render: (r) => r.department_name || "-" },
    { key: "headcount_budget", label: "Budget" },
    { key: "current_headcount", label: "Filled" },
    { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#111827]">Departments</h3>
          <button onClick={() => openDept(null)} className="flex h-9 items-center gap-2 rounded-lg bg-[#166534] px-4 text-sm font-semibold text-white"><FiPlus className="h-4 w-4" /> Add Department</button>
        </div>
        <Table columns={deptColumns} data={departments} onEdit={openDept} onDelete={async (id) => { await api.delete(`/api/employee-info/departments/${id}`); onRefresh(); }} />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#111827]">Positions</h3>
          <button onClick={() => openPos(null)} className="flex h-9 items-center gap-2 rounded-lg bg-[#166534] px-4 text-sm font-semibold text-white"><FiPlus className="h-4 w-4" /> Add Position</button>
        </div>
        <Table columns={posColumns} data={positions} onEdit={openPos} onDelete={async (id) => { await api.delete(`/api/employee-info/positions/${id}`); onRefresh(); }} />
      </div>
      <Modal open={deptModal} onClose={() => setDeptModal(false)} title={editDeptId ? "Edit Department" : "New Department"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Code" value={deptForm.code} onChange={(v) => setDeptForm({ ...deptForm, code: v })} />
          <Field label="Name" value={deptForm.name} onChange={(v) => setDeptForm({ ...deptForm, name: v })} />
          <Field label="Parent Dept" type="select" value={deptForm.parent_id} onChange={(v) => setDeptForm({ ...deptForm, parent_id: Number(v) || null })} options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          <Field label="Status" type="select" value={deptForm.status} onChange={(v) => setDeptForm({ ...deptForm, status: v })} options={["Active", "Inactive"]} />
          <Field label="Effective Date" type="date" value={deptForm.effective_date} onChange={(v) => setDeptForm({ ...deptForm, effective_date: v })} />
        </div>
        <button onClick={saveDept} className="mt-4 h-10 w-full rounded-lg bg-[#166534] text-sm font-semibold text-white">Save</button>
      </Modal>
      <Modal open={posModal} onClose={() => setPosModal(false)} title={editPosId ? "Edit Position" : "New Position"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Code" value={posForm.code} onChange={(v) => setPosForm({ ...posForm, code: v })} />
          <Field label="Title" value={posForm.title} onChange={(v) => setPosForm({ ...posForm, title: v })} />
          <Field label="Job Level" type="select" value={posForm.job_level} onChange={(v) => setPosForm({ ...posForm, job_level: v })} options={["Staff", "Senior", "Supervisor", "Manager", "Director", "VP", "C-Level"]} />
          <Field label="Grade" value={posForm.grade} onChange={(v) => setPosForm({ ...posForm, grade: v })} />
          <Field label="Department" type="select" value={posForm.department_id} onChange={(v) => setPosForm({ ...posForm, department_id: Number(v) || null })} options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          <Field label="Headcount Budget" type="number" value={posForm.headcount_budget} onChange={(v) => setPosForm({ ...posForm, headcount_budget: Number(v) })} />
          <Field label="Status" type="select" value={posForm.status} onChange={(v) => setPosForm({ ...posForm, status: v })} options={["Active", "Inactive"]} />
        </div>
        <button onClick={savePos} className="mt-4 h-10 w-full rounded-lg bg-[#166534] text-sm font-semibold text-white">Save</button>
      </Modal>
    </div>
  );
};

// ──── Document Management ────

const DOC_TYPES = ["National ID Card", "Passport", "Family Book", "Birth Certificate", "CV / Resume", "Employment Contract", "Promotion Letter", "Transfer Letter", "Warning Letter", "Resignation Letter", "Bank Book", "Salary Adjustment Letter", "NDA", "Policy Acknowledgement", "Certificate", "Training Record"];
const DOC_STATUSES = ["Active", "Expired", "Archived"];

const emptyDocForm = () => ({
  user_id: "", doc_type: "", doc_name: "", doc_number: "",
  issue_date: "", expiry_date: "", status: "Active", remarks: "",
});
const docFields = ["user_id", "doc_type", "doc_name", "doc_number", "issue_date", "expiry_date", "file_path", "status", "remarks"];

const DocumentView = ({ documents, onRefresh }) => {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyDocForm());
  const [editingId, setEditingId] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  useEffect(() => {
    api.get("/api/hris/employees?limit=500").then(({ data }) => setEmployeeOptions(data || [])).catch(() => {});
  }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyDocForm()); setModal(true); };
  const openEdit = (r) => { setEditingId(r.id); setForm(r); setModal(true); };

  const save = async () => {
    const payload = normalizePayload(form, docFields, ["user_id"]);
    if (editingId) await api.put(`/api/employee-info/documents/${editingId}`, payload);
    else await api.post("/api/employee-info/documents", payload);
    setModal(false);
    onRefresh();
  };

  const columns = [
    { key: "employee_name", label: "Employee" },
    { key: "doc_type", label: "Type" },
    { key: "doc_name", label: "Name" },
    { key: "doc_number", label: "Number", render: (r) => r.doc_number || "-" },
    { key: "issue_date", label: "Issued", render: (r) => r.issue_date || "-" },
    { key: "expiry_date", label: "Expires", render: (r) => r.expiry_date || "-" },
    { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={openCreate} className="flex h-9 items-center gap-2 rounded-lg bg-[#166534] px-4 text-sm font-semibold text-white"><FiPlus className="h-4 w-4" /> Upload Document</button></div>
      <Table columns={columns} data={documents} onEdit={openEdit} onDelete={async (id) => { await api.delete(`/api/employee-info/documents/${id}`); onRefresh(); }} />
      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? "Edit Document" : "Upload Document"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee" type="select" value={form.user_id} onChange={(v) => setForm({ ...form, user_id: Number(v) })} options={employeeOptions.map((e) => ({ value: e.id, label: `${e.name} (${e.emp_code})` }))} />
          <Field label="Document Type" type="select" value={form.doc_type} onChange={(v) => setForm({ ...form, doc_type: v })} options={DOC_TYPES} />
          <Field label="Document Name" value={form.doc_name} onChange={(v) => setForm({ ...form, doc_name: v })} />
          <Field label="Document Number" value={form.doc_number} onChange={(v) => setForm({ ...form, doc_number: v })} />
          <Field label="Issue Date" type="date" value={form.issue_date} onChange={(v) => setForm({ ...form, issue_date: v })} />
          <Field label="Expiry Date" type="date" value={form.expiry_date} onChange={(v) => setForm({ ...form, expiry_date: v })} />
          <Field label="Status" type="select" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={DOC_STATUSES} />
          <div className="col-span-2"><Field label="Remarks" value={form.remarks} onChange={(v) => setForm({ ...form, remarks: v })} /></div>
        </div>
        <button onClick={save} className="mt-4 h-10 w-full rounded-lg bg-[#166534] text-sm font-semibold text-white">{editingId ? "Update" : "Upload"}</button>
      </Modal>
    </div>
  );
};

// ──── Main Page ────

const EmployeeInfoPage = () => {
  const location = useLocation();
  const initialTab = new URLSearchParams(location.search).get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState({});
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [employeeModal, setEmployeeModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm());

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab") || "dashboard";
    setActiveTab(tab);
  }, [location.search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "dashboard") {
        const { data } = await api.get("/api/employee-info/dashboard");
        setDashboard(data);
      } else if (activeTab === "personal" || activeTab === "profile") {
        const { data } = await api.get("/api/employee-info/employees");
        setEmployees(data || []);
      } else if (activeTab === "org-structure") {
        const [d, p] = await Promise.all([
          api.get("/api/employee-info/departments"),
          api.get("/api/employee-info/positions"),
        ]);
        setDepartments(d.data || []);
        setPositions(p.data || []);
      } else if (activeTab === "documents") {
        const { data } = await api.get("/api/employee-info/documents");
        setDocuments(data || []);
      }
    } catch { } finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreateEmployee = () => {
    setEmployeeForm(emptyEmployeeForm());
    setEmployeeModal(true);
  };

  const createEmployee = async () => {
    await api.post(
      "/api/hris/employees/new",
      normalizePayload(employeeForm, createEmployeeFields, ["basic_salary"])
    );
    setEmployeeModal(false);
    loadData();
  };

  const dashboardCards = [
    { icon: FiUsers, label: "Total Employees", value: dashboard.total_employees, tone: "bg-emerald-600 text-white" },
    { icon: FiUser, label: "Male", value: dashboard.male_count, tone: "bg-blue-600 text-white" },
    { icon: FiUser, label: "Female", value: dashboard.female_count, tone: "bg-rose-600 text-white" },
    { icon: FiUserCheck, label: "Active", value: dashboard.active_employees, tone: "bg-teal-600 text-white" },
    { icon: FiFolder, label: "Departments", value: dashboard.total_departments, tone: "bg-purple-600 text-white" },
    { icon: FiUserCheck, label: "Positions", value: dashboard.total_positions, tone: "bg-indigo-600 text-white" },
    { icon: FiFileText, label: "Documents", value: dashboard.total_documents, tone: "bg-amber-600 text-white" },
    { icon: FiAlertCircle, label: "Expired Docs", value: dashboard.expired_documents, tone: "bg-red-600 text-white" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f5f7fb] px-4 py-5 md:px-6">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-[#111827]">
            Employee Information Management
            {activeTab !== "dashboard" && (
              <span className="ml-2 text-lg font-semibold text-[#6B7280]">/ {tabs.find((t) => t.id === activeTab)?.label}</span>
            )}
          </h1>
          {(activeTab === "personal" || activeTab === "profile") && (
            <button onClick={openCreateEmployee} className="flex h-10 items-center gap-2 rounded-lg bg-[#166534] px-4 text-sm font-semibold text-white hover:bg-[#145226]">
              <FiPlus className="h-4 w-4" /> Add Employee
            </button>
          )}
        </div>
        <div className="flex gap-0 overflow-x-auto border-b border-slate-200">
          {tabs.map((tab) => (
            <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); window.history.replaceState(null, "", `?tab=${tab.id}`); }}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </TabButton>
          ))}
        </div>
        {loading && <p className="text-sm text-[#6B7280]">Loading...</p>}
        {!loading && activeTab === "dashboard" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dashboardCards.map((c, i) => <DashboardStatCard key={i} {...c} />)}
          </div>
        )}
        {!loading && activeTab === "personal" && <PersonalInfoView employees={employees} onRefresh={loadData} />}
        {!loading && activeTab === "profile" && <MasterProfileView employees={employees} onRefresh={loadData} />}
        {!loading && activeTab === "org-structure" && <OrgStructureView departments={departments} positions={positions} onRefresh={loadData} />}
        {!loading && activeTab === "documents" && <DocumentView documents={documents} onRefresh={loadData} />}
        <Modal open={employeeModal} onClose={() => setEmployeeModal(false)} title="Add Employee">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required value={employeeForm.first_name} onChange={(v) => setEmployeeForm({ ...employeeForm, first_name: v })} />
            <Field label="Last Name" required value={employeeForm.last_name} onChange={(v) => setEmployeeForm({ ...employeeForm, last_name: v })} />
            <Field label="Email" required type="email" value={employeeForm.email} onChange={(v) => setEmployeeForm({ ...employeeForm, email: v })} />
            <Field label="Temporary Password" required type="password" value={employeeForm.password} onChange={(v) => setEmployeeForm({ ...employeeForm, password: v })} />
            <Field label="Role" type="select" value={employeeForm.role} onChange={(v) => setEmployeeForm({ ...employeeForm, role: v })} options={[
              { value: "staff", label: "Staff" },
              { value: "line_manager", label: "Line Manager" },
              { value: "department_head", label: "Department Head" },
              { value: "management_hr", label: "Management HR" },
              { value: "payroll_officer", label: "Payroll Officer" },
              { value: "admin", label: "Admin" },
            ]} />
            <Field label="Department" value={employeeForm.department} onChange={(v) => setEmployeeForm({ ...employeeForm, department: v })} />
            <Field label="Phone" value={employeeForm.phone} onChange={(v) => setEmployeeForm({ ...employeeForm, phone: v })} />
            <Field label="Position" value={employeeForm.position} onChange={(v) => setEmployeeForm({ ...employeeForm, position: v })} />
            <Field label="Contract Type" type="select" value={employeeForm.contract_type} onChange={(v) => setEmployeeForm({ ...employeeForm, contract_type: v })} options={EMPLOYMENT_TYPES} />
            <Field label="Employment Status" type="select" value={employeeForm.status} onChange={(v) => setEmployeeForm({ ...employeeForm, status: v })} options={EMPLOYMENT_STATUSES} />
            <Field label="Contract Start" type="date" value={employeeForm.contract_start_date} onChange={(v) => setEmployeeForm({ ...employeeForm, contract_start_date: v })} />
            <Field label="Basic Salary" type="number" value={employeeForm.basic_salary} onChange={(v) => setEmployeeForm({ ...employeeForm, basic_salary: v })} />
            <div className="col-span-2"><Field label="Address" value={employeeForm.address} onChange={(v) => setEmployeeForm({ ...employeeForm, address: v })} /></div>
          </div>
          <button onClick={createEmployee} className="mt-4 h-10 w-full rounded-lg bg-[#166534] text-sm font-semibold text-white hover:bg-[#145226]">Create Employee</button>
        </Modal>
      </div>
    </div>
  );
};

export default EmployeeInfoPage;
