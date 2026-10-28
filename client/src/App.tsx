/**
 * src/App.tsx
 * Root component – provides AuthContext and defines route structure.
 */

import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InstrumentsPage from "./pages/InstrumentsPage";
import RegisterInstrumentPage from "./pages/RegisterInstrumentPage";
import InstrumentDetailPage from "./pages/InstrumentDetailPage";
import ScrutinyQueuePage from "./pages/ScrutinyQueuePage";
import ClearanceCommandCenterPage from "./pages/ClearanceCommandCenterPage";
import ClearanceCaseDetailPage from "./pages/ClearanceCaseDetailPage";
import MaturitiesPage from "./pages/MaturitiesPage";
import ProfilePage from "./pages/ProfilePage";
import AuditLogPage from "./pages/AuditLogPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />

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
          path="/clearances"
          element={
            <ProtectedRoute>
              <ClearanceCommandCenterPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clearances/:releaseRequestId"
          element={
            <ProtectedRoute>
              <ClearanceCaseDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/maturities"
          element={
            <ProtectedRoute>
              <MaturitiesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
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

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
