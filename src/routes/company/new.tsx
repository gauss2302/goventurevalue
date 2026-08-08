import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";
import { createCompanyFn } from "@/lib/server/companyFns";

export const Route = createFileRoute("/company/new")({
  beforeLoad: async ({ location }) => {
    await requireAuthForLoader(location);
  },
  component: NewCompany,
});

/** Domain is optional here but needed to verify by work email, so we say so. */
function NewCompany() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);

    try {
      const { companyId } = await createCompanyFn({
        data: {
          name: name.trim(),
          domain: domain.trim() || null,
          website: website.trim() || null,
        },
      });

      await router.navigate({ to: "/company/$companyId", params: { companyId } });
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[640px] px-6 py-12">
      <h1
        className="text-[var(--text-title1)] text-[var(--brand-ink)]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        Add your company
      </h1>
      <p className="mt-2 text-sm text-[var(--brand-muted)]">
        You will be its owner. Two more steps after this and your roles can go live.
      </p>

      <Card className="mt-8 p-6">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <Field label="Company name" required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme AI"
              required
              maxLength={200}
            />
          </Field>

          <Field
            label="Company domain"
            hint="Used to verify your work email. You can add it later, but verification needs it."
          >
            <Input
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="acme.dev"
              maxLength={200}
            />
          </Field>

          <Field label="Website">
            <Input
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://acme.dev"
              maxLength={300}
            />
          </Field>

          <Button
            type="submit"
            variant="brand"
            disabled={busy || name.trim().length === 0}
            className="self-start"
          >
            {busy ? "Creating…" : "Create company"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--brand-ink)]">
        {label}
        {required && <span className="text-[var(--destructive)]"> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-[var(--brand-muted)]">{hint}</span>}
    </label>
  );
}
