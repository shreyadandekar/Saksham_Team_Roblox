/**
 * src/pages/NotFoundPage.tsx
 * 404 fallback route.
 */
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";

export default function NotFoundPage() {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-2 mb-1">
          <img
            src="/assets/saksham-logo.png"
            alt="Saksham"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">404 – Page Not Found</h1>
        <p className="text-xs text-slate-500 max-w-sm">
          The requested page or resource could not be found within Saksham.
        </p>
        <Link
          to="/dashboard"
          className="mt-2 px-4 py-2 rounded-md bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </AppShell>
  );
}
