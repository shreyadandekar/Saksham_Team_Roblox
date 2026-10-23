/**
 * src/App.tsx
 * Root component – defines client-side route structure.
 * Business pages will be added here incrementally.
 */
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      {/* Future routes: /deposits, /fdrs, /admin, etc. */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
