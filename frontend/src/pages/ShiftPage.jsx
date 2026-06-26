import { useEffect, useMemo, useState } from "react";
import { FiClock, FiUsers, FiX, FiEdit2, FiTrash2, FiPlus, FiChevronLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { key: "setup", label: "Shift Setup", icon: <FiClock className="h-4 w-4" /> },
  { key: "assignment", label: "Schedule Assignment", icon: <FiUsers className="h-4 w-4" /> },
];

const SHIFT_TYPES = [
  ["fixed", "Fixed Shift"],
  ["rotational", "Rotational Shift"],
  ["flexible", "Flexible Shift"],
  ["night", "Night Shift"],
  ["split", "Split Shift"],
];

const inputClass = "h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium outline-none focus:border-blue-500";

const ShiftSetupTab = ({ shifts, onEdit, onDelete, onAdd, canManage }) => (
  <div className="space-y-6">
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-extrabold text-slate-900">Shift Informations</h3>
        <button disabled={!canManage} onClick={onAdd} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
          <FiPlus className="h-4 w-4" /> Add Shift
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
              <th className="py-3 pr-4">Code</th>
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Type</th>
              <th className="py-3 pr-4">Start</th>
              <th className="py-3 pr-4">End</th>
              <th className="py-3 pr-4">Break Start</th>
              <th className="py-3 pr-4">Break End</th>
              <th className="py-3 pr-4">Hours</th>
              <th className="py-3 pr-4">Late Tol.</th>
              <th className="py-3 pr-4">Early Leave Tol.</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shifts.length === 0 ? (
              <tr className="border-b border-slate-100 text-slate-500">
                <td className="py-4 pr-4 font-medium" colSpan={12}>No shifts yet. Click "Add Shift" to create one.</td>
              </tr>
            ) : shifts.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 pr-4 font-mono font-bold text-slate-900">{s.shift_code}</td>
                <td className="py-3 pr-4 font-semibold text-slate-900">{s.shift_name}</td>
                <td className="py-3 pr-4"><span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{s.shift_type}</span></td>
                <td className="py-3 pr-4 font-semibold">{s.start_time?.slice(0, 5)}</td>
                <td className="py-3 pr-4 font-semibold">{s.end_time?.slice(0, 5)}</td>
                <td className="py-3 pr-4 font-semibold">{s.break_start_time ? String(s.break_start_time).slice(0, 5) : "-"}</td>
                <td className="py-3 pr-4 font-semibold">{s.break_end_time ? String(s.break_end_time).slice(0, 5) : "-"}</td>
                <td className="py-3 pr-4 font-semibold">{s.working_hours ? `${s.working_hours}h` : "-"}</td>
                <td className="py-3 pr-4 font-semibold">{s.late_tolerance_minutes != null ? `${s.late_tolerance_minutes}m` : "-"}</td>
                <td className="py-3 pr-4 font-semibold">{s.early_leave_tolerance_minutes != null ? `${s.early_leave_tolerance_minutes}m` : "-"}</td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button disabled={!canManage} onClick={() => onEdit(s)} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><FiEdit2 className="h-4 w-4" /></button>
                    <button disabled={!canManage} onClick={() => onDelete(s)} className="grid h-8 w-8 place-items-center rounded-md text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><FiTrash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-extrabold text-slate-900">Shift Type Master</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHIFT_TYPES.map(([key, label]) => (
          <div key={key} className="rounded-lg border border-slate-200 p-4">
            <p className="font-bold text-slate-900">{label}</p>
            <p className="mt-1 text-xs text-slate-500">{key === "fixed" ? "Same working hours every day" : key === "rotational" ? "Rotating shift schedule" : key === "flexible" ? "Flexible working hours" : key === "night" ? "Overnight working schedule" : "Multiple working periods in one day"}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ScheduleAssignmentTab = ({ schedules, users, shifts, onEdit, onDelete, onAdd, canManage }) => {
  const userMap = useMemo(() => new Map((users || []).map((u) => [u.id, u])), [users]);
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">Schedule Assignment</h3>
          <button disabled={!canManage} onClick={onAdd} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            <FiPlus className="h-4 w-4" /> Assign Schedule
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                <th className="py-3 pr-4">Employee</th>
                <th className="py-3 pr-4">Department</th>
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Shift</th>
                <th className="py-3 pr-4">Start</th>
                <th className="py-3 pr-4">End</th>
                <th className="py-3 pr-4">Rest Day</th>
                <th className="py-3 pr-4">Holiday</th>
                <th className="py-3 pr-4">Schedule Status</th>
                <th className="py-3 pr-4">Remarks</th>
                <th className="py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr className="border-b border-slate-100 text-slate-500">
                  <td className="py-4 pr-4 font-medium" colSpan={11}>No schedules yet. Click "Assign Schedule" to create one.</td>
                </tr>
              ) : schedules.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-xs font-bold">{s.employee_name?.[0] || "?"}</span>
                      <div>
                        <p className="font-bold text-slate-900">{s.employee_name}</p>
                        <p className="text-xs text-slate-500">{s.employee_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-slate-700">{s.department || "-"}</td>
                  <td className="py-3 pr-4 font-semibold">{s.work_date}</td>
                  <td className="py-3 pr-4"><span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">{s.shift_name}</span></td>
                  <td className="py-3 pr-4 font-semibold">{s.start_time?.slice(0, 5)}</td>
                  <td className="py-3 pr-4 font-semibold">{s.end_time?.slice(0, 5)}</td>
                  <td className="py-3 pr-4">{s.is_rest_day ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">Yes</span> : <span className="text-xs text-slate-400">No</span>}</td>
                  <td className="py-3 pr-4">{s.is_public_holiday ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">Yes</span> : <span className="text-xs text-slate-400">No</span>}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.schedule_status === "Approved" ? "bg-emerald-100 text-emerald-700" : s.schedule_status === "Completed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {s.schedule_status || "Planned"}
                    </span>
                  </td>
                  <td className="max-w-[120px] truncate py-3 pr-4 text-xs text-slate-500" title={s.remarks || ""}>{s.remarks || "-"}</td>
                  <td className="py-3 pr-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button disabled={!canManage} onClick={() => onEdit(s)} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><FiEdit2 className="h-4 w-4" /></button>
                      <button disabled={!canManage} onClick={() => onDelete(s)} className="grid h-8 w-8 place-items-center rounded-md text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><FiTrash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
    <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><FiX className="h-5 w-5" /></button>
      </div>
      {children}
    </div>
  </div>
);

const ShiftForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { shift_code: "", shift_name: "", shift_type: "fixed", start_time: "08:00", end_time: "17:00", break_start_time: "", break_end_time: "", working_hours: "", late_tolerance_minutes: "0", early_leave_tolerance_minutes: "0", is_active: true });
  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Shift Code *</span>
          <input className={inputClass} value={form.shift_code} onChange={(e) => update({ shift_code: e.target.value })} required disabled={!!initial?.id} />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Shift Name *</span>
          <input className={inputClass} value={form.shift_name} onChange={(e) => update({ shift_name: e.target.value })} required />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Type *</span>
          <select className={inputClass} value={form.shift_type} onChange={(e) => update({ shift_type: e.target.value })} required>
            {SHIFT_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Working Hours</span>
          <input className={inputClass} type="number" step="0.5" value={form.working_hours} onChange={(e) => update({ working_hours: e.target.value })} placeholder="e.g. 8" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Start Time *</span>
          <input className={inputClass} type="time" value={form.start_time} onChange={(e) => update({ start_time: e.target.value })} required />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">End Time *</span>
          <input className={inputClass} type="time" value={form.end_time} onChange={(e) => update({ end_time: e.target.value })} required />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Break Start Time</span>
          <input className={inputClass} type="time" value={form.break_start_time} onChange={(e) => update({ break_start_time: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Break End Time</span>
          <input className={inputClass} type="time" value={form.break_end_time} onChange={(e) => update({ break_end_time: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Late Tolerance (min)</span>
          <input className={inputClass} type="number" value={form.late_tolerance_minutes} onChange={(e) => update({ late_tolerance_minutes: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Early Leave Tolerance (min)</span>
          <input className={inputClass} type="number" value={form.early_leave_tolerance_minutes} onChange={(e) => update({ early_leave_tolerance_minutes: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Active</span>
          <select className={inputClass} value={form.is_active ? "true" : "false"} onChange={(e) => update({ is_active: e.target.value === "true" })}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-3">
        <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="submit" className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700">Save</button>
      </div>
    </form>
  );
};

const ScheduleForm = ({ initial, users, shifts, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { user_id: "", shift_id: "", shift_name: "", work_date: "", start_time: "08:00", end_time: "17:00", location: "", is_rest_day: false, is_public_holiday: false, schedule_status: "Planned", remarks: "" });
  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };
  const selectedShift = shifts.find((s) => s.id === Number(form.shift_id));
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block col-span-2">
          <span className="text-xs font-bold text-slate-500">Employee *</span>
          <select className={inputClass} value={form.user_id} onChange={(e) => update({ user_id: e.target.value })} required disabled={!!initial?.id}>
            <option value="">Select employee...</option>
            {(users || []).map((u) => <option key={u.id} value={u.id}>{u.name} ({u.emp_code || u.id})</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Date *</span>
          <input className={inputClass} type="date" value={form.work_date} onChange={(e) => update({ work_date: e.target.value })} required />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Shift *</span>
          <select className={inputClass} value={form.shift_id} onChange={(e) => {
            const s = shifts.find((x) => x.id === Number(e.target.value));
            update({ shift_id: e.target.value, shift_name: s?.shift_name || "", start_time: s?.start_time?.slice(0, 5) || "08:00", end_time: s?.end_time?.slice(0, 5) || "17:00" });
          }} required>
            <option value="">Select shift...</option>
            {shifts.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.shift_name} ({s.shift_code})</option>)}
          </select>
        </label>
        {selectedShift && (
          <>
            <label className="block">
              <span className="text-xs font-bold text-slate-500">Start Time</span>
              <input className={inputClass} type="time" value={form.start_time} onChange={(e) => update({ start_time: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-500">End Time</span>
              <input className={inputClass} type="time" value={form.end_time} onChange={(e) => update({ end_time: e.target.value })} />
            </label>
          </>
        )}
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Rest Day</span>
          <select className={inputClass} value={form.is_rest_day ? "true" : "false"} onChange={(e) => update({ is_rest_day: e.target.value === "true" })}>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Public Holiday</span>
          <select className={inputClass} value={form.is_public_holiday ? "true" : "false"} onChange={(e) => update({ is_public_holiday: e.target.value === "true" })}>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Schedule Status *</span>
          <select className={inputClass} value={form.schedule_status} onChange={(e) => update({ schedule_status: e.target.value })} required>
            <option value="Planned">Planned</option>
            <option value="Approved">Approved</option>
            <option value="Completed">Completed</option>
          </select>
        </label>
        <label className="block col-span-2">
          <span className="text-xs font-bold text-slate-500">Location</span>
          <input className={inputClass} value={form.location} onChange={(e) => update({ location: e.target.value })} placeholder="Office / Remote / Client site" />
        </label>
        <label className="block col-span-2">
          <span className="text-xs font-bold text-slate-500">Remarks</span>
          <textarea className="min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500" value={form.remarks} onChange={(e) => update({ remarks: e.target.value })} placeholder="Additional comments..." />
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-3">
        <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="submit" className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700">{initial?.id ? "Update" : "Assign"}</button>
      </div>
    </form>
  );
};

const DeleteConfirm = ({ label, onConfirm, onClose }) => (
  <Modal title="Confirm Delete" onClose={onClose}>
    <p className="text-sm text-slate-600">Are you sure you want to delete {label}?</p>
    <div className="flex justify-end gap-3 pt-4">
      <button onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
      <button onClick={onConfirm} className="h-10 rounded-lg bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700">Delete</button>
    </div>
  </Modal>
);

export default function ShiftPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canManage = ["line_manager", "department_head", "management_hr"].includes(role);
  const [activeTab, setActiveTab] = useState("setup");
  const [shifts, setShifts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type: "shift-form" | "schedule-form" | "delete", data? }
  const [deptFilter, setDeptFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");

  const userMap = useMemo(() => new Map((users || []).map((u) => [u.id, u])), [users]);

  const departments = useMemo(
    () => [...new Set(users.map((u) => u.department).filter(Boolean))],
    [users],
  );
  const unitOptions = useMemo(
    () => [...new Set(
      users
        .filter((u) => deptFilter === "all" || u.department === deptFilter)
        .map((u) => u.sub_department)
        .filter(Boolean)
    )],
    [users, deptFilter],
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, schRes, uRes] = await Promise.all([
        api.get("/api/shifts"),
        api.get("/api/shifts/schedules"),
        api.get("/api/admin/users").catch(() => ({ data: [] })),
      ]);
      setShifts(sRes.data || []);
      setSchedules(schRes.data || []);
      setUsers(uRes.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { void loadAll(); }, []);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((sched) => {
      const u = userMap.get(sched.user_id);
      if (!u) return true;
      if (deptFilter !== "all" && u.department !== deptFilter) return false;
      if (unitFilter !== "all" && u.sub_department !== unitFilter) return false;
      return true;
    });
  }, [schedules, userMap, deptFilter, unitFilter]);

  const employeesByShift = useMemo(() => {
    const map = new Map();
    filteredSchedules.forEach((sched) => {
      const key = sched.shift_name || "Unassigned";
      if (!map.has(key)) map.set(key, new Map());
      const empMap = map.get(key);
      if (!empMap.has(sched.user_id)) {
        const u = userMap.get(sched.user_id);
        empMap.set(sched.user_id, {
          id: sched.user_id,
          name: sched.employee_name,
          code: sched.employee_code,
          department: sched.department,
          sub_department: u?.sub_department,
        });
      }
    });
    return Array.from(map.entries())
      .map(([shiftName, empMap]) => ({ shiftName, employees: Array.from(empMap.values()) }))
      .filter((s) => s.shiftName !== "Standard Day")
      .sort((a, b) => b.employees.length - a.employees.length);
  }, [filteredSchedules, userMap]);

  const shiftTypeMap = useMemo(
    () => new Map((shifts || []).map((s) => [s.id, s.shift_type])),
    [shifts],
  );

  const employeesByShiftType = useMemo(() => {
    const init = Object.fromEntries(SHIFT_TYPES.map(([key, label]) => [key, { type: key, label, employees: [] }]));
    const map = new Map(Object.entries(init));
    const seen = {};
    filteredSchedules.forEach((sched) => {
      const type = shiftTypeMap.get(sched.shift_id) || "unknown";
      const dedupKey = `${type}:${sched.user_id}`;
      if (seen[dedupKey]) return;
      seen[dedupKey] = true;
      if (!map.has(type)) map.set(type, { type, label: "Other", employees: [] });
      const u = userMap.get(sched.user_id);
      map.get(type).employees.push({
        id: sched.user_id,
        name: sched.employee_name,
        code: sched.employee_code,
        department: sched.department,
        sub_department: u?.sub_department,
      });
    });
    return Array.from(map.values()).filter((group) => group.type !== "unknown");
  }, [filteredSchedules, shiftTypeMap, userMap]);

  const handleSaveShift = async (form) => {
    const payload = {
      ...form,
      working_hours: form.working_hours ? Number(form.working_hours) : null,
      late_tolerance_minutes: form.late_tolerance_minutes ? Number(form.late_tolerance_minutes) : 0,
    };
    if (form.id) {
      await api.put(`/api/shifts/${form.id}`, payload);
    } else {
      await api.post("/api/shifts", payload);
    }
    setModal(null);
    await loadAll();
  };

  const handleDeleteShift = async (shift) => {
    await api.delete(`/api/shifts/${shift.id}`);
    setModal(null);
    await loadAll();
  };

  const handleSaveSchedule = async (form) => {
    const payload = {
      ...form,
      user_id: Number(form.user_id),
      shift_id: form.shift_id ? Number(form.shift_id) : null,
    };
    if (form.id) {
      await api.put(`/api/shifts/schedules/${form.id}`, payload);
    } else {
      await api.post("/api/shifts/schedules", payload);
    }
    setModal(null);
    await loadAll();
  };

  const handleDeleteSchedule = async (sched) => {
    await api.delete(`/api/shifts/schedules/${sched.id}`);
    setModal(null);
    await loadAll();
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="-ml-1 grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100"><FiChevronLeft className="h-6 w-6" /></button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Shift & Schedule Management</h1>
            <p className="mt-1 text-sm text-slate-500">Manage employee work schedules, shift assignments, and workforce planning.</p>
          </div>
        </div>
      </div>

      {!canManage && (
        <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          You can view shift data, but only HR and managers can add, edit, or delete shifts and schedules.
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {employeesByShiftType.map(({ type, label, employees }) => (
          <div key={type} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-extrabold text-slate-900">{label}</h4>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{employees.length}</span>
            </div>
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {employees.length === 0 ? (
                <p className="text-sm text-slate-400">No employees</p>
              ) : employees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-2 rounded-lg hover:bg-slate-50">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                    {emp.name?.[0] || "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{emp.name}</p>
                    <p className="truncate text-[11px] font-semibold text-slate-500">{emp.code}{emp.department ? ` · ${emp.department}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setUnitFilter("all"); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none">
          <option value="all">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none">
          <option value="all">All Units</option>
          {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {employeesByShift.map(({ shiftName, employees }) => (
          <div key={shiftName} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-extrabold text-slate-900">{shiftName}</h4>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{employees.length}</span>
            </div>
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-2 rounded-lg hover:bg-slate-50">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                    {emp.name?.[0] || "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{emp.name}</p>
                    <p className="truncate text-[11px] font-semibold text-slate-500">{emp.code}{emp.department ? ` · ${emp.department}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>


      <div className="mb-6 flex gap-1 rounded-xl bg-white p-1 shadow-sm">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${activeTab === tab.key ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100"}`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-white" />)}
        </div>
      ) : (
        <>
          {activeTab === "setup" && (
            <ShiftSetupTab
              shifts={shifts}
              onEdit={(s) => setModal({ type: "shift-form", data: s })}
              onDelete={(s) => setModal({ type: "delete-shift", data: s })}
              onAdd={() => setModal({ type: "shift-form", data: null })}
              canManage={canManage}
            />
          )}
          {activeTab === "assignment" && (
            <ScheduleAssignmentTab
              schedules={filteredSchedules}
              users={users}
              shifts={shifts}
              onEdit={(s) => setModal({ type: "schedule-form", data: s })}
              onDelete={(s) => setModal({ type: "delete-schedule", data: s })}
              onAdd={() => setModal({ type: "schedule-form", data: null })}
              canManage={canManage}
            />
          )}
        </>
      )}

      {modal?.type === "shift-form" && (
        <Modal title={modal.data ? "Edit Shift" : "Add Shift"} onClose={() => setModal(null)}>
          <ShiftForm initial={modal.data} onSave={handleSaveShift} onClose={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === "schedule-form" && (
        <Modal title={modal.data ? "Edit Schedule" : "Assign Schedule"} onClose={() => setModal(null)}>
          <ScheduleForm initial={modal.data} users={users} shifts={shifts} onSave={handleSaveSchedule} onClose={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === "delete-shift" && (
        <DeleteConfirm label={`shift "${modal.data.shift_name}"`} onConfirm={() => handleDeleteShift(modal.data)} onClose={() => setModal(null)} />
      )}

      {modal?.type === "delete-schedule" && (
        <DeleteConfirm label={`schedule for ${modal.data.employee_name} on ${modal.data.work_date}`} onConfirm={() => handleDeleteSchedule(modal.data)} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
