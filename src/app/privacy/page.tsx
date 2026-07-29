import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PrivacyRetentionFaq from "@/components/PrivacyRetentionFaq";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex-1 w-full max-w-2xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>
        <div className="mt-6 space-y-6 text-muted-foreground leading-relaxed">

          <p>
            This Privacy Policy explains how DevBench (devbench.co.in) collects, uses, and
            protects information when you visit and use the site. By using DevBench, you agree
            to the practices described below.
          </p>

          <h2 className="text-lg font-semibold text-foreground pt-2">1. Tool inputs and data processing</h2>
          <p>
            Most DevBench tools process your input <strong className="text-foreground">entirely
            within your browser</strong>. Text you paste, files you upload, and options you
            configure are handled by client-side JavaScript on your device. We do not store or
            log tool inputs. A small set of features uses short-lived server relays (listed
            below); those requests are not retained after the response.
          </p>
          <p>
            Examples of data that never reaches our servers for client-only tools: JSON payloads,
            JWT tokens, Base64 strings, passwords, hash inputs, most PDF/image edits, cron
            expressions, and similar text or files you provide to DevBench tools.
          </p>
          <p>
            A few features require a network request by design:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm">
            <li>
              <strong className="text-foreground">API Tester</strong> — HTTP requests you
              send are routed through a CORS proxy so they can reach external APIs from a
              browser. The proxy forwards your request and returns the response; it does not
              log request bodies or headers beyond what is necessary to relay the response.
            </li>
            <li>
              <strong className="text-foreground">Webhook Simulator</strong> — payloads are
              sent to the destination URL you provide. HMAC signing happens in your browser
              before transmission; your signing secret is never sent to our servers.
            </li>
            <li>
              <strong className="text-foreground">Notebook → PDF</strong> — the{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">.ipynb</code> file you
              upload is converted on our servers (then discarded); nothing is retained after
              the PDF response.
            </li>
            <li>
              <strong className="text-foreground">Go playground</strong> — Go source you run
              is forwarded to the public{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">go.dev</code> playground
              compile API. Other playground languages stay in your browser.
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground pt-2">
            1a. Data flow (how information moves)
          </h2>
          <p>
            The diagram below describes the path your data takes when you use DevBench.
            It is a logical flow — not a network capture of every byte — but it reflects
            how the product is built today.
          </p>
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm font-mono leading-relaxed space-y-1 text-foreground/90">
            <p>[You] paste / upload / type</p>
            <p className="pl-4">↓</p>
            <p>[Browser tab] DevBench JavaScript parses &amp; transforms locally</p>
            <p className="pl-4">↓</p>
            <p>[Browser tab] Result rendered + optional download blob</p>
            <p className="pl-4">↳ (not sent) DevBench application servers — no tool-input API</p>
            <p className="pl-8 pt-2 text-muted-foreground font-sans text-xs">
              Exceptions branch sideways:
            </p>
            <p className="pl-8">→ API Tester → CORS proxy → your target API</p>
            <p className="pl-8">→ Webhook Simulator → destination URL you enter</p>
            <p className="pl-8">→ Notebook → PDF → convert API (ephemeral upload)</p>
            <p className="pl-8">→ Go playground → go.dev compile API</p>
            <p className="pl-8">→ Page load → CDN (Vercel) serves static assets only</p>
            <p className="pl-8">→ Analytics → coarse visit metadata (no tool bodies)</p>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-sm mt-4">
            <li>
              <strong className="text-foreground">Input capture</strong> — Keyboard and
              file-picker data stay inside the rendering engine for that tab.
            </li>
            <li>
              <strong className="text-foreground">Processing</strong> — Libraries (JSON,
              PDF, crypto, etc.) run synchronously or via Web Workers in the same origin
              as the page; output is written to the DOM or a temporary object URL for
              download.
            </li>
            <li>
              <strong className="text-foreground">Persistence</strong> — DevBench does not
              write tool payloads to disk on our infrastructure. Only your browser may
              cache static files or store theme/shortcut preferences in{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">localStorage</code>.
            </li>
            <li>
              <strong className="text-foreground">Egress</strong> — Data leaves the tab
              only when you use an explicit network feature (API call, webhook, notebook
              PDF, Go playground) or when analytics scripts record a page view.
            </li>
          </ol>

          <h2 className="text-lg font-semibold text-foreground pt-2">
            1b. Data retention FAQ
          </h2>
          <p className="text-sm">
            Quick answers about how long different categories of data exist. Expand each
            question for detail.
          </p>
          <PrivacyRetentionFaq />

          <h2 className="text-lg font-semibold text-foreground pt-2">
            1c. Sensitive data — examples and risk reduction
          </h2>
          <p>
            Many visitors use DevBench with credentials, customer data, or regulated
            information. The table below lists common sensitive inputs and practical ways
            to minimize exposure.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-3 py-2 font-semibold text-foreground">Data type</th>
                  <th className="px-3 py-2 font-semibold text-foreground">Example</th>
                  <th className="px-3 py-2 font-semibold text-foreground">How to minimize risk</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground divide-y divide-border">
                <tr>
                  <td className="px-3 py-2">JWT / API keys</td>
                  <td className="px-3 py-2 font-mono text-xs">Bearer eyJhbG…</td>
                  <td className="px-3 py-2">
                    Use expiring test tokens; redact before screenshots; prefer JWT Debugger
                    over pasting into chat or ticket systems.
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Passwords &amp; hashes</td>
                  <td className="px-3 py-2">Production bcrypt hashes</td>
                  <td className="px-3 py-2">
                    Use synthetic samples for format checks; never reuse real passwords
                    across environments.
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2">PII in JSON/CSV</td>
                  <td className="px-3 py-2">Customer export with emails</td>
                  <td className="px-3 py-2">
                    Anonymize columns first; work on a copy; close the tab when finished.
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2">PDF contracts</td>
                  <td className="px-3 py-2">Signed legal PDF</td>
                  <td className="px-3 py-2">
                    Processing stays local, but clear downloads from shared machines and
                    avoid browser extensions that scan downloads.
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Health / finance figures</td>
                  <td className="px-3 py-2">Loan or BMI inputs</td>
                  <td className="px-3 py-2">
                    Treat calculators as estimates only; do not enter real account numbers
                    or medical record IDs.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm">
            When in doubt, assume anything visible on screen could be captured by screen
            recording, shoulder surfing, or a compromised browser extension. DevBench’s
            client-side model removes server-side storage risk but does not replace your
            organisation&apos;s data-handling policies.
          </p>

          <h2 className="text-lg font-semibold text-foreground pt-2">2. Analytics</h2>
          <p>
            DevBench uses <strong className="text-foreground">Google Analytics (via Google
            Tag Manager)</strong> and <strong className="text-foreground">Vercel
            Analytics</strong> to understand which tools are used, where visitors come from,
            and how the site performs. These services collect standard web analytics data:
            pages visited, referrer, browser type, country, and device type. Individual tool
            inputs are not included in analytics events.
          </p>
          <p>
            Analytics data helps us prioritise which tools to improve and which new tools to
            build. You can opt out of Google Analytics by using the{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Google Analytics Opt-out Browser Add-on
            </a>
            .
          </p>

          <h2 className="text-lg font-semibold text-foreground pt-2">3. Cookies and local storage</h2>
          <p>
            DevBench itself stores items in your browser&apos;s{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">localStorage</code> such as
            your preferred light or dark colour theme and optional tool preferences (for example
            favourites and recent tools). These preferences never leave your device and are not
            sent to any server as part of normal tool usage.
          </p>
          <p>
            Third-party services (Google Analytics / Tag Manager, Vercel) may set their own
            cookies. These are governed by their respective privacy policies, which are linked
            in section 2 above.
          </p>

          <h2 className="text-lg font-semibold text-foreground pt-2">4. Hosting and server logs</h2>
          <p>
            DevBench is hosted on <strong className="text-foreground">Vercel</strong>. Vercel
            may collect standard server access logs (IP address, requested URL, HTTP status
            code, timestamp, and user agent) as part of normal infrastructure operation. See{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Vercel&apos;s Privacy Policy
            </a>{" "}
            for details on how they handle this data.
          </p>

          <h2 className="text-lg font-semibold text-foreground pt-2">5. Contact form</h2>
          <p>
            The{" "}
            <Link href="/contact" className="text-accent hover:underline">
              contact page
            </Link>{" "}
            lets you send a message to us via email. The form constructs a{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">mailto:</code> link that
            opens your email client; your message is not submitted to or stored by DevBench
            until you send it through your own email provider. We retain contact messages only
            as long as necessary to respond.
          </p>

          <h2 className="text-lg font-semibold text-foreground pt-2">6. Children&apos;s privacy</h2>
          <p>
            DevBench is not directed at children under 13 years of age. We do not knowingly
            collect personal information from children under 13. If you believe a child has
            submitted personal information to us, please{" "}
            <Link href="/contact" className="text-accent hover:underline">
              contact us
            </Link>{" "}
            and we will promptly delete it.
          </p>

          <h2 className="text-lg font-semibold text-foreground pt-2">7. Your rights</h2>
          <p>
            Because DevBench does not collect personal data through tool usage, there is
            generally no data stored about you to access, correct, or delete. If you have
            contacted us and wish to have your message deleted from our records, please reach
            out and we will honour that request promptly.
          </p>

          <h2 className="text-lg font-semibold text-foreground pt-2">8. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy as the site evolves — for example, when new
            tools or features are added. The &ldquo;last updated&rdquo; date at the top of
            this page reflects the most recent revision. Continued use of DevBench after a
            change constitutes acceptance of the updated policy.
          </p>

          <p className="pt-2">
            Questions about this policy?{" "}
            <Link href="/contact" className="text-accent hover:underline">
              Reach out via the contact page
            </Link>
            .
          </p>

        </div>
      </main>
      <Footer />
    </>
  );
}
