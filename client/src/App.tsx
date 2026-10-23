/**
 * src/App.tsx
 * Root component – provides AuthContext and defines route structure.
 */

import type { ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InstrumentsPage from "./pages/InstrumentsPage";
import InstrumentDetailPage from "./pages/InstrumentDetailPage";
import MaturitiesPage from "./pages/MaturitiesPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";

function Protected({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public login route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/instruments" element={<Protected><InstrumentsPage /></Protected>} />
        <Route
          path="/instruments/:id"
          element={<Protected><InstrumentDetailPage /></Protected>}
        />
        <Route path="/maturities" element={<Protected><MaturitiesPage /></Protected>} />
        <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />

        {/* Redirect root to dashboard (ProtectedRoute will forward to /login if unauthenticated) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
