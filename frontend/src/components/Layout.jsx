import { useEffect, useState } from "react";
import { BiSolidTimeFive } from "react-icons/bi";
import { BsFillClipboardDataFill } from "react-icons/bs";
import {
  FiActivity,
  FiAlertCircle,
  FiAward,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckSquare,
  FiChevronDown,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiShield,
  FiStar,
  FiTarget,
  FiTrendingUp,
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
    label: "Attendance & Leave",
    icon: <BiSolidTimeFive className="h-5 w-5" aria-hidden />,
    items: [
      { to: "/admin", label: "Attendance Management", icon: <BiSolidTimeFive className="h-4 w-4" aria-hidden /> },
      { to: "/requests?type=leave", label: "Leave Management", icon: <FiCalendar className="h-4 w-4" aria-hidden /> },
      { to: "/requests?type=ot", label: "OT Management", icon: <FiClock className="h-4 w-4" aria-hidden /> },
      { to: "/shift", label: "Shift & Schedule", icon: <FiRefreshCw className="h-4 w-4" aria-hidden /> },
    ],
  },
  {
    key: "training",
    label: "Training & Development",
    icon: <FiBookOpen className="h-5 w-5" aria-hidden />,
    items: [
      { to: "/training", label: "Dashboard", icon: <FiGrid className="h-4 w-4" aria-hidden /> },
      { to: "/training?tab=plans", label: "Training Plans", icon: <FiBookOpen className="h-4 w-4" aria-hidden /> },
      { to: "/training?tab=records", label: "Training Records", icon: <FiFileText className="h-4 w-4" aria-hidden /> },
      { to: "/training?tab=competency", label: "Competency Assessment", icon: <FiTrendingUp className="h-4 w-4" aria-hidden /> },
    ],
  },
  {
    key: "performance",
    label: "Performance Management",
    icon: <FiBriefcase className="h-5 w-5" aria-hidden />,
    items: [
      { to: "/performance", label: "Dashboard", icon: <FiBarChart2 className="h-4 w-4" aria-hidden /> },
      { to: "/performance?tab=kpi-planning", label: "KPI Planning", icon: <FiTarget className="h-4 w-4" aria-hidden /> },
      { to: "/performance?tab=kpi-monitoring", label: "KPI Monitoring", icon: <FiActivity className="h-4 w-4" aria-hidden /> },
      { to: "/performance?tab=reviews", label: "Performance Review", icon: <FiStar className="h-4 w-4" aria-hidden /> },
      { to: "/performance?tab=career", label: "Career Development", icon: <FiTrendingUp className="h-4 w-4" aria-hidden /> },
      { to: "/performance?tab=pip", label: "PIP", icon: <FiAlertCircle className="h-4 w-4" aria-hidden /> },
    ],
  },
  {
    key: "payroll_comp",
    label: "Payroll, Compensation & Staff Movement",
    icon: <FiCreditCard className="h-5 w-5" aria-hidden />,
    items: [
      { to: "/payroll-comp", label: "Dashboard", icon: <FiBarChart2 className="h-4 w-4" aria-hidden /> },
      { to: "/payroll-comp?tab=payroll-processing", label: "Payroll Processing", icon: <FiCreditCard className="h-4 w-4" aria-hidden /> },
      { to: "/payroll-comp?tab=compensation", label: "Compensation Management", icon: <FiDollarSign className="h-4 w-4" aria-hidden /> },
      { to: "/payroll-comp?tab=benefits", label: "Benefits Management", icon: <FiShield className="h-4 w-4" aria-hidden /> },
      { to: "/payroll-comp?tab=seniority", label: "Seniority & Severance", icon: <FiAward className="h-4 w-4" aria-hidden /> },
      { to: "/payroll-comp?tab=movement", label: "Staff Movement", icon: <FiRefreshCw className="h-4 w-4" aria-hidden /> },
    ],
  },
];

const standaloneNavItems = [
  { to: "/self-service", label: "ESS Dashboard", icon: <FiUserCheck className="h-5 w-5" aria-hidden /> },
  { to: "/my-attendance", label: "My Attendance", icon: <FiClock className="h-5 w-5" aria-hidden /> },
];

const otherNavItems = [
  { to: "/hris?tab=payroll", label: "Payroll", icon: <FiCreditCard className="h-5 w-5" aria-hidden /> },
  { to: "/hris?tab=reports", label: "Reports", icon: <BsFillClipboardDataFill className="h-5 w-5" aria-hidden /> },
  { to: "/hris?tab=settings", label: "HRIS Settings", icon: <FiSettings className="h-5 w-5" aria-hidden /> },
  { to: "/profile", label: "Settings", icon: <FiSettings className="h-5 w-5" aria-hidden /> },
];

const isActiveRoute = (to, pathname, search) => {
  const current = `${pathname}${search}`;
  return to.includes("?") ? current === to : pathname === to && !search;
};

const NavLinkItem = ({ to, label, icon }) => {
  const location = useLocation();
  const active = isActiveRoute(to, location.pathname, location.search);
  return (
    <NavLink
      to={to}
      className={`flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-[#E9F6EE] text-[#166534]"
          : "text-[#6B7280] hover:bg-[#F3F8F4] hover:text-[#166534]"
      }`}
      style={active ? { borderLeft: "3px solid #166534", borderRadius: 0, paddingLeft: "9px" } : {}}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
};

const ModuleGroup = ({ group, isExpanded, onToggle }) => {
  const location = useLocation();
  const hasItems = group.items.length > 0;
  const anyActive = group.items.some((item) =>
    isActiveRoute(item.to, location.pathname, location.search)
  );

  return (
    <div>
      <button
        onClick={onToggle}
        className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-all duration-150 ${
          anyActive
            ? "bg-[#E9F6EE] text-[#166534]"
            : "text-[#6B7280] hover:bg-[#F3F8F4] hover:text-[#166534]"
        }`}
        style={anyActive ? { borderLeft: "3px solid #166534", borderRadius: 0, paddingLeft: "9px" } : {}}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">{group.icon}</span>
        <span className="flex-1 text-left">{group.label}</span>
        {hasItems && (
          <span className={`shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
            <FiChevronDown className="h-4 w-4" />
          </span>
        )}
      </button>
      {hasItems && (
        <div
          className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? "mt-1 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">
            <div className="ml-2 space-y-0.5 border-l border-[#E5E7EB] pl-2">
              {group.items.map((item) => (
                <div key={item.to + item.label}>
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

  const currentPath = `${location.pathname}${location.search}`;

  const [expandedModules, setExpandedModules] = useState(() => {
    try {
      const saved = localStorage.getItem("expandedModules");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setExpandedModules((prev) => {
      const next = [...prev];
      let changed = false;
      for (const group of moduleGroups) {
        const matches = group.items.some((item) =>
          isActiveRoute(item.to, location.pathname, location.search)
        );
        if (matches && !next.includes(group.key)) {
          next.push(group.key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [currentPath, location.pathname, location.search]);

  const toggleModule = (key) => {
    setExpandedModules((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      localStorage.setItem("expandedModules", JSON.stringify(next));
      return next;
    });
  };

  if (isManagement) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] text-[#111827]">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-[#E5E7EB] bg-white shadow-sm lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-3 px-5">
            <img src="/logo.svg" alt="Logo" className="h-9 w-9" />
            <div>
              <p className="text-base font-bold leading-none text-[#111827]">HCM App</p>
              <p className="mt-0.5 text-xs font-medium text-[#6B7280]">Human Capital Mgmt</p>
            </div>
          </div>

          <nav className="sidebar-nav flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {flatNavItems.map((item) => (
              <div key={item.to}>
                <NavLinkItem to={item.to} label={item.label} icon={item.icon} />
              </div>
            ))}

            <div className="my-4 border-t border-[#E5E7EB]" />

            {moduleGroups.map((group) => (
              <div key={group.key} className="mb-1">
                <ModuleGroup
                  group={group}
                  isExpanded={expandedModules.includes(group.key)}
                  onToggle={() => toggleModule(group.key)}
                />
              </div>
            ))}

            <div className="my-4 border-t border-[#E5E7EB]" />

            {standaloneNavItems.map((item) => (
              <div key={item.to}>
                <NavLinkItem to={item.to} label={item.label} icon={item.icon} />
              </div>
            ))}

            {otherNavItems.map((item) => (
              <div key={item.to}>
                <NavLinkItem to={item.to} label={item.label} icon={item.icon} />
              </div>
            ))}
          </nav>

          <div className="border-t border-[#E5E7EB] p-4">
            <div className="flex items-center gap-3 rounded-xl bg-[#F9FAFB] p-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#166534] text-sm font-bold text-white">
                {name?.[0] || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#111827]">{name}</p>
                <p className="truncate text-xs font-medium text-[#6B7280]">{role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-[#6B7280] transition-all hover:bg-[#F3F8F4] hover:text-[#166534]"
            >
              <FiLogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </aside>

        <div className="lg:pl-[280px]">
          <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-[#E5E7EB] text-[#6B7280] lg:hidden">
                  <FiMenu className="h-5 w-5" aria-hidden />
                </button>
                <div className="relative hidden w-full max-w-md md:block">
                  <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                  <input
                    className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-[#166534] focus:bg-white"
                    placeholder="Search employees, modules..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="relative grid h-10 w-10 place-items-center rounded-lg text-[#6B7280] transition-all hover:bg-[#F3F8F4]">
                  <FiBell className="h-5 w-5" aria-hidden />
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                </button>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-[#111827]">{name}</p>
                  <p className="text-xs font-medium text-[#6B7280]">{role}</p>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#166534] text-sm font-bold text-white">
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
