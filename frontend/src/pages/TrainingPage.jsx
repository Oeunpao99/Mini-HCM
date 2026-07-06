import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiEdit2,
  FiList,
  FiPlus,
  FiTrash2,
  FiTrendingUp,
  FiUserCheck,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Field, inputClass, money } from "./hris/HrisCommon";

const TRAINING_CATEGORIES = ["Orientation", "Technical", "Soft Skill", "Compliance", "Leadership"];
const TRAINING_TYPES = ["Internal", "External", "Online", "Classroom", "Workshop", "Seminar"];
const TRAINING_PLAN_STATUSES = ["Draft", "Pending", "Approved", "Rejected"];
const TRAINING_STATUSES = ["Planned", "Ongoing", "Completed", "Cancelled"];
const ATTENDANCE_STATUSES = ["Present", "Absent", "Completed", "Incomplete"];
const COMPLETION_STATUSES = ["Completed", "Not Completed", "In Progress"];
const ASSESSMENT_RESULTS = ["Pass", "Fail", "Not Applicable"];
const RECORD_STATUSES = ["Draft", "Approved", "Rejected"];
const ASSESSMENT_TYPES = ["Annual", "Probation", "Promotion", "Ad-hoc"];
const COMPETENCY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const ASSESSMENT_STATUSES = ["Draft", "Submitted", "In Review", "Approved", "Rejected", "Completed"];

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-10 pb-10">
      <div className="relative w-4/5 max-w-5xl rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const emptyPlanForm = () => ({
  title: "", category: "Technical", training_type: "Internal", training_year: new Date().getFullYear(),
  objective: "", department: "", position: "", employee_id: "",
  planned_start_date: "", planned_end_date: "", trainer: "", venue: "",
  estimated_cost: "", actual_cost: "", approval_status: "Draft", training_status: "Planned", remarks: "",
});

const emptyRecordForm = () => ({
  user_id: "", plan_id: "", title: "", training_type: "Internal", category: "Technical",
  provider: "", training_date: "", end_date: "", duration: "", training_method: "Classroom",
  attendance_status: "", completion_status: "In Progress", assessment_result: "Not Applicable",
  score: "", skills_gained: "", certification: "", related_kpi_id: "", related_job_role: "",
  certificate_file: "", feedback_file: "", verified_by: "", status: "Draft", remarks: "",
});

const emptyAssessmentForm = () => ({
  user_id: "", assessment_type: "Annual", assessment_period_start: "", assessment_period_end: "",
  assessor_id: "", assessment_date: "", competency_model: "", technical_skills: "", soft_skills: "",
  behavioral_competency: "", technical_score: "0", soft_skills_score: "0", behavioral_score: "0",
  strengths: "", improvement_areas: "", development_needs: "", training_recommendation_id: "",
  coaching_required: "No", career_path_suggestion: "", approval_status: "Draft", remarks: "",
});

const TrainingPage = () => {
  const { userId } = useAuth();
  const location = useLocation();
  const initialTab = new URLSearchParams(location.search).get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tabFromUrl = new URLSearchParams(location.search).get("tab") || "dashboard";
    setActiveTab(tabFromUrl);
  }, [location.search]);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [records, setRecords] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      const { data } = await api.get("/api/hris/employees?limit=500");
      setEmployees(data || []);
    } catch { }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "dashboard") {
        const { data } = await api.get("/api/hris/training/dashboard");
        setDashboard(data);
      } else if (activeTab === "plans") {
        const { data } = await api.get("/api/hris/training-plans");
        setPlans(data || []);
      } else if (activeTab === "records") {
        const [recordsRes, plansRes] = await Promise.all([
          api.get("/api/hris/training-records"),
          api.get("/api/hris/training-plans"),
        ]);
        setRecords(recordsRes.data || []);
        setPlans(plansRes.data || []);
      } else if (activeTab === "competency") {
        const { data } = await api.get("/api/hris/competency-assessments");
        setAssessments(data || []);
      }
    } catch { } finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const openCreate = (type) => {
    setEditingId(null);
    if (type === "plan") setForm(emptyPlanForm());
    else if (type === "record") setForm(emptyRecordForm());
    else setForm(emptyAssessmentForm());
    setModal(type);
  };

  const openEdit = (type, row) => {
    setEditingId(row.id);
    const f = { ...row };
    Object.keys(f).forEach((k) => { if (f[k] === null || f[k] === undefined) f[k] = ""; });
    setForm(f);
    setModal(type);
  };

  const normalize = (obj, fields) => {
    const out = { ...obj };
    fields.forEach((f) => { if (out[f] === "") out[f] = null; });
    return out;
  };

  const handleSave = async (type) => {
    setSaving(true);
    try {
      if (type === "plan") {
        if (!form.title || !form.objective || !form.planned_start_date || !form.planned_end_date) {
          alert("Title, Objective, Start Date, and End Date are required.");
          return;
        }
        const payload = normalize(form, ["employee_id", "estimated_cost", "actual_cost"]);
        if (editingId) {
          const { data } = await api.put(`/api/hris/training-plans/${editingId}`, payload);
          setPlans((prev) => prev.map((p) => (p.id === editingId ? data : p)));
        } else {
          const { data } = await api.post("/api/hris/training-plans", payload);
          setPlans((prev) => [data, ...prev]);
        }
      } else if (type === "record") {
        if (!form.user_id || !form.title || !form.training_date) {
          alert("Employee, Title, and Training Date are required.");
          return;
        }
        const payload = normalize(form, ["plan_id", "duration", "score", "related_kpi_id", "verified_by"]);
        payload.user_id = Number(payload.user_id);
        if (editingId) {
          const { data } = await api.put(`/api/hris/training-records/${editingId}`, payload);
          setRecords((prev) => prev.map((r) => (r.id === editingId ? data : r)));
        } else {
          const { data } = await api.post("/api/hris/training-records", payload);
          setRecords((prev) => [data, ...prev]);
        }
      } else if (type === "competency") {
        if (!form.user_id || !form.assessor_id || !form.assessment_date) {
          alert("Employee, Assessor, and Assessment Date are required.");
          return;
        }
        const payload = normalize(form, ["training_recommendation_id"]);
        payload.user_id = Number(payload.user_id);
        payload.assessor_id = Number(payload.assessor_id);
        if (editingId) {
          const { data } = await api.put(`/api/hris/competency-assessments/${editingId}`, payload);
          setAssessments((prev) => prev.map((a) => (a.id === editingId ? data : a)));
        } else {
          const { data } = await api.post("/api/hris/competency-assessments", payload);
          setAssessments((prev) => [data, ...prev]);
        }
      }
      setModal(null);
    } catch (err) {
      alert(err?.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };

  const handleDelete = async (type, id) => {
    if (!confirm("Delete this item?")) return;
    try {
      if (type === "plan") {
        await api.delete(`/api/hris/training-plans/${id}`);
        setPlans((prev) => prev.filter((p) => p.id !== id));
      } else if (type === "record") {
        await api.delete(`/api/hris/training-records/${id}`);
        setRecords((prev) => prev.filter((r) => r.id !== id));
      } else if (type === "competency") {
        await api.delete(`/api/hris/competency-assessments/${id}`);
        setAssessments((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      alert(err?.response?.data?.detail || "Delete failed");
    }
  };

  const updateForm = (updates) => setForm((prev) => ({ ...prev, ...updates }));

  const employeeOptions = employees.map((e) => (
    <option key={e.user_id || e.id} value={e.user_id || e.id}>{e.name} ({e.emp_code})</option>
  ));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f5f7fb] px-4 py-5 md:px-6">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Training & Development
            {activeTab !== "dashboard" && (
              <span className="ml-2 text-lg font-semibold text-slate-500">
                / {activeTab === "plans" ? "Training Plans" : activeTab === "records" ? "Training Records" : "Competency Assessment"}
              </span>
            )}
          </h1>
          <div className="flex gap-2">
            {activeTab !== "dashboard" && (
              <button
                onClick={() => openCreate(activeTab === "plans" ? "plan" : activeTab === "records" ? "record" : "competency")}
                className="flex h-10 items-center gap-2 rounded-lg bg-[#166432] px-4 text-sm font-bold text-white shadow hover:bg-[#1a7a3e]"
              >
                <FiPlus className="h-4 w-4" /> Add New
              </button>
            )}
          </div>
        </div>



        {activeTab === "dashboard" && (
          <DashboardView dashboard={dashboard} loading={loading} />
        )}

        {activeTab === "plans" && (
          <PlansView plans={plans} loading={loading} onEdit={(r) => openEdit("plan", r)} onDelete={(id) => handleDelete("plan", id)} />
        )}

        {activeTab === "records" && (
          <RecordsView records={records} loading={loading} onEdit={(r) => openEdit("record", r)} onDelete={(id) => handleDelete("record", id)} />
        )}

        {activeTab === "competency" && (
          <CompetencyView assessments={assessments} loading={loading} onEdit={(r) => openEdit("competency", r)} onDelete={(id) => handleDelete("competency", id)} />
        )}

        <Modal open={modal === "plan"} onClose={() => setModal(null)} title={editingId ? "Edit Training Plan" : "New Training Plan"}>
          <PlanForm form={form} onChange={updateForm} employees={employees} onSave={() => handleSave("plan")} saving={saving} editingId={editingId} />
        </Modal>

        <Modal open={modal === "record"} onClose={() => setModal(null)} title={editingId ? "Edit Training Record" : "New Training Record"}>
          <RecordForm form={form} onChange={updateForm} employeeOptions={employeeOptions} employees={employees} plans={plans} onSave={() => handleSave("record")} saving={saving} editingId={editingId} />
        </Modal>

        <Modal open={modal === "competency"} onClose={() => setModal(null)} title={editingId ? "Edit Competency Assessment" : "New Competency Assessment"}>
          <AssessmentForm form={form} onChange={updateForm} employeeOptions={employeeOptions} employees={employees} onSave={() => handleSave("competency")} saving={saving} editingId={editingId} />
        </Modal>
      </div>
    </div>
  );
};

const DashboardStatCard = ({ label, value, helper, icon: Icon, tone }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-4">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-[#111b4f]">{label}</p>
        <p className="mt-1 text-3xl font-extrabold leading-none text-[#111b4f]">{value}</p>
        {helper && <p className="mt-1 text-sm font-extrabold text-slate-500">{helper}</p>}
      </div>
    </div>
  </div>
);

const DashboardView = ({ dashboard, loading }) => {
  if (loading || !dashboard) {
    return <div className="mt-10 text-center text-sm font-bold text-slate-400">Loading dashboard...</div>;
  }
  const widgets = [
    { label: "Annual Training Plan", value: dashboard.total_plans, icon: FiBookOpen, tone: "bg-blue-600 text-white" },
    { label: "Active Programs", value: dashboard.ongoing, icon: FiClock, tone: "bg-amber-500 text-white" },
    { label: "Completed Training", value: dashboard.completed, icon: FiCheckCircle, tone: "bg-emerald-600 text-white" },
    { label: "Pending Approval", value: dashboard.pending_approval, icon: FiUserCheck, tone: "bg-violet-600 text-white" },
    { label: "Participants", value: dashboard.participants, icon: FiUserPlus, tone: "bg-cyan-600 text-white" },
    { label: "Est. Budget", value: `$${Number(dashboard.budget_estimated || 0).toLocaleString()}`, icon: FiDollarSign, tone: "bg-indigo-600 text-white" },
    { label: "Actual Cost", value: `$${Number(dashboard.budget_actual || 0).toLocaleString()}`, icon: FiDollarSign, tone: "bg-rose-600 text-white" },
    { label: "Upcoming", value: dashboard.upcoming, icon: FiTrendingUp, tone: "bg-teal-600 text-white" },
  ];

  const COLORS = ["#166432", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];
  const deptData = dashboard.by_department || [];
  const budgetData = [
    { name: "Estimated", value: parseFloat(dashboard.budget_estimated || 0) },
    { name: "Actual", value: parseFloat(dashboard.budget_actual || 0) },
  ];
  const statusData = [
    { name: "Planned", value: dashboard.total_plans - dashboard.ongoing - dashboard.completed || 0 },
    { name: "Ongoing", value: dashboard.ongoing },
    { name: "Completed", value: dashboard.completed },
  ];

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {widgets.map((w) => (
          <DashboardStatCard key={w.label} label={w.label} value={w.value} icon={w.icon} tone={w.tone} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {deptData.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-lg font-extrabold text-[#111b4f]">Training by Department</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deptData} dataKey="count" nameKey="department" cx="50%" cy="50%" outerRadius={80} innerRadius={50} label={({ department, count }) => `${department}: ${count}`}>
                    {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-extrabold text-[#111b4f]">Budget Overview</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: "#111b4f" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  <Cell fill="#166432" />
                  <Cell fill="#ef4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-extrabold text-[#111b4f]">Training Status</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={[COLORS[0], COLORS[2], COLORS[1]][i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status, mapping }) => {
  const colorMap = {
    blue: "bg-blue-100 text-blue-700", green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700", red: "bg-red-100 text-red-700",
    violet: "bg-violet-100 text-violet-700", slate: "bg-slate-100 text-slate-600",
    cyan: "bg-cyan-100 text-cyan-700",
  };
  const color = mapping?.[status] || "slate";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${colorMap[color]}`}>
      {status}
    </span>
  );
};

const PlanStatusBadge = ({ status }) => {
  const m = { Draft: "slate", Pending: "amber", Approved: "green", Rejected: "red", Planned: "blue", Ongoing: "cyan", Completed: "green", Cancelled: "red" };
  return <StatusBadge status={status} mapping={m} />;
};

const RecordStatusBadge = ({ status }) => {
  const m = { Draft: "slate", Approved: "green", Rejected: "red", Completed: "green", "In Progress": "amber", "Not Completed": "red" };
  return <StatusBadge status={status} mapping={m} />;
};

const AssessmentStatusBadge = ({ status }) => {
  const m = { Draft: "slate", Submitted: "blue", "In Review": "amber", Approved: "green", Rejected: "red", Completed: "cyan" };
  return <StatusBadge status={status} mapping={m} />;
};

const CompetencyLevelBadge = ({ level }) => {
  const m = { Beginner: "red", Intermediate: "amber", Advanced: "blue", Expert: "violet" };
  return <StatusBadge status={level} mapping={m} />;
};

const ActionButtons = ({ onEdit, onDelete }) => (
  <div className="flex items-center gap-1">
    <button onClick={onEdit} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Edit">
      <FiEdit2 className="h-4 w-4" />
    </button>
    <button onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Delete">
      <FiTrash2 className="h-4 w-4" />
    </button>
  </div>
);

const TableHeader = ({ children }) => (
  <thead className="bg-slate-50 text-xs font-extrabold uppercase text-slate-500">
    <tr>{children}</tr>
  </thead>
);

const TableHeaderCell = ({ children }) => (
  <th className="whitespace-nowrap px-4 py-3 text-left">{children}</th>
);

const TableCell = ({ children, className = "" }) => (
  <td className={`whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700 ${className}`}>{children}</td>
);

const numberValue = (value) => Number(value || 0);

const countBy = (rows, key, fallback = "Unassigned") => {
  const counts = rows.reduce((acc, row) => {
    const label = row[key] || fallback;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
};

const PlanOverviewCard = ({ label, value, helper, icon: Icon, tone }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-extrabold leading-none text-[#111b4f]">{value}</p>
        {helper && <p className="mt-1 text-xs font-bold text-slate-500">{helper}</p>}
      </div>
    </div>
  </div>
);

const PlansOverview = ({ plans }) => {
  const totalPlans = plans.length;
  const approved = plans.filter((plan) => plan.approval_status === "Approved").length;
  const pending = plans.filter((plan) => plan.approval_status === "Pending").length;
  const completed = plans.filter((plan) => plan.training_status === "Completed").length;
  const active = plans.filter((plan) => ["Planned", "Ongoing"].includes(plan.training_status)).length;
  const estimatedCost = plans.reduce((sum, plan) => sum + numberValue(plan.estimated_cost), 0);
  const actualCost = plans.reduce((sum, plan) => sum + numberValue(plan.actual_cost), 0);
  const completionRate = totalPlans ? Math.round((completed / totalPlans) * 100) : 0;
  const approvedRate = totalPlans ? Math.round((approved / totalPlans) * 100) : 0;
  const statusData = countBy(plans, "training_status", "No Status");
  const categoryData = countBy(plans, "category", "Other");
  const costData = [
    { name: "Estimated", value: estimatedCost },
    { name: "Actual", value: actualCost },
  ];
  const COLORS = ["#166432", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

  const cards = [
    { label: "Total Plans", value: totalPlans, helper: `${approvedRate}% approved`, icon: FiBookOpen, tone: "bg-blue-600 text-white" },
    { label: "Active Plans", value: active, helper: "Planned or ongoing", icon: FiClock, tone: "bg-amber-500 text-white" },
    { label: "Completed", value: completed, helper: `${completionRate}% complete`, icon: FiCheckCircle, tone: "bg-emerald-600 text-white" },
    { label: "Pending Approval", value: pending, helper: "Needs review", icon: FiUserCheck, tone: "bg-violet-600 text-white" },
    { label: "Estimated Cost", value: `$${estimatedCost.toLocaleString()}`, helper: "Planned budget", icon: FiDollarSign, tone: "bg-cyan-600 text-white" },
    { label: "Actual Cost", value: `$${actualCost.toLocaleString()}`, helper: "Recorded spend", icon: FiTrendingUp, tone: "bg-rose-600 text-white" },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <PlanOverviewCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-extrabold text-[#111b4f]">Plan Status</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72} label={({ name, count }) => `${name}: ${count}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-extrabold text-[#111b4f]">Plan Categories</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#166432" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-extrabold text-[#111b4f]">Budget Overview</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: "#334155" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  <Cell fill="#166432" />
                  <Cell fill="#dc2626" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlansView = ({ plans, loading, onEdit, onDelete }) => (
  <div className="mt-4 grid gap-4">
    <PlansOverview plans={plans} />
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1400px] text-left text-sm">
        <TableHeader>
          <TableHeaderCell>Plan ID</TableHeaderCell>
          <TableHeaderCell>Title</TableHeaderCell>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Year</TableHeaderCell>
          <TableHeaderCell>Dept</TableHeaderCell>
          <TableHeaderCell>Start</TableHeaderCell>
          <TableHeaderCell>End</TableHeaderCell>
          <TableHeaderCell>Est. Cost</TableHeaderCell>
          <TableHeaderCell>Approval</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell className="text-center">Actions</TableHeaderCell>
        </TableHeader>
        <tbody>
          {plans.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
              <TableCell>{row.plan_id}</TableCell>
              <TableCell className="max-w-[200px] truncate font-extrabold text-slate-900">{row.title}</TableCell>
              <TableCell><span className="text-xs">{row.category}</span></TableCell>
              <TableCell>{row.training_type}</TableCell>
              <TableCell>{row.training_year}</TableCell>
              <TableCell>{row.department || "-"}</TableCell>
              <TableCell>{row.planned_start_date}</TableCell>
              <TableCell>{row.planned_end_date}</TableCell>
              <TableCell>{row.estimated_cost ? `$${money(row.estimated_cost)}` : "-"}</TableCell>
              <TableCell><PlanStatusBadge status={row.approval_status} /></TableCell>
              <TableCell><PlanStatusBadge status={row.training_status} /></TableCell>
              <TableCell className="text-center"><ActionButtons onEdit={() => onEdit(row)} onDelete={() => onDelete(row.id)} /></TableCell>
            </tr>
          ))}
          {!plans.length && (
            <tr><td colSpan={12} className="px-4 py-10 text-center text-sm font-bold text-slate-400">{loading ? "Loading..." : "No training plans found."}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const RecordsOverview = ({ records }) => {
  const totalRecords = records.length;
  const completed = records.filter((record) => record.completion_status === "Completed").length;
  const inProgress = records.filter((record) => record.completion_status === "In Progress").length;
  const present = records.filter((record) => ["Present", "Completed"].includes(record.attendance_status)).length;
  const certified = records.filter((record) => record.certification === "Yes").length;
  const scoredRecords = records.filter((record) => record.score !== null && record.score !== undefined && record.score !== "");
  const averageScore = scoredRecords.length
    ? Math.round(scoredRecords.reduce((sum, record) => sum + numberValue(record.score), 0) / scoredRecords.length)
    : 0;
  const completionRate = totalRecords ? Math.round((completed / totalRecords) * 100) : 0;
  const attendanceRate = totalRecords ? Math.round((present / totalRecords) * 100) : 0;
  const completionData = countBy(records, "completion_status", "No Status");
  const categoryData = countBy(records, "category", "Other");
  const attendanceData = countBy(records, "attendance_status", "No Status");
  const COLORS = ["#166432", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

  const cards = [
    { label: "Total Records", value: totalRecords, helper: "Employee training logs", icon: FiList, tone: "bg-blue-600 text-white" },
    { label: "Completed", value: completed, helper: `${completionRate}% complete`, icon: FiCheckCircle, tone: "bg-emerald-600 text-white" },
    { label: "In Progress", value: inProgress, helper: "Still learning", icon: FiClock, tone: "bg-amber-500 text-white" },
    { label: "Attendance", value: `${attendanceRate}%`, helper: `${present} attended`, icon: FiUserCheck, tone: "bg-cyan-600 text-white" },
    { label: "Avg. Score", value: `${averageScore}%`, helper: `${scoredRecords.length} scored`, icon: FiTrendingUp, tone: "bg-violet-600 text-white" },
    { label: "Certified", value: certified, helper: "Certificates issued", icon: FiBookOpen, tone: "bg-rose-600 text-white" },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <PlanOverviewCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-extrabold text-[#111b4f]">Completion Status</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={completionData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72} label={({ name, count }) => `${name}: ${count}`}>
                  {completionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-extrabold text-[#111b4f]">Records by Category</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#166432" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-extrabold text-[#111b4f]">Attendance Status</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecordsView = ({ records, loading, onEdit, onDelete }) => (
  <div className="mt-4 grid gap-4">
    <RecordsOverview records={records} />
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[3200px] text-left text-sm">
        <TableHeader>
          <TableHeaderCell>Employee ID</TableHeaderCell>
          <TableHeaderCell>Employee Name</TableHeaderCell>
          <TableHeaderCell>Department</TableHeaderCell>
          <TableHeaderCell>Position</TableHeaderCell>
          <TableHeaderCell>Training ID</TableHeaderCell>
          <TableHeaderCell>Training Title</TableHeaderCell>
          <TableHeaderCell>Training Type</TableHeaderCell>
          <TableHeaderCell>Training Category</TableHeaderCell>
          <TableHeaderCell>Training Provider</TableHeaderCell>
          <TableHeaderCell>Training Date</TableHeaderCell>
          <TableHeaderCell>Training Duration (Days)</TableHeaderCell>
          <TableHeaderCell>Training Method</TableHeaderCell>
          <TableHeaderCell>Attendance Status</TableHeaderCell>
          <TableHeaderCell>Completion Status</TableHeaderCell>
          <TableHeaderCell>Assessment Result</TableHeaderCell>
          <TableHeaderCell>Score</TableHeaderCell>
          <TableHeaderCell>Skills Gained</TableHeaderCell>
          <TableHeaderCell>Certification</TableHeaderCell>
          <TableHeaderCell>Related KPI</TableHeaderCell>
          <TableHeaderCell>Related Job Role</TableHeaderCell>
          <TableHeaderCell>Certificate Upload</TableHeaderCell>
          <TableHeaderCell>Feedback Form</TableHeaderCell>
          <TableHeaderCell>Verified By</TableHeaderCell>
          <TableHeaderCell>Approval Status</TableHeaderCell>
          <TableHeaderCell>Remarks</TableHeaderCell>
          <TableHeaderCell className="text-center">Actions</TableHeaderCell>
        </TableHeader>
        <tbody>
          {records.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
              <TableCell className="font-extrabold text-[#111b4f]">{row.employee_id || row.user_id || "-"}</TableCell>
              <TableCell className="font-extrabold text-slate-900">{row.employee_name}</TableCell>
              <TableCell>{row.department || "-"}</TableCell>
              <TableCell>{row.position || "-"}</TableCell>
              <TableCell className="font-extrabold text-[#111b4f]">{row.training_id || row.plan_id || "-"}</TableCell>
              <TableCell className="max-w-[200px] truncate">{row.title}</TableCell>
              <TableCell>{row.training_type || "-"}</TableCell>
              <TableCell>{row.category || "-"}</TableCell>
              <TableCell>{row.provider || "-"}</TableCell>
              <TableCell>{row.training_date}</TableCell>
              <TableCell>{row.duration != null ? `${row.duration} ${Number(row.duration) === 1 ? "day" : "days"}` : "-"}</TableCell>
              <TableCell>{row.training_method || "-"}</TableCell>
              <TableCell><RecordStatusBadge status={row.attendance_status || "N/A"} /></TableCell>
              <TableCell><RecordStatusBadge status={row.completion_status || "N/A"} /></TableCell>
              <TableCell>{row.assessment_result || "-"}</TableCell>
              <TableCell>{row.score != null ? `${row.score}%` : "-"}</TableCell>
              <TableCell className="max-w-[220px] truncate">{row.skills_gained || "-"}</TableCell>
              <TableCell>{row.certification || "-"}</TableCell>
              <TableCell>{row.related_kpi_id || "-"}</TableCell>
              <TableCell>{row.related_job_role || "-"}</TableCell>
              <TableCell className="max-w-[180px] truncate">{row.certificate_file || "-"}</TableCell>
              <TableCell className="max-w-[180px] truncate">{row.feedback_file || "-"}</TableCell>
              <TableCell>{row.verifier_name || row.verified_by || "-"}</TableCell>
              <TableCell><RecordStatusBadge status={row.status} /></TableCell>
              <TableCell className="max-w-[220px] truncate">{row.remarks || "-"}</TableCell>
              <TableCell className="text-center"><ActionButtons onEdit={() => onEdit(row)} onDelete={() => onDelete(row.id)} /></TableCell>
            </tr>
          ))}
          {!records.length && (
            <tr><td colSpan={26} className="px-4 py-10 text-center text-sm font-bold text-slate-400">{loading ? "Loading..." : "No training records found."}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const CompetencyOverview = ({ assessments }) => {
  const totalAssessments = assessments.length;
  const approved = assessments.filter((assessment) => assessment.approval_status === "Approved").length;
  const inReview = assessments.filter((assessment) => ["Submitted", "In Review"].includes(assessment.approval_status)).length;
  const advancedOrExpert = assessments.filter((assessment) => ["Advanced", "Expert"].includes(assessment.competency_level)).length;
  const coachingRequired = assessments.filter((assessment) => assessment.coaching_required === "Yes").length;
  const scoredAssessments = assessments.filter((assessment) => assessment.overall_score !== null && assessment.overall_score !== undefined && assessment.overall_score !== "");
  const averageOverall = scoredAssessments.length
    ? Math.round(scoredAssessments.reduce((sum, assessment) => sum + numberValue(assessment.overall_score), 0) / scoredAssessments.length)
    : 0;
  const approvalRate = totalAssessments ? Math.round((approved / totalAssessments) * 100) : 0;
  const advancedRate = totalAssessments ? Math.round((advancedOrExpert / totalAssessments) * 100) : 0;
  const statusData = countBy(assessments, "approval_status", "No Status");
  const levelData = countBy(assessments, "competency_level", "Unrated");
  const typeData = countBy(assessments, "assessment_type", "Other");
  const COLORS = ["#166432", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

  const cards = [
    { label: "Assessments", value: totalAssessments, helper: `${approvalRate}% approved`, icon: FiList, tone: "bg-blue-600 text-white" },
    { label: "Avg. Overall", value: `${averageOverall}%`, helper: `${scoredAssessments.length} scored`, icon: FiTrendingUp, tone: "bg-emerald-600 text-white" },
    { label: "In Review", value: inReview, helper: "Submitted or review", icon: FiClock, tone: "bg-amber-500 text-white" },
    { label: "Advanced+", value: advancedOrExpert, helper: `${advancedRate}% of assessments`, icon: FiCheckCircle, tone: "bg-violet-600 text-white" },
    { label: "Coaching", value: coachingRequired, helper: "Needs coaching", icon: FiUserCheck, tone: "bg-cyan-600 text-white" },
    { label: "Approved", value: approved, helper: "Finalized reviews", icon: FiUserPlus, tone: "bg-rose-600 text-white" },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <PlanOverviewCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-extrabold text-[#111b4f]">Assessment Status</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72} label={({ name, count }) => `${name}: ${count}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-extrabold text-[#111b4f]">Competency Level</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#166432" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-extrabold text-[#111b4f]">Assessment Type</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompetencyView = ({ assessments, loading, onEdit, onDelete }) => (
  <div className="mt-4 grid gap-4">
    <CompetencyOverview assessments={assessments} />
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[3400px] text-left text-sm">
        <TableHeader>
          <TableHeaderCell>Employee ID</TableHeaderCell>
          <TableHeaderCell>Employee Name</TableHeaderCell>
          <TableHeaderCell>Department</TableHeaderCell>
          <TableHeaderCell>Position</TableHeaderCell>
          <TableHeaderCell>Assessment ID</TableHeaderCell>
          <TableHeaderCell>Assessment Type</TableHeaderCell>
          <TableHeaderCell>Assessment Period</TableHeaderCell>
          <TableHeaderCell>Assessor</TableHeaderCell>
          <TableHeaderCell>Assessment Date</TableHeaderCell>
          <TableHeaderCell>Job Competency Model</TableHeaderCell>
          <TableHeaderCell>Technical Skills</TableHeaderCell>
          <TableHeaderCell>Soft Skills</TableHeaderCell>
          <TableHeaderCell>Behavioral Competency</TableHeaderCell>
          <TableHeaderCell>Technical Score</TableHeaderCell>
          <TableHeaderCell>Soft Skills Score</TableHeaderCell>
          <TableHeaderCell>Behavioral Score</TableHeaderCell>
          <TableHeaderCell>Overall Score</TableHeaderCell>
          <TableHeaderCell>Competency Level</TableHeaderCell>
          <TableHeaderCell>Strengths</TableHeaderCell>
          <TableHeaderCell>Improvement Areas</TableHeaderCell>
          <TableHeaderCell>Development Needs</TableHeaderCell>
          <TableHeaderCell>Training Recommendation</TableHeaderCell>
          <TableHeaderCell>Coaching Required</TableHeaderCell>
          <TableHeaderCell>Career Path Suggestion</TableHeaderCell>
          <TableHeaderCell>Verified By</TableHeaderCell>
          <TableHeaderCell>Approval Status</TableHeaderCell>
          <TableHeaderCell>Remarks</TableHeaderCell>
          <TableHeaderCell className="text-center">Actions</TableHeaderCell>
        </TableHeader>
        <tbody>
          {assessments.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
              <TableCell className="font-extrabold text-[#111b4f]">{row.employee_id || row.user_id || "-"}</TableCell>
              <TableCell className="font-extrabold text-slate-900">{row.employee_name}</TableCell>
              <TableCell>{row.department || "-"}</TableCell>
              <TableCell>{row.position || "-"}</TableCell>
              <TableCell className="font-extrabold text-[#111b4f]">{row.assessment_id || row.id}</TableCell>
              <TableCell>{row.assessment_type}</TableCell>
              <TableCell>{row.assessment_period_start} ~ {row.assessment_period_end}</TableCell>
              <TableCell>{row.assessor_name || "-"}</TableCell>
              <TableCell>{row.assessment_date}</TableCell>
              <TableCell className="max-w-[200px] truncate">{row.competency_model || "-"}</TableCell>
              <TableCell className="max-w-[220px] truncate">{row.technical_skills || "-"}</TableCell>
              <TableCell className="max-w-[220px] truncate">{row.soft_skills || "-"}</TableCell>
              <TableCell className="max-w-[220px] truncate">{row.behavioral_competency || "-"}</TableCell>
              <TableCell>{row.technical_score}</TableCell>
              <TableCell>{row.soft_skills_score}</TableCell>
              <TableCell>{row.behavioral_score}</TableCell>
              <TableCell className="font-extrabold">{row.overall_score ?? "-"}</TableCell>
              <TableCell><CompetencyLevelBadge level={row.competency_level} /></TableCell>
              <TableCell className="max-w-[220px] truncate">{row.strengths || "-"}</TableCell>
              <TableCell className="max-w-[220px] truncate">{row.improvement_areas || "-"}</TableCell>
              <TableCell className="max-w-[220px] truncate">{row.development_needs || "-"}</TableCell>
              <TableCell>{row.training_recommendation || row.training_recommendation_id || "-"}</TableCell>
              <TableCell>{row.coaching_required || "-"}</TableCell>
              <TableCell className="max-w-[240px] truncate">{row.career_path_suggestion || "-"}</TableCell>
              <TableCell>{row.verifier_name || row.verified_by || "-"}</TableCell>
              <TableCell><AssessmentStatusBadge status={row.approval_status} /></TableCell>
              <TableCell className="max-w-[220px] truncate">{row.remarks || "-"}</TableCell>
              <TableCell className="text-center"><ActionButtons onEdit={() => onEdit(row)} onDelete={() => onDelete(row.id)} /></TableCell>
            </tr>
          ))}
          {!assessments.length && (
            <tr><td colSpan={28} className="px-4 py-10 text-center text-sm font-bold text-slate-400">{loading ? "Loading..." : "No competency assessments found."}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const FormField = ({ label, required, children }) => (
  <Field label={label} required={required}>{children}</Field>
);

const Input = ({ value, onChange, type = "text", placeholder, className = "" }) => (
  <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputClass} ${className}`} />
);

const Select = ({ value, onChange, options, placeholder }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const Textarea = ({ value, onChange, rows = 3 }) => (
  <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={`${inputClass} h-auto min-h-[80px] resize-y pt-2`} />
);

const FormRow = ({ children }) => <div className="grid gap-4 sm:grid-cols-2">{children}</div>;

const PlanForm = ({ form, onChange, onSave, saving, editingId }) => (
  <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="grid gap-5">
    <FormRow>
      <FormField label="Training Title" required><Input value={form.title} onChange={(v) => onChange({ title: v })} /></FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Category"><Select value={form.category} onChange={(v) => onChange({ category: v })} options={TRAINING_CATEGORIES} /></FormField>
        <FormField label="Type"><Select value={form.training_type} onChange={(v) => onChange({ training_type: v })} options={TRAINING_TYPES} /></FormField>
      </div>
    </FormRow>
    <FormRow>
      <FormField label="Training Year"><Input type="number" value={form.training_year} onChange={(v) => onChange({ training_year: Number(v) })} /></FormField>
      <FormField label="Department"><Input value={form.department} onChange={(v) => onChange({ department: v })} placeholder="e.g. Engineering" /></FormField>
    </FormRow>
    <FormRow>
      <FormField label="Position"><Input value={form.position} onChange={(v) => onChange({ position: v })} placeholder="Target position" /></FormField>
      <FormField label="Employee"><Input value={form.employee_id} onChange={(v) => onChange({ employee_id: v })} placeholder="Employee ID (optional)" /></FormField>
    </FormRow>
    <FormField label="Training Objective" required>
      <Textarea value={form.objective} onChange={(v) => onChange({ objective: v })} />
    </FormField>
    <FormRow>
      <FormField label="Planned Start Date" required><Input type="date" value={form.planned_start_date} onChange={(v) => onChange({ planned_start_date: v })} /></FormField>
      <FormField label="Planned End Date" required><Input type="date" value={form.planned_end_date} onChange={(v) => onChange({ planned_end_date: v })} /></FormField>
    </FormRow>
    <FormRow>
      <FormField label="Trainer"><Input value={form.trainer} onChange={(v) => onChange({ trainer: v })} /></FormField>
      <FormField label="Venue"><Input value={form.venue} onChange={(v) => onChange({ venue: v })} /></FormField>
    </FormRow>
    <FormRow>
      <FormField label="Estimated Cost"><Input type="number" value={form.estimated_cost} onChange={(v) => onChange({ estimated_cost: v })} /></FormField>
      <FormField label="Actual Cost"><Input type="number" value={form.actual_cost} onChange={(v) => onChange({ actual_cost: v })} /></FormField>
    </FormRow>
    <FormRow>
      <FormField label="Approval Status"><Select value={form.approval_status} onChange={(v) => onChange({ approval_status: v })} options={TRAINING_PLAN_STATUSES} /></FormField>
      <FormField label="Training Status"><Select value={form.training_status} onChange={(v) => onChange({ training_status: v })} options={TRAINING_STATUSES} /></FormField>
    </FormRow>
    <FormField label="Remarks"><Textarea value={form.remarks} onChange={(v) => onChange({ remarks: v })} rows={2} /></FormField>
    <button type="submit" disabled={saving} className="h-11 rounded-lg bg-[#166432] text-sm font-bold text-white hover:bg-[#1a7a3e] disabled:opacity-50">
      {saving ? "Saving..." : editingId ? "Update Training Plan" : "Create Training Plan"}
    </button>
  </form>
);

const RecordForm = ({ form, onChange, employeeOptions, employees, plans, onSave, saving, editingId }) => {
  const selectedEmployee = employees.find((employee) => String(employee.user_id || employee.id) === String(form.user_id));

  const handlePlanChange = (value) => {
    const selectedPlan = plans.find((plan) => String(plan.id) === String(value));
    if (!selectedPlan) {
      onChange({ plan_id: value });
      return;
    }
    onChange({
      plan_id: value,
      title: form.title || selectedPlan.title || "",
      training_type: selectedPlan.training_type || form.training_type,
      category: selectedPlan.category || form.category,
      provider: selectedPlan.trainer || form.provider,
      training_date: selectedPlan.planned_start_date || form.training_date,
      end_date: selectedPlan.planned_end_date || form.end_date,
      duration: form.duration || selectedPlan.duration || "",
      training_method: selectedPlan.venue === "Online" ? "Online" : form.training_method,
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="grid gap-5">
      <FormRow>
        <FormField label="Employee ID" required>
          <select value={form.user_id} onChange={(e) => onChange({ user_id: e.target.value })} className={inputClass}>
            <option value="">Select Employee ID</option>
            {employeeOptions}
          </select>
        </FormField>
        <FormField label="Employee Name">
          <input value={selectedEmployee?.name || form.employee_name || ""} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
        </FormField>
      </FormRow>
      <FormRow>
        <FormField label="Department">
          <input value={selectedEmployee?.department || form.department || ""} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
        </FormField>
        <FormField label="Position">
          <input value={selectedEmployee?.position || form.position || ""} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
        </FormField>
      </FormRow>
      <FormRow>
        <FormField label="Training ID">
          <select value={form.plan_id || ""} onChange={(e) => handlePlanChange(e.target.value)} className={inputClass}>
            <option value="">Select Training ID</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.plan_id} - {plan.title}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Training Title" required><Input value={form.title} onChange={(v) => onChange({ title: v })} /></FormField>
      </FormRow>
      <FormRow>
        <FormField label="Training Type"><Select value={form.training_type} onChange={(v) => onChange({ training_type: v })} placeholder="Select type" options={TRAINING_TYPES} /></FormField>
        <FormField label="Training Category"><Select value={form.category} onChange={(v) => onChange({ category: v })} placeholder="Select category" options={TRAINING_CATEGORIES} /></FormField>
      </FormRow>
      <FormRow>
        <FormField label="Training Provider"><Input value={form.provider} onChange={(v) => onChange({ provider: v })} /></FormField>
        <FormField label="Training Date" required><Input type="date" value={form.training_date} onChange={(v) => onChange({ training_date: v })} /></FormField>
      </FormRow>
      <FormRow>
        <FormField label="Training Duration (days)"><Input type="number" value={form.duration} onChange={(v) => onChange({ duration: v })} /></FormField>
        <FormField label="Training Method"><Select value={form.training_method} onChange={(v) => onChange({ training_method: v })} options={["Classroom", "Online", "Workshop", "Coaching"]} /></FormField>
      </FormRow>
      <FormRow>
        <FormField label="Attendance Status"><Select value={form.attendance_status} onChange={(v) => onChange({ attendance_status: v })} placeholder="Select" options={ATTENDANCE_STATUSES} /></FormField>
        <FormField label="Completion Status"><Select value={form.completion_status} onChange={(v) => onChange({ completion_status: v })} options={COMPLETION_STATUSES} /></FormField>
      </FormRow>
      <FormRow>
        <FormField label="Assessment Result"><Select value={form.assessment_result} onChange={(v) => onChange({ assessment_result: v })} options={ASSESSMENT_RESULTS} /></FormField>
        <FormField label="Score"><Input type="number" value={form.score} onChange={(v) => onChange({ score: v })} /></FormField>
      </FormRow>
      <FormField label="Skills Gained"><Textarea value={form.skills_gained} onChange={(v) => onChange({ skills_gained: v })} rows={2} /></FormField>
      <FormField label="Certification"><Select value={form.certification} onChange={(v) => onChange({ certification: v })} options={["Yes", "No"]} /></FormField>
      <FormRow>
        <FormField label="Related KPI"><Input type="number" value={form.related_kpi_id} onChange={(v) => onChange({ related_kpi_id: v })} /></FormField>
        <FormField label="Related Job Role"><Input value={form.related_job_role} onChange={(v) => onChange({ related_job_role: v })} /></FormField>
      </FormRow>
      <FormRow>
        <FormField label="Certificate Upload"><Input value={form.certificate_file} onChange={(v) => onChange({ certificate_file: v })} placeholder="File path or URL" /></FormField>
        <FormField label="Feedback Form"><Input value={form.feedback_file} onChange={(v) => onChange({ feedback_file: v })} placeholder="File path or URL" /></FormField>
      </FormRow>
      <FormRow>
        <FormField label="Verified By">
          <select value={form.verified_by || ""} onChange={(e) => onChange({ verified_by: e.target.value })} className={inputClass}>
            <option value="">Select Verifier</option>
            {employeeOptions}
          </select>
        </FormField>
        <FormField label="Approval Status"><Select value={form.status} onChange={(v) => onChange({ status: v })} options={RECORD_STATUSES} /></FormField>
      </FormRow>
      <FormField label="Remarks"><Textarea value={form.remarks} onChange={(v) => onChange({ remarks: v })} rows={2} /></FormField>
      <button type="submit" disabled={saving} className="h-11 rounded-lg bg-[#166432] text-sm font-bold text-white hover:bg-[#1a7a3e] disabled:opacity-50">
        {saving ? "Saving..." : editingId ? "Update Training Record" : "Create Training Record"}
      </button>
    </form>
  );
};

const AssessmentForm = ({ form, onChange, employeeOptions, employees, onSave, saving, editingId }) => {
  const assessorOptions = employees.map((e) => (
    <option key={e.id} value={e.id}>{e.name}</option>
  ));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="grid gap-5">
      <FormRow>
        <FormField label="Employee" required>
          <select value={form.user_id} onChange={(e) => onChange({ user_id: e.target.value })} className={inputClass}>
            <option value="">Select Employee</option>
            {employeeOptions}
          </select>
        </FormField>
        <FormField label="Assessor" required>
          <select value={form.assessor_id} onChange={(e) => onChange({ assessor_id: e.target.value })} className={inputClass}>
            <option value="">Select Assessor</option>
            {assessorOptions}
          </select>
        </FormField>
      </FormRow>
      <FormRow>
        <FormField label="Assessment Type"><Select value={form.assessment_type} onChange={(v) => onChange({ assessment_type: v })} options={ASSESSMENT_TYPES} /></FormField>
        <FormField label="Assessment Date" required><Input type="date" value={form.assessment_date} onChange={(v) => onChange({ assessment_date: v })} /></FormField>
      </FormRow>
      <FormRow>
        <FormField label="Period Start"><Input type="date" value={form.assessment_period_start} onChange={(v) => onChange({ assessment_period_start: v })} /></FormField>
        <FormField label="Period End"><Input type="date" value={form.assessment_period_end} onChange={(v) => onChange({ assessment_period_end: v })} /></FormField>
      </FormRow>
      <FormField label="Competency Model"><Input value={form.competency_model} onChange={(v) => onChange({ competency_model: v })} placeholder="Job competency framework name" /></FormField>
      <FormRow>
        <FormField label="Technical Skills"><Textarea value={form.technical_skills} onChange={(v) => onChange({ technical_skills: v })} rows={2} /></FormField>
        <FormField label="Soft Skills"><Textarea value={form.soft_skills} onChange={(v) => onChange({ soft_skills: v })} rows={2} /></FormField>
      </FormRow>
      <FormField label="Behavioral Competency"><Textarea value={form.behavioral_competency} onChange={(v) => onChange({ behavioral_competency: v })} rows={2} /></FormField>
      <FormRow>
        <FormField label="Technical Score"><Input type="number" value={form.technical_score} onChange={(v) => onChange({ technical_score: v })} /></FormField>
        <FormField label="Soft Skills Score"><Input type="number" value={form.soft_skills_score} onChange={(v) => onChange({ soft_skills_score: v })} /></FormField>
      </FormRow>
      <FormRow>
        <FormField label="Behavioral Score"><Input type="number" value={form.behavioral_score} onChange={(v) => onChange({ behavioral_score: v })} /></FormField>
        <FormField label="Coaching Required"><Select value={form.coaching_required} onChange={(v) => onChange({ coaching_required: v })} options={["Yes", "No"]} /></FormField>
      </FormRow>
      <FormField label="Strengths"><Textarea value={form.strengths} onChange={(v) => onChange({ strengths: v })} rows={2} /></FormField>
      <FormField label="Improvement Areas"><Textarea value={form.improvement_areas} onChange={(v) => onChange({ improvement_areas: v })} rows={2} /></FormField>
      <FormField label="Development Needs"><Textarea value={form.development_needs} onChange={(v) => onChange({ development_needs: v })} rows={2} /></FormField>
      <FormField label="Career Path Suggestion"><Textarea value={form.career_path_suggestion} onChange={(v) => onChange({ career_path_suggestion: v })} rows={2} /></FormField>
      <FormField label="Approval Status"><Select value={form.approval_status} onChange={(v) => onChange({ approval_status: v })} options={ASSESSMENT_STATUSES} /></FormField>
      <FormField label="Remarks"><Textarea value={form.remarks} onChange={(v) => onChange({ remarks: v })} rows={2} /></FormField>
      <button type="submit" disabled={saving} className="h-11 rounded-lg bg-[#166432] text-sm font-bold text-white hover:bg-[#1a7a3e] disabled:opacity-50">
        {saving ? "Saving..." : editingId ? "Update Assessment" : "Create Assessment"}
      </button>
    </form>
  );
};

export default TrainingPage;
