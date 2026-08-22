/** Invite-a-candidate form used by the /candidates/invite route. */
import { useEffect, useState } from "react";
import { Alert, Button, Card, Input, PhoneInput, Select, Textarea } from "@/lib/components/ui";
import { EXPIRY_OPTIONS, candidatesApi, type InviteInput } from "@/lib/api/candidates";
import { formsApi } from "@/lib/api/forms";
import type { FormSchema } from "@/lib/types/formSchema";

export interface InviteSuccess {
  candidateId: string;
  pipelineId: string;
  magicLinkUrl: string;
  expiresAt: string;
  email: string;
}

export interface InviteFormProps {
  onSuccess: (result: InviteSuccess) => void;
}

export function InviteForm({ onSuccess }: InviteFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleName, setRoleName] = useState("");
  const [formId, setFormId] = useState("");
  const [expiryHours, setExpiryHours] = useState(EXPIRY_OPTIONS[2].hours);
  const [hrNotes, setHrNotes] = useState("");
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void formsApi.publishedCandidateForms().then((r) => {
      if (r.data) setForms(r.data);
      setLoadingForms(false);
    });
  }, []);

  const submit = async (allowDuplicate = false) => {
    setError(null);
    setDuplicateId(null);
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    setSubmitting(true);
    const input: InviteInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      roleName: roleName.trim() || undefined,
      formId: formId || null,
      expiryHours,
      hrNotes: hrNotes.trim() || undefined,
      allowDuplicate,
    };
    const r = await candidatesApi.invite(input);
    setSubmitting(false);
    if (r.error) {
      if (r.error.code === "duplicate" && r.error.message.startsWith("DUPLICATE:")) {
        setDuplicateId(r.error.message.slice("DUPLICATE:".length));
        setError("A candidate with this email already has an active application for this role.");
      } else {
        setError(r.error.message);
      }
      return;
    }
    if (r.data) {
      onSuccess({ ...r.data, email: input.email });
    }
  };

  return (
    <Card className="space-y-6">
      {error && (
        <Alert variant="warning" title="Heads up">
          <p>{error}</p>
          {duplicateId && (
            <div className="mt-2 flex gap-3">
              <button type="button" className="text-[13px] font-medium underline" onClick={() => void submit(true)}>
                Yes, create new
              </button>
              <a
                href={`/candidates/${duplicateId}`}
                className="text-[13px] font-medium underline"
              >
                View existing
              </a>
            </div>
          )}
        </Alert>
      )}

      {!loadingForms && forms.length === 0 && (
        <Alert variant="warning" title="No published candidate forms">
          <p>
            Publish a candidate onboarding form in{" "}
            <a href="/settings/forms" className="underline font-medium">Settings → Forms</a> so candidates can fill it in,
            or continue below to send a form-less invite.
          </p>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <PhoneInput label="Phone" value={phone} onChange={setPhone} />
        <Input label="Role" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. Product Designer" />
        <Select
          label="Onboarding form"
          value={formId}
          onChange={(e) => setFormId(e.target.value)}
          options={forms.map((f) => ({ value: f.id, label: `${f.title} (v${f.version})` }))}
          placeholder={forms.length ? "Select a form (optional)" : "No published forms available"}
        />
        <Select
          label="Link expiry"
          value={String(expiryHours)}
          onChange={(e) => setExpiryHours(Number(e.target.value))}
          options={EXPIRY_OPTIONS.map((o) => ({ value: String(o.hours), label: o.label }))}
        />
      </div>

      <Textarea
        label="Internal notes (optional)"
        value={hrNotes}
        onChange={(e) => setHrNotes(e.target.value)}
        placeholder="Not visible to the candidate…"
        rows={3}
      />

      <div className="flex justify-end">
        <Button loading={submitting} onClick={() => void submit(false)}>
          Send invitation
        </Button>
      </div>
    </Card>
  );
}
