import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InstallOptions from "@/components/InstallOptions";
import { fetchLatestGitHubRelease } from "@/lib/github-release";
import { SHOW_MAC_APP_DOWNLOAD } from "@/lib/distribution";

export default async function AboutPage() {
  const release = await fetchLatestGitHubRelease();

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
        <h1 className="text-3xl font-bold tracking-tight">About DevBench</h1>
        <div className="mt-6 space-y-6 text-muted-foreground leading-relaxed">

          <p>
            DevBench is a free, browser-based toolkit built for developers, DevOps engineers,
            data teams, and anyone who works with code and data every day. It brings together
            130+ carefully crafted utilities — from JSON formatting and Base64 encoding to PDF
            tools, finance calculators, and regex testing — in one place, with no account
            required and nothing uploaded to a server.
          </p>

          <h2 className="text-xl font-semibold text-foreground pt-2">Why we built it</h2>
          <p>
            Every developer knows the feeling: you need to quickly decode a JWT, prettify some
            JSON, or convert a Unix timestamp — and you end up bouncing between browser tabs,
            sketchy websites with intrusive ads, or spinning up a local REPL just for a 10-second
            task. DevBench was built to fix that. One URL, all the tools, no friction.
          </p>
          <p>
            We also cared deeply about privacy from day one. Most online tools silently send your
            input to a backend server. When you paste an API key, a JWT, or a customer&apos;s
            data into one of those tools, you are sharing it with a third party. DevBench
            processes everything locally using your browser&apos;s JavaScript engine, Web Crypto
            API, and Web Workers. Open DevTools, go to the Network tab, and you will see no
            outbound request when you format JSON, encode text, or run a hash — because there
            isn&apos;t one.
          </p>

          <h2 className="text-xl font-semibold text-foreground pt-2">What&apos;s inside</h2>
          <p>DevBench organises its tools into focused categories so you can find what you need quickly:</p>
          <ul className="list-disc list-inside space-y-1.5 text-sm">
            <li><strong className="text-foreground">JSON &amp; Data</strong> — formatter, validator, diff, JSON↔YAML, JSON↔CSV, JSON↔TypeScript, XML tools</li>
            <li><strong className="text-foreground">Encoding &amp; Decoding</strong> — Base64, URL encoding, HTML entities, hex, binary, ROT13, Morse code, AES-256 encryption</li>
            <li><strong className="text-foreground">Text Utilities</strong> — regex tester, case converter, diff checker, word counter, Markdown preview, string inspector, Unicode checker</li>
            <li><strong className="text-foreground">Developer Tools</strong> — JWT debugger, hash generator, UUID/ULID/Nano ID, cron editor, API tester, webhook simulator, AWS Lambda sandbox, colour converter, SQL formatter</li>
            <li><strong className="text-foreground">PDF Tools</strong> — merge, split, rotate, compress, watermark, page editor, image-to-PDF, PDF-to-JPG</li>
            <li><strong className="text-foreground">Image Tools</strong> — background remover, image resizer, image merger, compressor, format converter, SVG optimizer, EXIF viewer</li>
            <li><strong className="text-foreground">Math &amp; Science</strong> — graph calculator, quadratic solver, Pythagorean theorem, GCD &amp; LCM, astronomy tools</li>
            <li><strong className="text-foreground">Finance &amp; Health</strong> — compound interest, EMI calculator, GST/VAT, BMI, BMR, TDEE, body fat estimator</li>
            <li><strong className="text-foreground">Date &amp; Time</strong> — Unix timestamp converter, date calculator, age calculator, countdown, timezone converter, world clock</li>
            <li><strong className="text-foreground">Conversion</strong> — temperature, units, bytes, Roman numerals, number-to-words, aspect ratio, currency, percentage</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground pt-2">How it works</h2>
          <p>
            Every tool in DevBench runs in your browser. When you paste text, upload a file, or
            type into a form, the computation happens locally using JavaScript APIs that ship
            with every modern browser — the Web Crypto API for hashing and encryption, the File
            API for PDFs and images, Web Workers for CPU-intensive tasks like background removal
            and Pyodide (Python in the browser) for the code playground.
          </p>
          <p>
            The only exceptions are requests you explicitly initiate: the API Tester sends HTTP
            requests through a CORS proxy so you can reach external endpoints, and the Webhook
            Simulator lets you fire test payloads to URLs you specify. Everything else stays on
            your device.
          </p>

          <h2 className="text-xl font-semibold text-foreground pt-2">Who uses DevBench</h2>
          <p>
            DevBench is used by backend engineers formatting API responses, frontend developers
            debugging tokens and encodings, DevOps teams decoding logs and writing cron
            schedules, security researchers validating hashes, data analysts cleaning CSVs,
            students learning about algorithms, and anyone who just needs a quick converter
            without installing software.
          </p>

          <h2 className="text-xl font-semibold text-foreground pt-2">How we decide what to build</h2>
          <p>
            Every new tool has to earn its place. We ask three questions before shipping:
            Can it run meaningfully in the browser? Does it replace a tab people already open
            every week? And can we explain the underlying concept clearly enough that the tool
            page is useful even if you never click a button?
          </p>
          <p>
            That last point matters. Thin “paste here → get result” pages are easy to clone and
            hard to trust. DevBench tool pages include context — what the format is for, common
            mistakes, and when <em>not</em> to use a technique (for example treating Base64 as
            encryption, or trusting a JWT payload without verifying the signature). The{" "}
            <Link href="/blog" className="text-accent hover:underline">
              guides on the blog
            </Link>{" "}
            go deeper when a topic needs more than a sidebar.
          </p>
          <p>
            We also refuse features that would force routine secret handling through our servers.
            If a workflow needs a network hop (CORS for the API Tester, go.dev for the Go
            playground, ephemeral notebook conversion), we document it plainly on the tool and
            in the{" "}
            <Link href="/privacy" className="text-accent hover:underline">
              privacy policy
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold text-foreground pt-2">
            Privacy first, ads second
          </h2>
          <p>
            DevBench is free to use. Site hosting and ongoing maintenance are supported in part
            by Google AdSense. Ads load as a separate third-party script; they do not receive
            the JWTs, passwords, PDFs, or JSON you paste into tools. Tool inputs stay in your
            browser for client-side utilities. You can read the full advertising disclosure and
            opt-out links in our{" "}
            <Link href="/privacy" className="text-accent hover:underline">
              privacy policy
            </Link>
            .
          </p>
          <p>
            If an advertising partner&apos;s behaviour ever conflicted with the promise that
            tool payloads stay local, we would rather remove the ad than break that promise.
          </p>

          <h2 className="text-xl font-semibold text-foreground pt-2">Built from India</h2>
          <p>
            DevBench is built and maintained in India, for a global audience of developers who
            need dependable utilities without installers or accounts. The product name and
            domain (devbench.co.in) reflect that origin — not a regional lock-in. The same
            browser-first architecture works whether you are debugging an API in Bengaluru or
            reviewing a cron schedule in Berlin.
          </p>

          <h2 className="text-xl font-semibold text-foreground pt-2">The blog</h2>
          <p>
            Beyond the tools, DevBench publishes in-depth technical guides covering topics like
            JWT security, Base64 encoding internals, regex patterns, Unix timestamps, SHA-256 vs
            MD5, and more. The{" "}
            <Link href="/blog" className="text-accent hover:underline">
              blog
            </Link>{" "}
            aims to explain not just how to use each tool, but why the underlying technology
            works the way it does.
          </p>

          {SHOW_MAC_APP_DOWNLOAD ? (
            <>
              <h2 className="text-xl font-semibold text-foreground pt-2">Install on macOS</h2>
              <p>
                Download the desktop app, use Homebrew, or keep using the browser — details on the{" "}
                <Link href="/download" className="text-accent hover:underline">
                  install page
                </Link>
                .
              </p>
              <div className="not-prose">
                <InstallOptions release={release} compact />
              </div>
            </>
          ) : null}

          <h2 className="text-xl font-semibold text-foreground pt-2">Get in touch</h2>
          <p>
            Have a bug to report, a tool suggestion, or just want to say hello?{" "}
            <Link href="/contact" className="text-accent hover:underline">
              Use the contact form
            </Link>{" "}
            — we read every message. If you spot something broken or have an idea for a new
            utility, we genuinely want to hear it.
          </p>

        </div>
      </main>
      <Footer />
    </>
  );
}
