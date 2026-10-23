import { FileQuestion } from "lucide-react";
import { ButtonLink } from "../components/ui/Button";
import { BrandMark } from "../components/layout/BrandMark";

export default function NotFoundPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center px-4 sm:px-6">
          <BrandMark />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-ink-muted">
          <FileQuestion className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">Error 404</p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-900">Page not found</h1>
        <p className="mt-2 max-w-md text-sm text-ink-muted">
          The address may be mistyped, or the page may have moved. Check the URL or return to your
          dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ButtonLink to="/dashboard">Go to dashboard</ButtonLink>
          <ButtonLink to="/instruments" variant="secondary">
            Open FDR registry
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
