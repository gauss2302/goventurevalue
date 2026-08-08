import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { companyRoleEnum } from "@/db/schema";
import { inviteMemberFn, listMembersFn, setSlaContactFn } from "@/lib/server/companyFns";
import { roleCan, type CompanyRole } from "@/lib/company/permissions";

export const Route = createFileRoute("/company/$companyId/team")({
  loader: async ({ params }) => listMembersFn({ data: { companyId: params.companyId } }),
  component: Team,
});

const layoutRoute = getRouteApi("/company/$companyId");

const ROLE_SUMMARY: Record<CompanyRole, string> = {
  owner: "Everything, including the response commitment and billing",
  admin: "Company profile, roles and the team",
  recruiter: "Roles and replying to candidates",
  viewer: "Read only",
};

function Team() {
  const members = Route.useLoaderData();
  const { companyId } = Route.useParams();
  const { role: myRole } = layoutRoute.useLoaderData();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyRole>("recruiter");
  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const canInvite = roleCan(myRole as CompanyRole, "inviteMember");
  const canSetContact = roleCan(myRole as CompanyRole, "setSlaContact");

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);

    try {
      const result = await inviteMemberFn({ data: { companyId, email: email.trim(), role } });
      // Email delivery is not wired yet, so the link is surfaced rather than
      // silently going nowhere.
      setInviteLink(`/invite/${result.token}`);
      toast.success("Invitation created");
      setEmail("");
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const makeContact = async (memberId: string) => {
    setBusy(true);
    try {
      await setSlaContactFn({ data: { companyId, memberId } });
      toast.success("Reminder contact updated");
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h2
        className="text-[var(--text-title2)] text-[var(--brand-ink)]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        Team
      </h2>

      <ul className="flex flex-col gap-3">
        {members.map((member) => (
          <li key={member.id}>
            <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[var(--brand-ink)]">{member.user.name}</p>
                  <Badge variant={member.role === "owner" ? "brand" : "neutral"}>
                    {member.role}
                  </Badge>
                  {member.isSlaContact && (
                    // Whoever gets chased when nobody else is assigned (§6.6).
                    <Badge variant="info">Reminder contact</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-[var(--brand-muted)]">{member.user.email}</p>
                <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
                  {ROLE_SUMMARY[member.role]}
                </p>
              </div>

              {canSetContact && !member.isSlaContact && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => makeContact(member.id)}
                >
                  Make reminder contact
                </Button>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {canInvite && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-[var(--brand-ink)]">Invite someone</h3>
          <p className="mt-1 text-xs text-[var(--brand-muted)]">
            Recruiters can reply to candidates — that is the permission that matters most.
          </p>

          <form onSubmit={invite} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--brand-ink)]">Work email</span>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@company.com"
                required
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--brand-ink)]">Role</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as CompanyRole)}
                className="h-10 rounded-[var(--radius-sm)] border border-[var(--surface-muted-border)] bg-[var(--page)] px-3 text-sm text-[var(--brand-ink)]"
              >
                {companyRoleEnum.enumValues
                  .filter((value) => value !== "owner" || myRole === "owner")
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </label>

            <Button type="submit" disabled={busy || email.trim().length === 0}>
              Create invitation
            </Button>
          </form>

          {inviteLink && (
            <p className="mt-4 rounded-[var(--radius-sm)] bg-[var(--surface-2)] p-3 text-xs text-[var(--brand-ink)]">
              Send this link to them — email delivery is not set up yet:
              <br />
              <code className="break-all">{inviteLink}</code>
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
