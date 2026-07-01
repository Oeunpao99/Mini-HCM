import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import AdminPage from "./pages/AdminPage";
import AttendancePage from "./pages/AttendancePage";
import MyAttendancePage from "./pages/MyAttendancePage";
import DashboardPage from "./pages/DashboardPage";
import HrisPage from "./pages/HrisPage";
import LoginPage from "./pages/LoginPage";
import PayslipPage from "./pages/PayslipPage";
import ProfilePage from "./pages/ProfilePage";
import ReportPage from "./pages/ReportPage";
import RequestsPage from "./pages/RequestsPage";
import SelfServicePage from "./pages/SelfServicePage";
import ShiftPage from "./pages/ShiftPage";
import SwapPage from "./pages/SwapPage";
import PerformancePage from "./pages/PerformancePage";
import TrainingPage from "./pages/TrainingPage";

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
        path="/my-attendance"
        element={
          <ProtectedRoute
            roles={["line_manager", "department_head", "management_hr", "payroll_officer"]}
          >
            <Layout>
              <MyAttendancePage />
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
        path="/training"
        element={
          <ProtectedRoute>
            <Layout>
              <TrainingPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/performance"
        element={
          <ProtectedRoute
            roles={["line_manager", "department_head", "management_hr", "payroll_officer"]}
          >
            <Layout>
              <PerformancePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/self-service"
        element={
          <ProtectedRoute>
            <Layout>
              <SelfServicePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shift"
        element={
          <ProtectedRoute
            roles={["line_manager", "department_head", "management_hr", "payroll_officer"]}
          >
            <Layout>
              <ShiftPage />
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
