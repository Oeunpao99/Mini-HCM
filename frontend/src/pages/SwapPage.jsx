import { useEffect, useState } from "react";
import api from "../services/api";

const SwapPage = () => {
  const [targetUserId, setTargetUserId] = useState("");
  const [swapDate, setSwapDate] = useState("");
  const [rows, setRows] = useState([]);

  const load = async () => {
    const { data } = await api.get("/api/swap/my");
    setRows(data);
  };

  useEffect(() => {
    load();
  }, []);

  const requestSwap = async (e) => {
    e.preventDefault();
    await api.post("/api/swap/request", {
      target_user_id: Number(targetUserId),
      swap_date: swapDate,
    });
    setTargetUserId("");
    setSwapDate("");
    load();
  };

  const respond = async (id, action) => {
    try {
      const { data } = await api.put("/api/swap/respond", {
        swap_request_id: id,
        action,
      });

      // If the current user accepted the swap (target accepted), create a flexible check-in for the swap date
      if (action.toLowerCase() === "accept") {
        try {
          // find the swap item to get the date
          const swapItem = rows.find((r) => r.id === id) || data;
          const swapDate = swapItem.swap_date || data.swap_date;
          // use 09:00:00 as default check-in time for swapped day
          const timestamp = `${swapDate}T09:00:00`;
          await api.post("/api/attendance/flex-checkin", {
            timestamp,
            flexible: true,
          });
        } catch (err) {
          // non-fatal: log and continue
          console.warn(
            "Swap accepted but check-in failed",
            err?.response?.data || err.message || err,
          );
        }
      }

      load();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to respond to swap");
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={requestSwap}
        className="card grid gap-3 p-5 md:grid-cols-3"
      >
        <h2 className="font-display text-xl font-semibold md:col-span-3">
          Request Attendance Swap
        </h2>
        <input
          className="rounded border px-3 py-2"
          placeholder="Target User ID"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2"
          type="date"
          value={swapDate}
          onChange={(e) => setSwapDate(e.target.value)}
          required
        />
        <button className="rounded bg-ink px-4 py-2 text-white">Request</button>
      </form>

      <div className="card p-5">
        <h3 className="font-display text-lg font-semibold">Swap Requests</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">ID</th>
                <th className="p-2">Requester</th>
                <th className="p-2">Target</th>
                <th className="p-2">Date</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.id}</td>
                  <td className="p-2">{r.requester_id}</td>
                  <td className="p-2">{r.target_user_id}</td>
                  <td className="p-2">{r.swap_date}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2 flex gap-2">
                    <button
                      className="rounded bg-emerald-100 px-2 py-1 text-emerald-700"
                      onClick={() => respond(r.id, "accept")}
                    >
                      Accept
                    </button>
                    <button
                      className="rounded bg-red-100 px-2 py-1 text-red-700"
                      onClick={() => respond(r.id, "reject")}
                    >
                      Reject
                    </button>
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

export default SwapPage;
