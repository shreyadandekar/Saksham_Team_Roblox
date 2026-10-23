/**
 * src/App.tsx
 * Root component – provides AuthContext and defines route structure.
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InstrumentsPage from "./pages/InstrumentsPage";
import RegisterInstrumentPage from "./pages/RegisterInstrumentPage";
import InstrumentDetailPage from "./pages/InstrumentDetailPage";
import ScrutinyQueuePage from "./pages/ScrutinyQueuePage";
import AuditLogPage from "./pages/AuditLogPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public login route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/instruments"
          element={
            <ProtectedRoute>
              <InstrumentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/instruments/new"
          element={
            <ProtectedRoute>
              <RegisterInstrumentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/instruments/:id"
          element={
            <ProtectedRoute>
              <InstrumentDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scrutiny"
          element={
            <ProtectedRoute>
              <ScrutinyQueuePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit"
          element={
            <ProtectedRoute>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />

        {/* Redirect root to dashboard (ProtectedRoute will forward to /login if unauthenticated) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
