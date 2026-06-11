import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiLogIn,
  FiLogOut,
  FiMapPin,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(`${String(value).slice(0, 10)}T00:00:00`);
};

const dateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const localYear = value.getFullYear();
  const localMonth = String(value.getMonth() + 1).padStart(2, "0");
  const localDay = String(value.getDate()).padStart(2, "0");
  return `${localYear}-${localMonth}-${localDay}`;
};

const formatTime = (value) => {
  if (!value) return "---";
  if (/[AP]M/i.test(value)) return value;

  const [hour = "0", minute = "00"] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCheckIn = (item) => item.check_in_time || item.check_in;
const getCheckOut = (item) => item.check_out_time || item.check_out;

const compactNumber = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });

const mapUrl = (lat, lon) => {
  if (lat === undefined || lat === null || lon === undefined || lon === null) {
    return "";
  }
  return `https://www.google.com/maps?q=${lat},${lon}`;
};

const getStatus = (item) => {
  if (item.status) return String(item.status).toUpperCase();
  if (getCheckIn(item) || getCheckOut(item)) return "PRESENT";

  const day = toDate(item.date)?.getDay();
  return day === 0 || day === 6 ? "HOLIDAY" : "ABSENT";
};

const getStatusClass = (status) => {
  if (status === "PRESENT") return "bg-[#e8f2df] text-[#2d7c47]";
  if (status === "HOLIDAY") return "bg-[#dcebff] text-[#3f72ff]";
  if (status === "ABSENT") return "bg-black text-white";
  return "bg-slate-100 text-slate-600";
};

const StatusPill = ({ status }) => (
  <span
    className={`inline-flex h-7 items-center rounded-xl px-3 text-[11px] font-bold ${getStatusClass(
      status,
    )}`}
  >
    {status}
  </span>
);

const ScanTime = ({ icon: Icon, value, muted }) => (
  <span
    className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
      muted ? "text-slate-400" : "text-slate-800"
    }`}
  >
    <Icon
      className={`h-3.5 w-3.5 ${
        muted ? "text-slate-300" : "text-emerald-700"
      }`}
      aria-hidden
    />
    {formatTime(value)}
  </span>
);

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="min-w-0 rounded-lg bg-slate-50 p-3">
    <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-400">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </div>
    <p className="mt-1 break-words text-sm font-extrabold text-slate-900">
      {value || "---"}
    </p>
  </div>
);

const approvalText = (item) => {
  if (!item.requires_manager_approval) return "Not required";
  if (item.manager_approved === null || item.manager_approved === undefined) {
    return "Pending";
  }
  return item.manager_approved ? "Approved" : "Rejected";
};

const AttendanceDetail = ({ item }) => {
  const checkInMap = mapUrl(item.check_in_lat, item.check_in_lon);
  const checkOutMap = mapUrl(item.check_out_lat, item.check_out_lon);

  return (
    <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <DetailItem icon={FiLogIn} label="Check In" value={formatTime(getCheckIn(item))} />
        <DetailItem icon={FiLogOut} label="Check Out" value={formatTime(getCheckOut(item))} />
        <DetailItem icon={FiClock} label="Worked Hours" value={`${compactNumber(item.worked_hours)}h`} />
        <DetailItem icon={FiAlertTriangle} label="Late" value={item.is_late ? "Yes" : "No"} />
        <DetailItem icon={FiClock} label="Early Checkout" value={item.is_early_checkout ? "Yes" : "No"} />
        <DetailItem icon={FiCheckCircle} label="Flexible Scan" value={item.flexible || item.flexible_scan ? "Yes" : "No"} />
        <DetailItem icon={FiCheckCircle} label="Approval" value={approvalText(item)} />
        <DetailItem icon={FiFileText} label="Reason" value={item.needs_approval_reason} />
      </div>

      {(checkInMap || checkOutMap) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {checkInMap && (
            <a
              href={checkInMap}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-50 px-3 text-xs font-extrabold text-blue-700 hover:bg-blue-100"
            >
              <FiMapPin className="h-4 w-4" aria-hidden />
              Check-in map
            </a>
          )}
          {checkOutMap && (
            <a
              href={checkOutMap}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-50 px-3 text-xs font-extrabold text-blue-700 hover:bg-blue-100"
            >
              <FiMapPin className="h-4 w-4" aria-hidden />
              Check-out map
            </a>
          )}
        </div>
      )}

      {item.remark && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600">
          {item.remark}
        </div>
      )}
    </section>
  );
};

const AttendanceRow = ({ item, expanded, onToggle }) => {
  const dayDate = toDate(item.date);
  const status = getStatus(item);
  const checkIn = getCheckIn(item);
  const checkOut = getCheckOut(item);
  const isEmpty = !checkIn && !checkOut;
  const lateText =
    item.late ||
    item.late_minutes ||
    (item.is_late ? "Late" : "");

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className={`grid min-h-[80px] w-full grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-white px-4 py-3 text-left shadow-sm transition md:min-h-[78px] md:grid-cols-[64px_minmax(0,1fr)_auto] md:px-6 ${
          expanded ? "ring-2 ring-blue-500" : "hover:bg-slate-50"
        }`}
      >
        <div className="border-r border-slate-100 pr-3">
          <div className="text-2xl font-extrabold leading-7 text-black">
            {dayDate?.getDate()}
          </div>
          <div className="mt-0.5 text-xs font-bold text-slate-500">
            {dayDate?.toLocaleDateString(undefined, { weekday: "short" })}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <ScanTime icon={FiLogIn} value={checkIn} muted={isEmpty} />
            <ScanTime icon={FiLogOut} value={checkOut} muted={isEmpty} />
          </div>

          {(lateText || item.flexible || item.flexible_scan) && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-bold">
              {lateText && (
                <span className="text-amber-600">
                  {String(lateText).startsWith("Late")
                    ? lateText
                    : `Late ${lateText}`}
                </span>
              )}
              {(item.flexible || item.flexible_scan) && (
                <span className="text-blue-600">on Flexible</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <StatusPill status={status} />
          <span className="text-[10px] font-bold text-slate-400">
            {expanded ? "Hide" : "Detail"}
          </span>
        </div>
      </button>

      {expanded && <AttendanceDetail item={item} />}
    </div>
  );
};

export default function AttendancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setUnauthenticated(false);

    try {
      const res = await api.get(
        `/api/attendance/monthly?year=${year}&month=${month}`,
      );
      const monthlyRecords = res.data?.records || res.data || [];
      setRecords(Array.isArray(monthlyRecords) ? monthlyRecords : []);
    } catch (err) {
      if (err?.response?.status === 403 || err?.response?.status === 401) {
        setUnauthenticated(true);
      }
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    setSelectedDate("");
  }, [month, year]);

  const items = useMemo(() => {
    const byDate = new Map(records.map((record) => [dateKey(record.date), record]));
    const selectedMonth = new Date(year, month - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const maxDay =
      selectedMonth.getTime() === currentMonth.getTime()
        ? now.getDate()
        : daysInMonth;

    return Array.from({ length: maxDay }, (_, index) => {
      const day = maxDay - index;
      const key = dateKey(new Date(year, month - 1, day));
      return {
        date: key,
        ...byDate.get(key),
      };
    });
  }, [month, records, year]);

  const moveMonth = (direction) => {
    const next = new Date(year, month - 1 + direction, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };

  return (
    <div className="min-h-screen bg-[#eeeeee] pb-28">
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
          <h1 className="text-base font-extrabold text-black">
            Attendances View
          </h1>
        </div>

        <div className="flex items-center justify-between border-t border-slate-50 px-5 py-2 text-sm font-bold text-slate-500">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100"
            aria-label="Previous month"
          >
            <FiChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span>
            {new Date(year, month - 1).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100"
            aria-label="Next month"
          >
            <FiChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      <main className="space-y-2 p-3 md:space-y-2.5 md:p-4">
        {loading &&
          Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-[80px] animate-pulse rounded-lg bg-white"
            />
          ))}

        {!loading && unauthenticated && (
          <div className="rounded-lg bg-white p-6 text-center text-sm font-semibold text-slate-500">
            Please{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-extrabold text-emerald-700"
            >
              login
            </button>{" "}
            to view attendance.
          </div>
        )}

        {!loading &&
          !unauthenticated &&
          items.map((item) => (
            <AttendanceRow
              key={item.date}
              item={item}
              expanded={selectedDate === item.date}
              onToggle={() =>
                setSelectedDate((current) =>
                  current === item.date ? "" : item.date,
                )
              }
            />
          ))}
      </main>
    </div>
  );
}
