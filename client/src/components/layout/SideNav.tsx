import { NavLink } from "react-router-dom";
import type { Role } from "../../types/auth";
import { navForRole } from "../../lib/navigation";

interface SideNavProps {
  role: Role;
  onNavigate?: () => void;
}

export function SideNav({ role, onNavigate }: SideNavProps) {
  const { available, unavailable } = navForRole(role);

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-6">
      <ul className="flex flex-col gap-0.5">
        {available.map(({ label, to, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-lg px-3 h-11 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-navy-50 text-navy-900 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-saffron"
                    : "text-ink-muted hover:bg-muted hover:text-ink"
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      {unavailable.length > 0 && (
        <div>
          <p
            id="nav-unavailable-heading"
            className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle"
          >
            Not yet available
          </p>
          <ul aria-labelledby="nav-unavailable-heading" className="flex flex-col gap-0.5">
            {unavailable.map(({ label, icon: Icon, dependency }) => {
              const descId = `nav-dep-${label.replace(/\s+/g, "-").toLowerCase()}`;
              return (
                <li key={label}>
                  <span
                    role="link"
                    aria-disabled="true"
                    aria-describedby={descId}
                    className="flex items-start gap-3 rounded-lg px-3 py-2 text-sm text-ink-subtle cursor-not-allowed select-none"
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 mt-px" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block font-medium">{label}</span>
                      <span id={descId} className="block text-[11px] leading-snug mt-0.5">
                        {dependency}
                      </span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
