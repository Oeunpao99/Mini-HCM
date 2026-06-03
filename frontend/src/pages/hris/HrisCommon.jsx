const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth() + 1;

export const employeeTabs = ["personal", "job", "documents", "history"];

export const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const defaultEmployeeForm = {
  user_id: "",
  phone: "",
  address: "",
  position: "",
  sub_department: "",
  job_grade: "",
  contract_type: "permanent",
  contract_start_date: "2026-01-01",
  contract_end_date: "",
  basic_salary: "900",
  bank_account: "",
  status: "active",
};

export const defaultPayrollForm = {
  user_id: "",
  period_year: currentYear,
  period_month: currentMonth,
  basic_salary: "900",
  overtime_amount: "0",
  allowances: "0",
  bonus: "0",
  benefits: "0",
  salary_adjustment: "0",
  tax_deduction: "0",
  nssf_deduction: "0",
  other_deductions: "0",
  status: "draft",
  auto_calculate_contributions: true,
};

export const defaultPerformanceForm = {
  user_id: "",
  review_period: `${currentYear}-Q2`,
  score: "80",
  rating: "meets_expectations",
  comments: "",
  status: "draft",
};

export const defaultNewEmployee = {
  first_name: "",
  last_name: "",
  email: "",
  role: "staff",
  department: "",
  manager_id: "",
  temporary_password: "staff123",
  profile_photo: "",
  phone: "",
  dob: "",
  gender: "",
  marital_status: "",
  nationality: "",
  id_number: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

export const inputClass =
  "h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export const Field = ({ label, required, children }) => (
  <label className="grid gap-2 text-sm font-bold text-slate-700">
    <span>
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </span>
    {children}
  </label>
);

export const Avatar = ({ name, src, size = "h-9 w-9" }) => {
  const initials = String(name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#e7f0ff] to-[#d8f6ee] text-xs font-extrabold text-blue-700 ring-1 ring-slate-200`}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials}
    </div>
  );
};

export const statusTone = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("leave")) return "bg-amber-50 text-amber-700";
  if (normalized.includes("inactive") || normalized.includes("resign")) {
    return "bg-red-50 text-red-700";
  }
  return "bg-emerald-50 text-emerald-700";
};

export const formatContract = (value) => {
  if (!value) return "Permanent";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const StatCard = ({ label, value, icon: Icon, tone }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-4">
      <span className={`grid h-14 w-14 place-items-center rounded-2xl ${tone}`}>
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-extrabold leading-none text-slate-950">
          {value}
        </p>
      </div>
    </div>
  </div>
);

export const FilterSelect = ({ label, value, onChange, options }) => (
  <label className="grid gap-1 text-xs font-bold text-slate-500">
    {label}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 min-w-36 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

export const TableEmpty = ({ loading, colSpan = 9 }) => (
  <tr>
    <td
      colSpan={colSpan}
      className="px-4 py-10 text-center text-sm font-bold text-slate-400"
    >
      {loading
        ? "Loading employee database..."
        : "No employees match the current filters."}
    </td>
  </tr>
);

export const DrawerTabButton = ({ id, active, onClick, children }) => (
  <button
    type="button"
    onClick={() => onClick(id)}
    className={`h-12 border-b-2 px-2 text-sm font-bold ${
      active === id
        ? "border-blue-600 text-blue-600"
        : "border-transparent text-slate-500 hover:text-slate-900"
    }`}
  >
    {children}
  </button>
);
