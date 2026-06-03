import { BiSolidTimeFive } from "react-icons/bi";
import { BsFillClipboardDataFill } from "react-icons/bs";
import {
  FiBell,
  FiBriefcase,
  FiCheckSquare,
  FiCreditCard,
  FiMenu,
  FiSearch,
  FiSettings,
  FiUsers,
} from "react-icons/fi";
import { FaHome } from "react-icons/fa";
import { RiDashboardFill, RiUserSettingsFill } from "react-icons/ri";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const staffNavItems = [
  { to: "/", label: "Home", icon: <FaHome className="h-5 w-5" aria-hidden /> },
  {
    to: "/attendance",
    label: "Attendance",
    icon: <BiSolidTimeFive className="h-5 w-5" aria-hidden />,
  },
  {
    to: "/requests",
    label: "Request",
    icon: <FiCheckSquare className="h-5 w-5" aria-hidden />,
  },
  {
    to: "/payslips",
    label: "Payslip",
    icon: <FiCreditCard className="h-5 w-5" aria-hidden />,
  },
  {
    to: "/profile",
    label: "Profile",
    icon: <RiUserSettingsFill className="h-5 w-5" aria-hidden />,
  },
];

const managementRoles = [
  "line_manager",
  "department_head",
  "management_hr",
  "payroll_officer",
];

const managementNavItems = [
  {
    to: "/",
    label: "Dashboard",
    icon: <RiDashboardFill className="h-5 w-5" aria-hidden />,
  },
  {
    to: "/hris",
    label: "Employee Database",
    icon: <FiUsers className="h-5 w-5" aria-hidden />,
  },
  {
    to: "/admin",
    label: "Time & Attendance",
    icon: <BiSolidTimeFive className="h-5 w-5" aria-hidden />,
  },
  {
    to: "/requests",
    label: "Request Management",
    icon: <FiCheckSquare className="h-5 w-5" aria-hidden />,
  },
  {
    to: "/hris?tab=payroll",
    label: "Payroll",
    icon: <FiCreditCard className="h-5 w-5" aria-hidden />,
  },
  {
    to: "/hris?tab=performance",
    label: "Performance",
    icon: <FiBriefcase className="h-5 w-5" aria-hidden />,
  },
  {
    to: "/hris?tab=reports",
    label: "Reports",
    icon: <BsFillClipboardDataFill className="h-5 w-5" aria-hidden />,
  },
  {
    to: "/hris?tab=settings",
    label: "HRIS Settings",
    icon: <FiSettings className="h-5 w-5" aria-hidden />,
  },
  {
    to: "/profile",
    label: "Settings",
    icon: <FiSettings className="h-5 w-5" aria-hidden />,
  },
];

const Layout = ({ children }) => {
  const { role, name, logout } = useAuth();
  const location = useLocation();
  const isManagement = managementRoles.includes(role);

  if (isManagement) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] bg-[#071a33] text-white shadow-2xl lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 px-6">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600">
              <FiUsers className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-xl font-extrabold leading-none">HRIS</p>
              <p className="mt-1 text-xs font-semibold leading-tight text-white/65">
                Human Resource Information System
              </p>
            </div>
          </div>

          <nav className="mt-4 grid gap-1 px-4">
            {managementNavItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => {
                  const current = `${location.pathname}${location.search}`;
                  const active = item.to.includes("?")
                    ? current === item.to
                    : isActive && !location.search;
                  return `flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-bold ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                      : "text-white/78 hover:bg-white/10 hover:text-white"
                  }`;
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/8 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-sm font-extrabold text-[#071a33]">
                {name?.[0] || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">{name}</p>
                <p className="truncate text-xs font-semibold text-white/55">{role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-3 h-10 w-full rounded-lg bg-white/10 text-sm font-bold text-white hover:bg-white/15"
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="lg:pl-[264px]">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 lg:hidden">
                  <FiMenu className="h-5 w-5" aria-hidden />
                </button>
                <div className="relative hidden w-full max-w-md md:block">
                  <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-10 w-full rounded-lg border border-slate-100 bg-slate-50 pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-500"
                    placeholder="Search employees, modules..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="relative grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-50">
                  <FiBell className="h-5 w-5" aria-hidden />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
                </button>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-extrabold text-slate-950">{name}</p>
                  <p className="text-xs font-semibold text-slate-400">{role}</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
                  {name?.[0] || "U"}
                </div>
              </div>
            </div>
          </header>
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eeeeee] pb-24">
      <main className="min-w-0">{children}</main>

      <nav
        className="dashboard-bottom-nav fixed bottom-4 left-1/2 z-20 grid w-[calc(100%-2rem)] max-w-[448px] -translate-x-1/2 rounded-[1.75rem] border border-white/80 bg-white/95 p-3 shadow-[0_24px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl md:max-w-[520px]"
        style={{ gridTemplateColumns: `repeat(${staffNavItems.length}, minmax(0, 1fr))` }}
      >
        {staffNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-1 text-center text-[11px] font-bold ${
                isActive ? "text-blue-700" : "text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl text-xl leading-none ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-700/25"
                      : "text-slate-400"
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
