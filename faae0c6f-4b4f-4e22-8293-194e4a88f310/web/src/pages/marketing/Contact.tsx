import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/primitives";
import { Field, FormError, Input, Select, Textarea, useFieldId } from "@/components/ui/form";
import { Container, Eyebrow } from "@/components/marketing/Section";
import { COMPANY } from "@/features/marketing/content";

const enquiryTypes = [
  { value: "business", label: "Bulk supply enquiry" },
  { value: "customer", label: "Existing customer support" },
  { value: "supplier", label: "Supplier or partner proposal" },
  { value: "general", label: "General enquiry" },
];

export function Contact() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    type: "business",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const ids = {
    name: useFieldId("name"),
    company: useFieldId("company"),
    email: useFieldId("email"),
    phone: useFieldId("phone"),
    subject: useFieldId("subject"),
    message: useFieldId("message"),
    type: useFieldId("type"),
  };

  const update = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ id: string; message: string }>("/public/enquiries", {
        ...form,
        company: form.company || null,
        phone: form.phone || null,
      });
      setSent(result.message);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not send your enquiry. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-b border-line bg-surface">
      <Container className="grid gap-12 py-14 md:py-20 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <Eyebrow>Contact</Eyebrow>
          <h1 className="mt-4 text-[clamp(1.9rem,3.4vw,2.8rem)] leading-[1.06] font-semibold tracking-[-0.03em] text-ink">
            Talk to the commercial desk.
          </h1>
          <p className="mt-5 text-[14px] leading-relaxed text-muted">
            Enquiries are reviewed by the commercial team and routed internally. Supply requests should include the
            product, volume and destination so availability can be confirmed in the first response.
          </p>

          <dl className="mt-8 space-y-5">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <div>
                <dt className="text-[11px] tracking-wide text-muted uppercase">Head office</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-ink-soft">{COMPANY.address}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <div>
                <dt className="text-[11px] tracking-wide text-muted uppercase">Telephone</dt>
                <dd className="mt-1 text-[13px] text-ink-soft">{COMPANY.phone}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <div>
                <dt className="text-[11px] tracking-wide text-muted uppercase">Written enquiries</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                  Use the form. It creates a tracked record that the commercial team can respond to.
                </dd>
              </div>
            </div>
          </dl>

          <div className="mt-8 rounded-[14px] border border-line bg-canvas p-4">
            <p className="text-[11px] leading-relaxed text-muted">
              Demonstration build: submitted enquiries are stored in this prototype's database and are not sent to any
              external mailbox or real company address.
            </p>
          </div>
        </div>

        <div className="rounded-[18px] border border-line bg-canvas p-6 md:p-8">
          {sent ? (
            <div className="flex h-full flex-col items-start justify-center py-10">
              <CheckCircle2 className="size-8 text-ok" aria-hidden />
              <h2 className="mt-4 text-xl font-semibold text-ink">Enquiry received</h2>
              <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted">{sent}</p>
              <Button
                className="mt-6"
                variant="secondary"
                onClick={() => {
                  setSent(null);
                  setForm({ name: "", company: "", email: "", phone: "", subject: "", message: "", type: "business" });
                }}
              >
                Send another enquiry
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <h2 className="text-lg font-semibold text-ink">Send an enquiry</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" required htmlFor={ids.name}>
                  <Input id={ids.name} value={form.name} onChange={update("name")} required minLength={2} autoComplete="name" />
                </Field>
                <Field label="Company" htmlFor={ids.company}>
                  <Input id={ids.company} value={form.company} onChange={update("company")} autoComplete="organization" />
                </Field>
                <Field label="Email" required htmlFor={ids.email}>
                  <Input id={ids.email} type="email" value={form.email} onChange={update("email")} required autoComplete="email" />
                </Field>
                <Field label="Phone" htmlFor={ids.phone}>
                  <Input id={ids.phone} value={form.phone} onChange={update("phone")} autoComplete="tel" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                <Field label="Subject" required htmlFor={ids.subject}>
                  <Input
                    id={ids.subject}
                    value={form.subject}
                    onChange={update("subject")}
                    required
                    minLength={3}
                    placeholder="e.g. 40 MT LPG, monthly lift"
                  />
                </Field>
                <Field label="Enquiry type" htmlFor={ids.type}>
                  <Select id={ids.type} value={form.type} onChange={update("type")}>
                    {enquiryTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Message" required htmlFor={ids.message} hint="Include product, volume, destination and timing where relevant.">
                <Textarea
                  id={ids.message}
                  value={form.message}
                  onChange={update("message")}
                  required
                  minLength={10}
                  rows={6}
                  placeholder="Tell us what you need and when you need it."
                />
              </Field>
              <FormError message={error} />
              <Button type="submit" loading={busy} className="w-full sm:w-auto">
                Send enquiry
              </Button>
            </form>
          )}
        </div>
      </Container>
    </section>
  );
}
