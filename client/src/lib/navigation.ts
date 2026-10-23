import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  FilePlus2,
  FileStack,
  LayoutDashboard,
  ScrollText,
  Settings,
  Undo2,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "../types/auth";

const ALL: Role[] = ["INSTITUTION_USER", "AICTE_OFFICER", "SYSTEM_ADMIN"];

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: Role[];
}

export interface UnavailableNavItem {
  label: string;
  icon: LucideIcon;
  roles: Role[];
  /** What the backend needs before this can be built. */
  dependency: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: ALL },
  { label: "FDR Registry", to: "/instruments", icon: FileStack, roles: ALL },
  { label: "Maturities", to: "/maturities", icon: CalendarClock, roles: ALL },
  { label: "Profile", to: "/profile", icon: UserCircle, roles: ALL },
];

export const UNAVAILABLE_NAV_ITEMS: UnavailableNavItem[] = [
  {
    label: "Register FDR",
    icon: FilePlus2,
    roles: ["INSTITUTION_USER"],
    dependency: "Requires create and update instrument endpoints.",
  },
  {
    label: "Scrutiny Queue",
    icon: ClipboardCheck,
    roles: ["AICTE_OFFICER", "SYSTEM_ADMIN"],
    dependency: "Requires scrutiny action endpoints.",
  },
  {
    label: "Releases",
    icon: Undo2,
    roles: ALL,
    dependency: "Requires release request endpoints.",
  },
  {
    label: "Institutions",
    icon: Building2,
    roles: ["AICTE_OFFICER", "SYSTEM_ADMIN"],
    dependency: "Requires an institutions endpoint.",
  },
  {
    label: "Users",
    icon: Users,
    roles: ["SYSTEM_ADMIN"],
    dependency: "Requires a user management endpoint.",
  },
  {
    label: "Audit Log",
    icon: ScrollText,
    roles: ["AICTE_OFFICER", "SYSTEM_ADMIN"],
    dependency: "Requires an audit events endpoint.",
  },
  {
    label: "Settings",
    icon: Settings,
    roles: ALL,
    dependency: "Requires a preferences endpoint.",
  },
];

export function navForRole(role: Role) {
  return {
    available: NAV_ITEMS.filter((i) => i.roles.includes(role)),
    unavailable: UNAVAILABLE_NAV_ITEMS.filter((i) => i.roles.includes(role)),
  };
}
