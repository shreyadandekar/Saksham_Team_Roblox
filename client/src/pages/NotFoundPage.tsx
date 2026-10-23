/**
 * src/pages/NotFoundPage.tsx
 * 404 fallback route.
 */
import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import AppShell from "../components/layout/AppShell";

export default function NotFoundPage() {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <FileQuestion
          className="h-12 w-12 text-slate-400"
          aria-hidden="true"
        />
        <h1 className="text-3xl font-bold text-slate-700">404 – Not Found</h1>
        <p className="text-slate-500">
          The page you're looking for doesn't exist.
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
