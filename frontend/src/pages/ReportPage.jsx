import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { IoFlame } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const ANNUAL_LEAVE = 18;
const SICK_LEAVE = 6;

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const dateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const localYear = value.getFullYear();
  const localMonth = String(value.getMonth() + 1).padStart(2, "0");
  const localDay = String(value.getDate()).padStart(2, "0");
  return `${localYear}-${localMonth}-${localDay}`;
};

const getMondayIndex = (date) => (date.getDay() + 6) % 7;

const hasScan = (record) => !!(record?.check_in_time || record?.check_out_time);

const isWorkflowRequest = (request) =>
  request?.type === "leave" || request?.type === "permission";

const isCoveredRequest = (request) =>
  isWorkflowRequest(request) && request.status === "approved";

const isPendingRequest = (request) =>
  isWorkflowRequest(request) && request.status === "pending";

const isHolidayRecord = (record) => {
  const text = `${record?.status || ""} ${record?.remark || ""}`.toLowerCase();
  return text.includes("holiday");
};

const getDayStatus = ({ date, record, request, todayKey }) => {
  const key = dateKey(date);
  if (isHolidayRecord(record)) return "holiday";
  if (isCoveredRequest(request)) return "leave";
  if (isPendingRequest(request) && !hasScan(record)) return "pending_request";
  if (hasScan(record)) return record?.is_late ? "late" : "on_time";
  if (key > todayKey) return "future";
  if (date.getDay() === 0) return "empty";
  return "absent";
};

const getCellClass = (status, isToday) => {
  if (isToday) {
    return "border-2 border-emerald-700 bg-emerald-50 text-emerald-800";
  }
  if (status === "on_time") return "bg-[#e8f2df] text-slate-900";
  if (status === "late") return "bg-[#fff1bf] text-slate-900";
  if (status === "absent") return "bg-[#ffe3e3] text-slate-900";
  if (status === "holiday") return "bg-[#dcebff] text-[#2f67e8]";
  if (status === "leave") return "bg-[#e8f0ff] text-[#3159c9]";
  if (status === "pending_request") {
    return "bg-[#fff7db] text-[#9a5b10] ring-1 ring-amber-200";
  }
  return "bg-transparent text-slate-600";
};

const getDotClass = (status) => {
  if (status === "on_time") return "bg-emerald-700";
  if (status === "late") return "bg-[#c26513]";
  if (status === "absent") return "bg-[#c91d22]";
  if (status === "holiday") return "bg-[#2f67e8]";
  if (status === "leave") return "bg-[#3159c9]";
  if (status === "pending_request") return "bg-[#d97706]";
  return "";
};

const MonthDay = ({ day }) => {
  if (!day) {
    return <div className="h-10" aria-hidden />;
  }

  const isMarked = [
    "on_time",
    "late",
    "absent",
    "holiday",
    "leave",
    "pending_request",
  ].includes(day.status);

  return (
    <div className="flex min-h-[41px] justify-center md:min-h-[48px]">
      <div
        className={`grid h-10 min-w-10 place-items-center rounded-lg px-2 text-sm font-semibold md:h-9 md:min-w-9 ${getCellClass(
          day.status,
          day.isToday,
        )}`}
      >
        <span className="leading-none">{day.date.getDate()}</span>
        {day.status === "holiday" ? (
          <span className="mt-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[#2f67e8] px-1 text-[8px] font-black leading-none text-white">
            H
          </span>
        ) : (
          isMarked && (
            <span
              className={`mt-0.5 h-1.5 w-1.5 rounded-full ${getDotClass(
                day.status,
              )}`}
            />
          )
        )}
      </div>
    </div>
  );
};

const LegendItem = ({ label, className }) => (
  <span className="inline-flex items-center gap-2">
    <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
    {label}
  </span>
);

const SummaryTile = ({ label, value, helper, tone = "text-slate-950" }) => (
  <div className="rounded-lg bg-[#f8f8f8] px-3 py-3 md:px-4">
    <p className="text-xs font-semibold text-slate-400">{label}</p>
    <p className={`mt-1 text-2xl font-extrabold leading-none ${tone}`}>
      {value}
    </p>
    <p className="mt-1 text-xs font-semibold text-slate-400">{helper}</p>
  </div>
);

const LeaveMetric = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold leading-5 text-slate-400 md:text-sm">
      {label}
    </p>
    <p className="mt-1 text-base font-extrabold text-slate-900">{value}</p>
  </div>
);

export default function ReportPage() {
  const now = new Date();
  const todayKey = dateKey(now);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [attendanceRes, requestsRes] = await Promise.all([
        api.get(`/api/attendance/monthly?year=${year}&month=${month}`),
        api.get("/api/requests/my").catch(() => ({ data: [] })),
      ]);

      setStats(attendanceRes.data);
      setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
    } catch (err) {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [month, year]);

  const report = useMemo(() => {
    const records = Array.isArray(stats?.records) ? stats.records : [];
    const byDate = new Map(records.map((record) => [dateKey(record.date), record]));
    const requestsByDate = new Map(
      requests
        .filter((request) => dateKey(request.date).startsWith(`${year}-${String(month).padStart(2, "0")}`))
        .map((request) => [dateKey(request.date), request]),
    );
    const daysInMonth = new Date(year, month, 0).getDate();
    const isCurrentMonth =
      year === now.getFullYear() && month === now.getMonth() + 1;

    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, month - 1, index + 1);
      const key = dateKey(date);
      const record = byDate.get(key);
      const request = requestsByDate.get(key);

      return {
        date,
        key,
        record,
        request,
        weekday: getMondayIndex(date),
        isToday: key === todayKey,
        status: getDayStatus({ date, record, request, todayKey }),
      };
    });

    const visibleDays = days.filter(
      (day) => !isCurrentMonth || day.key <= todayKey,
    );
    const workingDays = days.filter((day) => day.date.getDay() !== 0).length;
    const onTime = visibleDays.filter((day) => day.status === "on_time").length;
    const late =
      stats?.total_late_days ??
      visibleDays.filter((day) => day.status === "late").length;
    const absent = visibleDays.filter((day) => day.status === "absent").length;
    const leave = visibleDays.filter((day) => day.status === "leave").length;
    const holiday = visibleDays.filter((day) => day.status === "holiday").length;
    const rate = workingDays ? Math.round((onTime / workingDays) * 100) : 0;

    let streak = 0;
    for (const day of [...visibleDays].reverse()) {
      if (day.status === "on_time") {
        streak += 1;
      } else if (["future", "empty", "holiday"].includes(day.status)) {
        continue;
      } else {
        break;
      }
    }

    return {
      days,
      calendarCells: [
        ...Array.from({ length: days[0]?.weekday || 0 }, () => null),
        ...days,
      ],
      daysByWeekday: weekdays.map((_, index) =>
        days.filter((day) => day.weekday === index),
      ),
      workingDays,
      onTime,
      late,
      absent,
      leave,
      holiday,
      rate,
      streak,
    };
  }, [month, requests, stats, todayKey, year]);

  const leave = useMemo(() => {
    const approvedLeaves = requests.filter(
      (request) =>
        request.type === "leave" &&
        request.status === "approved" &&
        dateKey(request.date).startsWith(String(year)),
    );
    const sickLeaves = approvedLeaves.filter((request) =>
      String(request.leave_type || request.reason || "").toLowerCase().includes("sick"),
    );
    const usedSick = sickLeaves.length;
    const usedAnnual = Math.max(0, approvedLeaves.length - usedSick);

    return {
      usedAnnual,
      usedSick,
      remainingAnnual: Math.max(0, ANNUAL_LEAVE - usedAnnual).toFixed(2),
      remainingSick: Math.max(0, SICK_LEAVE - usedSick).toFixed(2),
    };
  }, [requests, year]);

  const moveMonth = (direction) => {
    const next = new Date(year, month - 1 + direction, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };

  const monthLabel = new Date(year, month - 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#eeeeee] pb-32">
      <header className="sticky top-0 z-10 bg-white">
        <div className="flex h-[72px] items-center gap-5 px-4 md:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="-ml-1 grid h-10 w-10 place-items-center rounded-full text-black hover:bg-slate-100"
            aria-label="Go back"
          >
            <FiChevronLeft className="h-7 w-7" aria-hidden />
          </button>
          <h1 className="text-base font-extrabold text-black">Report</h1>
        </div>
      </header>

      <main className="space-y-3 p-3 md:p-4">
        <div className="flex h-10 items-center justify-center gap-10">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#dfeae3] text-emerald-800 hover:bg-[#d4e2d8]"
            aria-label="Previous month"
          >
            <FiChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <p className="min-w-36 text-center text-lg font-extrabold text-black">
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-white"
            aria-label="Next month"
          >
            <FiChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white p-4 md:rounded-lg md:px-5 md:py-5">
          <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-4 md:grid-cols-[80px_1fr]">
            <div
              className="grid h-[76px] w-[76px] place-items-center rounded-full text-sm font-extrabold text-[#c91d22] md:h-20 md:w-20"
              style={{
                background: `conic-gradient(#c91d22 ${report.rate * 3.6}deg, #e7e7e7 0deg)`,
              }}
            >
              <div className="grid h-[60px] w-[60px] place-items-center rounded-full bg-white md:h-[64px] md:w-[64px]">
                {report.rate}%
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-base font-extrabold text-black">
                On Time Rate
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                {report.onTime} out of {report.workingDays} working days
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e4e4e4]">
                <div
                  className="h-full rounded-full bg-[#c91d22]"
                  style={{ width: `${Math.min(report.rate, 100)}%` }}
                />
              </div>
              <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#c91d22] md:text-sm">
                <FiAlertTriangle className="h-4 w-4" aria-hidden />
                Your on-time rate is low.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white px-6 py-6 md:rounded-lg md:px-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-black">
                Monthly Attendance
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                Keep the green alive
              </p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#e8f2df] px-4 py-2 text-sm font-extrabold text-[#476a1f]">
              <IoFlame className="h-4 w-4 text-[#476a1f]" aria-hidden />
              {report.streak || 0} day streak
            </div>
          </div>

          {loading ? (
            <div className="mt-8 h-56 animate-pulse rounded-lg bg-slate-50" />
          ) : (
            <div className="mt-8 pb-1">
              <div className="md:min-w-[760px]">
                <div className="grid grid-cols-7 text-xs font-extrabold text-slate-500">
                  {weekdays.map((day) => (
                    <div key={day} className="text-center">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-7 gap-x-2 gap-y-1 md:hidden">
                  {report.calendarCells.map((day, index) => (
                    <MonthDay key={day?.key || `blank-${index}`} day={day} />
                  ))}
                </div>

                <div className="mt-6 hidden grid-cols-7 gap-5 md:grid">
                  {report.daysByWeekday.map((column, index) => (
                    <div key={weekdays[index]} className="space-y-2">
                      {column.map((day) => (
                        <MonthDay key={day.key} day={day} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
            <LegendItem label="On time" className="bg-emerald-700" />
            <LegendItem label="Late" className="bg-[#c26513]" />
            <LegendItem label="Absent" className="bg-[#c91d22]" />
            <LegendItem label="Holiday" className="bg-[#2f67e8]" />
            <LegendItem label="Approved leave" className="bg-[#3159c9]" />
            <LegendItem label="Pending request" className="bg-[#d97706]" />
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 md:gap-3">
            <SummaryTile
              label="On time"
              value={report.onTime}
              helper={`/ ${report.days.length} days`}
              tone="text-emerald-700"
            />
            <SummaryTile
              label="Late"
              value={report.late}
              helper="days"
              tone="text-[#c26513]"
            />
            <SummaryTile
              label="Absent"
              value={report.absent}
              helper="days"
              tone="text-[#c91d22]"
            />
            <SummaryTile
              label="Leave"
              value={report.leave}
              helper="days"
              tone="text-[#3159c9]"
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 md:rounded-lg">
          <h2 className="text-lg font-extrabold text-black">Leave info</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 md:gap-8">
            <div className="space-y-2">
              <LeaveMetric label="Allotted Annual Leave" value={ANNUAL_LEAVE} />
              <LeaveMetric label="Allotted Sick Leave" value={SICK_LEAVE} />
            </div>
            <div className="space-y-2 border-l border-slate-100 pl-3 md:pl-8">
              <LeaveMetric label="Used Annual Leave" value={leave.usedAnnual} />
              <LeaveMetric label="Used Sick Leave" value={leave.usedSick} />
            </div>
            <div className="space-y-2 border-l border-slate-100 pl-3 md:pl-8">
              <LeaveMetric
                label="Remaining Annual Leave"
                value={leave.remainingAnnual}
              />
              <LeaveMetric
                label="Remaining Sick Leave"
                value={leave.remainingSick}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
