import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiLogOut,
  FiMapPin,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";
import { TbClockPause } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import SlideButton from "../components/SlideButton";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { getCurrentPosition, haversineDistance } from "../utils/geo";

const actionItems = [
  {
    label: "Leave",
    icon: FiLogOut,
    tone: "text-emerald-800",
    to: "/requests?type=leave",
  },
  {
    label: "Flexible",
    icon: FiArrowLeft,
    tone: "text-red-500",
    to: "/requests?type=flexible",
  },
  {
    label: "Permission",
    icon: FiShield,
    tone: "text-emerald-800",
    to: "/requests?type=permission",
  },
  {
    label: "Overtime",
    icon: TbClockPause,
    tone: "text-red-500",
    to: "/requests?type=ot",
  },
  {
    label: "Pay Slip",
    icon: FiCreditCard,
    tone: "text-emerald-800",
    to: "/payslips",
  },
  {
    label: "Calendar",
    icon: FiCalendar,
    tone: "text-red-500",
    to: "/report",
  },
];

const formatScanDate = (value) =>
  value.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });

const formatScanTime = (value) =>
  value.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

const formatAttendanceTime = (value) => {
  if (!value) return "0:00";
  if (/[AP]M/i.test(value)) return value;

  const [hour = "0", minute = "00", second = "00"] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute), Number(second), 0);

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};

const canRetryAsFlexibleCheckin = (error) => {
  const detail = String(error?.response?.data?.detail || "").toLowerCase();
  return (
    error?.response?.status === 400 &&
    (detail.includes("outside company premises") ||
      detail.includes("not allowed at this time") ||
      detail.includes("location permission"))
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [daily, setDaily] = useState(null);
  const [distance, setDistance] = useState(null);
  const [status, setStatus] = useState("");
  const [popup, setPopup] = useState(null);
  const [scanTime, setScanTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token, name } = useAuth();

  const displayName = name || localStorage.getItem("name") || "Member";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const companyRes = await api
        .get("/api/company/location")
        .catch(() => null);
      const dailyRes = await api.get("/api/attendance/daily");

      if (companyRes?.data) {
        setCompany(companyRes.data);
      }
      setDaily(dailyRes.data);
      setStatus("");
    } catch (err) {
      setStatus(
        err?.response?.data?.detail ||
          err.message ||
          "Failed to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void loadData();
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => setScanTime(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!popup) return undefined;

    const timer = window.setTimeout(() => setPopup(null), 2200);
    return () => window.clearTimeout(timer);
  }, [popup]);

  const playSuccessSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended" && typeof ctx.resume === "function") {
        void ctx.resume();
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.001;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      oscillator.start(now);
      oscillator.stop(now + 0.26);
      setTimeout(() => {
        try {
          ctx.close();
        } catch {}
      }, 500);
    } catch (e) {
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
        );
        void audio.play();
      } catch {}
    }
  };

  const hasCheckedIn = !!daily?.check_in_time;
  const hasCheckedOut = !!daily?.check_out_time;

  const submit = async () => {
    setIsSubmitting(true);
    const timestamp = new Date();
    setScanTime(timestamp);

    try {
      let latitude = null;
      let longitude = null;

      try {
        const position = await getCurrentPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch {
        setDistance(null);
      }

      if (company && latitude !== null && longitude !== null) {
        const d = haversineDistance(
          latitude,
          longitude,
          company.latitude,
          company.longitude,
        );
        setDistance(d.toFixed(2));
      }

      const action = hasCheckedIn ? "checkout" : "checkin";
      const payload = {
        latitude,
        longitude,
        timestamp: timestamp.toISOString(),
        flexible: false,
      };
      let usedFlexibleCheckin = false;

      try {
        await api.post(`/api/attendance/${action}`, payload);
      } catch (err) {
        if (action !== "checkin" || !canRetryAsFlexibleCheckin(err)) {
          throw err;
        }

        await api.post("/api/attendance/flex-checkin", {
          ...payload,
          flexible: true,
        });
        usedFlexibleCheckin = true;
      }

      const successMessage = hasCheckedIn
        ? "Check-out time updated"
        : usedFlexibleCheckin
          ? "Flexible check-in saved"
          : "Check-in time saved";
      setStatus(successMessage);
      setPopup(successMessage);
      playSuccessSound();
      await loadData();
    } catch (err) {
      setStatus(err?.response?.data?.detail || err.message || "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const bottomLabel = hasCheckedIn
    ? hasCheckedOut
      ? "Swipe to Update Time"
      : "Swipe to Clock Out"
    : "Swipe to Clock In";

  return (
    <div className="dashboard-phone">
      {loading && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/10 px-4 pt-24 animate-fade-in">
          <div className="flex items-center gap-3 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-xl shadow-slate-900/10">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
            <span>Loading dashboard...</span>
          </div>
        </div>
      )}

      <section className="dashboard-profile">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-emerald-800 bg-slate-200 shadow-lg">
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-700 to-slate-950 text-sm font-extrabold text-white">
            {initials || "U"}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400">
            {greeting}, <span className="text-amber-500">🌙</span>
          </p>
          <h2 className="truncate text-lg font-extrabold text-slate-950">
            {displayName}
          </h2>
        </div>
      </section>

      <section className="location-card">
        <div className="relative z-10 flex items-center gap-4">
          <FiMapPin className="h-5 w-5 shrink-0 text-white" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/75">
              Current location
            </p>
            <p className="truncate text-sm font-extrabold text-white">
              Sangkat Boeng Tumpun 2
            </p>
            <p className="text-xs font-semibold text-white/75">Street 87BT</p>
          </div>
        </div>
      </section>

      <section className="quick-grid-panel">
        <div className="grid grid-cols-3 gap-2.5">
          {actionItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="quick-action"
                onClick={() => navigate(item.to)}
              >
                <Icon className={`h-5 w-5 ${item.tone}`} aria-hidden />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-slate-950">
            Today Attendance
          </h3>
          <button
            type="button"
            onClick={() => void loadData()}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-500 shadow-sm hover:text-emerald-800"
            aria-label="Refresh attendance"
          >
            <FiRefreshCw className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="attendance-tile">
            <div className="flex items-center gap-4 text-slate-950">
              <FiClock className="h-4 w-4 text-slate-300" aria-hidden />
              <p className="text-sm font-semibold">Clock In</p>
            </div>
            <p className="mt-5 text-lg font-extrabold text-slate-950">
              {formatAttendanceTime(daily?.check_in_time)}
            </p>
            <p className="mt-4 text-xs font-semibold text-slate-600">
              {daily?.is_late
                ? "Late"
                : daily?.check_in_time
                  ? "On time"
                  : "---"}
            </p>
          </div>

          <div className="attendance-tile">
            <div className="flex items-center gap-4 text-slate-950">
              <FiClock className="h-4 w-4 text-slate-300" aria-hidden />
              <p className="text-sm font-semibold">Clock Out</p>
            </div>
            <p className="mt-5 text-lg font-extrabold text-slate-950">
              {formatAttendanceTime(daily?.check_out_time)}
            </p>
            <p className="mt-4 text-xs font-semibold text-slate-600">
              {daily?.is_early_checkout
                ? "Early"
                : daily?.check_out_time
                  ? "Completed"
                  : "---"}
            </p>
          </div>
        </div>
      </section>

      <section className="scan-card">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-extrabold text-slate-950">Scan here</p>
          <p className="text-sm font-semibold text-slate-950">
            {formatScanDate(scanTime)},&nbsp;&nbsp; {formatScanTime(scanTime)}
          </p>
        </div>

        <div className="mt-4">
          <SlideButton
            onConfirm={submit}
            disabled={isSubmitting}
            label={bottomLabel}
          />
        </div>

        {isSubmitting && (
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-fade-in">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
            <span>Saving attendance...</span>
          </div>
        )}

        <p className="mt-4 text-sm text-slate-500">
          {status || "Swipe to save your current time."}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
          <p>Distance: {distance ? `${distance} m` : "Unknown"}</p>
          <p>Worked Hours: {daily?.worked_hours ?? "-"}</p>
        </div>
      </section>

      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 animate-fade-in">
          <div className="relative flex min-h-[280px] w-full max-w-[260px] flex-col items-center justify-center rounded-[28px] bg-white px-6 py-8 text-center shadow-2xl animate-modal-pop">
            <button
              type="button"
              aria-label="Close notification"
              onClick={() => setPopup(null)}
              className="absolute right-4 top-4 text-3xl leading-none text-slate-400 transition hover:text-slate-600"
            >
              x
            </button>
            <div className="success-ring grid h-20 w-20 place-items-center rounded-full bg-emerald-700 text-white shadow-lg shadow-emerald-700/30">
              <FiCheck className="h-11 w-11" aria-hidden />
            </div>
            <p className="mt-8 text-lg font-semibold text-emerald-800">
              {popup || "Successfully."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
