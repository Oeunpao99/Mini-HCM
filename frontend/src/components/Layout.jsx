import { useState } from "react";
import { BiSolidTimeFive } from "react-icons/bi";
import { BsFillClipboardDataFill } from "react-icons/bs";
import {
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiCheckSquare,
  FiChevronDown,
  FiClock,
  FiCreditCard,
  FiMenu,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { FaHome } from "react-icons/fa";
import { RiDashboardFill, RiUserSettingsFill } from "react-icons/ri";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const staffNavItems = [
  { to: "/", label: "Home", icon: <FaHome className="h-5 w-5" aria-hidden /> },
  { to: "/attendance", label: "Attendance", icon: <BiSolidTimeFive className="h-5 w-5" aria-hidden /> },
  { to: "/payslips", label: "Payslip", icon: <FiCreditCard className="h-5 w-5" aria-hidden /> },
  { to: "/report", label: "Report", icon: <BsFillClipboardDataFill className="h-5 w-5" aria-hidden /> },
  { to: "/profile", label: "Profile", icon: <RiUserSettingsFill className="h-5 w-5" aria-hidden /> },
];

const managementRoles = ["line_manager", "department_head", "management_hr", "payroll_officer"];

const flatNavItems = [
  { to: "/", label: "Dashboard", icon: <RiDashboardFill className="h-5 w-5" aria-hidden /> },
  { to: "/hris", label: "Employee Database", icon: <FiUsers className="h-5 w-5" aria-hidden /> },
];

const moduleGroups = [
  {
    key: "attendance_leave",
    label: "Attendance & Leave Management",
    icon: <BiSolidTimeFive className="h-5 w-5" aria-hidden />,
    items: [
      { to: "/admin", label: "Attendance Management", icon: <BiSolidTimeFive className="h-4 w-4" aria-hidden /> },
      { to: "/requests?type=leave", label: "Leave Management", icon: <FiCalendar className="h-4 w-4" aria-hidden /> },
      { to: "/requests?type=ot", label: "OT Management", icon: <FiClock className="h-4 w-4" aria-hidden /> },
      { to: "/shift", label: "Shift & Schedule Management", icon: <FiRefreshCw className="h-4 w-4" aria-hidden /> },
    ],
  },
  {
    key: "ess",
    label: "Employee Self Service",
    icon: <FiUserCheck className="h-5 w-5" aria-hidden />,
    items: [
      { to: "/self-service", label: "ESS Dashboard", icon: <FiUserCheck className="h-4 w-4" aria-hidden /> },
      { to: "/my-attendance", label: "My Attendance", icon: <FiClock className="h-4 w-4" aria-hidden /> },
    ],
  },
];

const standaloneNavItems = [];

const otherNavItems = [
  { to: "/hris?tab=payroll", label: "Payroll", icon: <FiCreditCard className="h-5 w-5" aria-hidden /> },
  { to: "/hris?tab=performance", label: "Performance", icon: <FiBriefcase className="h-5 w-5" aria-hidden /> },
  { to: "/hris?tab=reports", label: "Reports", icon: <BsFillClipboardDataFill className="h-5 w-5" aria-hidden /> },
  { to: "/hris?tab=settings", label: "HRIS Settings", icon: <FiSettings className="h-5 w-5" aria-hidden /> },
  { to: "/profile", label: "Settings", icon: <FiSettings className="h-5 w-5" aria-hidden /> },
];

const NavLinkItem = ({ to, label, icon }) => {
  const location = useLocation();
  const current = `${location.pathname}${location.search}`;
  const active = to.includes("?") ? current === to : location.pathname === to && !location.search;
  return (
    <NavLink
      to={to}
      className={`flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-bold ${
        active
          ? "bg-[#166432] text-white shadow-lg shadow-[#166432]/30"
          : "text-slate-500 hover:bg-[#166432]/10 hover:text-[#166432]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
};

const ModuleGroup = ({ group, isExpanded, onToggle }) => {
  const location = useLocation();
  const hasItems = group.items.length > 0;
  const anyActive = group.items.some((item) => {
    const current = `${location.pathname}${location.search}`;
    return item.to.includes("?") ? current === item.to : location.pathname === item.to;
  });

  return (
    <div>
      <button
        onClick={onToggle}
        className={`flex h-11 w-full items-center gap-3 rounded-lg px-4 text-sm font-bold ${
          anyActive
            ? "bg-[#166432]/10 text-[#166432]"
            : "text-slate-500 hover:bg-[#166432]/10 hover:text-[#166432]"
        }`}
      >
        {group.icon}
        <span className="flex-1 text-left">{group.label}</span>
        {hasItems && (
          <FiChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`}
          />
        )}
          {!hasItems && (
            <span className="text-[10px] font-semibold text-slate-400">Empty</span>
          )}
      </button>
      {hasItems && (
        <div
          className={`grid overflow-hidden transition-all duration-200 ${
            isExpanded ? "mt-1 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">
            <div className="ml-2 border-l border-slate-200 pl-3">
              {group.items.map((item) => (
                <div key={item.to + item.label} className="mb-1.5 last:mb-0">
                  <NavLinkItem to={item.to} label={item.label} icon={item.icon} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Layout = ({ children }) => {
  const { role, name, logout } = useAuth();
  const location = useLocation();
  const isManagement = managementRoles.includes(role);

  const initialExpanded = () => {
    try {
      const saved = localStorage.getItem("expandedModules");
      const parsed = saved ? JSON.parse(saved) : [];
      const activePath = `${location.pathname}${location.search}`;
      for (const group of moduleGroups) {
        if (group.items.some((item) => {
          const current = `${location.pathname}${location.search}`;
          return item.to.includes("?") ? current === item.to : location.pathname === item.to;
        })) {
          if (!parsed.includes(group.key)) parsed.push(group.key);
        }
      }
      return parsed;
    } catch {
      return [];
    }
  };

  const [expandedModules, setExpandedModules] = useState(initialExpanded);

  const toggleModule = (key) => {
    setExpandedModules((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      localStorage.setItem("expandedModules", JSON.stringify(next));
      return next;
    });
  };

  if (isManagement) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[300px] border-r border-slate-200 bg-white shadow-2xl lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 px-6">
            <img src="/logo.svg" alt="Logo" className="h-11 w-11" />
            <div>
              <p className="text-xl font-extrabold leading-none text-slate-900">HCM App</p>
              <p className="mt-1 text-xs font-semibold leading-tight text-slate-400">
                Human Capital Management
              </p>
            </div>
          </div>

          <nav className="sidebar-nav mt-4 grid gap-1 overflow-y-auto px-4">
            {flatNavItems.map((item) => (
              <div key={item.to} className="mb-1.5">
                <NavLinkItem to={item.to} label={item.label} icon={item.icon} />
              </div>
            ))}

            <div className="my-3 border-t border-slate-200" />

            {moduleGroups.map((group) => (
              <div key={group.key} className="mb-1.5">
                <ModuleGroup
                  group={group}
                  isExpanded={expandedModules.includes(group.key)}
                  onToggle={() => toggleModule(group.key)}
                />
              </div>
            ))}

            <div className="my-3 border-t border-slate-200" />

            {standaloneNavItems.map((item) => (
              <div key={item.to} className="mb-1.5">
                <NavLinkItem to={item.to} label={item.label} icon={item.icon} />
              </div>
            ))}

            <div className="my-3 border-t border-slate-200" />

            {otherNavItems.map((item) => (
              <div key={item.to} className="mb-1.5">
                <NavLinkItem to={item.to} label={item.label} icon={item.icon} />
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t border-slate-200 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-[#166432]/5 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#166432] text-sm font-extrabold text-white">
                {name?.[0] || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-900">{name}</p>
                <p className="truncate text-xs font-semibold text-slate-400">{role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-3 h-10 w-full rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200"
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="lg:pl-[300px]">
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
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#166432] text-sm font-extrabold text-white">
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
        className="dashboard-bottom-nav fixed bottom-4 left-1/2 z-20 grid w-[calc(100%-2rem)] max-w-[448px] -translate-x-1/2 rounded-[1.75rem] border border-white/80 bg-white/95 p-3 shadow-[0_24px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl ring-1 ring-[#166432]/20 md:max-w-[520px]"
        style={{ gridTemplateColumns: `repeat(${staffNavItems.length}, minmax(0, 1fr))` }}
      >
        {staffNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-1 text-center text-[11px] font-bold ${
                isActive ? "text-[#166432]" : "text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl text-xl leading-none ${
                    isActive
                      ? "bg-[#166432] text-white shadow-lg shadow-[#166432]/30"
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
