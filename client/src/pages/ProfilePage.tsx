/**
 * src/pages/ProfilePage.tsx
 * Read-only account details from GET /api/auth/me.
 */

import { KeyRound, Settings } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { UnavailableNotice } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { useInstruments } from "../hooks/useInstruments";
import { ROLE_LABELS, ROLE_SCOPE, initials } from "../lib/roles";

export default function ProfilePage() {
  const { user } = useAuth();
  const { instruments } = useInstruments();
  if (!user) return null;

  const institution = user.institutionId
    ? instruments.find((i) => i.institutionId === user.institutionId)?.institution
    : undefined;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Profile" }]}>
      <div className="flex flex-col gap-6 max-w-3xl">
        <PageHeader eyebrow="Account" title="Your profile" description="Details for the account you are signed in with." />

        <Card>
          <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy-100 text-lg font-semibold text-navy-900">
              {initials(user.fullName)}
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-navy-900 break-words">{user.fullName}</p>
              <p className="text-sm text-ink-muted break-all">{user.email}</p>
              <div className="mt-2">
                <Badge tone="info">{ROLE_LABELS[user.role]}</Badge>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Access" />
          <CardBody>
            <dl className="divide-y divide-line">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 pb-3">
                <dt className="text-[13px] text-ink-muted sm:w-44 shrink-0">Role</dt>
                <dd className="text-sm text-ink">{ROLE_LABELS[user.role]}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 py-3">
                <dt className="text-[13px] text-ink-muted sm:w-44 shrink-0">Record scope</dt>
                <dd className="text-sm text-ink">{ROLE_SCOPE[user.role]}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 pt-3">
                <dt className="text-[13px] text-ink-muted sm:w-44 shrink-0">Institution</dt>
                <dd className="text-sm text-ink">
                  {user.institutionId
                    ? institution
                      ? `${institution.name} (${institution.code})`
                      : "Linked institution"
                    : "Not linked. This role works across institutions."}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Security and preferences" description="These features are not yet available." />
          <CardBody className="flex flex-col gap-3">
            <UnavailableNotice icon={KeyRound} title="Change password">
              Requires a password change endpoint.
            </UnavailableNotice>
            <UnavailableNotice icon={Settings} title="Notification and display settings">
              Requires a preferences endpoint.
            </UnavailableNotice>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
