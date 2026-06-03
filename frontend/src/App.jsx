import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import AdminPage from "./pages/AdminPage";
import AttendancePage from "./pages/AttendancePage";
import DashboardPage from "./pages/DashboardPage";
import HrisPage from "./pages/HrisPage";
import LoginPage from "./pages/LoginPage";
import PayslipPage from "./pages/PayslipPage";
import ProfilePage from "./pages/ProfilePage";
import ReportPage from "./pages/ReportPage";
import RequestsPage from "./pages/RequestsPage";
import SwapPage from "./pages/SwapPage";

const App = () => {
  const { token, role } = useAuth();

  const managementRoles = [
    "line_manager",
    "department_head",
    "management_hr",
    "payroll_officer",
  ];
  const isManagement = managementRoles.includes(role);

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/" /> : <LoginPage />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              {isManagement ? <HrisPage /> : <DashboardPage />}
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Layout>
              <AttendancePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <Layout>
              <ReportPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <Layout>
              <RequestsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/swap"
        element={
          <ProtectedRoute>
            <Layout>
              <SwapPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <ProfilePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/payslips"
        element={
          <ProtectedRoute>
            <Layout>
              <PayslipPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute
            roles={["line_manager", "department_head", "management_hr", "payroll_officer"]}
          >
            <Layout>
              <AdminPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hris"
        element={
          <ProtectedRoute
            roles={[
              "line_manager",
              "department_head",
              "management_hr",
              "payroll_officer",
            ]}
          >
            <Layout>
              <HrisPage />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
