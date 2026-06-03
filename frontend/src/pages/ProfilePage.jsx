import { useEffect, useMemo, useState } from "react";
import {
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiShield,
  FiLogOut,
  FiTrendingUp,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const tabs = [
  { id: "personal", label: "Personal", icon: FiUser },
  { id: "employment", label: "Employment", icon: FiBriefcase },
  { id: "attendance", label: "Attendance", icon: FiClock },
  { id: "payroll", label: "Payroll", icon: FiCreditCard },
  { id: "performance", label: "Performance", icon: FiTrendingUp },
  { id: "training", label: "Training", icon: FiBookOpen },
  { id: "history", label: "History", icon: FiFileText },
];

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatLabel = (value) => {
  if (!value) return "";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatShortDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const monthLabel = (year, month) =>
  new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

const compactNumber = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });

const yearsBetween = (value) => {
  if (!value) return "";
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return "";
  const diff = Date.now() - start.getTime();
  if (diff < 0) return "";
  return (diff / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
};

const initialsFor = (value) =>
  String(value || "U")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const dateOnly = (value) => String(value || "").slice(0, 10);

const FieldRow = ({ icon: Icon, label, value }) => {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3 text-sm font-semibold text-[#37517e]">
        <Icon className="h-4 w-4 shrink-0 text-[#37517e]/75" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <div className="min-w-0 whitespace-pre-line text-sm font-bold leading-6 text-[#111b4f]">
        {value}
      </div>
    </div>
  );
};

const DetailItem = ({ icon: Icon, label, value }) => {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="flex min-w-0 items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#37517e]" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-bold text-[#37517e]/75">{label}</p>
        <p className="mt-1 truncate text-sm font-extrabold text-[#111b4f]">
          {value}
        </p>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, helper, icon: Icon, tone }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-4">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${tone}`}>
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-[#111b4f]">{label}</p>
        <p className="mt-2 text-3xl font-extrabold leading-none text-[#071a33]">
          {value}
        </p>
        {helper && (
          <p className="mt-2 text-xs font-bold text-[#37517e]/75">{helper}</p>
        )}
      </div>
    </div>
  </div>
);

const SectionCard = ({ title, children }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-extrabold text-[#111b4f]">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>
);

const EmptyState = ({ children }) => (
  <div className="rounded-lg border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-500">
    {children}
  </div>
);

const RecordGrid = ({ rows }) => {
  const visibleRows = rows.filter((row) => row.value !== undefined && row.value !== null && row.value !== "");

  if (!visibleRows.length) return <EmptyState>No recorded information yet.</EmptyState>;

  return (
    <div>
      {visibleRows.map((row) => (
        <FieldRow key={row.label} {...row} />
      ))}
    </div>
  );
};

function TabPanel({ activeTab, profile, attendance }) {
  const user = profile?.user || {};
  const employee = profile?.profile || {};
  const manager = profile?.manager;
  const payslips = profile?.payslips || [];
  const performance = profile?.performance || [];
  const training = profile?.training || [];
  const history = profile?.history || [];
  const attendanceRecords = attendance?.records || [];

  if (activeTab === "employment") {
    return (
      <SectionCard title="Employment Information">
        <RecordGrid
          rows={[
            { icon: FiBriefcase, label: "Department", value: user.department || employee.department },
            { icon: FiUsers, label: "Sub Department", value: employee.sub_department },
            { icon: FiFileText, label: "Position", value: employee.position },
            { icon: FiAward, label: "Job Grade", value: employee.job_grade },
            { icon: FiBriefcase, label: "Contract Type", value: formatLabel(employee.contract_type) },
            { icon: FiCalendar, label: "Contract Start Date", value: formatDate(employee.contract_start_date) },
            { icon: FiCalendar, label: "Contract End Date", value: formatDate(employee.contract_end_date) },
            { icon: FiCreditCard, label: "Basic Salary", value: employee.basic_salary ? `$${money(employee.basic_salary)}` : "" },
            { icon: FiCreditCard, label: "Bank Account", value: employee.bank_account },
            { icon: FiShield, label: "Status", value: formatLabel(employee.status) },
          ]}
        />
      </SectionCard>
    );
  }

  if (activeTab === "attendance") {
    return (
      <SectionCard title="Current Month Attendance">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-xs font-extrabold uppercase text-[#37517e]/65">Worked Days</p>
            <p className="mt-2 text-2xl font-extrabold text-[#111b4f]">{attendance?.total_worked_days || 0}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-xs font-extrabold uppercase text-[#37517e]/65">Late Days</p>
            <p className="mt-2 text-2xl font-extrabold text-[#111b4f]">{attendance?.total_late_days || 0}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-xs font-extrabold uppercase text-[#37517e]/65">OT Hours</p>
            <p className="mt-2 text-2xl font-extrabold text-[#111b4f]">{compactNumber(attendance?.total_ot_hours)}</p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {attendanceRecords.slice(-6).reverse().map((row) => (
            <div key={row.id || row.date} className="grid gap-2 px-4 py-3 text-sm font-bold text-[#111b4f] sm:grid-cols-[1fr_auto]">
              <span>{formatShortDate(row.date)}</span>
              <span className="text-[#37517e]">
                {row.check_in_time || "--"} / {row.check_out_time || "--"}
              </span>
            </div>
          ))}
          {!attendanceRecords.length && (
            <div className="px-4 py-5 text-sm font-bold text-slate-500">
              No attendance records for this month.
            </div>
          )}
        </div>
      </SectionCard>
    );
  }

  if (activeTab === "payroll") {
    return (
      <SectionCard title="Published Payslips">
        <div className="grid gap-3 md:grid-cols-2">
          {payslips.map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-extrabold text-[#111b4f]">
                {monthLabel(row.period_year, row.period_month)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-bold text-[#37517e]/65">Gross Pay</p>
                  <p className="mt-1 font-extrabold text-[#111b4f]">${money(row.gross_pay)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#37517e]/65">Net Pay</p>
                  <p className="mt-1 font-extrabold text-emerald-700">${money(row.net_pay)}</p>
                </div>
              </div>
            </div>
          ))}
          {!payslips.length && <EmptyState>No published payslips yet.</EmptyState>}
        </div>
      </SectionCard>
    );
  }

  if (activeTab === "performance") {
    return (
      <SectionCard title="Performance Reviews">
        <div className="grid gap-3 md:grid-cols-2">
          {performance.map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-[#111b4f]">{row.review_period}</p>
                  <p className="mt-1 text-xs font-bold text-[#37517e]/70">{formatLabel(row.rating)}</p>
                </div>
                <span className="rounded-md bg-blue-100 px-3 py-1 text-sm font-extrabold text-blue-700">
                  {compactNumber(row.score)}%
                </span>
              </div>
              {row.comments && (
                <p className="mt-3 text-sm font-semibold leading-6 text-[#37517e]">{row.comments}</p>
              )}
            </div>
          ))}
          {!performance.length && <EmptyState>No performance reviews recorded yet.</EmptyState>}
        </div>
      </SectionCard>
    );
  }

  if (activeTab === "training") {
    return (
      <SectionCard title="Training Records">
        <div className="grid gap-3 md:grid-cols-2">
          {training.map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-extrabold text-[#111b4f]">{row.title}</p>
              <p className="mt-1 text-xs font-bold text-[#37517e]/70">
                {[row.provider, formatLabel(row.status)].filter(Boolean).join(" - ")}
              </p>
              <p className="mt-3 text-sm font-bold text-[#37517e]">
                {[formatShortDate(row.start_date), formatShortDate(row.end_date)].filter(Boolean).join(" - ")}
              </p>
              {row.score !== null && row.score !== undefined && (
                <p className="mt-2 text-sm font-extrabold text-[#111b4f]">Score: {compactNumber(row.score)}%</p>
              )}
            </div>
          ))}
          {!training.length && <EmptyState>No training records recorded yet.</EmptyState>}
        </div>
      </SectionCard>
    );
  }

  if (activeTab === "history") {
    return (
      <SectionCard title="Employee History">
        <div className="space-y-3">
          {history.map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-extrabold text-[#111b4f]">{row.title}</p>
                  {row.description && (
                    <p className="mt-1 text-sm font-semibold leading-6 text-[#37517e]">{row.description}</p>
                  )}
                </div>
                <span className="shrink-0 rounded-md bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700">
                  {formatShortDate(row.effective_date)}
                </span>
              </div>
            </div>
          ))}
          {!history.length && <EmptyState>No employee history recorded yet.</EmptyState>}
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard title="Personal Information">
        <RecordGrid
          rows={[
            { icon: FiUser, label: "Full Name", value: user.name },
            { icon: FiFileText, label: "Employee ID", value: user.emp_code },
            { icon: FiMail, label: "Email Address", value: user.email },
            { icon: FiShield, label: "Role", value: formatLabel(user.role) },
            { icon: FiBriefcase, label: "Department", value: user.department || employee.department },
            { icon: FiShield, label: "Status", value: formatLabel(employee.status) },
          ]}
        />
      </SectionCard>

      <SectionCard title="Contact Information">
        <RecordGrid
          rows={[
            { icon: FiPhone, label: "Phone Number", value: employee.phone },
            { icon: FiMapPin, label: "Address", value: employee.address },
            { icon: FiUsers, label: "Manager", value: manager?.name },
            { icon: FiMail, label: "Manager Email", value: manager?.email },
          ]}
        />
      </SectionCard>
    </div>
  );
}

export default function ProfilePage() {
  const { name, role, empCode, logout } = useAuth();
  const today = new Date();
  const [activeTab, setActiveTab] = useState("personal");
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [profileRes, attendanceRes] = await Promise.all([
        api.get("/api/hris/my-profile"),
        api.get(`/api/attendance/monthly?year=${today.getFullYear()}&month=${today.getMonth() + 1}`),
      ]);
      setProfile(profileRes.data || null);
      setAttendance(attendanceRes.data || null);
      setStatus("");
    } catch (err) {
      setStatus(err?.response?.data?.detail || "Could not load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const user = profile?.user || {};
  const employee = profile?.profile || {};
  const manager = profile?.manager;
  const performance = profile?.performance || [];
  const payslips = profile?.payslips || [];
  const displayName = user.name || name || "Employee";
  const displayRole = formatLabel(user.role || role);
  const displayCode = user.emp_code || empCode;
  const startDate = employee.contract_start_date || user.created_at;
  const latestPerformance = performance[0];
  const latestPayslip = payslips[0];
  const serviceYears = yearsBetween(startDate);

  const metrics = useMemo(
    () => [
      {
        label: "Worked Days",
        value: attendance?.total_worked_days || 0,
        helper: monthLabel(today.getFullYear(), today.getMonth() + 1),
        icon: FiCalendar,
        tone: "bg-emerald-100 text-emerald-600",
      },
      {
        label: "Late Days",
        value: attendance?.total_late_days || 0,
        helper: "Current month",
        icon: FiClock,
        tone: "bg-amber-100 text-amber-600",
      },
      {
        label: "OT Hours",
        value: compactNumber(attendance?.total_ot_hours),
        helper: "Current month",
        icon: FiTrendingUp,
        tone: "bg-blue-100 text-blue-600",
      },
      {
        label: latestPerformance ? "Performance Score" : "Years of Service",
        value: latestPerformance ? `${compactNumber(latestPerformance.score)}%` : serviceYears || "-",
        helper: latestPerformance?.review_period || (serviceYears ? "Based on recorded start date" : "No start date recorded"),
        icon: latestPerformance ? FiAward : FiBriefcase,
        tone: "bg-violet-100 text-violet-600",
      },
    ],
    [attendance, latestPerformance, serviceYears, today],
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f5f7fb] px-4 py-5 md:px-6">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center">
              <div className="grid h-32 w-32 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 via-slate-100 to-emerald-100 text-4xl font-extrabold text-blue-700 ring-1 ring-slate-200">
                {employee.profile_photo ? (
                  <img src={employee.profile_photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  initialsFor(displayName)
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  {employee.status && (
                    <span className="inline-flex items-center gap-2 rounded-md bg-emerald-100 px-3 py-1.5 text-sm font-extrabold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {formatLabel(employee.status)}
                    </span>
                  )}
                  <h1 className="font-display text-3xl font-extrabold text-[#071a33] md:text-4xl">
                    {displayName}
                  </h1>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-white">
                    <FiCheckCircle className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                {displayRole && (
                  <p className="mt-2 text-lg font-extrabold text-blue-700">{displayRole}</p>
                )}

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailItem icon={FiFileText} label="Employee ID" value={displayCode} />
                  <DetailItem icon={FiBriefcase} label="Department" value={user.department || employee.department} />
                  <DetailItem icon={FiUsers} label="Position" value={employee.position} />
                  <DetailItem icon={FiUser} label="Manager" value={manager?.name} />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={load}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-extrabold text-[#111b4f] hover:bg-slate-50"
              >
                <FiRefreshCw className="h-4 w-4" aria-hidden />
                Refresh
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#071a33] px-4 text-sm font-extrabold text-white shadow-sm hover:bg-[#0d274a]"
              >
                <FiLogOut className="h-4 w-4" aria-hidden />
                Logout
              </button>
            </div>
          </div>
        </section>

        {status && (
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            {status}
          </div>
        )}

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">
            Loading profile...
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((item) => (
                <MetricCard key={item.label} {...item} />
              ))}
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto border-b border-slate-100 px-4 md:px-5">
                  <div className="flex min-w-max gap-3">
                    {tabs.map(({ id, label, icon: Icon }) => {
                      const isActive = activeTab === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setActiveTab(id)}
                          className={`flex h-14 items-center gap-2 border-b-2 px-2 text-sm font-extrabold transition ${
                            isActive
                              ? "border-blue-600 text-blue-600"
                              : "border-transparent text-[#37517e] hover:text-[#111b4f]"
                          }`}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 md:p-5">
                  <TabPanel activeTab={activeTab} profile={profile} attendance={attendance} />
                </div>
              </section>

              <aside className="space-y-4">
                <SectionCard title="Manager">
                  {manager ? (
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700">
                        {initialsFor(manager.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-[#111b4f]">{manager.name}</p>
                        <p className="truncate text-xs font-bold text-[#37517e]/75">{manager.email}</p>
                      </div>
                    </div>
                  ) : (
                    <EmptyState>No manager recorded.</EmptyState>
                  )}
                </SectionCard>

                <SectionCard title="Latest Payslip">
                  {latestPayslip ? (
                    <div className="rounded-lg bg-slate-50 p-4">
                      <p className="text-sm font-extrabold text-[#111b4f]">
                        {monthLabel(latestPayslip.period_year, latestPayslip.period_month)}
                      </p>
                      <p className="mt-3 text-3xl font-extrabold text-emerald-700">
                        ${money(latestPayslip.net_pay)}
                      </p>
                      <p className="mt-2 text-xs font-bold text-[#37517e]/75">
                        {formatLabel(latestPayslip.status)}
                      </p>
                    </div>
                  ) : (
                    <EmptyState>No published payslip yet.</EmptyState>
                  )}
                </SectionCard>

                <SectionCard title="Recorded Dates">
                  <RecordGrid
                    rows={[
                      { icon: FiCalendar, label: "Created", value: formatDate(user.created_at) },
                      { icon: FiCalendar, label: "Contract Start", value: formatDate(employee.contract_start_date) },
                      { icon: FiCalendar, label: "Contract End", value: formatDate(employee.contract_end_date) },
                      { icon: FiBriefcase, label: "Years of Service", value: serviceYears ? `${serviceYears} years` : "" },
                    ]}
                  />
                </SectionCard>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
