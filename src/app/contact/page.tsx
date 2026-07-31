"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Send, Clock, Bug } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_CONTACT_EMAIL } from "@/lib/site-config";
import { TOOLS } from "@/lib/tools-registry";

const TOPICS = [
  { id: "bug",         label: "Bug report" },
  { id: "tool",        label: "Tool suggestion" },
  { id: "feedback",    label: "General feedback" },
  { id: "partnership", label: "Partnership / collaboration" },
  { id: "privacy",     label: "Privacy concern" },
  { id: "other",       label: "Other" },
] as const;

const SUBJECT_PRESETS = [
  "Bug report",
  "Tool suggestion",
  "General feedback",
  "Partnership / collaboration",
  "Privacy concern",
  "Other",
] as const;

const MSG_MAX = 2000;

export default function ContactPage() {
  const [topic, setTopic]             = useState<(typeof TOPICS)[number]["id"]>("feedback");
  const [subjectPreset, setSubjectPreset] = useState<(typeof SUBJECT_PRESETS)[number]>("General feedback");
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [subjectLine, setSubjectLine] = useState("");
  const [toolHint, setToolHint]       = useState("");
  const [message, setMessage]         = useState("");
  const [sentHint, setSentHint]       = useState(false);
  const [formError, setFormError]     = useState("");

  const submitMailto = useCallback(() => {
    setFormError("");
    setSentHint(false);

    const n   = name.trim();
    const em  = email.trim();
    const sub = subjectLine.trim();
    const msg = message.trim();

    if (!n || !em || !sub || !msg) {
      setFormError("Please fill in name, email, subject summary, and message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (msg.length > MSG_MAX) {
      setFormError(`Message must be ${MSG_MAX} characters or fewer.`);
      return;
    }

    const topicLabel = TOPICS.find((t) => t.id === topic)?.label ?? topic;
    const toolLine   = toolHint.trim() ? `\nRelated tool / page: ${toolHint.trim()}` : "";

    const body = [
      `From: ${n} <${em}>`,
      `Topic: ${topicLabel}`,
      `Subject category: ${subjectPreset}`,
      toolLine,
      "",
      msg,
    ].join("\n");

    const subject = `[DevBench] ${subjectPreset}: ${sub}`;
    const url     = `mailto:${SITE_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = url;
    setSentHint(true);
  }, [topic, subjectPreset, name, email, subjectLine, toolHint, message]);

  return (
    <>
      <Header />
      <main id="main" className="mx-auto flex-1 w-full max-w-3xl px-4 py-10 sm:px-6 lg:max-w-6xl lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-12 lg:items-start">
          {/* ── Form ── */}
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5 text-accent" />
              Contact us
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              We&apos;d love to hear from you
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground leading-relaxed">
              Questions, bugs, or ideas for new tools? Fill in the form and your mail app will open
              with a pre-filled message — nothing is stored on our servers.
            </p>

            <div className="mt-10 space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div>
                <label htmlFor="contact-topic" className="mb-1.5 block text-sm font-medium">
                  What is this about?
                </label>
                <select
                  id="contact-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as (typeof TOPICS)[number]["id"])}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium">
                    Full name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                    aria-invalid={formError && !name.trim() ? true : undefined}
                    aria-describedby={formError ? "contact-form-error" : undefined}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium">
                    Your email <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    aria-invalid={formError && (!email.trim() || formError.includes("email")) ? true : undefined}
                    aria-describedby={formError ? "contact-form-error" : undefined}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject-preset" className="mb-1.5 block text-sm font-medium">
                  Subject <span className="text-destructive">*</span>
                </label>
                <select
                  id="contact-subject-preset"
                  value={subjectPreset}
                  onChange={(e) => setSubjectPreset(e.target.value as (typeof SUBJECT_PRESETS)[number])}
                  className="mb-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {SUBJECT_PRESETS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <label htmlFor="contact-subject" className="sr-only">
                  Subject summary
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={subjectLine}
                  onChange={(e) => setSubjectLine(e.target.value)}
                  placeholder="Short summary (e.g. JWT debugger export bug)"
                  required
                  aria-invalid={formError && !subjectLine.trim() ? true : undefined}
                  aria-describedby={formError ? "contact-form-error" : undefined}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>

              <div>
                <label htmlFor="contact-tool" className="mb-1.5 block text-sm font-medium">
                  Related tool (optional)
                </label>
                <input
                  id="contact-tool"
                  list="tool-suggestions"
                  value={toolHint}
                  onChange={(e) => setToolHint(e.target.value)}
                  placeholder="e.g. Image Resizer, /tools/xml-suite"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <datalist id="tool-suggestions">
                  {TOOLS.map((t) => (
                    <option key={t.slug} value={`${t.name} (/tools/${t.slug})`} />
                  ))}
                  <option value="/api-tester" />
                  <option value="/code-beautify" />
                  <option value="/graph-calculator" />
                  <option value="/jwt-debugger" />
                  <option value="/diff-checker" />
                </datalist>
              </div>

              <div>
                <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">
                  Message <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  maxLength={MSG_MAX}
                  placeholder="What happened? What did you expect? For bugs: browser, OS, and steps help."
                  required
                  aria-invalid={formError && !message.trim() ? true : undefined}
                  aria-describedby={formError ? "contact-form-error contact-message-count" : "contact-message-count"}
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <p id="contact-message-count" className="mt-1 text-xs text-muted-foreground">
                  {message.length} / {MSG_MAX}
                </p>
              </div>

              {formError && (
                <p id="contact-form-error" className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}
              {sentHint && !formError && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
                  Thank you! If your mail app didn&apos;t open, email{" "}
                  <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="font-medium text-accent hover:underline">
                    {SITE_CONTACT_EMAIL}
                  </a>{" "}
                  directly.
                </p>
              )}

              <button
                type="button"
                onClick={submitMailto}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 sm:w-auto"
              >
                <Send className="h-4 w-4" />
                Send message (open email app)
              </button>

              <p className="text-xs text-muted-foreground">
                By sending, you agree we may use your email only to reply. See{" "}
                <Link href="/privacy" className="text-accent hover:underline">Privacy</Link>.
              </p>
            </div>

            <section className="mt-14 border-t border-border pt-10">
              <h2 className="text-lg font-semibold">Frequently asked questions</h2>
              <dl className="mt-6 space-y-6">
                <div>
                  <dt className="font-medium">How do I report a bug?</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    Pick &quot;Bug report&quot;, choose the subject category, name the tool, and describe
                    expected vs actual behavior. Browser and OS details help.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Can I suggest a new tool?</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    Yes — we prioritize ideas that run fully in the browser without accounts or
                    server-side data storage.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Do you store my message?</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    No. The form only builds a mailto link; your email client sends the message.
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          {/* ── Sidebar ── */}
          <aside className="mt-12 space-y-6 lg:mt-0">
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <h2 className="font-semibold">Response time</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We aim to reply within <strong className="text-foreground">two business days</strong>.
                    Privacy-related requests may take longer depending on volume.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 font-semibold">
                <Bug className="h-4 w-4 text-accent" />
                Reporting a bug?
              </h2>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>Which tool or URL</li>
                <li>Expected vs actual behavior</li>
                <li>Browser name and version</li>
                <li>Sample input if safe to share</li>
              </ul>
            </section>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
