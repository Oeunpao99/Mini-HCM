import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [empCode, setEmpCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(empCode, password);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid login");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6">
        <h2 className="font-display text-2xl font-bold">Sign In</h2>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
          placeholder="Employee Code"
          value={empCode}
          onChange={(e) => setEmpCode(e.target.value)}
          required
        />
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-lg bg-ink py-2 font-semibold text-white">
          Login
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
