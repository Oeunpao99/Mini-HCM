import { useEffect, useMemo, useState } from "react";
import { FiCreditCard, FiDownload, FiRefreshCw } from "react-icons/fi";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const labelForMonth = (year, month) => {
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

export default function PayslipPage() {
  const { name, empCode } = useAuth();
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/hris/my-payslips");
      setRows(data || []);
      setSelectedId((current) => current || data?.[0]?.id || null);
      setStatus("");
    } catch (err) {
      setStatus(err?.response?.data?.detail || "Could not load payslips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) || rows[0],
    [rows, selectedId],
  );

  const downloadPayslip = () => {
    if (!selected) return;
    const lines = [
      `Payslip ${labelForMonth(selected.period_year, selected.period_month)}`,
      `Employee: ${name}`,
      `Employee ID: ${empCode || "-"}`,
      "",
      `Basic Salary: $${money(selected.basic_salary)}`,
      `Overtime: $${money(selected.overtime_amount)}`,
      `Allowances: $${money(selected.allowances)}`,
      `Bonus: $${money(selected.bonus)}`,
      `Benefits: $${money(selected.benefits)}`,
      `Salary Adjustment: $${money(selected.salary_adjustment)}`,
      `Gross Pay: $${money(selected.gross_pay)}`,
      `Tax Deduction: -$${money(selected.tax_deduction)}`,
      `NSSF Deduction: -$${money(selected.nssf_deduction)}`,
      `Other Deductions: -$${money(selected.other_deductions)}`,
      `Net Pay: $${money(selected.net_pay)}`,
      `Status: ${selected.status}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payslip-${selected.period_year}-${String(selected.period_month).padStart(2, "0")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto min-h-screen w-full max-w-[448px] bg-[#eeeeee] px-4 pb-28 pt-5 md:max-w-none md:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-700">Employee Self-Service</p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-950">Payslip</h1>
            </div>
            <button
              type="button"
              onClick={load}
              className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white"
              title="Refresh"
            >
              <FiRefreshCw className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {status && (
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            {status}
          </div>
        )}

        {loading ? (
          <div className="rounded-lg bg-white p-5 text-sm font-bold text-slate-500 shadow-sm">
            Loading payslips...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg bg-white p-5 text-sm font-bold text-slate-500 shadow-sm">
            No payslips published yet.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="rounded-lg bg-white p-3 shadow-sm">
              <div className="grid gap-2">
                {rows.map((row) => {
                  const active = row.id === selected?.id;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={`rounded-lg px-3 py-3 text-left ${
                        active ? "bg-emerald-700 text-white" : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <p className="text-sm font-extrabold">
                        {labelForMonth(row.period_year, row.period_month)}
                      </p>
                      <p className={`mt-1 text-xs font-bold ${active ? "text-white/75" : "text-slate-400"}`}>
                        Net pay ${money(row.net_pay)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {selected && (
              <div className="rounded-lg bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">{empCode}</p>
                    <h2 className="mt-1 text-xl font-extrabold text-slate-950">{name}</h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {labelForMonth(selected.period_year, selected.period_month)}
                    </p>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                    <FiCreditCard className="h-6 w-6" aria-hidden />
                  </div>
                </div>

                <div className="mt-5 rounded-lg bg-slate-950 p-4 text-white">
                  <p className="text-xs font-bold uppercase text-white/60">Net Pay</p>
                  <p className="mt-2 text-4xl font-extrabold">${money(selected.net_pay)}</p>
                  <p className="mt-2 text-sm font-bold text-white/60">{selected.status}</p>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <AmountRow label="Basic Salary" value={selected.basic_salary} />
                  <AmountRow label="Overtime" value={selected.overtime_amount} />
                  <AmountRow label="Allowances" value={selected.allowances} />
                  <AmountRow label="Bonus" value={selected.bonus} />
                  <AmountRow label="Benefits" value={selected.benefits} />
                  <AmountRow label="Salary Adjustment" value={selected.salary_adjustment} />
                  <AmountRow label="Gross Pay" value={selected.gross_pay} strong />
                  <AmountRow label="Tax Deduction" value={selected.tax_deduction} negative />
                  <AmountRow label="NSSF Deduction" value={selected.nssf_deduction} negative />
                  <AmountRow label="Other Deductions" value={selected.other_deductions} negative />
                </div>

                <button
                  type="button"
                  onClick={downloadPayslip}
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-extrabold text-white md:w-auto"
                >
                  <FiDownload className="h-4 w-4" aria-hidden />
                  Download Payslip
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const AmountRow = ({ label, value, strong = false, negative = false }) => (
  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3">
    <span className="text-sm font-bold text-slate-500">{label}</span>
    <span
      className={`text-sm font-extrabold ${
        negative ? "text-red-600" : strong ? "text-slate-950" : "text-slate-700"
      }`}
    >
      {negative ? "-" : ""}${money(value)}
    </span>
  </div>
);
