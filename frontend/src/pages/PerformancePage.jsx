import { useEffect, useState } from "react";
import {
  FiActivity, FiAlertCircle, FiBarChart2, FiBookOpen, FiCheckCircle,
  FiClock, FiEdit2, FiFileText, FiGrid, FiPlus, FiTarget, FiTrash2,
  FiTrendingUp, FiUserCheck, FiUserPlus, FiX, FiAward, FiFlag, FiStar,
  FiPieChart, FiList, FiSliders, FiThumbsUp, FiUsers,
} from "react-icons/fi";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Field, inputClass } from "./hris/HrisCommon";

const KPI_PERIODS = ["Probation", "Semester 1", "Semester 2", "Annual"];
const KPI_CATEGORIES = ["Individual", "Department", "Company"];
const MEASUREMENT_METHODS = ["Quantity", "Percentage", "Score", "Milestone", "Financial", "Compliance"];
const KPI_PLAN_STATUSES = ["Draft", "Pending Approval", "Approved", "Active", "Completed", "Cancelled"];
const APPROVAL_STATUSES = ["Pending", "Approved", "Rejected"];
const MONITORING_STATUSES = ["Not Started", "On Track", "At Risk", "Behind Target", "Completed"];
const REVIEW_PERIODS = ["Probation", "Semester 1", "Semester 2", "Annual"];
const PERFORMANCE_RATINGS = ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Needs Improvement", "Unsatisfactory"];
const POTENTIAL_RATINGS = ["Low", "Medium", "High"];
const READINESS_LEVELS = ["Ready Now", "Ready in 1 Year", "Ready in 2 Years", "Not Ready"];
const TALENT_POOLS = ["High Potential", "Successor Pool", "Key Talent", "Emerging Talent"];
const DEV_STATUSES = ["Active", "Completed", "On Hold", "Promoted", "Closed"];
const PIP_STATUS_LIST = ["Draft", "Active", "On Track", "At Risk", "Completed", "Extended", "Failed", "Closed"];
const REVIEW_FREQUENCIES = ["Weekly", "Bi-Weekly", "Monthly"];
const PIP_RESULTS = ["Passed", "Extended", "Failed", "Promoted Improvement"];
const PIP_RECS = ["Continue Employment", "Extend PIP", "Terminate"];

const mainTabs = [
  { id: "dashboard", label: "Dashboard", icon: FiPieChart },
  { id: "kpi-planning", label: "KPI Planning", icon: FiTarget },
  { id: "kpi-monitoring", label: "KPI Monitoring", icon: FiActivity },
  { id: "reviews", label: "Performance Review", icon: FiStar },
  { id: "career", label: "Career Development", icon: FiTrendingUp },
  { id: "pip", label: "PIP", icon: FiAlertCircle },
];

const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick}
    className={`h-12 border-b-2 px-4 text-sm font-extrabold whitespace-nowrap ${
      active ? "border-[#166432] text-[#166432]" : "border-transparent text-slate-500 hover:text-slate-900"
    }`}>
    {children}
  </button>
);

const SubTab = ({ active, onClick, children }) => (
  <button onClick={onClick}
    className={`h-10 rounded-lg px-4 text-sm font-bold whitespace-nowrap ${
      active ? "bg-[#166432] text-white shadow" : "text-slate-600 hover:bg-slate-100"
    }`}>
    {children}
  </button>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-10 pb-10">
      <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl mx-4">
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

const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
    <FiFileText className="mb-3 h-12 w-12" />
    <p className="text-sm font-bold">{message || "No records found"}</p>
  </div>
);

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

const StatusBadge = ({ status }) => {
  const tones = {
    "Draft": "bg-slate-100 text-slate-600",
    "Pending Approval": "bg-amber-50 text-amber-700",
    "Approved": "bg-emerald-50 text-emerald-700",
    "Active": "bg-blue-50 text-blue-700",
    "Completed": "bg-emerald-50 text-emerald-700",
    "Cancelled": "bg-red-50 text-red-700",
    "On Track": "bg-emerald-50 text-emerald-700",
    "At Risk": "bg-amber-50 text-amber-700",
    "Behind Target": "bg-red-50 text-red-700",
    "Not Started": "bg-slate-100 text-slate-500",
    "Submitted": "bg-blue-50 text-blue-700",
    "Reviewed": "bg-indigo-50 text-indigo-700",
    "Passed": "bg-emerald-50 text-emerald-700",
    "Failed": "bg-red-50 text-red-700",
    "Extended": "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${tones[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
};

const defaultKpiPlanForm = () => ({
  user_id: "", kpi_period: "Annual", start_date: "", end_date: "",
  kpi_category: "Individual", kpi_title: "", kpi_description: "",
  measurement_method: "Percentage", target_value: "", weight: "",
  minimum_achievement: "", data_source: "", responsible_person: "",
  line_manager_approval: "Pending", hr_review: "Pending", final_status: "Draft", remarks: "",
});

const defaultMonitoringForm = () => ({
  kpi_plan_id: "", monitoring_date: new Date().toISOString().slice(0, 10),
  current_achievement: "", supporting_evidence: "", employee_comment: "",
  status: "Not Started", monitoring_status: "Draft", remarks: "",
});

const defaultReviewForm = () => ({
  user_id: "", review_period: "Annual", start_date: "", end_date: "",
  kpi_score: "", kpi_weight: "70", competency_score: "", behavior_score: "", attendance_score: "",
  self_assessment: "", manager_comments: "", strengths: "", improvement_areas: "",
  development_action_plan: "", promotion_recommendation: "No", salary_increment_recommendation: "No",
  pip_required: "No", review_status: "Draft", final_decision: "", remarks: "",
});

const defaultCareerForm = () => ({
  user_id: "", potential_rating: "Medium", readiness_level: "Not Ready",
  career_goal: "", target_position: "", development_area: "",
  training_required: "", coaching_required: "No", mentoring_required: "No",
  successor_candidate: "No", talent_pool: "", review_date: "", next_review_date: "",
  dev_status: "Active", remarks: "",
});

const defaultPipForm = () => ({
  user_id: "", pip_start_date: "", pip_end_date: "", initiated_by: "",
  performance_issue: "", root_cause_analysis: "", improvement_objective: "", success_criteria: "",
  action_plan: "", training_required: "", coaching_required: "No", mentor_assigned: "",
  review_frequency: "Weekly", approval_status: "Draft", remarks: "",
});

export default function PerformancePage() {
  const { userId, role } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Dashboard
  const [dashboard, setDashboard] = useState(null);

  // KPI Plans
  const [kpiPlans, setKpiPlans] = useState([]);
  const [kpiPlanForm, setKpiPlanForm] = useState(defaultKpiPlanForm());
  const [kpiPlanModal, setKpiPlanModal] = useState(false);
  const [editingKpiPlan, setEditingKpiPlan] = useState(null);

  // KPI Monitoring
  const [monitoring, setMonitoring] = useState([]);
  const [monitoringForm, setMonitoringForm] = useState(defaultMonitoringForm());
  const [monitoringModal, setMonitoringModal] = useState(false);

  // Performance Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState(defaultReviewForm());
  const [reviewModal, setReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  // Career Development
  const [careers, setCareers] = useState([]);
  const [careerForm, setCareerForm] = useState(defaultCareerForm());
  const [careerModal, setCareerModal] = useState(false);
  const [editingCareer, setEditingCareer] = useState(null);

  // PIP
  const [pipList, setPipList] = useState([]);
  const [pipForm, setPipForm] = useState(defaultPipForm());
  const [pipModal, setPipModal] = useState(false);
  const [editingPip, setEditingPip] = useState(null);

  // Sub-tabs
  const [kpiSubTab, setKpiSubTab] = useState("plans");
  const [monSubTab, setMonSubTab] = useState("list");
  const [reviewSubTab, setReviewSubTab] = useState("list");
  const [careerSubTab, setCareerSubTab] = useState("list");
  const [pipSubTab, setPipSubTab] = useState("list");

  const mgmtRoles = ["line_manager", "department_head", "management_hr", "payroll_officer"];
  const isManagement = mgmtRoles.includes(role);

  const loadEmployees = async () => {
    try {
      const res = await api.get("/api/hris/employees");
      setEmployees(res.data || []);
    } catch {}
  };

  const loadDashboard = async () => {
    try {
      const res = await api.get("/api/performance/dashboard");
      setDashboard(res.data);
    } catch {}
  };

  const loadKpiPlans = async () => {
    try {
      const res = isManagement ? await api.get("/api/performance/kpi-plans") : await api.get("/api/performance/kpi-plans/my");
      setKpiPlans(res.data || []);
    } catch {}
  };

  const loadMonitoring = async () => {
    try {
      const res = isManagement ? await api.get("/api/performance/kpi-monitoring") : await api.get("/api/performance/kpi-monitoring/my");
      setMonitoring(res.data || []);
    } catch {}
  };

  const loadReviews = async () => {
    try {
      const res = isManagement ? await api.get("/api/performance/reviews") : await api.get("/api/performance/reviews/my");
      setReviews(res.data || []);
    } catch {}
  };

  const loadCareers = async () => {
    try {
      const res = isManagement ? await api.get("/api/performance/career-developments") : await api.get("/api/performance/career-developments/my");
      setCareers(res.data ? (Array.isArray(res.data) ? res.data : [res.data]) : []);
    } catch {}
  };

  const loadPip = async () => {
    try {
      const res = isManagement ? await api.get("/api/performance/pip") : await api.get("/api/performance/pip/my");
      setPipList(res.data || []);
    } catch {}
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      loadEmployees(),
      ...(isManagement ? [loadDashboard()] : []),
      loadKpiPlans(),
      loadMonitoring(),
      loadReviews(),
      loadCareers(),
      loadPip(),
    ]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [activeTab]);

  // ─── KPI Plan Handlers ─────────────────────────────────

  const openNewKpiPlan = () => {
    setEditingKpiPlan(null);
    setKpiPlanForm({ ...defaultKpiPlanForm(), user_id: userId || "" });
    setKpiPlanModal(true);
  };

  const openEditKpiPlan = (plan) => {
    setEditingKpiPlan(plan);
    setKpiPlanForm({
      user_id: plan.user_id, kpi_period: plan.kpi_period,
      start_date: plan.start_date ? plan.start_date.slice(0, 10) : "",
      end_date: plan.end_date ? plan.end_date.slice(0, 10) : "",
      kpi_category: plan.kpi_category, kpi_title: plan.kpi_title,
      kpi_description: plan.kpi_description || "",
      measurement_method: plan.measurement_method, target_value: plan.target_value,
      weight: plan.weight, minimum_achievement: plan.minimum_achievement || "",
      data_source: plan.data_source || "", responsible_person: plan.responsible_person || "",
      line_manager_approval: plan.line_manager_approval || "Pending",
      hr_review: plan.hr_review || "Pending", final_status: plan.final_status || "Draft",
      remarks: plan.remarks || "",
    });
    setKpiPlanModal(true);
  };

  const saveKpiPlan = async () => {
    try {
      const payload = { ...kpiPlanForm };
      if (editingKpiPlan) {
        await api.put(`/api/performance/kpi-plans/${editingKpiPlan.id}`, payload);
      } else {
        await api.post("/api/performance/kpi-plans", payload);
      }
      setKpiPlanModal(false);
      loadKpiPlans();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error saving KPI plan");
    }
  };

  const updateKpiPlanStatus = async (id, status) => {
    try {
      await api.put(`/api/performance/kpi-plans/${id}/status`, { final_status: status });
      loadKpiPlans();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error updating status");
    }
  };

  const deleteKpiPlan = async (id) => {
    if (!confirm("Delete this KPI plan?")) return;
    try {
      await api.delete(`/api/performance/kpi-plans/${id}`);
      loadKpiPlans();
    } catch {}
  };

  // ─── Monitoring Handlers ───────────────────────────────

  const openNewMonitoring = () => {
    setMonitoringForm({ ...defaultMonitoringForm(), monitoring_date: new Date().toISOString().slice(0, 10) });
    setMonitoringModal(true);
  };

  const saveMonitoring = async () => {
    try {
      await api.post("/api/performance/kpi-monitoring", monitoringForm);
      setMonitoringModal(false);
      loadMonitoring();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error saving monitoring record");
    }
  };

  const reviewMonitoring = async (id, data) => {
    try {
      await api.put(`/api/performance/kpi-monitoring/${id}/review`, data);
      loadMonitoring();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error reviewing monitoring record");
    }
  };

  const deleteMonitoring = async (id) => {
    if (!confirm("Delete this monitoring record?")) return;
    try {
      await api.delete(`/api/performance/kpi-monitoring/${id}`);
      loadMonitoring();
    } catch {}
  };

  // ─── Review Handlers ───────────────────────────────────

  const openNewReview = () => {
    setEditingReview(null);
    setReviewForm({ ...defaultReviewForm(), user_id: userId || "" });
    setReviewModal(true);
  };

  const openEditReview = (review) => {
    setEditingReview(review);
    setReviewForm({
      user_id: review.user_id, review_period: review.review_period,
      start_date: review.start_date ? review.start_date.slice(0, 10) : "",
      end_date: review.end_date ? review.end_date.slice(0, 10) : "",
      kpi_score: review.kpi_score || "", kpi_weight: review.kpi_weight || "70",
      competency_score: review.competency_score || "", behavior_score: review.behavior_score || "",
      attendance_score: review.attendance_score || "", self_assessment: review.self_assessment || "",
      manager_comments: review.manager_comments || "", strengths: review.strengths || "",
      improvement_areas: review.improvement_areas || "",
      development_action_plan: review.development_action_plan || "",
      promotion_recommendation: review.promotion_recommendation || "No",
      salary_increment_recommendation: review.salary_increment_recommendation || "No",
      pip_required: review.pip_required || "No",
      review_status: review.review_status || "Draft", final_decision: review.final_decision || "",
      remarks: review.remarks || "",
    });
    setReviewModal(true);
  };

  const saveReview = async () => {
    try {
      const payload = { ...reviewForm };
      if (editingReview) {
        await api.put(`/api/performance/reviews/${editingReview.id}`, payload);
      } else {
        await api.post("/api/performance/reviews", payload);
      }
      setReviewModal(false);
      loadReviews();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error saving review");
    }
  };

  const deleteReview = async (id) => {
    if (!confirm("Delete this review?")) return;
    try {
      await api.delete(`/api/performance/reviews/${id}`);
      loadReviews();
    } catch {}
  };

  // ─── Career Handlers ───────────────────────────────────

  const openNewCareer = () => {
    setEditingCareer(null);
    setCareerForm({ ...defaultCareerForm(), user_id: userId || "" });
    setCareerModal(true);
  };

  const openEditCareer = (career) => {
    setEditingCareer(career);
    setCareerForm({
      user_id: career.user_id, potential_rating: career.potential_rating || "Medium",
      readiness_level: career.readiness_level || "Not Ready",
      career_goal: career.career_goal || "", target_position: career.target_position || "",
      development_area: career.development_area || "", training_required: career.training_required || "",
      coaching_required: career.coaching_required || "No",
      mentoring_required: career.mentoring_required || "No",
      successor_candidate: career.successor_candidate || "No",
      talent_pool: career.talent_pool || "",
      review_date: career.review_date ? career.review_date.slice(0, 10) : "",
      next_review_date: career.next_review_date ? career.next_review_date.slice(0, 10) : "",
      dev_status: career.dev_status || "Active", remarks: career.remarks || "",
    });
    setCareerModal(true);
  };

  const saveCareer = async () => {
    try {
      const payload = { ...careerForm };
      if (editingCareer) {
        await api.put(`/api/performance/career-developments/${editingCareer.id}`, payload);
      } else {
        await api.post("/api/performance/career-developments", payload);
      }
      setCareerModal(false);
      loadCareers();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error saving career development");
    }
  };

  const deleteCareer = async (id) => {
    if (!confirm("Delete this career development record?")) return;
    try {
      await api.delete(`/api/performance/career-developments/${id}`);
      loadCareers();
    } catch {}
  };

  // ─── PIP Handlers ──────────────────────────────────────

  const openNewPip = () => {
    setEditingPip(null);
    setPipForm({ ...defaultPipForm(), user_id: userId || "", initiated_by: userId || "" });
    setPipModal(true);
  };

  const openEditPip = (pip) => {
    setEditingPip(pip);
    setPipForm({
      user_id: pip.user_id, pip_start_date: pip.pip_start_date ? pip.pip_start_date.slice(0, 10) : "",
      pip_end_date: pip.pip_end_date ? pip.pip_end_date.slice(0, 10) : "",
      initiated_by: pip.initiated_by, performance_issue: pip.performance_issue,
      root_cause_analysis: pip.root_cause_analysis || "",
      improvement_objective: pip.improvement_objective,
      success_criteria: pip.success_criteria || "", action_plan: pip.action_plan || "",
      training_required: pip.training_required || "", coaching_required: pip.coaching_required || "No",
      mentor_assigned: pip.mentor_assigned || "", review_frequency: pip.review_frequency || "Weekly",
      approval_status: pip.approval_status || "Draft", remarks: pip.remarks || "",
    });
    setPipModal(true);
  };

  const savePip = async () => {
    try {
      const payload = { ...pipForm };
      if (editingPip) {
        await api.put(`/api/performance/pip/${editingPip.id}`, payload);
      } else {
        await api.post("/api/performance/pip", payload);
      }
      setPipModal(false);
      loadPip();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error saving PIP");
    }
  };

  const updatePipProgress = async (id, status, comment) => {
    try {
      await api.put(`/api/performance/pip/${id}/progress`, { progress_status: status, progress_comment: comment });
      loadPip();
    } catch {}
  };

  const finalEvalPip = async (id, result, rec) => {
    try {
      await api.put(`/api/performance/pip/${id}/final-eval`, {
        final_result: result, recommendation: rec, approval_status: "Closed",
      });
      loadPip();
    } catch {}
  };

  const deletePip = async (id) => {
    if (!confirm("Delete this PIP?")) return;
    try {
      await api.delete(`/api/performance/pip/${id}`);
      loadPip();
    } catch {}
  };

  // ─── Render Dashboard ──────────────────────────────────

  const renderDashboard = () => {
    const d = dashboard;
    if (!d) return <EmptyState message="Loading dashboard..." />;
    const chartData = (d.kpi_by_department || []).map((item) => ({ name: item.department, count: item.count }));
    const periodData = (d.kpi_by_period || []).map((item) => ({ name: item.period, count: item.count }));
    const CHART_COLORS = ["#166432", "#2563eb", "#f59e0b", "#7c3aed", "#06b6d4", "#ec4899"];

    return (
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard icon={FiTarget} label="Total KPI Plans" value={d.total_kpi_plans} helper={`${d.active_kpis} active`} tone="bg-emerald-600 text-white" />
          <DashboardStatCard icon={FiClock} label="Pending Approval" value={d.pending_approval} helper="Awaiting review" tone="bg-amber-500 text-white" />
          <DashboardStatCard icon={FiStar} label="Reviews Completed" value={d.reviews_completed} helper={`${d.pending_reviews} pending`} tone="bg-blue-600 text-white" />
          <DashboardStatCard icon={FiAlertCircle} label="Active PIP Cases" value={d.active_pip} helper={`${d.completed_pip} completed`} tone="bg-red-500 text-white" />
          <DashboardStatCard icon={FiTrendingUp} label="Active Dev Plans" value={d.active_development_plans} helper={`${d.promotion_candidates} ready`} tone="bg-purple-600 text-white" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-extrabold text-slate-900">KPI by Department</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#166432" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState message="No data" />}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-extrabold text-slate-900">KPI by Period</h3>
            {periodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={periodData} cx="50%" cy="50%" outerRadius={80} dataKey="count" label={({ name }) => name}>
                    {periodData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState message="No data" />}
          </div>
        </div>
      </div>
    );
  };

  // ─── Render KPI Planning ───────────────────────────────

  const renderKpiPlanning = () => {
    const kpiSubTabs = [
      { id: "plans", label: "KPI Plans" },
      { id: "templates", label: "KPI Templates" },
      { id: "history", label: "KPI History" },
    ];

    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200">
          {kpiSubTabs.map((t) => (
            <TabButton key={t.id} active={kpiSubTab === t.id} onClick={() => setKpiSubTab(t.id)}>
              {t.label}
            </TabButton>
          ))}
          <div className="ml-auto pb-2">
            <button onClick={openNewKpiPlan} className="flex h-10 items-center gap-2 rounded-lg bg-[#166432] px-4 text-sm font-bold text-white shadow hover:bg-[#1a7a3e]">
              <FiPlus className="h-4 w-4" /> New KPI Plan
            </button>
          </div>
        </div>

        {kpiSubTab === "plans" && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Plan ID</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">KPI Title</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kpiPlans.length === 0 ? (
                  <tr><td colSpan={8}><EmptyState message="No KPI plans yet" /></td></tr>
                ) : kpiPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{plan.kpi_plan_id}</td>
                    <td className="px-4 py-3">{plan.employee_name}</td>
                    <td className="px-4 py-3">{plan.kpi_period}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{plan.kpi_title}</td>
                    <td className="px-4 py-3">{plan.target_value}</td>
                    <td className="px-4 py-3">{plan.weight}%</td>
                    <td className="px-4 py-3"><StatusBadge status={plan.final_status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditKpiPlan(plan)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Edit"><FiEdit2 className="h-4 w-4" /></button>
                        <button onClick={() => updateKpiPlanStatus(plan.id, "Active")} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600" title="Activate"><FiCheckCircle className="h-4 w-4" /></button>
                        <button onClick={() => deleteKpiPlan(plan.id)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Delete"><FiTrash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {kpiSubTab === "templates" && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-extrabold text-slate-900">Standard KPI Library</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Recruitment Completion", target: "90%", method: "Percentage", weight: "30%" },
                { title: "Employee Retention", target: "95%", method: "Percentage", weight: "25%" },
                { title: "Training Completion", target: "100%", method: "Percentage", weight: "20%" },
                { title: "Policy Development", target: "100%", method: "Milestone", weight: "25%" },
                { title: "Customer Satisfaction", target: "4.5", method: "Score", weight: "20%" },
                { title: "Cost Reduction", target: "$10K", method: "Financial", weight: "15%" },
              ].map((tpl, i) => (
                <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="font-extrabold text-slate-900">{tpl.title}</p>
                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <p>Target: <span className="font-bold text-slate-700">{tpl.target}</span></p>
                    <p>Method: <span className="font-bold text-slate-700">{tpl.method}</span></p>
                    <p>Weight: <span className="font-bold text-slate-700">{tpl.weight}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {kpiSubTab === "history" && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-extrabold text-slate-900">Previous KPI Plans</h3>
            {kpiPlans.filter((p) => p.final_status === "Completed" || p.final_status === "Cancelled").length === 0 ? (
              <EmptyState message="No completed KPI plans" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Plan ID</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiPlans.filter((p) => p.final_status === "Completed" || p.final_status === "Cancelled").map((plan) => (
                      <tr key={plan.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold">{plan.kpi_plan_id}</td>
                        <td className="px-4 py-3">{plan.kpi_period}</td>
                        <td className="px-4 py-3">{plan.kpi_title}</td>
                        <td className="px-4 py-3"><StatusBadge status={plan.final_status} /></td>
                        <td className="px-4 py-3">{plan.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* KPI Plan Modal */}
        <Modal open={kpiPlanModal} onClose={() => setKpiPlanModal(false)} title={editingKpiPlan ? "Edit KPI Plan" : "New KPI Plan"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee" required>
              <select className={inputClass} value={kpiPlanForm.user_id} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, user_id: e.target.value })}>
                <option value="">Select Employee</option>
                {employees.map((emp) => <option key={emp.user_id} value={emp.user_id}>{emp.name}</option>)}
              </select>
            </Field>
            <Field label="KPI Period" required>
              <select className={inputClass} value={kpiPlanForm.kpi_period} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, kpi_period: e.target.value })}>
                {KPI_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Start Date" required>
              <input type="date" className={inputClass} value={kpiPlanForm.start_date} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, start_date: e.target.value })} />
            </Field>
            <Field label="End Date" required>
              <input type="date" className={inputClass} value={kpiPlanForm.end_date} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, end_date: e.target.value })} />
            </Field>
            <Field label="KPI Category" required>
              <select className={inputClass} value={kpiPlanForm.kpi_category} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, kpi_category: e.target.value })}>
                {KPI_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Measurement Method" required>
              <select className={inputClass} value={kpiPlanForm.measurement_method} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, measurement_method: e.target.value })}>
                {MEASUREMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="KPI Title" required className="sm:col-span-2">
              <input className={inputClass} value={kpiPlanForm.kpi_title} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, kpi_title: e.target.value })} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea className={inputClass} rows={3} value={kpiPlanForm.kpi_description} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, kpi_description: e.target.value })} />
            </Field>
            <Field label="Target Value" required>
              <input type="number" step="any" className={inputClass} value={kpiPlanForm.target_value} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, target_value: e.target.value })} />
            </Field>
            <Field label="Weight (%)" required>
              <input type="number" step="any" className={inputClass} value={kpiPlanForm.weight} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, weight: e.target.value })} />
            </Field>
            <Field label="Min Achievement (%)">
              <input type="number" step="any" className={inputClass} value={kpiPlanForm.minimum_achievement} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, minimum_achievement: e.target.value })} />
            </Field>
            <Field label="Data Source">
              <input className={inputClass} value={kpiPlanForm.data_source} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, data_source: e.target.value })} />
            </Field>
            <Field label="Responsible Person">
              <select className={inputClass} value={kpiPlanForm.responsible_person} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, responsible_person: e.target.value })}>
                <option value="">Select</option>
                {employees.map((emp) => <option key={emp.user_id} value={emp.user_id}>{emp.name}</option>)}
              </select>
            </Field>
            <Field label="Remarks" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={kpiPlanForm.remarks} onChange={(e) => setKpiPlanForm({ ...kpiPlanForm, remarks: e.target.value })} />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setKpiPlanModal(false)} className="h-10 rounded-lg border border-slate-200 px-6 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={saveKpiPlan} className="h-10 rounded-lg bg-[#166432] px-6 text-sm font-bold text-white shadow hover:bg-[#1a7a3e]">
              {editingKpiPlan ? "Update" : "Create"}
            </button>
          </div>
        </Modal>
      </div>
    );
  };

  // ─── Render KPI Monitoring ─────────────────────────────

  const renderKpiMonitoring = () => {
    const subTabs = [
      { id: "list", label: "Progress Tracking" },
      { id: "dashboard", label: "Monitoring Dashboard" },
    ];

    const onTrack = monitoring.filter((m) => m.status === "On Track").length;
    const atRisk = monitoring.filter((m) => m.status === "At Risk").length;
    const behind = monitoring.filter((m) => m.status === "Behind Target").length;
    const completed = monitoring.filter((m) => m.status === "Completed").length;

    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200">
          {subTabs.map((t) => (
            <TabButton key={t.id} active={monSubTab === t.id} onClick={() => setMonSubTab(t.id)}>
              {t.label}
            </TabButton>
          ))}
          <div className="ml-auto pb-2">
            <button onClick={openNewMonitoring} className="flex h-10 items-center gap-2 rounded-lg bg-[#166432] px-4 text-sm font-bold text-white shadow hover:bg-[#1a7a3e]">
              <FiPlus className="h-4 w-4" /> Update Progress
            </button>
          </div>
        </div>

        {monSubTab === "list" && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">KPI</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Achievement</th>
                  <th className="px-4 py-3">%</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monitoring.length === 0 ? (
                  <tr><td colSpan={8}><EmptyState message="No monitoring records" /></td></tr>
                ) : monitoring.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 max-w-[150px] truncate font-bold text-slate-700">{m.kpi_title}</td>
                    <td className="px-4 py-3">{m.kpi_target}</td>
                    <td className="px-4 py-3">{m.current_achievement}</td>
                    <td className="px-4 py-3">{m.achievement_pct != null ? `${m.achievement_pct}%` : "-"}</td>
                    <td className="px-4 py-3">{m.kpi_score != null ? m.kpi_score.toFixed(2) : "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-3">{m.monitoring_date?.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => {
                          const comment = prompt("Manager comment:");
                          if (comment !== null) reviewMonitoring(m.id, { manager_comment: comment, monitoring_status: "Reviewed" });
                        }} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Review">
                          <FiCheckCircle className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteMonitoring(m.id)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Delete">
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {monSubTab === "dashboard" && (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <DashboardStatCard icon={FiCheckCircle} label="On Track" value={onTrack} tone="bg-emerald-600 text-white" />
              <DashboardStatCard icon={FiAlertCircle} label="At Risk" value={atRisk} tone="bg-amber-500 text-white" />
              <DashboardStatCard icon={FiX} label="Behind Target" value={behind} tone="bg-red-500 text-white" />
              <DashboardStatCard icon={FiAward} label="Completed" value={completed} tone="bg-blue-600 text-white" />
            </div>
          </div>
        )}

        {/* Monitoring Modal */}
        <Modal open={monitoringModal} onClose={() => setMonitoringModal(false)} title="Update KPI Progress">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="KPI Plan" required className="sm:col-span-2">
              <select className={inputClass} value={monitoringForm.kpi_plan_id} onChange={(e) => setMonitoringForm({ ...monitoringForm, kpi_plan_id: e.target.value })}>
                <option value="">Select KPI Plan</option>
                {kpiPlans.map((p) => <option key={p.id} value={p.id}>{p.kpi_plan_id} - {p.kpi_title}</option>)}
              </select>
            </Field>
            <Field label="Monitoring Date" required>
              <input type="date" className={inputClass} value={monitoringForm.monitoring_date} onChange={(e) => setMonitoringForm({ ...monitoringForm, monitoring_date: e.target.value })} />
            </Field>
            <Field label="Current Achievement" required>
              <input type="number" step="any" className={inputClass} value={monitoringForm.current_achievement} onChange={(e) => setMonitoringForm({ ...monitoringForm, current_achievement: e.target.value })} />
            </Field>
            <Field label="Employee Comment" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={monitoringForm.employee_comment} onChange={(e) => setMonitoringForm({ ...monitoringForm, employee_comment: e.target.value })} />
            </Field>
            <Field label="Supporting Evidence" className="sm:col-span-2">
              <input className={inputClass} placeholder="URL or file path" value={monitoringForm.supporting_evidence} onChange={(e) => setMonitoringForm({ ...monitoringForm, supporting_evidence: e.target.value })} />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setMonitoringModal(false)} className="h-10 rounded-lg border border-slate-200 px-6 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveMonitoring} className="h-10 rounded-lg bg-[#166432] px-6 text-sm font-bold text-white shadow hover:bg-[#1a7a3e]">Save Progress</button>
          </div>
        </Modal>
      </div>
    );
  };

  // ─── Render Performance Review ──────────────────────────

  const renderReviews = () => {
    const subTabs = [
      { id: "list", label: "Reviews" },
      { id: "kpi-eval", label: "KPI Evaluation" },
      { id: "summary", label: "Summary" },
    ];

    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200">
          {subTabs.map((t) => (
            <TabButton key={t.id} active={reviewSubTab === t.id} onClick={() => setReviewSubTab(t.id)}>
              {t.label}
            </TabButton>
          ))}
          <div className="ml-auto pb-2">
            <button onClick={openNewReview} className="flex h-10 items-center gap-2 rounded-lg bg-[#166432] px-4 text-sm font-bold text-white shadow hover:bg-[#1a7a3e]">
              <FiPlus className="h-4 w-4" /> New Review
            </button>
          </div>
        </div>

        {reviewSubTab === "list" && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">KPI Score</th>
                  <th className="px-4 py-3">Total Score</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviews.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState message="No reviews yet" /></td></tr>
                ) : reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{r.employee_name}</td>
                    <td className="px-4 py-3">{r.review_period}</td>
                    <td className="px-4 py-3">{r.kpi_score != null ? `${r.kpi_score}%` : "-"}</td>
                    <td className="px-4 py-3 font-bold">{r.total_score != null ? `${r.total_score.toFixed(2)}%` : "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.performance_rating} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.review_status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditReview(r)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Edit"><FiEdit2 className="h-4 w-4" /></button>
                        <button onClick={() => deleteReview(r.id)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Delete"><FiTrash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reviewSubTab === "kpi-eval" && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-extrabold text-slate-900">KPI Achievement Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">KPI Score</th>
                    <th className="px-4 py-3">KPI Weight</th>
                    <th className="px-4 py-3">Competency</th>
                    <th className="px-4 py-3">Behavior</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviews.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState message="No evaluation data" /></td></tr>
                  ) : reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold">{r.employee_name}</td>
                      <td className="px-4 py-3">{r.kpi_score != null ? `${r.kpi_score}%` : "-"}</td>
                      <td className="px-4 py-3">{r.kpi_weight != null ? `${r.kpi_weight}%` : "-"}</td>
                      <td className="px-4 py-3">{r.competency_score != null ? `${r.competency_score}%` : "-"}</td>
                      <td className="px-4 py-3">{r.behavior_score != null ? `${r.behavior_score}%` : "-"}</td>
                      <td className="px-4 py-3">{r.attendance_score != null ? `${r.attendance_score}%` : "-"}</td>
                      <td className="px-4 py-3 font-bold text-[#166432]">{r.total_score != null ? `${r.total_score.toFixed(2)}%` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reviewSubTab === "summary" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-extrabold text-slate-900">Performance Distribution</h3>
              {(() => {
                const dist = {};
                reviews.forEach((r) => { const key = r.performance_rating || "Unrated"; dist[key] = (dist[key] || 0) + 1; });
                const data = Object.entries(dist).map(([name, count]) => ({ name, count }));
                const COLORS = ["#166432", "#2563eb", "#f59e0b", "#7c3aed", "#ef4444"];
                return data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="count" label={({ name }) => name}>
                        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState message="No data" />;
              })()}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-extrabold text-slate-900">Score Weighting</h3>
              <div className="space-y-3">
                {[
                  { label: "KPI Achievement", pct: 70, color: "bg-emerald-500" },
                  { label: "Competency Assessment", pct: 15, color: "bg-blue-500" },
                  { label: "Behavior & Values", pct: 10, color: "bg-amber-500" },
                  { label: "Attendance & Discipline", pct: 5, color: "bg-purple-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between text-sm font-bold">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="text-slate-500">{item.pct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100">
                      <div className={`h-2.5 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        <Modal open={reviewModal} onClose={() => setReviewModal(false)} title={editingReview ? "Edit Performance Review" : "New Performance Review"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee" required>
              <select className={inputClass} value={reviewForm.user_id} onChange={(e) => setReviewForm({ ...reviewForm, user_id: e.target.value })}>
                <option value="">Select Employee</option>
                {employees.map((emp) => <option key={emp.user_id} value={emp.user_id}>{emp.name}</option>)}
              </select>
            </Field>
            <Field label="Review Period" required>
              <select className={inputClass} value={reviewForm.review_period} onChange={(e) => setReviewForm({ ...reviewForm, review_period: e.target.value })}>
                {REVIEW_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Start Date">
              <input type="date" className={inputClass} value={reviewForm.start_date} onChange={(e) => setReviewForm({ ...reviewForm, start_date: e.target.value })} />
            </Field>
            <Field label="End Date">
              <input type="date" className={inputClass} value={reviewForm.end_date} onChange={(e) => setReviewForm({ ...reviewForm, end_date: e.target.value })} />
            </Field>
            <Field label="KPI Score (%)">
              <input type="number" step="any" className={inputClass} value={reviewForm.kpi_score} onChange={(e) => setReviewForm({ ...reviewForm, kpi_score: e.target.value })} />
            </Field>
            <Field label="KPI Weight (%)">
              <input type="number" step="any" className={inputClass} value={reviewForm.kpi_weight} onChange={(e) => setReviewForm({ ...reviewForm, kpi_weight: e.target.value })} />
            </Field>
            <Field label="Competency Score (%)">
              <input type="number" step="any" className={inputClass} value={reviewForm.competency_score} onChange={(e) => setReviewForm({ ...reviewForm, competency_score: e.target.value })} />
            </Field>
            <Field label="Behavior Score (%)">
              <input type="number" step="any" className={inputClass} value={reviewForm.behavior_score} onChange={(e) => setReviewForm({ ...reviewForm, behavior_score: e.target.value })} />
            </Field>
            <Field label="Attendance Score (%)">
              <input type="number" step="any" className={inputClass} value={reviewForm.attendance_score} onChange={(e) => setReviewForm({ ...reviewForm, attendance_score: e.target.value })} />
            </Field>
            <Field label="Promotion Recommendation">
              <select className={inputClass} value={reviewForm.promotion_recommendation} onChange={(e) => setReviewForm({ ...reviewForm, promotion_recommendation: e.target.value })}>
                <option value="No">No</option><option value="Yes">Yes</option>
              </select>
            </Field>
            <Field label="Salary Increment">
              <select className={inputClass} value={reviewForm.salary_increment_recommendation} onChange={(e) => setReviewForm({ ...reviewForm, salary_increment_recommendation: e.target.value })}>
                <option value="No">No</option><option value="Yes">Yes</option>
              </select>
            </Field>
            <Field label="PIP Required">
              <select className={inputClass} value={reviewForm.pip_required} onChange={(e) => setReviewForm({ ...reviewForm, pip_required: e.target.value })}>
                <option value="No">No</option><option value="Yes">Yes</option>
              </select>
            </Field>
            <Field label="Self Assessment" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={reviewForm.self_assessment} onChange={(e) => setReviewForm({ ...reviewForm, self_assessment: e.target.value })} />
            </Field>
            <Field label="Manager Comments" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={reviewForm.manager_comments} onChange={(e) => setReviewForm({ ...reviewForm, manager_comments: e.target.value })} />
            </Field>
            <Field label="Strengths" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={reviewForm.strengths} onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })} />
            </Field>
            <Field label="Improvement Areas" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={reviewForm.improvement_areas} onChange={(e) => setReviewForm({ ...reviewForm, improvement_areas: e.target.value })} />
            </Field>
            <Field label="Development Action Plan" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={reviewForm.development_action_plan} onChange={(e) => setReviewForm({ ...reviewForm, development_action_plan: e.target.value })} />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setReviewModal(false)} className="h-10 rounded-lg border border-slate-200 px-6 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveReview} className="h-10 rounded-lg bg-[#166432] px-6 text-sm font-bold text-white shadow hover:bg-[#1a7a3e]">{editingReview ? "Update" : "Create"}</button>
          </div>
        </Modal>
      </div>
    );
  };

  // ─── Render Career Development ──────────────────────────

  const renderCareer = () => {
    const subTabs = [
      { id: "list", label: "Development Plans" },
      { id: "succession", label: "Succession Planning" },
    ];

    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200">
          {subTabs.map((t) => (
            <TabButton key={t.id} active={careerSubTab === t.id} onClick={() => setCareerSubTab(t.id)}>
              {t.label}
            </TabButton>
          ))}
          <div className="ml-auto pb-2">
            <button onClick={openNewCareer} className="flex h-10 items-center gap-2 rounded-lg bg-[#166432] px-4 text-sm font-bold text-white shadow hover:bg-[#1a7a3e]">
              <FiPlus className="h-4 w-4" /> New Development Plan
            </button>
          </div>
        </div>

        {careerSubTab === "list" && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Current Position</th>
                  <th className="px-4 py-3">Target Position</th>
                  <th className="px-4 py-3">Potential</th>
                  <th className="px-4 py-3">Readiness</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {careers.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState message="No career development plans" /></td></tr>
                ) : careers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{c.employee_name}</td>
                    <td className="px-4 py-3">{c.current_position}</td>
                    <td className="px-4 py-3">{c.target_position || "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.potential_rating} /></td>
                    <td className="px-4 py-3">{c.readiness_level || "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.dev_status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditCareer(c)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Edit"><FiEdit2 className="h-4 w-4" /></button>
                        <button onClick={() => deleteCareer(c.id)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Delete"><FiTrash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {careerSubTab === "succession" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-extrabold text-slate-900">Successor Candidates</h3>
              {careers.filter((c) => c.successor_candidate === "Yes").length === 0 ? (
                <EmptyState message="No successor candidates identified" />
              ) : (
                <div className="space-y-3">
                  {careers.filter((c) => c.successor_candidate === "Yes").map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-[#166432]/10 text-sm font-bold text-[#166432]">
                        {c.employee_name?.[0] || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900">{c.employee_name}</p>
                        <p className="text-xs text-slate-500">{c.current_position} → {c.target_position || "N/A"}</p>
                      </div>
                      <StatusBadge status={c.talent_pool} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-extrabold text-slate-900">Talent Pool Distribution</h3>
              {(() => {
                const dist = {};
                careers.forEach((c) => { const key = c.talent_pool || "Unassigned"; dist[key] = (dist[key] || 0) + 1; });
                const data = Object.entries(dist).map(([name, count]) => ({ name, count }));
                const COLORS = ["#166432", "#2563eb", "#f59e0b", "#7c3aed"];
                return data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="count" label={({ name }) => name}>
                        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState message="No data" />;
              })()}
            </div>
          </div>
        )}

        {/* Career Modal */}
        <Modal open={careerModal} onClose={() => setCareerModal(false)} title={editingCareer ? "Edit Career Development" : "New Career Development Plan"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee" required>
              <select className={inputClass} value={careerForm.user_id} onChange={(e) => setCareerForm({ ...careerForm, user_id: e.target.value })}>
                <option value="">Select Employee</option>
                {employees.map((emp) => <option key={emp.user_id} value={emp.user_id}>{emp.name}</option>)}
              </select>
            </Field>
            <Field label="Potential Rating">
              <select className={inputClass} value={careerForm.potential_rating} onChange={(e) => setCareerForm({ ...careerForm, potential_rating: e.target.value })}>
                {POTENTIAL_RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Readiness Level">
              <select className={inputClass} value={careerForm.readiness_level} onChange={(e) => setCareerForm({ ...careerForm, readiness_level: e.target.value })}>
                {READINESS_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Target Position">
              <input className={inputClass} value={careerForm.target_position} onChange={(e) => setCareerForm({ ...careerForm, target_position: e.target.value })} />
            </Field>
            <Field label="Career Goal" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={careerForm.career_goal} onChange={(e) => setCareerForm({ ...careerForm, career_goal: e.target.value })} />
            </Field>
            <Field label="Development Area" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={careerForm.development_area} onChange={(e) => setCareerForm({ ...careerForm, development_area: e.target.value })} />
            </Field>
            <Field label="Coaching Required">
              <select className={inputClass} value={careerForm.coaching_required} onChange={(e) => setCareerForm({ ...careerForm, coaching_required: e.target.value })}>
                <option value="No">No</option><option value="Yes">Yes</option>
              </select>
            </Field>
            <Field label="Mentoring Required">
              <select className={inputClass} value={careerForm.mentoring_required} onChange={(e) => setCareerForm({ ...careerForm, mentoring_required: e.target.value })}>
                <option value="No">No</option><option value="Yes">Yes</option>
              </select>
            </Field>
            <Field label="Successor Candidate">
              <select className={inputClass} value={careerForm.successor_candidate} onChange={(e) => setCareerForm({ ...careerForm, successor_candidate: e.target.value })}>
                <option value="No">No</option><option value="Yes">Yes</option>
              </select>
            </Field>
            <Field label="Talent Pool">
              <select className={inputClass} value={careerForm.talent_pool} onChange={(e) => setCareerForm({ ...careerForm, talent_pool: e.target.value })}>
                <option value="">Select</option>
                {TALENT_POOLS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Review Date">
              <input type="date" className={inputClass} value={careerForm.review_date} onChange={(e) => setCareerForm({ ...careerForm, review_date: e.target.value })} />
            </Field>
            <Field label="Next Review Date">
              <input type="date" className={inputClass} value={careerForm.next_review_date} onChange={(e) => setCareerForm({ ...careerForm, next_review_date: e.target.value })} />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setCareerModal(false)} className="h-10 rounded-lg border border-slate-200 px-6 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveCareer} className="h-10 rounded-lg bg-[#166432] px-6 text-sm font-bold text-white shadow hover:bg-[#1a7a3e]">{editingCareer ? "Update" : "Create"}</button>
          </div>
        </Modal>
      </div>
    );
  };

  // ─── Render PIP ─────────────────────────────────────────

  const renderPip = () => {
    const subTabs = [
      { id: "list", label: "PIP Cases" },
      { id: "monitoring", label: "Progress Monitoring" },
    ];

    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200">
          {subTabs.map((t) => (
            <TabButton key={t.id} active={pipSubTab === t.id} onClick={() => setPipSubTab(t.id)}>
              {t.label}
            </TabButton>
          ))}
          <div className="ml-auto pb-2">
            <button onClick={openNewPip} className="flex h-10 items-center gap-2 rounded-lg bg-[#166432] px-4 text-sm font-bold text-white shadow hover:bg-[#1a7a3e]">
              <FiPlus className="h-4 w-4" /> New PIP
            </button>
          </div>
        </div>

        {pipSubTab === "list" && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">PIP No</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Issue</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pipList.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState message="No PIP cases" /></td></tr>
                ) : pipList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{p.pip_no}</td>
                    <td className="px-4 py-3">{p.employee_name}</td>
                    <td className="px-4 py-3">{p.pip_duration || "-"} days</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{p.performance_issue}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.progress_status} /></td>
                    <td className="px-4 py-3"><StatusBadge status={p.approval_status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditPip(p)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Edit"><FiEdit2 className="h-4 w-4" /></button>
                        <button onClick={() => {
                          const s = prompt("Progress status (On Track/At Risk/Behind Plan):", p.progress_status);
                          if (s) updatePipProgress(p.id, s, prompt("Comment:"));
                        }} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600" title="Update Progress">
                          <FiTrendingUp className="h-4 w-4" />
                        </button>
                        <button onClick={() => {
                          const result = prompt("Final result (Passed/Extended/Failed):");
                          if (result) finalEvalPip(p.id, result, prompt("Recommendation:"));
                        }} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-purple-600" title="Final Evaluation">
                          <FiAward className="h-4 w-4" />
                        </button>
                        <button onClick={() => deletePip(p.id)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Delete"><FiTrash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pipSubTab === "monitoring" && (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <DashboardStatCard icon={FiAlertCircle} label="Active PIP" value={pipList.filter((p) => p.approval_status === "Active" || p.approval_status === "Draft").length} tone="bg-red-500 text-white" />
              <DashboardStatCard icon={FiCheckCircle} label="Completed" value={pipList.filter((p) => p.final_result === "Passed").length} tone="bg-emerald-600 text-white" />
              <DashboardStatCard icon={FiClock} label="Extended" value={pipList.filter((p) => p.final_result === "Extended").length} tone="bg-amber-500 text-white" />
              <DashboardStatCard icon={FiX} label="Failed" value={pipList.filter((p) => p.final_result === "Failed").length} tone="bg-red-500 text-white" />
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-extrabold text-slate-900">Weekly / Monthly Review Tracking</h3>
              {pipList.filter((p) => p.approval_status === "Active").length === 0 ? (
                <EmptyState message="No active PIP cases to monitor" />
              ) : (
                <div className="space-y-4">
                  {pipList.filter((p) => p.approval_status === "Active").map((p) => (
                    <div key={p.id} className="rounded-lg border border-slate-100 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900">{p.pip_no}</span>
                          <span className="ml-2 text-slate-500">- {p.employee_name}</span>
                        </div>
                        <StatusBadge status={p.progress_status} />
                      </div>
                      <p className="mb-2 text-sm text-slate-600">Issue: {p.performance_issue}</p>
                      {p.progress_comment && <p className="rounded bg-slate-50 p-2 text-sm italic text-slate-500">"{p.progress_comment}"</p>}
                      <div className="mt-2 flex gap-2">
                        {["On Track", "At Risk", "Behind Plan"].map((s) => (
                          <button key={s} onClick={() => updatePipProgress(p.id, s, p.progress_comment)}
                            className={`rounded px-3 py-1 text-xs font-bold ${
                              p.progress_status === s ? "bg-[#166432] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PIP Modal */}
        <Modal open={pipModal} onClose={() => setPipModal(false)} title={editingPip ? "Edit PIP" : "New Performance Improvement Plan"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee" required>
              <select className={inputClass} value={pipForm.user_id} onChange={(e) => setPipForm({ ...pipForm, user_id: e.target.value })}>
                <option value="">Select Employee</option>
                {employees.map((emp) => <option key={emp.user_id} value={emp.user_id}>{emp.name}</option>)}
              </select>
            </Field>
            <Field label="Initiated By" required>
              <select className={inputClass} value={pipForm.initiated_by} onChange={(e) => setPipForm({ ...pipForm, initiated_by: e.target.value })}>
                <option value="">Select</option>
                {employees.map((emp) => <option key={emp.user_id} value={emp.user_id}>{emp.name}</option>)}
              </select>
            </Field>
            <Field label="Start Date" required>
              <input type="date" className={inputClass} value={pipForm.pip_start_date} onChange={(e) => setPipForm({ ...pipForm, pip_start_date: e.target.value })} />
            </Field>
            <Field label="End Date" required>
              <input type="date" className={inputClass} value={pipForm.pip_end_date} onChange={(e) => setPipForm({ ...pipForm, pip_end_date: e.target.value })} />
            </Field>
            <Field label="Review Frequency">
              <select className={inputClass} value={pipForm.review_frequency} onChange={(e) => setPipForm({ ...pipForm, review_frequency: e.target.value })}>
                {REVIEW_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Coaching Required">
              <select className={inputClass} value={pipForm.coaching_required} onChange={(e) => setPipForm({ ...pipForm, coaching_required: e.target.value })}>
                <option value="No">No</option><option value="Yes">Yes</option>
              </select>
            </Field>
            <Field label="Performance Issue" required className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={pipForm.performance_issue} onChange={(e) => setPipForm({ ...pipForm, performance_issue: e.target.value })} />
            </Field>
            <Field label="Root Cause Analysis" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={pipForm.root_cause_analysis} onChange={(e) => setPipForm({ ...pipForm, root_cause_analysis: e.target.value })} />
            </Field>
            <Field label="Improvement Objective" required className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={pipForm.improvement_objective} onChange={(e) => setPipForm({ ...pipForm, improvement_objective: e.target.value })} />
            </Field>
            <Field label="Success Criteria" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={pipForm.success_criteria} onChange={(e) => setPipForm({ ...pipForm, success_criteria: e.target.value })} />
            </Field>
            <Field label="Action Plan" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={pipForm.action_plan} onChange={(e) => setPipForm({ ...pipForm, action_plan: e.target.value })} />
            </Field>
            <Field label="Mentor Assigned">
              <select className={inputClass} value={pipForm.mentor_assigned} onChange={(e) => setPipForm({ ...pipForm, mentor_assigned: e.target.value })}>
                <option value="">Select Mentor</option>
                {employees.map((emp) => <option key={emp.user_id} value={emp.user_id}>{emp.name}</option>)}
              </select>
            </Field>
            <Field label="Remarks">
              <textarea className={inputClass} rows={2} value={pipForm.remarks} onChange={(e) => setPipForm({ ...pipForm, remarks: e.target.value })} />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setPipModal(false)} className="h-10 rounded-lg border border-slate-200 px-6 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={savePip} className="h-10 rounded-lg bg-[#166432] px-6 text-sm font-bold text-white shadow hover:bg-[#1a7a3e]">{editingPip ? "Update" : "Create"}</button>
          </div>
        </Modal>
      </div>
    );
  };

  // ─── Main Render ────────────────────────────────────────

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Performance Management</h1>
        <p className="mt-1 text-sm text-slate-500">KPI planning, monitoring, reviews, career development & PIP</p>
      </div>

      {/* Main Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-slate-200">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex h-12 items-center gap-2 border-b-2 px-4 text-sm font-extrabold whitespace-nowrap ${
                activeTab === tab.id ? "border-[#166432] text-[#166432]" : "border-transparent text-slate-500 hover:text-slate-900"
              }`}>
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#166432] border-t-transparent" />
        </div>
      ) : (
        <>
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "kpi-planning" && renderKpiPlanning()}
          {activeTab === "kpi-monitoring" && renderKpiMonitoring()}
          {activeTab === "reviews" && renderReviews()}
          {activeTab === "career" && renderCareer()}
          {activeTab === "pip" && renderPip()}
        </>
      )}
    </div>
  );
}
