import { createContext, useContext, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

const normalizeRole = (role) =>
  ({ employee: "staff", manager: "line_manager", admin: "management_hr" })[
    role
  ] || role;

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role, setRole] = useState(normalizeRole(localStorage.getItem("role")));
  const [name, setName] = useState(localStorage.getItem("name"));
  const [empCode, setEmpCode] = useState(localStorage.getItem("empCode"));

  const login = async (emp_code, password) => {
    const { data } = await api.post("/api/auth/login", { emp_code, password });
    localStorage.setItem("token", data.access_token);
    const normalizedRole = normalizeRole(data.role);
    localStorage.setItem("role", normalizedRole);
    localStorage.setItem("name", data.name);
    localStorage.setItem("empCode", emp_code);
    setToken(data.access_token);
    setRole(normalizedRole);
    setName(data.name);
    setEmpCode(emp_code);
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setName(null);
    setEmpCode(null);
  };

  const value = useMemo(
    () => ({ token, role, name, empCode, login, logout }),
    [token, role, name, empCode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
