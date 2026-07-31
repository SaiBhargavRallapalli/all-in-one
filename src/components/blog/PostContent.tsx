import Link from "next/link";

const prose = "text-sm sm:text-base text-muted-foreground leading-relaxed";
const h2 = "text-xl font-semibold text-foreground mt-8 mb-3";
const h3 = "text-base font-semibold text-foreground mt-5 mb-2";
const ul = "list-disc list-outside pl-5 space-y-1.5 text-sm sm:text-base text-muted-foreground";
const ol = "list-decimal list-outside pl-5 space-y-1.5 text-sm sm:text-base text-muted-foreground";
const code = "font-mono text-xs bg-muted px-1.5 py-0.5 rounded";
const table = "w-full text-sm border-collapse my-4";
const th = "text-left px-3 py-2 bg-muted font-semibold text-foreground border border-border";
const td = "px-3 py-2 border border-border text-muted-foreground";

function UuidVsUlidVsNanoid() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Every developer reaches for <code className={code}>UUID v4</code> without thinking — it's in every language's standard library and universally supported. But UUID has real problems: it's 36 characters, not sortable, and can fragment B-tree indexes. ULID and Nano ID solve these. Here's when each one is the right tool.
      </p>

      <h2 className={h2}>UUID v4 — the safe default</h2>
      <p className={prose}>
        UUID v4 is a 128-bit random number formatted as <code className={code}>xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx</code> — 32 hex digits and 4 dashes. The probability of a collision is 1 in 2¹²², which is astronomically small.
      </p>
      <p className={prose}>
        Use UUID v4 when:
      </p>
      <ul className={ul}>
        <li>You need maximum ecosystem compatibility — PostgreSQL has a native <code className={code}>uuid</code> type, MySQL supports it, ORMs know how to handle it</li>
        <li>IDs are not exposed in URLs (so the 36-char length doesn't matter)</li>
        <li>Your database table is append-heavy and you're using <code className={code}>uuid_generate_v4()</code> or <code className={code}>gen_random_uuid()</code> at the DB level</li>
      </ul>
      <p className={prose}>
        <strong>The real problem with UUID v4</strong> is index fragmentation. Because UUIDs are random, each insert lands at a random position in your B-tree index — causing page splits and cache misses at scale. This matters at millions of rows, not thousands.
      </p>

      <h2 className={h2}>ULID — when insertion order matters</h2>
      <p className={prose}>
        ULID (Universally Unique Lexicographically Sortable Identifier) looks like this: <code className={code}>01ARZ3NDEKTSV4RRFFQ69G5FAV</code>. It's 26 characters in Crockford Base32 encoding.
      </p>
      <p className={prose}>
        The key property: the first 10 characters encode a millisecond timestamp. This means ULIDs generated close together sort together — inserts land near the end of the B-tree index rather than scattered randomly. <strong>This is much better for write-heavy workloads.</strong>
      </p>
      <ul className={ul}>
        <li>Time-sortable — rows with adjacent ULIDs were inserted at nearly the same time</li>
        <li>26 characters vs 36 for UUID (no dashes)</li>
        <li>Case-insensitive — the alphabet excludes I, L, O, U to avoid visual ambiguity</li>
        <li>128-bit entropy total (48 bits time + 80 bits random)</li>
      </ul>
      <p className={prose}>
        Use ULID for database primary keys where you care about index performance, or when you want IDs to carry implicit ordering by creation time (e.g., paginating by ID instead of a separate <code className={code}>created_at</code> column).
      </p>

      <h2 className={h2}>Nano ID — compact and URL-safe</h2>
      <p className={prose}>
        Nano ID generates short, URL-safe identifiers: <code className={code}>V1StGXR8_Z5jdHi6B-myT</code>. The default length is 21 characters using a 64-character alphabet (<code className={code}>A-Za-z0-9_-</code>).
      </p>
      <ul className={ul}>
        <li>21 characters by default (configurable down to 6, up to anything)</li>
        <li>URL-safe alphabet — no encoding needed in query strings or paths</li>
        <li>No timestamp component — purely random</li>
        <li>~126 bits of entropy at the default length (comparable to UUID v4)</li>
      </ul>
      <p className={prose}>
        Use Nano ID for short IDs that appear in URLs, API keys, session tokens, share links, and anywhere compact size matters more than sortability.
      </p>

      <h2 className={h2}>Quick comparison</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Property</th>
            <th className={th}>UUID v4</th>
            <th className={th}>ULID</th>
            <th className={th}>Nano ID</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>Length</td><td className={td}>36 chars</td><td className={td}>26 chars</td><td className={td}>21 chars</td></tr>
          <tr><td className={td}>Sortable</td><td className={td}>No</td><td className={td}>Yes (by time)</td><td className={td}>No</td></tr>
          <tr><td className={td}>URL-safe</td><td className={td}>Yes (with dashes)</td><td className={td}>Yes</td><td className={td}>Yes</td></tr>
          <tr><td className={td}>DB index friendly</td><td className={td}>Poor at scale</td><td className={td}>Excellent</td><td className={td}>Poor at scale</td></tr>
          <tr><td className={td}>Ecosystem support</td><td className={td}>Universal</td><td className={td}>Good</td><td className={td}>Good</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>The verdict</h2>
      <p className={prose}>
        Default to UUID v4 if you're unsure — compatibility wins. Switch to ULID if you're building a write-heavy service and B-tree index performance matters. Use Nano ID when IDs appear in user-visible URLs and compactness is a priority.
      </p>
    </div>
  );
}

function JwtExplained() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        A JSON Web Token is three Base64URL-encoded strings joined by dots: <code className={code}>header.payload.signature</code>. The compact format makes JWTs easy to embed in HTTP headers, URL query strings, and cookies. But that compactness hides a lot of nuance — especially around security.
      </p>

      <h2 className={h2}>The header</h2>
      <p className={prose}>
        The header is a JSON object describing the token type and the signing algorithm. Decoded, it typically looks like:
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`{
  "alg": "HS256",
  "typ": "JWT"
}`}
      </pre>
      <p className={prose}>
        The <code className={code}>alg</code> field is critical. Common values:
      </p>
      <ul className={ul}>
        <li><code className={code}>HS256</code> — HMAC-SHA256. Symmetric: the same secret is used to sign and verify. Simple but the secret must be shared between services.</li>
        <li><code className={code}>RS256</code> — RSA-SHA256. Asymmetric: sign with a private key, verify with a public key. Better for microservices — only the auth server needs the private key.</li>
        <li><code className={code}>ES256</code> — ECDSA with P-256. Like RS256 but smaller key sizes and faster operations.</li>
        <li><code className={code}>none</code> — No signature. <strong>Never accept this in production.</strong> Attackers can forge tokens with <code className={code}>"alg": "none"</code> if your library doesn't explicitly reject it.</li>
      </ul>

      <h2 className={h2}>The payload</h2>
      <p className={prose}>
        The payload contains claims — statements about the token subject. Standard registered claims:
      </p>
      <ul className={ul}>
        <li><code className={code}>sub</code> — subject: the user ID or entity this token represents</li>
        <li><code className={code}>iss</code> — issuer: the service that issued the token (e.g. <code className={code}>https://auth.example.com</code>)</li>
        <li><code className={code}>aud</code> — audience: the intended recipient service(s)</li>
        <li><code className={code}>exp</code> — expiry: Unix timestamp after which the token is invalid</li>
        <li><code className={code}>iat</code> — issued at: when the token was created</li>
        <li><code className={code}>nbf</code> — not before: token is invalid before this time</li>
        <li><code className={code}>jti</code> — JWT ID: unique identifier for this token (enables revocation)</li>
      </ul>
      <p className={prose}>
        <strong>Important:</strong> The payload is Base64URL-encoded, not encrypted. Anyone with the token can read the payload — never put passwords, credit card numbers, or other secrets in a JWT payload.
      </p>

      <h2 className={h2}>The signature</h2>
      <p className={prose}>
        The signature prevents tampering. For HS256, it is computed as:
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`HMAC-SHA256(
  base64url(header) + "." + base64url(payload),
  secret
)`}
      </pre>
      <p className={prose}>
        If an attacker changes any bit of the header or payload, the signature won't verify. This is what makes JWTs tamper-evident — not confidential.
      </p>

      <h2 className={h2}>Common JWT pitfalls</h2>
      <ul className={ul}>
        <li><strong>Algorithm confusion attack</strong> — if your library accepts both HS256 and RS256, an attacker can take an RS256 public key (which is public), sign a token with it using HS256, and the library may accept it if it doesn't check the expected algorithm explicitly.</li>
        <li><strong>Not validating expiry</strong> — always check <code className={code}>exp</code>. A valid signature doesn't mean a token is still valid.</li>
        <li><strong>Not validating audience</strong> — a token issued for Service A should be rejected by Service B. Check <code className={code}>aud</code>.</li>
        <li><strong>Weak secrets for HS256</strong> — a short or guessable HMAC secret can be brute-forced. Use at least 256 bits of random entropy.</li>
        <li><strong>Storing in localStorage</strong> — accessible to any JavaScript on the page. Prefer httpOnly cookies for tokens that authorize actions.</li>
      </ul>

      <h2 className={h2}>JWT vs sessions</h2>
      <p className={prose}>
        JWTs are stateless — the server doesn't store anything. Sessions are stateful — the server stores session data and gives the client an opaque ID. JWTs scale horizontally without a shared session store, but can't be individually revoked (you have to wait for <code className={code}>exp</code> or implement a token blocklist — which adds state back anyway). For most applications, server-side sessions with a fast store (Redis) are simpler and more secure.
      </p>
    </div>
  );
}

function EncodeUriComponentVsEncodeUri() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        JavaScript has two built-in URL encoding functions and developers mix them up constantly. Using the wrong one either produces broken URLs or silently leaves characters unencoded that should be escaped. Here's the precise rule for each.
      </p>

      <h2 className={h2}>What is percent-encoding?</h2>
      <p className={prose}>
        URLs can only contain a limited set of ASCII characters. Any other character — including spaces, non-Latin letters, and many punctuation marks — must be converted to a <code className={code}>%XX</code> sequence where <code className={code}>XX</code> is the character's hexadecimal UTF-8 byte value. A space becomes <code className={code}>%20</code>, a euro sign € becomes <code className={code}>%E2%82%AC</code>.
      </p>

      <h2 className={h2}>encodeURIComponent — for individual values</h2>
      <p className={prose}>
        <code className={code}>encodeURIComponent()</code> encodes everything <em>except</em>:
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`A-Z a-z 0-9 - _ . ! ~ * ' ( )`}
      </pre>
      <p className={prose}>
        This means it encodes structural URL characters like <code className={code}>/ ? # @ &amp; = + :</code>. That's intentional — you're encoding a <em>value</em>, not a URL, so those characters should be escaped so they can't be misinterpreted as URL structure.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`const query = encodeURIComponent("hello world & more");
// → "hello%20world%20%26%20more"

const url = \`https://api.example.com/search?q=\${query}\`;
// → "https://api.example.com/search?q=hello%20world%20%26%20more"`}
      </pre>
      <p className={prose}><strong>Use this for:</strong> query parameter values, path segment values, form field data.</p>

      <h2 className={h2}>encodeURI — for complete URLs</h2>
      <p className={prose}>
        <code className={code}>encodeURI()</code> encodes everything <em>except</em> characters that are legal in a complete URL:
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`A-Z a-z 0-9 - _ . ! ~ * ' ( ) ; / ? : @ & = + $ , #`}
      </pre>
      <p className={prose}>
        It deliberately leaves <code className={code}>/ ? # &amp; = + :</code> intact because it assumes those are structural URL characters, not data values.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`const url = encodeURI("https://example.com/path with spaces?q=hello");
// → "https://example.com/path%20with%20spaces?q=hello"
// Note: the ? and = are preserved (they're structure)
// But the space in the path is encoded`}
      </pre>
      <p className={prose}><strong>Use this for:</strong> encoding a complete URL that may contain spaces or non-ASCII characters, but whose structure (<code className={code}>://</code>, <code className={code}>?</code>, <code className={code}>&amp;</code>, <code className={code}>=</code>) should be preserved.</p>

      <h2 className={h2}>The most common mistake</h2>
      <p className={prose}>
        Using <code className={code}>encodeURI()</code> for query parameter values. If your value contains <code className={code}>&amp;</code> (e.g. a company name "AT&amp;T"), <code className={code}>encodeURI()</code> won't encode it — breaking the query string. Always use <code className={code}>encodeURIComponent()</code> for values.
      </p>

      <h2 className={h2}>The modern alternative: URLSearchParams</h2>
      <p className={prose}>
        In modern JavaScript, you rarely need either function directly. Use <code className={code}>URLSearchParams</code> which handles encoding automatically:
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`const params = new URLSearchParams({
  q: "hello world & more",
  page: "1",
});
const url = \`https://api.example.com/search?\${params}\`;
// → "https://api.example.com/search?q=hello+world+%26+more&page=1"`}
      </pre>
      <p className={prose}>
        Note that <code className={code}>URLSearchParams</code> uses <code className={code}>+</code> for spaces (application/x-www-form-urlencoded) while <code className={code}>encodeURIComponent()</code> uses <code className={code}>%20</code>. Both are valid in query strings; most servers handle both.
      </p>
    </div>
  );
}

function CommonJsonErrors() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        JSON is strict. Patterns that work fine in JavaScript object literals silently break JSON parsers. These are the seven errors that account for the vast majority of "Unexpected token" and "JSON parse error" messages.
      </p>

      <h2 className={h2}>1. Trailing comma</h2>
      <p className={prose}>
        The most common JSON error. JavaScript allows trailing commas; JSON does not.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// ❌ Invalid JSON
{
  "name": "Alice",
  "age": 30,   ← trailing comma
}

// ✅ Valid JSON
{
  "name": "Alice",
  "age": 30
}`}
      </pre>

      <h2 className={h2}>2. Single-quoted strings</h2>
      <p className={prose}>
        JSON requires double quotes. Single quotes are a JavaScript convenience, not part of the JSON spec.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// ❌ Invalid
{ 'name': 'Alice' }

// ✅ Valid
{ "name": "Alice" }`}
      </pre>

      <h2 className={h2}>3. Unquoted keys</h2>
      <p className={prose}>
        Object keys must be quoted strings in JSON. Unquoted keys are valid in JavaScript (<code className={code}>{`{ name: "Alice" }`}</code>) but invalid in JSON.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// ❌ Invalid JSON
{ name: "Alice" }

// ✅ Valid JSON
{ "name": "Alice" }`}
      </pre>

      <h2 className={h2}>4. Comments</h2>
      <p className={prose}>
        JSON has no comment syntax. Neither <code className={code}>{"// single-line"}</code> nor <code className={code}>{"/* block */"}</code> comments are valid. If you need comments in config files, consider JSONC (JSON with Comments, used by VS Code), YAML, or TOML instead.
      </p>

      <h2 className={h2}>5. NaN, Infinity, and undefined</h2>
      <p className={prose}>
        These are valid JavaScript values but not valid JSON. <code className={code}>JSON.stringify()</code> silently converts them:
      </p>
      <ul className={ul}>
        <li><code className={code}>NaN</code> → <code className={code}>null</code></li>
        <li><code className={code}>Infinity</code> → <code className={code}>null</code></li>
        <li><code className={code}>undefined</code> → key is omitted entirely</li>
      </ul>
      <p className={prose}>This means round-tripping through JSON can silently lose or change data if your objects contain these values.</p>

      <h2 className={h2}>6. Unescaped control characters in strings</h2>
      <p className={prose}>
        Literal newlines, tabs, and other control characters (U+0000 to U+001F) inside string values must be escaped. A raw newline in a string value is invalid.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// ❌ Invalid — literal newline in string
{ "message": "line one
line two" }

// ✅ Valid — escaped newline
{ "message": "line one\\nline two" }`}
      </pre>

      <h2 className={h2}>7. Numbers: hex, leading zeros, bare decimal point</h2>
      <p className={prose}>
        JSON numbers must be decimal only. Hexadecimal literals, octal literals, and numbers with a leading decimal point are not valid.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// ❌ Invalid JSON numbers
{ "a": 0xFF, "b": 077, "c": .5, "d": 1. }

// ✅ Valid
{ "a": 255, "b": 63, "c": 0.5, "d": 1.0 }`}
      </pre>

      <h2 className={h2}>Quick fix</h2>
      <p className={prose}>
        Paste your broken JSON into the validator below — it highlights the exact line and column of the error and explains what went wrong.
      </p>
    </div>
  );
}

function RegexCheatSheet() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Most developers use regex for the same 15–20 patterns repeatedly. This reference covers the patterns that actually appear in production JavaScript code, with copy-ready snippets and notes on edge cases.
      </p>

      <h2 className={h2}>Syntax quick reference</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Pattern</th>
            <th className={th}>Meaning</th>
          </tr>
        </thead>
        <tbody>
          {[
            [".","Any character except newline (use s flag to include newlines)"],
            ["\\d / \\D","Digit / non-digit"],
            ["\\w / \\W","Word char (A-Za-z0-9_) / non-word"],
            ["\\s / \\S","Whitespace / non-whitespace"],
            ["^ / $","Start / end of string (m flag: start/end of line)"],
            ["* + ?","0 or more / 1 or more / 0 or 1"],
            ["{n} {n,} {n,m}","Exactly n / at least n / between n and m"],
            ["(abc)","Capture group — referenced as $1, $2..."],
            ["(?:abc)","Non-capturing group — groups but doesn't capture"],
            ["(?<name>abc)","Named capture group — referenced as $<name>"],
            ["a|b","Alternation: a or b"],
            ["[abc]","Character class: a, b, or c"],
            ["[^abc]","Negated class: anything except a, b, c"],
            ["\\b / \\B","Word boundary / non-word boundary"],
            ["(?=abc)","Positive lookahead: followed by abc"],
            ["(?!abc)","Negative lookahead: not followed by abc"],
          ].map(([pat, desc]) => (
            <tr key={pat}>
              <td className={td}><code className={code}>{pat}</code></td>
              <td className={td}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className={h2}>Common patterns</h2>

      <h3 className={h3}>Email address (practical)</h3>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-2">
{`/^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$/`}
      </pre>
      <p className={prose}>Note: the only truly correct email regex spans thousands of characters. For most apps, validate server-side by sending a confirmation email.</p>

      <h3 className={h3}>URL</h3>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-2">
{`/^https?:\\/\\/[^\\s/$.?#].[^\\s]*$/i`}
      </pre>

      <h3 className={h3}>IPv4 address</h3>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-2">
{`/^(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$/`}
      </pre>

      <h3 className={h3}>ISO 8601 date (YYYY-MM-DD)</h3>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-2">
{`/^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/`}
      </pre>

      <h3 className={h3}>UUID v4</h3>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-2">
{`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`}
      </pre>

      <h3 className={h3}>Semantic version (semver)</h3>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-2">
{`/^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$/`}
      </pre>

      <h3 className={h3}>Hex color code</h3>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-2">
{`/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/`}
      </pre>

      <h3 className={h3}>Phone number (E.164 international format)</h3>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-2">
{`/^\\+[1-9]\\d{1,14}$/`}
      </pre>

      <h3 className={h3}>Strong password (min 8 chars, upper + lower + digit + symbol)</h3>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-2">
{`/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).{8,}$/`}
      </pre>

      <h3 className={h3}>Slug (URL-safe)</h3>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-2">
{`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`}
      </pre>

      <h2 className={h2}>Flags cheatsheet</h2>
      <ul className={ul}>
        <li><code className={code}>g</code> — global: find all matches (not just first). Required for <code className={code}>String.matchAll()</code>.</li>
        <li><code className={code}>i</code> — case-insensitive</li>
        <li><code className={code}>m</code> — multiline: <code className={code}>^</code> and <code className={code}>$</code> match line boundaries, not string boundaries</li>
        <li><code className={code}>s</code> — dotAll: <code className={code}>.</code> matches <code className={code}>\n</code> too</li>
        <li><code className={code}>u</code> — unicode: enables <code className={code}>\p{"{...}"}</code> property escapes and correct handling of surrogate pairs</li>
        <li><code className={code}>d</code> — indices: adds <code className={code}>.indices</code> to match results with start/end positions</li>
      </ul>

      <h2 className={h2}>Test your patterns interactively</h2>
      <p className={prose}>
        Paste any pattern from above into the regex tester to see live match highlighting, capture group values, and the equivalent Python/Go/PHP code.
      </p>
    </div>
  );
}

function HowToValidateJsonOnline() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Invalid JSON is one of the fastest ways to break APIs, CI pipelines, and config deploys — often with an error message that points at the wrong line. Validating JSON before you merge or ship catches problems early. Here is what “validate” actually means, how online tools differ, and a repeatable workflow.
      </p>

      <h2 className={h2}>What “valid JSON” means</h2>
      <p className={prose}>
        JSON validation usually means <strong>syntax checking</strong>: the text must follow{" "}
        <Link href="/blog/common-json-errors" className="text-accent hover:underline">
          strict rules
        </Link>{" "}
        — double-quoted keys and strings, no trailing commas, no comments, no{" "}
        <code className={code}>undefined</code>. A validator runs <code className={code}>JSON.parse()</code> (or equivalent) and either succeeds or reports the first parse error with a position.
      </p>
      <p className={prose}>
        That is different from <strong>schema validation</strong> (JSON Schema, OpenAPI), which checks whether the <em>shape</em> of the data matches what your service expects — required fields, types, enums. You need both in mature systems: syntax first, then schema where it matters.
      </p>

      <h2 className={h2}>Why “online” matters for privacy</h2>
      <p className={prose}>
        Many “JSON validator” sites send your paste to a backend or third-party analytics. For internal configs, sample API payloads, or anything proprietary, that is a real leak surface. Before you paste sensitive data anywhere, check whether processing happens <strong>entirely in your browser</strong> (no upload) — or use a local editor / CLI.
      </p>
      <ul className={ul}>
        <li><strong>Browser-only tools</strong> — parsing runs in JavaScript on your machine; nothing should leave the tab except what you explicitly export.</li>
        <li><strong>Server-backed validators</strong> — convenient for huge files or shared links, but assume the text is stored or logged unless the product states otherwise.</li>
        <li><strong>CLI</strong> — <code className={code}>jq . file.json</code> or <code className={code}>python -m json.tool</code> are fine for local files and CI.</li>
      </ul>

      <h2 className={h2}>How to validate JSON online (step by step)</h2>
      <ol className={ol}>
        <li>Copy the raw JSON — not a screenshot, not markdown — from your editor, log, or HTTP client.</li>
        <li>Paste into a validator that runs client-side. You should get either “valid” or a single clear error (line/column or pointer).</li>
        <li>If invalid, fix the first error only; often later errors are cascading artifacts.</li>
        <li>Re-run until parse succeeds. Optionally pretty-print to confirm structure.</li>
        <li>For APIs, paste the same payload into your integration test or schema validator before deploy.</li>
      </ol>

      <h2 className={h2}>Tips that save time</h2>
      <ul className={ul}>
        <li>Watch for smart quotes from Slack or Word — replace with straight <code className={code}>"</code>.</li>
        <li>Large minified blobs: use a formatter after validation so diffs are readable.</li>
        <li>If validation passes but the API still rejects the body, the problem is usually headers, encoding, or schema — not JSON syntax.</li>
      </ul>

      <h2 className={h2}>Try it on DevBench</h2>
      <p className={prose}>
        The JSON Formatter &amp; Validator runs in your browser — paste, validate, and format without sending your payload to our servers. Use it whenever you need a quick sanity check before commit or deploy.
      </p>
    </div>
  );
}

function JwtDecoderWithoutUploading() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        A JWT looks opaque, but the header and payload are only <strong>Base64URL-encoded JSON</strong>. Anyone who has the token string can decode those two parts — no secret required. That is why “decoding” in the browser is straightforward; the security story is about where the token travels, not about magic encryption of the payload.
      </p>

      <h2 className={h2}>What “without uploading to a server” means</h2>
      <p className={prose}>
        Some JWT tools send your token to an API to decode or verify. If you care about operational secrecy — staging tokens, internal user IDs in claims, or compliance — you want a tool where the token never leaves your device in an HTTP request. A proper client-side decoder only runs JavaScript in your tab: split the three JWT segments, Base64URL-decode header and payload, then pretty-print JSON.
      </p>
      <p className={prose}>
        DevBench’s JWT Debugger follows that model: decode and inspect locally in the browser, with no round-trip to decode the header and payload.
      </p>

      <h2 className={h2}>Decoding is not verifying</h2>
      <p className={prose}>
        Reading the payload does <strong>not</strong> prove the token is legitimate. Signature verification (HMAC with a secret, or asymmetric keys) must use the correct key material on a trusted path. A malicious token can still contain arbitrary claims; only verification binds those claims to an issuer.
      </p>
      <p className={prose}>
        For a full tour of header algorithms and pitfalls, see{" "}
        <Link href="/blog/jwt-explained" className="text-accent hover:underline">
          JWT Explained: Header, Payload, and Signature Decoded
        </Link>
        .
      </p>

      <h2 className={h2}>When you should still be careful</h2>
      <ul className={ul}>
        <li><strong>Shared or recorded screens</strong> — claims may include emails, tenant IDs, or session metadata.</li>
        <li><strong>Browser extensions</strong> — treat them like untrusted code with access to page content.</li>
        <li><strong>Refresh tokens and long-lived secrets</strong> — decoding is fine; storing or logging them is not.</li>
      </ul>
      <p className={prose}>
        If a token is highly sensitive, prefer local OpenSSL or <code className={code}>jwt-cli</code> on an air-gapped machine — same math, zero web surface.
      </p>

      <h2 className={h2}>Practical workflow</h2>
      <ol className={ol}>
        <li>Copy the JWT from the <code className={code}>Authorization</code> header or your auth library’s debug output.</li>
        <li>Paste into a client-side decoder and confirm <code className={code}>alg</code>, <code className={code}>iss</code>, <code className={code}>exp</code>, and audience claims match expectations.</li>
        <li>If something looks wrong, rotate credentials and verify signatures on the server — never trust decode output alone for authorization decisions.</li>
      </ol>
    </div>
  );
}

function Base64EncodingExplained() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Base64 is <strong>encoding</strong>, not encryption. It maps arbitrary bytes to a limited alphabet of 64 printable ASCII characters so binary data can survive channels that only tolerate text — email bodies (MIME), JSON fields, XML, URLs (often Base64URL), and HTML{" "}
        <code className={code}>data:</code> URIs. Understanding the mechanics explains the ~33% size overhead — and why Base64 is the wrong tool whenever you need secrecy or optimal bandwidth.
      </p>

      <h2 className={h2}>How Base64 works</h2>
      <p className={prose}>
        Input bytes are treated as a continuous stream of bits. Those bits are sliced into groups of <strong>six</strong> bits (64 possible values per group). Each sextet indexes a symbol from the alphabet{" "}
        <code className={code}>A–Z</code>, <code className={code}>a–z</code>, <code className={code}>0–9</code>, then typically <code className={code}>+</code> and <code className={code}>/</code> for the standard alphabet (MIME / PEM). Three bytes (24 bits) become four Base64 characters with no waste.
      </p>
      <p className={prose}>
        When the bit length is not divisible by 24, the final quantum is padded so the encoder always outputs full groups of four characters. Padding uses <code className={code}>=</code> (one or two equals signs) so decoders know how many trailing bits were insignificant. That padding is why you sometimes see <code className={code}>==</code> at the end of a string.
      </p>

      <h2 className={h2}>Base64 vs Base64URL</h2>
      <p className={prose}>
        In URLs, <code className={code}>+</code> and <code className={code}>/</code> are awkward without escaping. Base64URL replaces <code className={code}>+</code> → <code className={code}>-</code>, <code className={code}>/</code> → <code className={code}>_</code>, and usually omits padding. JWTs use Base64URL for header and payload segments — same math, URL-safe alphabet.
      </p>

      <h2 className={h2}>When Base64 is the right tool</h2>
      <ul className={ul}>
        <li><strong>Embedding small binaries in text formats</strong> — icons or thumbnails as <code className={code}>data:image/png;base64,...</code> in HTML or CSS.</li>
        <li><strong>Carrying binary inside JSON or XML</strong> — certificate PEM bodies, protobuf in JSON, attachment blobs.</li>
        <li><strong>SMTP and MIME</strong> — historical email attachments before binary transports were universal.</li>
        <li><strong>Checksums and fingerprints as text</strong> — hex is fine too; Base64 is shorter than hex for the same bytes but not human-sortable.</li>
      </ul>

      <h2 className={h2}>When NOT to use Base64</h2>
      <ul className={ul}>
        <li>
          <strong>Never call it “encryption.”</strong> Anyone can decode Base64 instantly — there is no key. If you need confidentiality, use real cryptography (for example TLS for transport, AES-256-GCM for payload protection at rest). Confusing encoding with encryption leads to leaked passwords and compliance failures.
        </li>
        <li>
          <strong>Large payloads without compression first.</strong> Base64 expands size by roughly one third. Encoding gigabytes of raw binary into JSON is slow, cache-unfriendly, and expensive at the edge. Compress or use dedicated blob storage with signed URLs instead.
        </li>
        <li>
          <strong>Secrets you hope to “hide” in URLs or logs.</strong> Obfuscation is not protection. Tokens in query strings end up in referrer headers, analytics, and server logs — Base64 does not change that risk profile.
        </li>
        <li>
          <strong>When hex or plain UTF-8 would work.</strong> If you already have text, encoding again wastes bytes and CPU.
        </li>
      </ul>

      <h2 className={h2}>Quick mental model</h2>
      <p className={prose}>
        Treat Base64 like turning binary into a fax-friendly alphabet: reversible, universal, and visible to everyone. Use it where the transport demands text; use cryptography where the data demands privacy.
      </p>
    </div>
  );
}

function JwtSecurityBestPractices() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        JWTs solve real problems — horizontal scaling without sticky sessions, OAuth/OIDC interop, and signed assertions between services — but they are easy to misuse. Below are ten mistakes teams make repeatedly, with practical fixes. For structure of the token itself, see{" "}
        <Link href="/blog/jwt-explained" className="text-accent hover:underline">
          JWT Explained
        </Link>
        .
      </p>

      <h3 className={h3}>1. Treating the payload as confidential</h3>
      <p className={prose}>
        The middle segment is Base64URL-encoded JSON. Anyone with the JWT can decode it. Never put passwords, API keys, card numbers, or detailed PII in claims unless you also encrypt (JWE) — and most stacks stick to signed JWT (JWS) only.
      </p>

      <h3 className={h3}>2. Skipping signature verification</h3>
      <p className={prose}>
        Decoding is not verifying. Your API must validate the signature with the correct key (HMAC secret or asymmetric public key), check <code className={code}>alg</code> against an allowlist, and reject tokens signed with unexpected algorithms — algorithm confusion between HS256 and RS256 has caused real breaches.
      </p>

      <h3 className={h3}>3. Ignoring expiry and clock skew</h3>
      <p className={prose}>
        Always enforce <code className={code}>exp</code> (and usually <code className={code}>nbf</code>). Allow a small clock skew window (for example ±60 seconds) between issuers and validators so legitimate tokens are not rejected on boundary seconds.
      </p>

      <h3 className={h3}>4. Not constraining audience and issuer</h3>
      <p className={prose}>
        Validate <code className={code}>aud</code> against your API’s identifier and <code className={code}>iss</code> against your identity provider’s issuer URL. A token minted for Service A must not authorize requests to Service B.
      </p>

      <h3 className={h3}>5. Weak secrets for HS256</h3>
      <p className={prose}>
        Symmetric signing puts the entire security on one shared string. Use long, random secrets (≥256 bits of entropy), rotate them with a plan, and never embed secrets in client-side code — browsers cannot hold signing secrets safely for HS256-issued tokens consumed by the same browser.
      </p>

      <h3 className={h3}>6. Storing access tokens in localStorage</h3>
      <p className={prose}>
        Any XSS payload can read <code className={code}>localStorage</code>. Prefer <code className={code}>httpOnly</code>, <code className={code}>Secure</code>, <code className={code}>SameSite</code> cookies for refresh/session flows where your threat model includes XSS — paired with tight CSP and short-lived access tokens.
      </p>

      <h3 className={h3}>7. Long-lived access tokens without rotation</h3>
      <p className={prose}>
        Long expiry reduces traffic but increases blast radius when a token leaks. Prefer short access tokens plus refresh token rotation (one-time use refresh tokens stored server-side or in HttpOnly cookies).
      </p>

      <h3 className={h3}>8. No revocation story</h3>
      <p className={prose}>
        Stateless JWT means validators do not ask a database — until you need instant revoke after compromise. Plan for blocklists, session versions, or rotating signing keys (kid headers). Pure “JWT means no DB” breaks down the moment you must invalidate tokens early.
      </p>

      <h3 className={h3}>9. Logging tokens verbatim</h3>
      <p className={prose}>
        Request logs, APM traces, and error reports often capture Authorization headers. Log that a bearer token was present — never the full string — and scrub proxies accordingly.
      </p>

      <h3 className={h3}>10. Using JWT for everything by default</h3>
      <p className={prose}>
        Server-side sessions with opaque IDs and Redis often simplify revocation, device binding, and logout. JWT shines for federation and cross-service claims; it is not mandatory for every SPA. Pick the model from threat model and ops constraints, not hype.
      </p>

      <h2 className={h2}>Bottom line</h2>
      <p className={prose}>
        Secure JWT usage is mostly boring hygiene: verify signatures, narrow claims, short lifetimes, thoughtful storage, and explicit revocation. Decode in the browser for debugging — authorize only after cryptographic verification on the server.
      </p>
    </div>
  );
}

function YamlVsJsonExplained() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        JSON is the lingua franca of APIs and browsers: strict, easy to parse, and ubiquitous. YAML optimizes for humans writing config: fewer quotes, readable structure, comments — plus features JSON does not have (anchors, aliases, tags). Both serialize structured data; they differ in ergonomics and foot-guns.
      </p>

      <h2 className={h2}>Syntax: noise vs intent</h2>
      <p className={prose}>
        JSON requires double quotes around keys and strings, commas between properties, and no trailing commas — see{" "}
        <Link href="/blog/common-json-errors" className="text-accent hover:underline">
          common JSON mistakes
        </Link>
        . YAML often lets you drop quotes when strings look unambiguous and uses indentation instead of braces for nesting.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// JSON — explicit punctuation
{
  "service": "payments",
  "timeout_ms": 3000,
  "regions": ["iad", "pdx"]
}`}
      </pre>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`# YAML — indentation defines scope (use spaces; tabs are messy)
service: payments
timeout_ms: 3000
regions:
  - iad
  - pdx`}
      </pre>

      <h2 className={h2}>Comments</h2>
      <p className={prose}>
        Standard JSON has no comments. YAML supports <code className={code}>#</code> line comments — invaluable for explaining flags in Kubernetes manifests and CI configs. Tools that claim “JSON with comments” are extensions (JSONC), not RFC 8259 JSON.
      </p>

      <h2 className={h2}>Types and surprises</h2>
      <p className={prose}>
        YAML 1.1 treats unquoted <code className={code}>yes</code>/<code className={code}>no</code>/<code className={code}>on</code>/<code className={code}>off</code> as booleans in some parsers — a notorious source of Kubernetes bugs when a country code like NO disappeared into a boolean. JSON only has explicit <code className={code}>true</code>/<code className={code}>false</code>.
      </p>
      <p className={prose}>
        YAML also exposes multiple numeric forms (sexagesimal in older specs, plain integers vs floats). JSON numbers are decimal only. For interoperable configs, quote ambiguous scalars in YAML and validate with a schema (JSON Schema / OpenAPI).
      </p>

      <h2 className={h2}>Anchors and aliases — YAML-only power</h2>
      <p className={prose}>
        YAML can deduplicate structures with anchors (<code className={code}>&amp;</code>) and aliases (<code className={code}>*</code>), reducing repetition in large documents. JSON has no equivalent — you duplicate or generate JSON programmatically.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`defaults: &defaults
  timeout_ms: 3000
  retries: 2

payments:
  <<: *defaults
  path: /pay

refunds:
  <<: *defaults
  path: /refund`}
      </pre>

      <h2 className={h2}>Streams and documents</h2>
      <p className={prose}>
        YAML can concatenate multiple documents in one file separated by <code className={code}>---</code>. JSON is typically one value per file — joining objects requires JSON Lines or wrapping arrays (unless you use extensions).
      </p>

      <h2 className={h2}>JSON inside YAML</h2>
      <p className={prose}>
        Many pipelines embed JSON strings inside YAML for opaque blobs — Kubernetes annotations, CI matrices — because downstream APIs expect JSON. You still validate twice: YAML structure plus inner JSON text.
      </p>

      <h2 className={h2}>When to choose which</h2>
      <ul className={ul}>
        <li><strong>Prefer JSON</strong> for HTTP APIs, browser <code className={code}>fetch</code>, WebSockets, and anywhere unknown parsers must interoperate without ambiguity.</li>
        <li><strong>Prefer YAML</strong> for hand-written infra and app config where humans iterate daily — after linting and schema validation.</li>
        <li><strong>Machine-generated config</strong> often stays JSON end-to-end to avoid YAML’s implicit typing edge cases.</li>
      </ul>

      <h2 className={h2}>Validate before you ship</h2>
      <p className={prose}>
        Paste YAML into a formatter that rejects tabs and fixes indentation, and keep JSON on the narrow path from editor to CI so trailing commas never reach production parsers.
      </p>
    </div>
  );
}

function BrowserCodePlaygroundPrivacy() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Not every &quot;Run&quot; button means the same thing. Some playgrounds execute entirely in your browser tab; others forward source to a remote compiler farm. The difference matters the moment you paste an API key, a JWT from production, or proprietary business logic.
      </p>

      <h2 className={h2}>Three execution patterns you should recognise</h2>
      <ol className={ol}>
        <li>
          <strong className="text-foreground">Sandboxed JavaScript in an iframe.</strong> User code runs in an isolated browsing context with no direct access to your cookies or DevBench DOM. Console output is bridged back to the parent page. There is still a trust boundary: malicious code could try CPU-heavy loops or annoy you — but it cannot open arbitrary network sockets from classic sandbox rules.
        </li>
        <li>
          <strong className="text-foreground">WebAssembly interpreters (Pyodide).</strong> CPython and wheels are shipped to the client and run locally. First load can be large, but after that your Python source stays in-memory in the tab unless you explicitly fetch data. Stdin can be simulated line-by-line from a text area — useful for teaching and quick scripts.
        </li>
        <li>
          <strong className="text-foreground">Remote compile or run APIs.</strong> Some languages proxy to an official or vendor-hosted service (for example the Go Playground). Your source crosses the network under that provider&apos;s policy. Read their terms before shipping internal code.
        </li>
      </ol>

      <h2 className={h2}>Stdin and &quot;feels like a terminal&quot;</h2>
      <p className={prose}>
        Browser playgrounds cannot give you a real TTY. They approximate stdin with buffered lines or shims around small subsets of Node APIs. That is enough for exercises and many algorithms, but not for interactive ncurses apps or programs that expect binary stdin. When behaviour diverges, run the same snippet locally with your real toolchain.
      </p>

      <h2 className={h2}>Practical rules</h2>
      <ul className={ul}>
        <li>Treat every hosted editor as <strong className="text-foreground">public</strong> unless you have verified end-to-end where bytes go.</li>
        <li>Use browser-first tools for <strong className="text-foreground">shape checks</strong> and learning; use locked-down CI or laptops for secrets.</li>
        <li>Open DevTools → Network once per product so you know which requests fire on Run.</li>
      </ul>

      <p className={prose}>
        DevBench&apos;s{" "}
        <Link href="/playground" className="text-accent hover:underline">
          code playground
        </Link>{" "}
        keeps JS/TS and Pyodide paths in the tab and documents Go&apos;s remote compile path in-page — match the tool to your threat model, then get back to shipping.
      </p>
    </div>
  );
}

function HowToGenerateSecurePasswords() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Passwords fail for two reasons: they are too short to withstand brute force, or they come from a predictable source. A truly secure password is long, drawn from a large character set, and generated by a cryptographically strong random number generator — not <code className={code}>Math.random()</code>, a human brain, or a pattern like <code className={code}>P@ssword1!</code>.
      </p>

      <h2 className={h2}>What makes a password secure: entropy</h2>
      <p className={prose}>
        Password strength is measured in bits of entropy — the number of equally likely possibilities an attacker must search. A brute-force attacker tries possibilities at a rate determined by their hardware; entropy determines how large the search space is.
      </p>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Length</th>
            <th className={th}>Character set</th>
            <th className={th}>Entropy (bits)</th>
            <th className={th}>Verdict</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>8 chars</td><td className={td}>lowercase only (26)</td><td className={td}>~37.6</td><td className={td}>Crackable in seconds</td></tr>
          <tr><td className={td}>8 chars</td><td className={td}>upper + lower + digits (62)</td><td className={td}>~47.6</td><td className={td}>Hours to days</td></tr>
          <tr><td className={td}>12 chars</td><td className={td}>upper + lower + digits + symbols (94)</td><td className={td}>~78.7</td><td className={td}>Years on current hardware</td></tr>
          <tr><td className={td}>16 chars</td><td className={td}>same 94-char set</td><td className={td}>~105</td><td className={td}>Astronomically large</td></tr>
          <tr><td className={td}>5 words</td><td className={td}>diceware (7776 word list)</td><td className={td}>~64.6</td><td className={td}>Strong and memorable</td></tr>
        </tbody>
      </table>
      <p className={prose}>
        Entropy formula: <code className={code}>bits = length × log₂(charsetSize)</code>. Aim for at least 80 bits for standard accounts; 128 bits or more for critical credentials.
      </p>

      <h2 className={h2}>Why Math.random() is wrong for passwords</h2>
      <p className={prose}>
        JavaScript's <code className={code}>Math.random()</code> is a pseudo-random number generator (PRNG) seeded from a predictable source. An attacker who knows the seed can reproduce your entire output. For password generation you need a <strong>cryptographically secure</strong> PRNG (CSPRNG) backed by the operating system's entropy pool.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// ❌ Never use for passwords
const random = Math.random(); // not cryptographically secure

// ✅ Use the Web Crypto API
const array = new Uint32Array(1);
crypto.getRandomValues(array);
const randomValue = array[0];`}
      </pre>

      <h2 className={h2}>Generating a secure password in JavaScript</h2>
      <p className={prose}>
        The Web Crypto API is available in all modern browsers and Node.js 15+. Here is a clean, unbiased implementation:
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`function generatePassword(length = 16, options = {}) {
  const { upper = true, lower = true, digits = true, symbols = true } = options;
  let charset = "";
  if (upper)   charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (lower)   charset += "abcdefghijklmnopqrstuvwxyz";
  if (digits)  charset += "0123456789";
  if (symbols) charset += "!@#$%^&*()-_=+[]{}|;:,.<>?";

  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);

  // Modulo bias fix: rejection sampling
  const max = Math.floor(0xFFFFFFFF / charset.length) * charset.length;
  const chars: string[] = [];
  let i = 0;
  while (chars.length < length) {
    const val = bytes[i % length];
    if (val < max) chars.push(charset[val % charset.length]);
    i++;
    if (i >= length && chars.length < length) {
      crypto.getRandomValues(bytes); i = 0;
    }
  }
  return chars.join("");
}`}
      </pre>
      <p className={prose}>
        The rejection-sampling step avoids modulo bias — a subtle flaw where values near the end of the character set are slightly more likely when the charset size does not evenly divide the random range.
      </p>

      <h2 className={h2}>Generating a secure password in Python</h2>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`import secrets
import string

def generate_password(length=16):
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return "".join(secrets.choice(alphabet) for _ in range(length))

print(generate_password(20))`}
      </pre>
      <p className={prose}>
        Python's <code className={code}>secrets</code> module (added in 3.6) is the correct tool for security-sensitive random generation. <code className={code}>random.choice()</code> is the Python equivalent of <code className={code}>Math.random()</code> — do not use it for credentials.
      </p>

      <h2 className={h2}>On the command line</h2>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`# macOS / Linux — openssl
openssl rand -base64 24

# Linux — /dev/urandom
head -c 32 /dev/urandom | base64

# Cross-platform — pwgen
pwgen -s 20 1`}
      </pre>

      <h2 className={h2}>Passphrases vs random strings</h2>
      <p className={prose}>
        A five-word diceware passphrase like <code className={code}>correct-horse-battery-staple-bridge</code> has ~65 bits of entropy, is more memorable than a random string, and survives dictionary attacks if words are chosen from a large enough wordlist (7776+ words from physical dice rolls, not a guessable pattern). Use passphrases for human-typed credentials; use random strings for API keys and machine credentials.
      </p>

      <h2 className={h2}>Where not to store passwords</h2>
      <ul className={ul}>
        <li><strong>Plain text files or spreadsheets</strong> — if the file leaks, every credential is exposed instantly.</li>
        <li><strong>Environment variables in version control</strong> — <code className={code}>.env</code> files with real secrets should never be committed.</li>
        <li><strong>Sticky notes or browser autofill for shared credentials</strong> — use a team password manager with audit logs.</li>
      </ul>
      <p className={prose}>
        For server-side storage of user passwords, never store plaintext or reversible encryption. Hash with a purpose-built password hashing function: <code className={code}>bcrypt</code>, <code className={code}>scrypt</code>, or <code className={code}>Argon2id</code>.
      </p>
    </div>
  );
}

function Sha256VsMd5() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        MD5 and SHA-1 are dead as security tools — collision attacks exist, and GPU clusters can compute billions of hashes per second. SHA-256 is today's minimum for integrity and digital signatures. But even SHA-256 is the wrong choice when you are hashing passwords. Here is the full picture.
      </p>

      <h2 className={h2}>What a hash function does</h2>
      <p className={prose}>
        A cryptographic hash function takes arbitrary-length input and produces a fixed-length digest. Three properties define a secure hash:
      </p>
      <ul className={ul}>
        <li><strong>Pre-image resistance</strong> — given a digest, you cannot find the original input.</li>
        <li><strong>Second pre-image resistance</strong> — given an input, you cannot find a different input with the same digest.</li>
        <li><strong>Collision resistance</strong> — you cannot find any two inputs that produce the same digest.</li>
      </ul>
      <p className={prose}>
        MD5 fails on collision resistance. SHA-1 is practically broken for collision attacks. SHA-256 passes all three for currently known attacks.
      </p>

      <h2 className={h2}>MD5 — fast and broken</h2>
      <p className={prose}>
        MD5 produces a 128-bit (32 hex character) digest and is extremely fast — around 10 GB/s on modern hardware. That speed is a liability for security applications: an attacker can precompute rainbow tables or brute-force password hashes rapidly.
      </p>
      <p className={prose}>
        The practical verdict: MD5 collisions are trivially producible. Two different files can share the same MD5 hash. A certificate authority was forged using MD5 collision attacks in 2008. <strong>Do not use MD5 for anything security-sensitive.</strong>
      </p>
      <p className={prose}>
        MD5 is still fine for non-security use cases: checksums for detecting accidental corruption (not tampering), cache keys, deduplication identifiers, and content-addressable storage where an adversary cannot craft inputs.
      </p>

      <h2 className={h2}>SHA-256 — the modern baseline</h2>
      <p className={prose}>
        SHA-256 is part of the SHA-2 family. It produces a 256-bit (64 hex character) digest and has no known practical attacks against its collision resistance. It is the hash function used in TLS certificates, code signing, Bitcoin's proof-of-work, and HMAC-SHA256 (used in JWT signing and HMAC authentication headers).
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// SHA-256 in the browser (Web Crypto API)
async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const digest = await sha256("hello world");
// → "b94d27b9934d3e08a52e52d7da7dabfac484efe04294e576..."`}
      </pre>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`# Python
import hashlib
digest = hashlib.sha256(b"hello world").hexdigest()
print(digest)`}
      </pre>

      <h2 className={h2}>SHA-512 and SHA-3</h2>
      <p className={prose}>
        SHA-512 doubles the digest size (512 bits / 128 hex chars) and is faster than SHA-256 on 64-bit hardware due to wider native word operations. Use it when you need a larger digest or are operating on 64-bit architectures. SHA-3 (Keccak) uses an entirely different internal construction (sponge function) and is the correct fallback if SHA-2 were ever broken — but SHA-2 breakage is not a realistic near-term threat.
      </p>

      <h2 className={h2}>Comparison table</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Algorithm</th>
            <th className={th}>Digest size</th>
            <th className={th}>Collision resistance</th>
            <th className={th}>Speed</th>
            <th className={th}>Use today?</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>MD5</td><td className={td}>128-bit</td><td className={td}>Broken</td><td className={td}>Very fast</td><td className={td}>Non-security only</td></tr>
          <tr><td className={td}>SHA-1</td><td className={td}>160-bit</td><td className={td}>Broken</td><td className={td}>Fast</td><td className={td}>No</td></tr>
          <tr><td className={td}>SHA-256</td><td className={td}>256-bit</td><td className={td}>Strong</td><td className={td}>Fast</td><td className={td}>Yes — baseline</td></tr>
          <tr><td className={td}>SHA-512</td><td className={td}>512-bit</td><td className={td}>Strong</td><td className={td}>Fast on 64-bit</td><td className={td}>Yes</td></tr>
          <tr><td className={td}>SHA-3-256</td><td className={td}>256-bit</td><td className={td}>Strong</td><td className={td}>Moderate</td><td className={td}>Yes (future-proof)</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Why you should not hash passwords with SHA-256</h2>
      <p className={prose}>
        General-purpose hash functions are designed to be fast. Password hashing needs to be deliberately slow to resist brute-force attacks. Use a purpose-built password hashing function:
      </p>
      <ul className={ul}>
        <li><strong>bcrypt</strong> — work factor configurable; well-supported across languages; 72-byte input limit.</li>
        <li><strong>scrypt</strong> — memory-hard; harder to parallelize on ASICs.</li>
        <li><strong>Argon2id</strong> — winner of the Password Hashing Competition; recommended by OWASP; tunable memory, time, and parallelism.</li>
      </ul>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// Node.js — argon2 package
const argon2 = require("argon2");
const hash = await argon2.hash("user_password");
const valid = await argon2.verify(hash, "user_password"); // true`}
      </pre>

      <h2 className={h2}>HMAC — keyed hashing for authentication</h2>
      <p className={prose}>
        If you want to verify that a message came from someone who knows a secret key, use HMAC (Hash-based Message Authentication Code). HMAC-SHA256 is used in AWS Signature V4, JWT HS256, and webhook verification. A plain SHA-256 hash without a key does not authenticate the sender.
      </p>
    </div>
  );
}

function CronExpressionSyntaxGuide() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Cron is the original Unix job scheduler, and its expression syntax has become a cross-platform standard for describing recurring schedules in CI/CD pipelines, cloud functions, database maintenance windows, and task queues. The syntax is compact but easy to misread — a single character mistake can cause a job to run every minute instead of once a day.
      </p>

      <h2 className={h2}>The five standard fields</h2>
      <p className={prose}>
        A standard cron expression has five space-separated fields:
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`┌─────────────── minute        (0–59)
│ ┌───────────── hour          (0–23)
│ │ ┌─────────── day of month  (1–31)
│ │ │ ┌───────── month         (1–12 or JAN–DEC)
│ │ │ │ ┌─────── day of week   (0–6, 0=Sunday, or SUN–SAT)
│ │ │ │ │
* * * * *`}
      </pre>

      <h2 className={h2}>Field values and special characters</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Character</th>
            <th className={th}>Meaning</th>
            <th className={th}>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}><code className={code}>*</code></td><td className={td}>Every value in the field</td><td className={td}><code className={code}>* * * * *</code> — every minute</td></tr>
          <tr><td className={td}><code className={code}>,</code></td><td className={td}>List of values</td><td className={td}><code className={code}>0 9,17 * * *</code> — 9 AM and 5 PM</td></tr>
          <tr><td className={td}><code className={code}>-</code></td><td className={td}>Range of values</td><td className={td}><code className={code}>0 9-17 * * *</code> — every hour 9 AM–5 PM</td></tr>
          <tr><td className={td}><code className={code}>/</code></td><td className={td}>Step / interval</td><td className={td}><code className={code}>*/15 * * * *</code> — every 15 minutes</td></tr>
          <tr><td className={td}><code className={code}>?</code></td><td className={td}>No specific value (day fields only, Quartz/AWS)</td><td className={td}><code className={code}>0 12 15 * ?</code></td></tr>
          <tr><td className={td}><code className={code}>L</code></td><td className={td}>Last day of month or week (Quartz)</td><td className={td}><code className={code}>0 0 L * ?</code> — last day of month</td></tr>
          <tr><td className={td}><code className={code}>W</code></td><td className={td}>Nearest weekday (Quartz)</td><td className={td}><code className={code}>0 9 15W * ?</code></td></tr>
          <tr><td className={td}><code className={code}>#</code></td><td className={td}>Nth weekday of month (Quartz)</td><td className={td}><code className={code}>0 9 ? * 2#1</code> — first Monday</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Common schedule patterns</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Expression</th>
            <th className={th}>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}><code className={code}>* * * * *</code></td><td className={td}>Every minute</td></tr>
          <tr><td className={td}><code className={code}>0 * * * *</code></td><td className={td}>Every hour (on the hour)</td></tr>
          <tr><td className={td}><code className={code}>0 0 * * *</code></td><td className={td}>Daily at midnight</td></tr>
          <tr><td className={td}><code className={code}>0 9 * * 1-5</code></td><td className={td}>Weekdays at 9 AM</td></tr>
          <tr><td className={td}><code className={code}>0 0 * * 0</code></td><td className={td}>Every Sunday at midnight</td></tr>
          <tr><td className={td}><code className={code}>0 0 1 * *</code></td><td className={td}>First day of every month</td></tr>
          <tr><td className={td}><code className={code}>0 0 1 1 *</code></td><td className={td}>Once a year, Jan 1st at midnight</td></tr>
          <tr><td className={td}><code className={code}>*/5 * * * *</code></td><td className={td}>Every 5 minutes</td></tr>
          <tr><td className={td}><code className={code}>30 8,20 * * *</code></td><td className={td}>8:30 AM and 8:30 PM daily</td></tr>
          <tr><td className={td}><code className={code}>0 2 * * 6,0</code></td><td className={td}>Weekends at 2 AM (Sat and Sun)</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Six-field cron (with seconds)</h2>
      <p className={prose}>
        Some schedulers (Quartz, AWS EventBridge, GitHub Actions) add a sixth field for seconds or year. The order varies by platform:
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`# Quartz (seconds first)
0 0 12 * * ?        → every day at noon

# AWS EventBridge (seconds first, year last)
0 0 12 * * ? *      → every day at noon`}
      </pre>
      <p className={prose}>
        Always check which variant your platform uses — mixing up the field order is a common source of confusion.
      </p>

      <h2 className={h2}>Special strings (vixie cron and systemd)</h2>
      <p className={prose}>
        Many cron implementations support named shortcuts instead of numeric expressions:
      </p>
      <ul className={ul}>
        <li><code className={code}>@yearly</code> / <code className={code}>@annually</code> — equivalent to <code className={code}>0 0 1 1 *</code></li>
        <li><code className={code}>@monthly</code> — equivalent to <code className={code}>0 0 1 * *</code></li>
        <li><code className={code}>@weekly</code> — equivalent to <code className={code}>0 0 * * 0</code></li>
        <li><code className={code}>@daily</code> / <code className={code}>@midnight</code> — equivalent to <code className={code}>0 0 * * *</code></li>
        <li><code className={code}>@hourly</code> — equivalent to <code className={code}>0 * * * *</code></li>
        <li><code className={code}>@reboot</code> — run once at startup (vixie cron only)</li>
      </ul>

      <h2 className={h2}>Platform differences to watch for</h2>
      <ul className={ul}>
        <li><strong>Sunday is 0 or 7</strong> — vixie cron accepts both 0 and 7 as Sunday; some platforms only accept 0.</li>
        <li><strong>Day of month + day of week interaction</strong> — in most cron implementations, if both are non-<code className={code}>*</code>, the job runs when either condition is true (OR logic), not when both are true (AND). Quartz uses <code className={code}>?</code> to say "don't care" for one of them.</li>
        <li><strong>Timezone</strong> — cron traditionally runs in the server's local timezone. Cloud schedulers (AWS, GCP, GitHub Actions) let you specify a timezone explicitly — always do this for production jobs.</li>
        <li><strong>GitHub Actions</strong> — uses UTC and the standard five-field format. Minimum interval is every 5 minutes.</li>
      </ul>

      <h2 className={h2}>Debugging tips</h2>
      <p className={prose}>
        Before deploying a cron expression, run it through a parser that shows the next N execution times. A schedule that looks right in your head often has off-by-one errors in the day-of-week field (0 vs 7 for Sunday) or in step expressions (<code className={code}>*/30</code> in the minute field runs at :00 and :30, not 30 minutes after the last run).
      </p>
    </div>
  );
}

function UnixTimestampsExplained() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        A Unix timestamp is the number of seconds elapsed since the Unix epoch — <strong>1970-01-01T00:00:00Z</strong> (midnight UTC on January 1st, 1970). It is the standard representation of a point in time in operating systems, databases, log files, and APIs. Understanding how timestamps work prevents the most common datetime bugs: timezone confusion, milliseconds vs seconds mismatches, and the 2038 problem.
      </p>

      <h2 className={h2}>The Unix epoch</h2>
      <p className={prose}>
        The epoch is an agreed-upon origin point. Time before it produces negative timestamps (e.g., 1969-12-31 is timestamp <code className={code}>-86400</code>). The number is always expressed in UTC, meaning it has no timezone. Converting to a human-readable date requires knowing what timezone to display — the timestamp itself carries no timezone information.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// Current timestamp in JavaScript
const seconds = Math.floor(Date.now() / 1000);  // seconds
const millis  = Date.now();                       // milliseconds

// From timestamp to date
new Date(1_700_000_000 * 1000).toISOString();
// → "2023-11-14T22:13:20.000Z"`}
      </pre>

      <h2 className={h2}>Seconds vs milliseconds</h2>
      <p className={prose}>
        This is the most common source of timestamp bugs. Unix time is canonically in <strong>seconds</strong>, but JavaScript's <code className={code}>Date.now()</code> and many APIs return <strong>milliseconds</strong>. At the time of writing, the current Unix timestamp in seconds is around 1.7 billion; in milliseconds it is 1.7 trillion. If you store a millisecond value where seconds are expected, dates will show up in the year 56,000.
      </p>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Language / API</th>
            <th className={th}>Default unit</th>
            <th className={th}>How to get seconds</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>JavaScript <code className={code}>Date.now()</code></td><td className={td}>Milliseconds</td><td className={td}><code className={code}>Math.floor(Date.now() / 1000)</code></td></tr>
          <tr><td className={td}>Python <code className={code}>time.time()</code></td><td className={td}>Seconds (float)</td><td className={td}><code className={code}>int(time.time())</code></td></tr>
          <tr><td className={td}>Unix shell <code className={code}>date +%s</code></td><td className={td}>Seconds</td><td className={td}>Native</td></tr>
          <tr><td className={td}>PostgreSQL <code className={code}>extract(epoch from now())</code></td><td className={td}>Seconds</td><td className={td}>Native</td></tr>
          <tr><td className={td}>MySQL <code className={code}>UNIX_TIMESTAMP()</code></td><td className={td}>Seconds</td><td className={td}>Native</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Working with timestamps in JavaScript</h2>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// Current timestamp (seconds)
const now = Math.floor(Date.now() / 1000);

// Parse a timestamp into a Date
const date = new Date(1_700_000_000 * 1000);
console.log(date.toISOString());    // UTC string
console.log(date.toLocaleString()); // Local timezone string

// Future timestamp (24 hours from now)
const tomorrow = Math.floor(Date.now() / 1000) + 86400;

// Check if a timestamp is expired
function isExpired(ts) {
  return ts < Math.floor(Date.now() / 1000);
}`}
      </pre>

      <h2 className={h2}>Working with timestamps in Python</h2>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`import time
from datetime import datetime, timezone

# Current timestamp
now = int(time.time())

# Parse timestamp to datetime (always UTC-aware)
dt = datetime.fromtimestamp(1_700_000_000, tz=timezone.utc)
print(dt.isoformat())  # 2023-11-14T22:13:20+00:00

# datetime to timestamp
ts = int(dt.timestamp())`}
      </pre>

      <h2 className={h2}>Timezones and timestamps</h2>
      <p className={prose}>
        A Unix timestamp is always UTC — there is no such thing as "a Unix timestamp in Eastern time." Timezone only matters when converting to or from a human-readable string. The two main mistakes:
      </p>
      <ul className={ul}>
        <li><strong>Storing local time as if it were UTC</strong> — a timestamp generated on a machine set to UTC-5 will be off by 5 hours if naively treated as UTC.</li>
        <li><strong>Displaying UTC timestamps without conversion</strong> — users see the wrong hour unless you convert to their local timezone in the UI.</li>
      </ul>
      <p className={prose}>
        Best practice: store and transmit UTC timestamps everywhere. Convert to the user's local timezone only at display time, using the browser's <code className={code}>Intl.DateTimeFormat</code> or a library like <code className={code}>date-fns-tz</code>.
      </p>

      <h2 className={h2}>The Year 2038 problem</h2>
      <p className={prose}>
        On January 19, 2038 at 03:14:07 UTC, 32-bit signed integer Unix timestamps will overflow from <code className={code}>2147483647</code> to <code className={code}>-2147483648</code>, wrapping clocks back to 1901. This affects legacy embedded systems, 32-bit C code, and old database schemas using <code className={code}>INT</code> for timestamps. Modern 64-bit systems can represent dates billions of years into the future. The fix is to use 64-bit integers for timestamps — which all modern languages and databases already do by default.
      </p>
    </div>
  );
}

function HexRgbHslCssColors() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        CSS gives you multiple ways to express the same color — HEX, RGB, RGBA, HSL, HSLA, and newer formats like <code className={code}>oklch</code>. Each format has a job: HEX is what you copy from design tools, RGB maps to hardware, and HSL makes programmatic color manipulation readable. Knowing how they relate saves time when converting between design files, code, and accessibility tools.
      </p>

      <h2 className={h2}>HEX — the design-tool default</h2>
      <p className={prose}>
        Hexadecimal colors encode red, green, and blue channels as two hex digits each, prefixed with <code className={code}>#</code>. The range per channel is <code className={code}>00</code>–<code className={code}>FF</code> (0–255 decimal).
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`#RRGGBB       → 6-digit standard
#RGB          → 3-digit shorthand (each digit doubled: #ABC = #AABBCC)
#RRGGBBAA     → 8-digit with alpha channel (CSS Colors Level 4)
#RGBA         → 4-digit shorthand with alpha

/* Examples */
#ff0000       → red
#00ff00       → green
#0000ff       → blue
#ffffff       → white
#000000       → black
#ff000080     → red at ~50% opacity`}
      </pre>
      <p className={prose}>
        HEX is compact and universally supported but not human-readable — you cannot intuit what <code className={code}>#3a7bd5</code> looks like without a color picker. It is the format Figma, Sketch, and most design tools export by default.
      </p>

      <h2 className={h2}>RGB and RGBA — the hardware model</h2>
      <p className={prose}>
        RGB expresses each channel as a decimal 0–255 (or 0–100% in newer CSS). RGBA adds an alpha channel for opacity as a 0–1 float.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`rgb(255, 0, 0)          → red
rgb(58, 123, 213)       → a medium blue
rgba(58, 123, 213, 0.5) → same blue at 50% opacity

/* CSS Colors Level 4 — space-separated, optional alpha */
rgb(58 123 213)
rgb(58 123 213 / 50%)`}
      </pre>
      <p className={prose}>
        RGB maps directly to how monitors display color (additive mixing). It is the format used by canvas APIs, WebGL, and image processing code. <code className={code}>rgb(0,0,0)</code> is black; <code className={code}>rgb(255,255,255)</code> is white. Equal values of R, G, B always produce a grey.
      </p>

      <h2 className={h2}>HSL and HSLA — the intuitive model</h2>
      <p className={prose}>
        HSL stands for Hue, Saturation, Lightness. It describes color in terms that match how humans think about it:
      </p>
      <ul className={ul}>
        <li><strong>Hue</strong> — the color angle on a color wheel, 0–360°. 0° = red, 120° = green, 240° = blue.</li>
        <li><strong>Saturation</strong> — 0% is grey; 100% is the full color.</li>
        <li><strong>Lightness</strong> — 0% is black; 50% is the pure color; 100% is white.</li>
      </ul>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`hsl(0, 100%, 50%)       → red
hsl(120, 100%, 50%)     → green
hsl(240, 100%, 50%)     → blue
hsl(240, 100%, 25%)     → dark blue
hsl(240, 100%, 75%)     → light blue
hsl(0, 0%, 50%)         → medium grey

hsla(240, 100%, 50%, 0.3)  → blue at 30% opacity`}
      </pre>
      <p className={prose}>
        HSL shines for programmatic color manipulation. To darken a button on hover, subtract lightness. To create a color palette, vary hue while keeping saturation and lightness constant. To generate accessible text colors, check lightness against the background.
      </p>

      <h2 className={h2}>Conversion formulas</h2>
      <p className={prose}>
        HEX and RGB are the same data in different notation — converting between them is simple arithmetic. HEX <code className={code}>FF</code> = decimal <code className={code}>255</code>. HSL requires trigonometry to convert to/from RGB, but any color picker or CSS library handles this.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// HEX → RGB in JavaScript
function hexToRgb(hex) {
  const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

hexToRgb("#3a7bd5") // → { r: 58, g: 123, b: 213 }`}
      </pre>

      <h2 className={h2}>Modern CSS color formats</h2>
      <p className={prose}>
        CSS Colors Level 4 and 5 introduce additional formats now widely supported in modern browsers:
      </p>
      <ul className={ul}>
        <li><code className={code}>oklch(L C H)</code> — perceptual lightness, chroma, hue. Changing hue does not shift perceived brightness, making it ideal for accessible design systems.</li>
        <li><code className={code}>color(display-p3 R G B)</code> — the Display P3 wide-gamut color space used by modern Apple and Samsung displays. Covers more saturated reds and greens than sRGB.</li>
        <li><code className={code}>color-mix(in srgb, red 50%, blue)</code> — mix two colors in CSS without JavaScript.</li>
      </ul>

      <h2 className={h2}>When to use which format</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Format</th>
            <th className={th}>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}><code className={code}>HEX</code></td><td className={td}>Copying from design tools; static design tokens</td></tr>
          <tr><td className={td}><code className={code}>RGB / RGBA</code></td><td className={td}>Canvas, WebGL, image processing, dynamic opacity in JS</td></tr>
          <tr><td className={td}><code className={code}>HSL / HSLA</code></td><td className={td}>Programmatic theming, hover states, color scales in CSS variables</td></tr>
          <tr><td className={td}><code className={code}>oklch</code></td><td className={td}>Design systems needing perceptual uniformity; accessible palettes</td></tr>
          <tr><td className={td}><code className={code}>color(display-p3)</code></td><td className={td}>High-fidelity visuals targeting wide-gamut displays</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Accessibility: contrast and color</h2>
      <p className={prose}>
        WCAG 2.1 defines contrast ratio requirements: 4.5:1 for normal text (AA), 3:1 for large text (AA), and 7:1 for enhanced contrast (AAA). Contrast ratio is calculated from relative luminance — a function of the linear RGB values. HSL lightness is a shortcut heuristic, not a precise predictor of WCAG contrast. Use a dedicated contrast checker and favor <code className={code}>oklch</code> for color systems where consistent perceived contrast matters.
      </p>
    </div>
  );
}

function CelsiusToFahrenheit() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Converting between Celsius and Fahrenheit comes up constantly — whether you are checking a weather forecast, reading a recipe, or monitoring a patient's temperature. The two scales use different zero points and different step sizes, so the conversion requires both multiplication and addition.
      </p>

      <h2 className={h2}>The Formula</h2>
      <p className={prose}>
        To convert Celsius to Fahrenheit, multiply by 9/5 (or 1.8) and then add 32:
      </p>
      <p className={prose}>
        <code className={code}>°F = (°C × 9/5) + 32</code>
      </p>
      <p className={prose}>
        To go the other way — Fahrenheit to Celsius — subtract 32 first, then multiply by 5/9:
      </p>
      <p className={prose}>
        <code className={code}>°C = (°F − 32) × 5/9</code>
      </p>
      <p className={prose}>
        The factor 9/5 comes from the ratio of the Fahrenheit degree size to the Celsius degree size. One Celsius degree spans 1.8 Fahrenheit degrees. The offset of 32 aligns the zero points: 0 °C (water freezes) equals 32 °F.
      </p>

      <h2 className={h2}>Quick Mental Trick</h2>
      <p className={prose}>
        For a fast approximation without a calculator, double the Celsius value and add 30:
      </p>
      <p className={prose}>
        <code className={code}>°F ≈ (°C × 2) + 30</code>
      </p>
      <p className={prose}>
        Example: 20 °C → (20 × 2) + 30 = 70 °F. The exact answer is 68 °F — off by just 2 degrees. This trick works well in the everyday temperature range (0–40 °C). It gets less accurate near the extremes.
      </p>

      <h2 className={h2}>Worked Example: What is 35 °C in Fahrenheit?</h2>
      <p className={prose}>
        35 °C is a hot summer day or a slightly elevated body temperature. Here is the step-by-step calculation:
      </p>
      <ol className={ol}>
        <li>Start with the formula: <code className={code}>°F = (°C × 9/5) + 32</code></li>
        <li>Substitute: <code className={code}>°F = (35 × 9/5) + 32</code></li>
        <li>Multiply: <code className={code}>35 × 9 = 315</code>, then <code className={code}>315 ÷ 5 = 63</code></li>
        <li>Add 32: <code className={code}>63 + 32 = 95</code></li>
        <li>Result: <strong>35 °C = 95 °F</strong></li>
      </ol>
      <p className={prose}>
        Similarly, 37 °C (normal human body temperature) = (37 × 9/5) + 32 = 66.6 + 32 = <strong>98.6 °F</strong>.
      </p>

      <h2 className={h2}>Reference Conversion Table</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Celsius (°C)</th>
            <th className={th}>Fahrenheit (°F)</th>
            <th className={th}>Context</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>−40</td><td className={td}>−40</td><td className={td}>The only point where both scales meet</td></tr>
          <tr><td className={td}>0</td><td className={td}>32</td><td className={td}>Water freezes / ice melts</td></tr>
          <tr><td className={td}>10</td><td className={td}>50</td><td className={td}>Cool autumn day</td></tr>
          <tr><td className={td}>20</td><td className={td}>68</td><td className={td}>Room temperature</td></tr>
          <tr><td className={td}>25</td><td className={td}>77</td><td className={td}>Warm indoor temperature</td></tr>
          <tr><td className={td}>30</td><td className={td}>86</td><td className={td}>Warm summer day</td></tr>
          <tr><td className={td}>35</td><td className={td}>95</td><td className={td}>Hot day / mild fever</td></tr>
          <tr><td className={td}>37</td><td className={td}>98.6</td><td className={td}>Normal human body temperature</td></tr>
          <tr><td className={td}>40</td><td className={td}>104</td><td className={td}>High fever / extreme heat</td></tr>
          <tr><td className={td}>50</td><td className={td}>122</td><td className={td}>Dangerously hot weather</td></tr>
          <tr><td className={td}>100</td><td className={td}>212</td><td className={td}>Water boils (at sea level)</td></tr>
          <tr><td className={td}>180</td><td className={td}>356</td><td className={td}>Slow oven (bread proofing temperature)</td></tr>
          <tr><td className={td}>200</td><td className={td}>392</td><td className={td}>Moderate oven (baking cakes)</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Why These Temperatures Matter</h2>
      <ul className={ul}>
        <li><strong>0 °C / 32 °F</strong> — water transitions between solid and liquid. Critical for food safety, road conditions, and biology.</li>
        <li><strong>37 °C / 98.6 °F</strong> — average human core body temperature. Readings above 38 °C (100.4 °F) indicate fever.</li>
        <li><strong>100 °C / 212 °F</strong> — water boils at standard atmospheric pressure (sea level). Boiling point drops about 1 °C for every 300 m of altitude.</li>
        <li><strong>Oven temperatures</strong> — most baking recipes are written in one scale. A moderate oven is around 180 °C (356 °F); a hot oven is 220 °C (428 °F).</li>
        <li><strong>Weather comfort</strong> — temperatures below 0 °C (32 °F) risk frost; above 35 °C (95 °F) pose heat-stress risks without proper hydration.</li>
      </ul>

      <h2 className={h2}>Adding Kelvin to the Mix</h2>
      <p className={prose}>
        Scientists use the Kelvin scale, which starts at absolute zero — the theoretical point where all molecular motion stops. Converting from Celsius to Kelvin is straightforward:
      </p>
      <p className={prose}>
        <code className={code}>K = °C + 273.15</code>
      </p>
      <p className={prose}>
        So 0 °C = 273.15 K, 100 °C = 373.15 K, and −273.15 °C = 0 K (absolute zero). Kelvin has no negative values and no degree symbol — you write 300 K, not 300 °K.
      </p>

      <p className={prose}>
        Need to convert any temperature instantly?{" "}
        <Link href="/tools/temperature-converter" className="text-primary underline underline-offset-2 hover:no-underline">
          Use the DevBench Temperature Converter
        </Link>{" "}
        — it handles Celsius, Fahrenheit, Kelvin, and Rankine in real time.
      </p>
    </div>
  );
}

function MorseCodeAlphabetChart() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Morse code is one of the most enduring communication systems ever invented. Nearly two centuries after its creation, it still appears in ham radio transmissions, aviation beacons, and accessibility tools. This guide covers the complete alphabet, numbers, punctuation, and a brief look at why Morse has lasted so long.
      </p>

      <h2 className={h2}>A Brief History</h2>
      <p className={prose}>
        In the 1830s, American artist and inventor Samuel Morse partnered with physicist Joseph Henry and machinist Alfred Vail to develop an electrical telegraph system. The code they devised — officially called International Morse Code after its 1865 standardization — assigned short signals (dots) and long signals (dashes) to each letter of the alphabet. On 24 May 1844, Morse sent the first long-distance telegraph message from Washington D.C. to Baltimore: "What hath God wrought."
      </p>
      <p className={prose}>
        The original American Morse Code differed slightly from the International version used today. The International standard was adopted by the ITU and remains the global reference.
      </p>

      <h2 className={h2}>How Morse Code Works</h2>
      <p className={prose}>
        Morse uses just two signals — a short mark called a <strong>dot</strong> (<code className={code}>·</code>) and a long mark called a <strong>dash</strong> (<code className={code}>−</code>). The timing rules define everything:
      </p>
      <ul className={ul}>
        <li>A dash is 3× the duration of a dot.</li>
        <li>The gap between signals within a letter = 1 dot length.</li>
        <li>The gap between letters = 3 dot lengths.</li>
        <li>The gap between words = 7 dot lengths.</li>
      </ul>
      <p className={prose}>
        These timing ratios mean Morse can be sent at any speed — a skilled operator can transmit over 30 words per minute, while a beginner might start at 5 wpm.
      </p>

      <h2 className={h2}>Complete A–Z Alphabet</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Letter</th>
            <th className={th}>Morse Code</th>
            <th className={th}>Letter</th>
            <th className={th}>Morse Code</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>A</td><td className={td}><code className={code}>· −</code></td><td className={td}>N</td><td className={td}><code className={code}>− ·</code></td></tr>
          <tr><td className={td}>B</td><td className={td}><code className={code}>− · · ·</code></td><td className={td}>O</td><td className={td}><code className={code}>− − −</code></td></tr>
          <tr><td className={td}>C</td><td className={td}><code className={code}>− · − ·</code></td><td className={td}>P</td><td className={td}><code className={code}>· − − ·</code></td></tr>
          <tr><td className={td}>D</td><td className={td}><code className={code}>− · ·</code></td><td className={td}>Q</td><td className={td}><code className={code}>− − · −</code></td></tr>
          <tr><td className={td}>E</td><td className={td}><code className={code}>·</code></td><td className={td}>R</td><td className={td}><code className={code}>· − ·</code></td></tr>
          <tr><td className={td}>F</td><td className={td}><code className={code}>· · − ·</code></td><td className={td}>S</td><td className={td}><code className={code}>· · ·</code></td></tr>
          <tr><td className={td}>G</td><td className={td}><code className={code}>− − ·</code></td><td className={td}>T</td><td className={td}><code className={code}>−</code></td></tr>
          <tr><td className={td}>H</td><td className={td}><code className={code}>· · · ·</code></td><td className={td}>U</td><td className={td}><code className={code}>· · −</code></td></tr>
          <tr><td className={td}>I</td><td className={td}><code className={code}>· ·</code></td><td className={td}>V</td><td className={td}><code className={code}>· · · −</code></td></tr>
          <tr><td className={td}>J</td><td className={td}><code className={code}>· − − −</code></td><td className={td}>W</td><td className={td}><code className={code}>· − −</code></td></tr>
          <tr><td className={td}>K</td><td className={td}><code className={code}>− · −</code></td><td className={td}>X</td><td className={td}><code className={code}>− · · −</code></td></tr>
          <tr><td className={td}>L</td><td className={td}><code className={code}>· − · ·</code></td><td className={td}>Y</td><td className={td}><code className={code}>− · − −</code></td></tr>
          <tr><td className={td}>M</td><td className={td}><code className={code}>− −</code></td><td className={td}>Z</td><td className={td}><code className={code}>− − · ·</code></td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Numbers 0–9</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Digit</th>
            <th className={th}>Morse Code</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>0</td><td className={td}><code className={code}>− − − − −</code></td></tr>
          <tr><td className={td}>1</td><td className={td}><code className={code}>· − − − −</code></td></tr>
          <tr><td className={td}>2</td><td className={td}><code className={code}>· · − − −</code></td></tr>
          <tr><td className={td}>3</td><td className={td}><code className={code}>· · · − −</code></td></tr>
          <tr><td className={td}>4</td><td className={td}><code className={code}>· · · · −</code></td></tr>
          <tr><td className={td}>5</td><td className={td}><code className={code}>· · · · ·</code></td></tr>
          <tr><td className={td}>6</td><td className={td}><code className={code}>− · · · ·</code></td></tr>
          <tr><td className={td}>7</td><td className={td}><code className={code}>− − · · ·</code></td></tr>
          <tr><td className={td}>8</td><td className={td}><code className={code}>− − − · ·</code></td></tr>
          <tr><td className={td}>9</td><td className={td}><code className={code}>− − − − ·</code></td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Common Punctuation</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Symbol</th>
            <th className={th}>Morse Code</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>. (period)</td><td className={td}><code className={code}>· − · − · −</code></td></tr>
          <tr><td className={td}>, (comma)</td><td className={td}><code className={code}>− − · · − −</code></td></tr>
          <tr><td className={td}>? (question mark)</td><td className={td}><code className={code}>· · − − · ·</code></td></tr>
          <tr><td className={td}>! (exclamation)</td><td className={td}><code className={code}>− · − · − −</code></td></tr>
          <tr><td className={td}>/ (slash)</td><td className={td}><code className={code}>− · · − ·</code></td></tr>
          <tr><td className={td}>@ (at sign)</td><td className={td}><code className={code}>· − − · − ·</code></td></tr>
          <tr><td className={td}>= (equals)</td><td className={td}><code className={code}>− · · · −</code></td></tr>
        </tbody>
      </table>

      <h2 className={h2}>SOS — The Most Famous Morse Sequence</h2>
      <p className={prose}>
        The international distress signal SOS is sent as <code className={code}>· · · − − − · · ·</code> (three dots, three dashes, three dots) without any letter gaps — it is transmitted as a single continuous prosign. It was chosen in 1906 precisely because it is easy to recognize: a distinct pattern that stands out from ordinary traffic. SOS does not stand for "Save Our Ship" or "Save Our Souls" — those backronyms came later. The letters were simply chosen for their memorability in Morse.
      </p>

      <h2 className={h2}>Where Morse Code is Still Used Today</h2>
      <ul className={ul}>
        <li><strong>Amateur (ham) radio</strong> — the FCC no longer requires a Morse test to obtain a US amateur licence, but many operators still use CW (continuous wave Morse) because it cuts through noise better than voice at low power levels.</li>
        <li><strong>Aviation</strong> — VOR navigation beacons and Non-Directional Beacons (NDB) transmit their three-letter identifier in Morse so pilots can confirm they are tuned to the correct station.</li>
        <li><strong>Military and emergency communications</strong> — Morse remains a backup communication method in scenarios where voice or digital links fail.</li>
        <li><strong>Accessibility</strong> — people with limited motor control can input Morse via a single switch to type text. iOS and Android both support Morse input as an accessibility keyboard option.</li>
        <li><strong>Hobbyist and cultural uses</strong> — Morse tattoos, jewellery, puzzle design, and escape rooms have given the code a popular-culture second life.</li>
      </ul>

      <p className={prose}>
        Want to translate text to Morse and hear the audio?{" "}
        <Link href="/tools/morse-code" className="text-primary underline underline-offset-2 hover:no-underline">
          Try the DevBench Morse Code Translator
        </Link>{" "}
        — it converts in both directions and plays back the dots and dashes.
      </p>
    </div>
  );
}

function PythagoreanTheoremExamples() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        The Pythagorean theorem is one of the oldest and most useful relationships in mathematics. It connects the three sides of any right-angled triangle and appears in everything from construction and navigation to screen dimensions and physics. Here is a complete guide — from the formula to worked examples and real-world applications.
      </p>

      <h2 className={h2}>The Theorem</h2>
      <p className={prose}>
        In a right-angled triangle, the square of the length of the hypotenuse (the side opposite the right angle) equals the sum of the squares of the other two sides. Written as a formula:
      </p>
      <p className={prose}>
        <code className={code}>a² + b² = c²</code>
      </p>
      <p className={prose}>
        Where <code className={code}>c</code> is the hypotenuse (the longest side, always opposite the 90° angle) and <code className={code}>a</code> and <code className={code}>b</code> are the two shorter sides, called legs. The theorem holds for <em>every</em> right-angled triangle, regardless of size.
      </p>
      <p className={prose}>
        Geometrically, it means: the area of the square drawn on the hypotenuse equals the combined area of the squares drawn on the two legs. This is why the theorem is often shown with three squares attached to the sides of a triangle.
      </p>

      <h2 className={h2}>Finding the Hypotenuse</h2>
      <p className={prose}>
        When you know both legs and need the hypotenuse, rearrange to isolate <code className={code}>c</code>:
      </p>
      <p className={prose}>
        <code className={code}>c = √(a² + b²)</code>
      </p>
      <h3 className={h3}>Worked Example: The 3-4-5 Triangle</h3>
      <ol className={ol}>
        <li>Known values: <code className={code}>a = 3</code>, <code className={code}>b = 4</code></li>
        <li>Apply the formula: <code className={code}>c = √(3² + 4²)</code></li>
        <li>Square each leg: <code className={code}>9 + 16 = 25</code></li>
        <li>Take the square root: <code className={code}>√25 = 5</code></li>
        <li>Result: <strong>c = 5</strong></li>
      </ol>
      <p className={prose}>
        The 3-4-5 triangle is the simplest Pythagorean triple — three whole numbers that satisfy the theorem exactly with no rounding.
      </p>

      <h2 className={h2}>Finding a Missing Leg</h2>
      <p className={prose}>
        When you know the hypotenuse and one leg, rearrange to find the missing leg:
      </p>
      <p className={prose}>
        <code className={code}>b = √(c² − a²)</code>
      </p>
      <h3 className={h3}>Worked Example: Hypotenuse 13, One Leg 5</h3>
      <ol className={ol}>
        <li>Known values: <code className={code}>c = 13</code>, <code className={code}>a = 5</code></li>
        <li>Apply the formula: <code className={code}>b = √(13² − 5²)</code></li>
        <li>Square each value: <code className={code}>169 − 25 = 144</code></li>
        <li>Take the square root: <code className={code}>√144 = 12</code></li>
        <li>Result: <strong>b = 12</strong></li>
      </ol>
      <p className={prose}>
        This is the 5-12-13 triple — another set of whole-number values that satisfy the theorem perfectly.
      </p>

      <h2 className={h2}>Pythagorean Triples</h2>
      <p className={prose}>
        A Pythagorean triple is a set of three positive integers that satisfy <code className={code}>a² + b² = c²</code>. They are useful for quick mental checks and for problems where exact integer answers are expected.
      </p>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>a</th>
            <th className={th}>b</th>
            <th className={th}>c</th>
            <th className={th}>Verification</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>3</td><td className={td}>4</td><td className={td}>5</td><td className={td}><code className={code}>9 + 16 = 25</code></td></tr>
          <tr><td className={td}>5</td><td className={td}>12</td><td className={td}>13</td><td className={td}><code className={code}>25 + 144 = 169</code></td></tr>
          <tr><td className={td}>8</td><td className={td}>15</td><td className={td}>17</td><td className={td}><code className={code}>64 + 225 = 289</code></td></tr>
          <tr><td className={td}>7</td><td className={td}>24</td><td className={td}>25</td><td className={td}><code className={code}>49 + 576 = 625</code></td></tr>
          <tr><td className={td}>20</td><td className={td}>21</td><td className={td}>29</td><td className={td}><code className={code}>400 + 441 = 841</code></td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Real-World Applications</h2>
      <ul className={ul}>
        <li>
          <strong>Construction squareness check</strong> — builders use the 3-4-5 method to verify a corner is exactly 90°. Measure 3 units along one wall and 4 units along the adjacent wall; if the diagonal is 5 units, the corner is square. No protractor needed.
        </li>
        <li>
          <strong>Screen diagonal</strong> — a monitor described as "27 inches" refers to the diagonal. If you know the width is 23.5 in and the height is 13.2 in, verify: <code className={code}>√(23.5² + 13.2²) = √(552.25 + 174.24) ≈ 26.97 in</code>.
        </li>
        <li>
          <strong>Navigation distance</strong> — if a ship travels 60 km east and 80 km north, the straight-line distance from start to finish is <code className={code}>√(60² + 80²) = √(3600 + 6400) = √10000 = 100 km</code>.
        </li>
        <li>
          <strong>Ramp and staircase design</strong> — given a horizontal run and a required height, the Pythagorean theorem gives the exact length of the ramp or stringer needed.
        </li>
      </ul>

      <h2 className={h2}>Word Problem: The Ladder</h2>
      <p className={prose}>
        A ladder 10 ft long leans against a wall. The base of the ladder is 6 ft from the wall. How high up the wall does the ladder reach?
      </p>
      <ol className={ol}>
        <li>The ladder is the hypotenuse: <code className={code}>c = 10</code></li>
        <li>The base distance is one leg: <code className={code}>a = 6</code></li>
        <li>Find the height (other leg): <code className={code}>b = √(c² − a²) = √(100 − 36) = √64 = 8</code></li>
        <li>Result: the ladder reaches <strong>8 ft</strong> up the wall.</li>
      </ol>
      <p className={prose}>
        Notice that 6, 8, 10 is just the 3-4-5 triple scaled by 2. Recognising common triples lets you solve these problems in your head.
      </p>

      <p className={prose}>
        Need to solve a triangle quickly?{" "}
        <Link href="/tools/pythagorean-theorem" className="text-primary underline underline-offset-2 hover:no-underline">
          Use the DevBench Pythagorean Theorem Calculator
        </Link>{" "}
        — enter any two sides and it instantly computes the third.
      </p>
    </div>
  );
}

function MergePdfOnline() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Merging PDFs is one of those tasks that sounds trivial until you realise your options are: install Adobe Acrobat (expensive), upload files to a random website (risky), or use a command-line tool (overkill for a quick task). This guide covers all three approaches — and explains when each makes sense.
      </p>

      <h2 className={h2}>Why merge PDFs?</h2>
      <ul className={ul}>
        <li><strong>Contracts and agreements</strong> — combine the main document with attachments into one file before signing</li>
        <li><strong>Invoices and receipts</strong> — merge multiple monthly invoices into one for expense reports</li>
        <li><strong>Portfolio or report submissions</strong> — universities and employers often require one PDF upload</li>
        <li><strong>Scanned documents</strong> — a scanner that produces one PDF per page needs merging before sharing</li>
        <li><strong>Presentations</strong> — combine slide deck exports from multiple contributors</li>
      </ul>

      <h2 className={h2}>Online vs desktop vs command line</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Method</th>
            <th className={th}>Pros</th>
            <th className={th}>Cons</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>Online tool (browser-side)</td><td className={td}>No install, works on any OS, files never leave your device</td><td className={td}>Depends on browser PDF libraries</td></tr>
          <tr><td className={td}>Online tool (server-side)</td><td className={td}>Handles large files, richer features</td><td className={td}>Files uploaded to a third-party server — privacy risk</td></tr>
          <tr><td className={td}>Adobe Acrobat</td><td className={td}>Full-featured, reliable</td><td className={td}>Paid subscription, overkill for occasional use</td></tr>
          <tr><td className={td}>macOS Preview</td><td className={td}>Built-in, free, fast</td><td className={td}>macOS only</td></tr>
          <tr><td className={td}>Ghostscript (CLI)</td><td className={td}>Free, scriptable, handles any file size</td><td className={td}>Command-line setup required</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>The privacy question</h2>
      <p className={prose}>
        Before you drag your bank statements or NDA into an online tool, check whether processing happens in your browser or on their server. A tool that runs in the browser — using JavaScript libraries like <code className={code}>pdf-lib</code> or <code className={code}>pdf.js</code> — never transmits your files. A server-side tool receives, processes, and (ideally) deletes your file, but you're trusting their infrastructure and privacy policy.
      </p>
      <p className={prose}>
        Look for explicit "processed in your browser" language, or check the browser's network tab while merging — if no file upload request appears, processing is local.
      </p>

      <h2 className={h2}>How to merge PDFs in your browser (DevBench)</h2>
      <ol className={ol}>
        <li>Open <Link href="/tools/merge-pdf" className="text-primary underline underline-offset-2 hover:no-underline">DevBench PDF Merger</Link> — no account needed</li>
        <li>Click <strong>Add PDFs</strong> or drag and drop your files into the upload zone</li>
        <li>Reorder pages by dragging the thumbnail list — put them in the sequence you want in the final document</li>
        <li>Click <strong>Merge PDFs</strong></li>
        <li>Download the combined file — it's generated entirely in your browser using pdf-lib</li>
      </ol>
      <p className={prose}>
        Your files are never sent to a server. The download happens client-side and the result exists only in your browser memory until you save it.
      </p>

      <h2 className={h2}>Merge PDFs on macOS (Preview)</h2>
      <ol className={ol}>
        <li>Open the first PDF in Preview</li>
        <li>Go to <strong>View → Thumbnails</strong> to show the page sidebar</li>
        <li>Drag additional PDF files into the sidebar at the position where you want them inserted</li>
        <li>Go to <strong>File → Export as PDF</strong> to save the merged document</li>
      </ol>
      <p className={prose}>
        This works for any number of files. Drag pages between positions to reorder before exporting.
      </p>

      <h2 className={h2}>Merge PDFs with Ghostscript (command line)</h2>
      <p className={prose}>
        Install Ghostscript (<code className={code}>brew install ghostscript</code> on macOS, <code className={code}>apt install ghostscript</code> on Ubuntu), then:
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite \\
   -sOutputFile=merged.pdf \\
   file1.pdf file2.pdf file3.pdf`}
      </pre>
      <p className={prose}>
        Ghostscript recompresses content during merge, which can slightly reduce quality on image-heavy PDFs. Use <code className={code}>-dCompatibilityLevel=1.7 -dPDFSETTINGS=/prepress</code> to preserve quality:
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite \\
   -dCompatibilityLevel=1.7 -dPDFSETTINGS=/prepress \\
   -sOutputFile=merged.pdf \\
   file1.pdf file2.pdf file3.pdf`}
      </pre>

      <h2 className={h2}>Merge PDFs with Python (pypdf)</h2>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`from pypdf import PdfWriter

writer = PdfWriter()
for filename in ["file1.pdf", "file2.pdf", "file3.pdf"]:
    writer.append(filename)

with open("merged.pdf", "wb") as output:
    writer.write(output)`}
      </pre>
      <p className={prose}>
        Install with <code className={code}>pip install pypdf</code>. This is ideal for batch merging in scripts — merge hundreds of files in a loop.
      </p>

      <h2 className={h2}>Common problems and fixes</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Problem</th>
            <th className={th}>Cause</th>
            <th className={th}>Fix</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>Merged file is very large</td><td className={td}>High-res images in source PDFs</td><td className={td}>Compress first, then merge; or use <code className={code}>/screen</code> setting in Ghostscript</td></tr>
          <tr><td className={td}>Fonts look wrong</td><td className={td}>Fonts not embedded in source PDF</td><td className={td}>Regenerate source PDFs with embedded fonts</td></tr>
          <tr><td className={td}>Pages appear rotated</td><td className={td}>PDF rotation metadata mismatch</td><td className={td}>Rotate pages before merging using a PDF editor or tool</td></tr>
          <tr><td className={td}>Password-protected PDF fails</td><td className={td}>Encrypted PDFs can't be merged without the password</td><td className={td}>Unlock the PDF first (requires the password)</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function ImageToPdfPost() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Whether you're submitting scanned documents, sending photos as a professional attachment, or archiving screenshots, converting images to PDF is a routine task. This guide covers every method — browser tools, built-in OS features, and command-line options — with a clear take on when to use each.
      </p>

      <h2 className={h2}>When do you need image-to-PDF?</h2>
      <ul className={ul}>
        <li><strong>Document submissions</strong> — universities, banks, and government portals almost always require PDF, not JPEG</li>
        <li><strong>Multi-page scans</strong> — a scanner that produces one image per page; you need them as a single paginated document</li>
        <li><strong>Professional sharing</strong> — a PDF preserves layout and doesn't accidentally get compressed by email clients or messaging apps</li>
        <li><strong>Archiving photos</strong> — PDF/A is an ISO standard for long-term digital archiving</li>
        <li><strong>iOS/Android screenshots</strong> — HEIC photos from iPhones need conversion before Windows users can view them</li>
      </ul>

      <h2 className={h2}>Supported formats</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Format</th>
            <th className={th}>Common source</th>
            <th className={th}>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>JPEG / JPG</td><td className={td}>Photos, scans</td><td className={td}>Most widely supported; lossy compression</td></tr>
          <tr><td className={td}>PNG</td><td className={td}>Screenshots, graphics with transparency</td><td className={td}>Lossless; transparency becomes white background in PDF</td></tr>
          <tr><td className={td}>HEIC / HEIF</td><td className={td}>iPhone photos (iOS 11+)</td><td className={td}>Modern format; not natively supported on older Windows/Linux</td></tr>
          <tr><td className={td}>WebP</td><td className={td}>Web-optimised images</td><td className={td}>Increasingly common; browser tools handle it natively</td></tr>
          <tr><td className={td}>BMP</td><td className={td}>Old Windows graphics</td><td className={td}>Large file size; always convert to JPEG first</td></tr>
          <tr><td className={td}>TIFF</td><td className={td}>High-res scans, print</td><td className={td}>Large file; preserve for archival PDFs</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Convert images to PDF in your browser (DevBench)</h2>
      <ol className={ol}>
        <li>Open <Link href="/tools/image-to-pdf" className="text-primary underline underline-offset-2 hover:no-underline">DevBench Image to PDF</Link></li>
        <li>Drag and drop your images — JPG, PNG, WebP, HEIC, BMP, or TIFF</li>
        <li>Reorder pages by dragging thumbnails into the desired sequence</li>
        <li>Choose page size (A4 is the global standard; Letter is common in North America)</li>
        <li>Click <strong>Convert to PDF</strong> and download</li>
      </ol>
      <p className={prose}>
        All processing happens in your browser with pdf-lib. No images are uploaded. Works with multiple images at once — one image per page.
      </p>

      <h2 className={h2}>Convert on macOS (built-in, no install)</h2>
      <p className={prose}>
        For a single image: open it in Preview → <strong>File → Export as PDF</strong>. Done.
      </p>
      <p className={prose}>
        For multiple images: select all files in Finder → right-click → <strong>Quick Actions → Create PDF</strong>. macOS creates a multi-page PDF in the same folder with images sorted by filename.
      </p>

      <h2 className={h2}>Convert on Windows 10/11 (built-in)</h2>
      <ol className={ol}>
        <li>Open the image in the Photos app</li>
        <li>Press <code className={code}>Ctrl + P</code> to print</li>
        <li>In the printer dropdown, select <strong>Microsoft Print to PDF</strong></li>
        <li>Choose orientation and click Print — then save the PDF</li>
      </ol>
      <p className={prose}>
        For multiple images, select all in File Explorer → right-click → Print → choose Microsoft Print to PDF. Windows will ask for page layout and create a multi-page PDF.
      </p>

      <h2 className={h2}>Convert with ImageMagick (command line)</h2>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`# Single image
convert photo.jpg output.pdf

# Multiple images to one PDF
convert page1.jpg page2.jpg page3.jpg combined.pdf

# With quality control (lower number = smaller file)
convert -quality 80 photo.jpg output.pdf`}
      </pre>
      <p className={prose}>
        Install ImageMagick with <code className={code}>brew install imagemagick</code> (macOS) or <code className={code}>apt install imagemagick</code> (Ubuntu). For HEIC files on macOS you also need <code className={code}>brew install libheif</code>.
      </p>
      <p className={prose}>
        Note: some Linux systems restrict ImageMagick's PDF output by default due to security policies. Edit <code className={code}>/etc/ImageMagick-6/policy.xml</code> and change the PDF policy from <code className={code}>none</code> to <code className={code}>read|write</code> if you get a "not authorized" error.
      </p>

      <h2 className={h2}>Tips for better output quality</h2>
      <ul className={ul}>
        <li><strong>Page size matters</strong> — A4 (210×297mm) is standard globally; if your images are portrait photos they'll fit correctly. Landscape photos may need a rotated page setting.</li>
        <li><strong>DPI for scans</strong> — 150 DPI is readable; 300 DPI is the standard for document archival. Higher DPI = larger file.</li>
        <li><strong>Transparent PNG</strong> — transparency is not supported in PDF. It renders as white. If you need the transparent background preserved, convert to PNG with a coloured background before converting to PDF.</li>
        <li><strong>HEIC to PDF</strong> — browsers natively support HEIC → PDF now; if your tool doesn't, convert HEIC → JPEG first using macOS Photos or a converter.</li>
      </ul>
    </div>
  );
}

function LoanEmiCalculator() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        An EMI — Equated Monthly Installment — is the fixed amount you pay every month to repay a loan. It combines principal repayment and interest in a single number. Understanding how the EMI formula works helps you compare loan offers, plan prepayments, and avoid being surprised by amortisation schedules.
      </p>

      <h2 className={h2}>The EMI formula</h2>
      <p className={prose}>
        The standard EMI formula is:
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`EMI = P × r × (1 + r)^n
      ─────────────────────
          (1 + r)^n − 1

Where:
  P = Principal loan amount
  r = Monthly interest rate (annual rate ÷ 12 ÷ 100)
  n = Loan tenure in months`}
      </pre>
      <p className={prose}>
        The formula looks complex but the intuition is straightforward: you're spreading the loan amount (plus all future interest) evenly across <code className={code}>n</code> payments so that the outstanding balance reaches exactly zero at the last payment.
      </p>

      <h2 className={h2}>Worked example: home loan</h2>
      <p className={prose}>
        Suppose you take a home loan of <strong>₹50,00,000</strong> at <strong>8.5% per annum</strong> for <strong>20 years</strong>.
      </p>
      <ul className={ul}>
        <li>P = 50,00,000</li>
        <li>Annual rate = 8.5%, so monthly rate r = 8.5 ÷ 12 ÷ 100 = 0.007083</li>
        <li>n = 20 × 12 = 240 months</li>
      </ul>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`EMI = 50,00,000 × 0.007083 × (1.007083)^240
      ──────────────────────────────────────
              (1.007083)^240 − 1

    = 50,00,000 × 0.007083 × 5.2748
      ─────────────────────────────
              5.2748 − 1

    = 50,00,000 × 0.03735 / 4.2748

    ≈ ₹43,671 per month`}
      </pre>
      <p className={prose}>
        Over 240 months you pay ₹43,671 × 240 = <strong>₹1,04,81,040</strong> in total. The interest cost is ₹1,04,81,040 − ₹50,00,000 = <strong>₹54,81,040</strong> — more than the original principal. This is why tenure choice matters enormously.
      </p>

      <h2 className={h2}>How interest rate affects EMI</h2>
      <p className={prose}>
        Same ₹50 lakh loan, 20-year tenure at different rates:
      </p>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Interest rate</th>
            <th className={th}>Monthly EMI</th>
            <th className={th}>Total interest paid</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>7.0% p.a.</td><td className={td}>₹38,765</td><td className={td}>₹43,03,600</td></tr>
          <tr><td className={td}>8.0% p.a.</td><td className={td}>₹41,822</td><td className={td}>₹50,37,280</td></tr>
          <tr><td className={td}>8.5% p.a.</td><td className={td}>₹43,671</td><td className={td}>₹54,81,040</td></tr>
          <tr><td className={td}>9.0% p.a.</td><td className={td}>₹44,986</td><td className={td}>₹57,96,640</td></tr>
          <tr><td className={td}>10.0% p.a.</td><td className={td}>₹48,251</td><td className={td}>₹65,80,240</td></tr>
        </tbody>
      </table>
      <p className={prose}>
        A 1% rate difference on a ₹50 lakh loan over 20 years costs roughly <strong>₹7–8 lakh more in interest</strong>. Negotiating your interest rate down by even 0.5% at origination is worth significant effort.
      </p>

      <h2 className={h2}>How tenure affects EMI and total cost</h2>
      <p className={prose}>
        Same ₹50 lakh loan at 8.5% p.a. at different tenures:
      </p>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Tenure</th>
            <th className={th}>Monthly EMI</th>
            <th className={th}>Total interest paid</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>10 years</td><td className={td}>₹62,000</td><td className={td}>₹24,40,000</td></tr>
          <tr><td className={td}>15 years</td><td className={td}>₹49,250</td><td className={td}>₹38,65,000</td></tr>
          <tr><td className={td}>20 years</td><td className={td}>₹43,671</td><td className={td}>₹54,81,040</td></tr>
          <tr><td className={td}>25 years</td><td className={td}>₹40,260</td><td className={td}>₹70,78,000</td></tr>
          <tr><td className={td}>30 years</td><td className={td}>₹38,446</td><td className={td}>₹88,40,560</td></tr>
        </tbody>
      </table>
      <p className={prose}>
        Extending from 20 to 30 years saves only ₹5,225/month in EMI but costs an extra <strong>₹33,59,520 in interest</strong>. Shorter tenures hurt your monthly cash flow but dramatically reduce the total cost of the loan.
      </p>

      <h2 className={h2}>How amortisation works</h2>
      <p className={prose}>
        In the early months, most of your EMI is interest and very little is principal repayment. As the outstanding balance shrinks, the interest component falls and the principal component rises — but the EMI stays constant.
      </p>
      <p className={prose}>
        For the ₹50 lakh / 8.5% / 20-year example, the first few months look like:
      </p>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Month</th>
            <th className={th}>EMI</th>
            <th className={th}>Interest</th>
            <th className={th}>Principal</th>
            <th className={th}>Outstanding</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>1</td><td className={td}>₹43,671</td><td className={td}>₹35,417</td><td className={td}>₹8,254</td><td className={td}>₹49,91,746</td></tr>
          <tr><td className={td}>2</td><td className={td}>₹43,671</td><td className={td}>₹35,358</td><td className={td}>₹8,313</td><td className={td}>₹49,83,433</td></tr>
          <tr><td className={td}>12</td><td className={td}>₹43,671</td><td className={td}>₹34,820</td><td className={td}>₹8,851</td><td className={td}>₹49,14,400</td></tr>
          <tr><td className={td}>120</td><td className={td}>₹43,671</td><td className={td}>₹24,108</td><td className={td}>₹19,563</td><td className={td}>₹33,73,000</td></tr>
          <tr><td className={td}>240</td><td className={td}>₹43,671</td><td className={td}>₹309</td><td className={td}>₹43,362</td><td className={td}>₹0</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Prepayment: how it helps</h2>
      <p className={prose}>
        Making a lump-sum prepayment directly reduces the outstanding principal, which shrinks future interest. Even a small prepayment in the early years has outsized impact because you eliminate years of compounding interest.
      </p>
      <p className={prose}>
        Example: a ₹2 lakh prepayment at the end of year 1 on the above loan reduces the remaining tenure by approximately 14 months and saves roughly ₹6 lakh in total interest — a 3× return on the prepayment amount.
      </p>
      <p className={prose}>
        Check the prepayment penalty clause before paying early — some lenders charge 1–2% on prepaid amounts for fixed-rate loans.
      </p>

      <p className={prose}>
        Use the{" "}
        <Link href="/tools/loan-emi-calculator" className="text-primary underline underline-offset-2 hover:no-underline">
          DevBench EMI Calculator
        </Link>{" "}
        to compute your exact monthly installment, total interest, and amortisation schedule for any loan amount, rate, and tenure.
      </p>
    </div>
  );
}

function BmiCalculatorPost() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        BMI — Body Mass Index — is a number derived from your height and weight that classifies body size into underweight, normal, overweight, and obese ranges. It's the most widely used screening tool in clinical practice, but it has important limitations that are worth understanding before acting on a number.
      </p>

      <h2 className={h2}>The BMI formula</h2>
      <p className={prose}>
        BMI is calculated differently depending on which unit system you use:
      </p>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>System</th>
            <th className={th}>Formula</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>Metric</td><td className={td}>BMI = weight (kg) ÷ height (m)²</td></tr>
          <tr><td className={td}>Imperial</td><td className={td}>BMI = 703 × weight (lb) ÷ height (in)²</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Worked examples</h2>
      <p className={prose}>
        <strong>Example 1 (metric):</strong> A person who weighs 70 kg and is 1.75 m tall.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`BMI = 70 ÷ (1.75)²
    = 70 ÷ 3.0625
    = 22.9`}
      </pre>
      <p className={prose}>
        <strong>Example 2 (imperial):</strong> A person who weighs 154 lb and is 5′9″ (69 inches) tall.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`BMI = 703 × 154 ÷ (69)²
    = 703 × 154 ÷ 4761
    = 108,262 ÷ 4761
    = 22.7`}
      </pre>

      <h2 className={h2}>BMI classification (WHO standard)</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>BMI range</th>
            <th className={th}>Category</th>
            <th className={th}>Health risk</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>Below 16.0</td><td className={td}>Severe underweight</td><td className={td}>High risk of malnutrition, bone density loss, heart problems</td></tr>
          <tr><td className={td}>16.0 – 16.9</td><td className={td}>Moderate underweight</td><td className={td}>Elevated risk, clinical evaluation recommended</td></tr>
          <tr><td className={td}>17.0 – 18.4</td><td className={td}>Mild underweight</td><td className={td}>Slightly elevated risk</td></tr>
          <tr><td className={td}>18.5 – 24.9</td><td className={td}>Normal weight</td><td className={td}>Lowest risk range</td></tr>
          <tr><td className={td}>25.0 – 29.9</td><td className={td}>Overweight</td><td className={td}>Moderately increased risk of metabolic disease</td></tr>
          <tr><td className={td}>30.0 – 34.9</td><td className={td}>Obese Class I</td><td className={td}>High risk</td></tr>
          <tr><td className={td}>35.0 – 39.9</td><td className={td}>Obese Class II</td><td className={td}>Very high risk</td></tr>
          <tr><td className={td}>40.0 and above</td><td className={td}>Obese Class III (severe)</td><td className={td}>Extremely high risk</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Asian BMI cut-offs</h2>
      <p className={prose}>
        The WHO classification above is based primarily on European populations. Multiple studies have shown that people of South Asian, East Asian, and Southeast Asian origin have higher rates of metabolic disease (type 2 diabetes, cardiovascular disease) at the same BMI compared to European populations. Several health authorities — including India's National Institute of Nutrition — recommend adjusted cut-offs:
      </p>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Category</th>
            <th className={th}>Standard WHO cut-off</th>
            <th className={th}>Recommended Asian cut-off</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>Overweight</td><td className={td}>≥ 25.0</td><td className={td}>≥ 23.0</td></tr>
          <tr><td className={td}>Obese</td><td className={td}>≥ 30.0</td><td className={td}>≥ 27.5</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Limitations of BMI</h2>
      <p className={prose}>
        BMI is a population-level screening tool, not a diagnostic metric. It has known blind spots:
      </p>
      <ul className={ul}>
        <li><strong>Muscle vs fat</strong> — BMI doesn't distinguish between muscle and fat tissue. A muscular athlete can have a BMI of 28–30 (overweight by classification) with very low body fat. Conversely, a sedentary person with a "normal" BMI of 23 can carry excess visceral fat.</li>
        <li><strong>Fat distribution</strong> — where you carry fat matters more than total fat. Visceral fat (around the abdomen) is more metabolically active and dangerous than subcutaneous fat. Waist circumference is a better predictor of cardiovascular risk than BMI alone.</li>
        <li><strong>Age</strong> — older adults tend to have more body fat at the same BMI due to muscle loss (sarcopenia). BMI slightly overestimates health for older people.</li>
        <li><strong>Sex</strong> — women naturally carry more body fat than men at the same BMI. The 18.5–24.9 range is identical for both sexes despite this biological difference.</li>
        <li><strong>Pregnancy</strong> — BMI is not applicable during pregnancy.</li>
      </ul>
      <p className={prose}>
        Use BMI as a first-pass indicator. For a more complete picture, pair it with waist circumference (risk increases above 88 cm for women / 102 cm for men by WHO criteria) and body fat percentage measured by DEXA scan or bioimpedance analysis.
      </p>

      <h2 className={h2}>Healthy weight range by height</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Height</th>
            <th className={th}>Healthy weight (BMI 18.5–24.9)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>155 cm (5′1″)</td><td className={td}>44 – 60 kg (98 – 132 lb)</td></tr>
          <tr><td className={td}>160 cm (5′3″)</td><td className={td}>47 – 64 kg (104 – 141 lb)</td></tr>
          <tr><td className={td}>165 cm (5′5″)</td><td className={td}>50 – 68 kg (111 – 149 lb)</td></tr>
          <tr><td className={td}>170 cm (5′7″)</td><td className={td}>54 – 72 kg (118 – 159 lb)</td></tr>
          <tr><td className={td}>175 cm (5′9″)</td><td className={td}>57 – 76 kg (125 – 168 lb)</td></tr>
          <tr><td className={td}>180 cm (5′11″)</td><td className={td}>60 – 81 kg (133 – 178 lb)</td></tr>
          <tr><td className={td}>185 cm (6′1″)</td><td className={td}>63 – 85 kg (140 – 188 lb)</td></tr>
        </tbody>
      </table>

      <p className={prose}>
        Calculate your BMI instantly with the{" "}
        <Link href="/tools/bmi-calculator" className="text-primary underline underline-offset-2 hover:no-underline">
          DevBench BMI Calculator
        </Link>{" "}
        — enter height and weight in metric or imperial and get your BMI, category, and healthy weight range.
      </p>
    </div>
  );
}

function JsonToCsvPost() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        JSON is the lingua franca of APIs; CSV is the lingua franca of spreadsheets. Converting between them is a daily task for data engineers, analysts, and developers pulling data from APIs into Excel, Google Sheets, or a SQL import. This guide covers how the conversion works, the edge cases that trip people up, and code examples in JavaScript and Python.
      </p>

      <h2 className={h2}>When you need JSON → CSV</h2>
      <ul className={ul}>
        <li><strong>API data into spreadsheets</strong> — export REST API responses to Excel or Google Sheets for non-technical stakeholders</li>
        <li><strong>Database exports</strong> — MongoDB and Firestore export JSON; downstream tools often expect CSV</li>
        <li><strong>Data science pipelines</strong> — pandas, R, and most ML toolkits read CSV natively and have no built-in JSON array reader</li>
        <li><strong>Bulk imports</strong> — CRMs, email platforms, and accounting tools almost universally accept CSV for data import</li>
      </ul>

      <h2 className={h2}>How JSON arrays map to CSV</h2>
      <p className={prose}>
        The conversion only makes sense for a JSON array of objects with consistent keys. Each object becomes a row; the keys become column headers.
      </p>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// Input JSON
[
  { "name": "Alice", "age": 30, "city": "Mumbai" },
  { "name": "Bob",   "age": 25, "city": "Delhi"  },
  { "name": "Carol", "age": 35, "city": "Pune"   }
]

// Output CSV
name,age,city
Alice,30,Mumbai
Bob,25,Delhi
Carol,35,Pune`}
      </pre>

      <h2 className={h2}>Convert online (DevBench)</h2>
      <ol className={ol}>
        <li>Open <Link href="/tools/json-to-csv" className="text-primary underline underline-offset-2 hover:no-underline">DevBench JSON to CSV</Link></li>
        <li>Paste your JSON array (or upload a .json file)</li>
        <li>Click <strong>Convert</strong> — headers are auto-detected from the first object's keys</li>
        <li>Copy the CSV output or download as a .csv file</li>
      </ol>
      <p className={prose}>
        DevBench handles nested objects by flattening them with dot notation (<code className={code}>address.city</code>) and arrays by joining values with a semicolon.
      </p>

      <h2 className={h2}>Convert in JavaScript</h2>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`function jsonToCsv(arr) {
  if (!arr.length) return "";
  const headers = Object.keys(arr[0]);
  const escape = (val) => {
    const str = String(val ?? "");
    return str.includes(",") || str.includes('"') || str.includes("\\n")
      ? \`"\${str.replace(/"/g, '""')}"\`
      : str;
  };
  const rows = arr.map((obj) =>
    headers.map((h) => escape(obj[h])).join(",")
  );
  return [headers.join(","), ...rows].join("\\n");
}

const data = [
  { name: "Alice", age: 30, city: "Mumbai" },
  { name: "Bob",   age: 25, city: "Delhi"  },
];
console.log(jsonToCsv(data));`}
      </pre>
      <p className={prose}>
        The <code className={code}>escape</code> function handles the RFC 4180 quoting rules: wrap in double-quotes if the value contains a comma, double-quote, or newline; double up any embedded double-quotes.
      </p>

      <h2 className={h2}>Convert in Python</h2>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`import json, csv, io

with open("data.json") as f:
    data = json.load(f)

output = io.StringIO()
writer = csv.DictWriter(output, fieldnames=data[0].keys())
writer.writeheader()
writer.writerows(data)
print(output.getvalue())`}
      </pre>
      <p className={prose}>
        Python's <code className={code}>csv.DictWriter</code> handles all quoting automatically. Replace <code className={code}>io.StringIO()</code> with <code className={code}>open("output.csv", "w", newline="")</code> to write directly to a file. The <code className={code}>newline=""</code> argument is required on Windows to prevent double line endings.
      </p>

      <h2 className={h2}>Edge cases and how to handle them</h2>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Edge case</th>
            <th className={th}>Example</th>
            <th className={th}>How to handle</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>Missing keys</td><td className={td}>Object 2 has no <code className={code}>city</code> key</td><td className={td}>Output empty string for the cell; don't skip the column</td></tr>
          <tr><td className={td}>Value contains comma</td><td className={td}><code className={code}>"New York, NY"</code></td><td className={td}>Wrap in double-quotes: <code className={code}>"New York, NY"</code></td></tr>
          <tr><td className={td}>Value contains double-quote</td><td className={td}><code className={code}>He said "hello"</code></td><td className={td}>Escape as <code className={code}>"He said ""hello"""</code></td></tr>
          <tr><td className={td}>Nested object</td><td className={td}><code className={code}>{`{ "addr": { "city": "Mumbai" } }`}</code></td><td className={td}>Flatten to <code className={code}>addr.city</code> column, or JSON-encode the value as a string</td></tr>
          <tr><td className={td}>Array value</td><td className={td}><code className={code}>{`{ "tags": ["a", "b"] }`}</code></td><td className={td}>Join as <code className={code}>a;b</code> or JSON-encode as <code className={code}>["a","b"]</code></td></tr>
          <tr><td className={td}>Null / undefined</td><td className={td}><code className={code}>null</code></td><td className={td}>Output as empty string (most spreadsheet tools interpret blank as null)</td></tr>
          <tr><td className={td}>Very large numbers</td><td className={td}><code className={code}>9007199254740993</code></td><td className={td}>Wrap in double-quotes to prevent Excel from rounding with float precision</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Handling nested JSON: flatten vs stringify</h2>
      <p className={prose}>
        Two strategies for nested objects:
      </p>
      <ul className={ul}>
        <li><strong>Flatten</strong> — recursively expand <code className={code}>{`{ "address": { "city": "Mumbai", "pin": "400001" } }`}</code> into two columns: <code className={code}>address.city</code> and <code className={code}>address.pin</code>. Good when nested structure is shallow and consistent.</li>
        <li><strong>Stringify</strong> — JSON-encode the nested value as a string and put it in a single column. Good for deeply nested or variable-structure objects — preserves data without exploding column count.</li>
      </ul>
      <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
{`// Flatten approach
function flatten(obj, prefix = "") {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? \`\${prefix}.\${k}\` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(acc, flatten(v, key));
    } else {
      acc[key] = v;
    }
    return acc;
  }, {});
}

const flat = data.map(flatten);
console.log(jsonToCsv(flat));`}
      </pre>

      <p className={prose}>
        For quick conversions without writing code, use the{" "}
        <Link href="/tools/json-to-csv" className="text-primary underline underline-offset-2 hover:no-underline">
          DevBench JSON to CSV converter
        </Link>
        {" "}— paste your array and download the result in one click.
      </p>
    </div>
  );
}

function JsonSchemaValidation() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        JSON is flexible by design — any key, any value, any depth. That flexibility is great for prototyping and terrible for production APIs. JSON Schema is the standard way to describe what a valid JSON document must look like: which fields are required, what types they must be, and what constraints they must satisfy.
      </p>

      <h2 className={h2}>What JSON Schema actually is</h2>
      <p className={prose}>
        A JSON Schema is itself a JSON document. You write it once, then use it to validate any number of input documents against it. The schema lives at <code className={code}>$schema: "https://json-schema.org/draft/2020-12/schema"</code> by convention. Libraries like <strong>AJV</strong> (Node.js), <strong>jsonschema</strong> (Python), and <strong>Newtonsoft.Json.Schema</strong> (.NET) implement validation against it.
      </p>
      <p className={prose}>A minimal schema looks like this:</p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "name", "email"],
  "properties": {
    "id":    { "type": "integer", "minimum": 1 },
    "name":  { "type": "string",  "minLength": 1 },
    "email": { "type": "string",  "format": "email" }
  },
  "additionalProperties": false
}`}</code></pre>
      <p className={prose}>This schema says: the document must be an object with three required fields. <code className={code}>id</code> must be a positive integer, <code className={code}>name</code> a non-empty string, <code className={code}>email</code> a valid email address, and no extra fields are allowed.</p>

      <h2 className={h2}>The six core keywords</h2>
      <table className={table}>
        <thead><tr><th className={th}>Keyword</th><th className={th}>What it does</th><th className={th}>Example</th></tr></thead>
        <tbody>
          <tr><td className={td}><code className={code}>type</code></td><td className={td}>Constrains the JSON type</td><td className={td}><code className={code}>{`"type": "string"`}</code></td></tr>
          <tr><td className={td}><code className={code}>required</code></td><td className={td}>Lists mandatory keys in an object</td><td className={td}><code className={code}>{`"required": ["id"]`}</code></td></tr>
          <tr><td className={td}><code className={code}>properties</code></td><td className={td}>Defines sub-schemas for each key</td><td className={td}><code className={code}>{`"properties": { "age": { ... } }`}</code></td></tr>
          <tr><td className={td}><code className={code}>enum</code></td><td className={td}>Restricts value to a fixed set</td><td className={td}><code className={code}>{`"enum": ["active", "inactive"]`}</code></td></tr>
          <tr><td className={td}><code className={code}>minimum / maximum</code></td><td className={td}>Numeric range constraints</td><td className={td}><code className={code}>{`"minimum": 0, "maximum": 100`}</code></td></tr>
          <tr><td className={td}><code className={code}>pattern</code></td><td className={td}>Regex the string must match</td><td className={td}><code className={code}>{`"pattern": "^[A-Z]{2}\\d{4}$"`}</code></td></tr>
        </tbody>
      </table>

      <h2 className={h2}>String constraints</h2>
      <ul className={ul}>
        <li><code className={code}>minLength</code> / <code className={code}>maxLength</code> — character count bounds</li>
        <li><code className={code}>pattern</code> — a regex the value must satisfy (anchored to the full string)</li>
        <li><code className={code}>format</code> — semantic hints: <code className={code}>email</code>, <code className={code}>uri</code>, <code className={code}>date</code>, <code className={code}>date-time</code>, <code className={code}>uuid</code>. Note: formats are annotations by default — validators only enforce them if you opt in (e.g. <code className={code}>ajv.opts.formats</code>)</li>
      </ul>

      <h2 className={h2}>Array constraints</h2>
      <ul className={ul}>
        <li><code className={code}>items</code> — the schema every element must satisfy</li>
        <li><code className={code}>minItems</code> / <code className={code}>maxItems</code> — length bounds</li>
        <li><code className={code}>uniqueItems: true</code> — no duplicates allowed</li>
      </ul>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`{
  "type": "array",
  "items": { "type": "string" },
  "minItems": 1,
  "uniqueItems": true
}`}</code></pre>

      <h2 className={h2}>Composition keywords</h2>
      <p className={prose}>JSON Schema has four composition keywords that let you build complex rules from simpler schemas:</p>
      <ul className={ul}>
        <li><code className={code}>allOf</code> — must satisfy every listed schema (AND)</li>
        <li><code className={code}>anyOf</code> — must satisfy at least one listed schema (OR)</li>
        <li><code className={code}>oneOf</code> — must satisfy exactly one listed schema (XOR)</li>
        <li><code className={code}>not</code> — must not satisfy the given schema</li>
      </ul>
      <p className={prose}>A common pattern is <code className={code}>anyOf</code> for nullable fields: <code className={code}>{`"anyOf": [{ "type": "string" }, { "type": "null" }]`}</code>. In JSON Schema 2019-09+ you can write this more concisely as <code className={code}>{`"type": ["string", "null"]`}</code>.</p>

      <h2 className={h2}>Validating with AJV in Node.js</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv();
addFormats(ajv); // enables "email", "uri", "date-time" etc.

const schema = {
  type: "object",
  required: ["id", "name"],
  properties: {
    id:   { type: "integer", minimum: 1 },
    name: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

const validate = ajv.compile(schema);
const valid = validate({ id: 1, name: "Alice" });

if (!valid) {
  console.error(validate.errors);
}`}</code></pre>
      <p className={prose}>
        <code className={code}>ajv.compile()</code> returns a reusable validation function — compile once, call many times. The <code className={code}>validate.errors</code> array contains detailed error objects with the failing path, keyword, and message.
      </p>

      <h2 className={h2}>$ref and reusable definitions</h2>
      <p className={prose}>Large schemas use <code className={code}>$defs</code> (formerly <code className={code}>definitions</code>) and <code className={code}>$ref</code> to avoid repetition:</p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`{
  "$defs": {
    "Address": {
      "type": "object",
      "required": ["street", "city"],
      "properties": {
        "street": { "type": "string" },
        "city":   { "type": "string" }
      }
    }
  },
  "type": "object",
  "properties": {
    "billing":  { "$ref": "#/$defs/Address" },
    "shipping": { "$ref": "#/$defs/Address" }
  }
}`}</code></pre>

      <h2 className={h2}>Common mistakes</h2>
      <ul className={ul}>
        <li><strong>Forgetting <code className={code}>additionalProperties: false</code></strong> — without it, extra fields silently pass validation</li>
        <li><strong>Confusing <code className={code}>format</code> enforcement</strong> — <code className={code}>{`"format": "email"`}</code> is not enforced unless your validator is configured to check formats</li>
        <li><strong>Using <code className={code}>oneOf</code> where <code className={code}>anyOf</code> is correct</strong> — <code className={code}>oneOf</code> fails if more than one sub-schema matches, which is rarely what you want</li>
        <li><strong>Schema draft mismatch</strong> — AJV v8 defaults to Draft 2020-12; older tooling may use Draft 4 or 7 with different keyword semantics</li>
      </ul>
    </div>
  );
}

function JsonPathCheatSheet() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        JSONPath is a query language for JSON, analogous to XPath for XML. Given a deeply nested JSON document, a JSONPath expression lets you extract one value, a list of values, or everything that matches a pattern — without writing loops. It is supported natively in PostgreSQL (<code className={code}>jsonb_path_query</code>), AWS CloudFormation, Kubernetes admission webhooks, and most API testing tools.
      </p>

      <h2 className={h2}>Root and current node</h2>
      <table className={table}>
        <thead><tr><th className={th}>Symbol</th><th className={th}>Meaning</th></tr></thead>
        <tbody>
          <tr><td className={td}><code className={code}>$</code></td><td className={td}>Root of the document</td></tr>
          <tr><td className={td}><code className={code}>@</code></td><td className={td}>Current node (used inside filter expressions)</td></tr>
        </tbody>
      </table>
      <p className={prose}>Every JSONPath expression starts with <code className={code}>$</code>.</p>

      <h2 className={h2}>Navigation operators</h2>
      <table className={table}>
        <thead><tr><th className={th}>Operator</th><th className={th}>Meaning</th><th className={th}>Example</th></tr></thead>
        <tbody>
          <tr><td className={td}><code className={code}>.key</code></td><td className={td}>Child key (dot notation)</td><td className={td}><code className={code}>$.user.name</code></td></tr>
          <tr><td className={td}><code className={code}>["key"]</code></td><td className={td}>Child key (bracket notation — use for keys with spaces or special chars)</td><td className={td}><code className={code}>{`$["first name"]`}</code></td></tr>
          <tr><td className={td}><code className={code}>[n]</code></td><td className={td}>Array element at index <em>n</em> (0-based)</td><td className={td}><code className={code}>$.items[0]</code></td></tr>
          <tr><td className={td}><code className={code}>[*]</code></td><td className={td}>All array elements (wildcard)</td><td className={td}><code className={code}>$.items[*].id</code></td></tr>
          <tr><td className={td}><code className={code}>.*</code></td><td className={td}>All children of current node</td><td className={td}><code className={code}>$.user.*</code></td></tr>
          <tr><td className={td}><code className={code}>..</code></td><td className={td}>Recursive descent — searches all depths</td><td className={td}><code className={code}>$..name</code></td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Array slicing</h2>
      <p className={prose}>JSONPath supports Python-style slice notation <code className={code}>[start:end:step]</code>:</p>
      <table className={table}>
        <thead><tr><th className={th}>Expression</th><th className={th}>Result</th></tr></thead>
        <tbody>
          <tr><td className={td}><code className={code}>$.a[0:3]</code></td><td className={td}>Elements at index 0, 1, 2</td></tr>
          <tr><td className={td}><code className={code}>$.a[-1]</code></td><td className={td}>Last element</td></tr>
          <tr><td className={td}><code className={code}>$.a[::2]</code></td><td className={td}>Every second element (0, 2, 4 …)</td></tr>
          <tr><td className={td}><code className={code}>$.a[1,3]</code></td><td className={td}>Elements at index 1 and 3 (union)</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Filter expressions</h2>
      <p className={prose}>Filter expressions use <code className={code}>?(…)</code> syntax to select elements that satisfy a condition. Inside the filter, <code className={code}>@</code> refers to the current array element:</p>
      <table className={table}>
        <thead><tr><th className={th}>Expression</th><th className={th}>Selects</th></tr></thead>
        <tbody>
          <tr><td className={td}><code className={code}>{`$.items[?(@.price < 10)]`}</code></td><td className={td}>Items where price is less than 10</td></tr>
          <tr><td className={td}><code className={code}>{`$.users[?(@.active == true)]`}</code></td><td className={td}>Active users</td></tr>
          <tr><td className={td}><code className={code}>{`$..book[?(@.isbn)]`}</code></td><td className={td}>Any book with an isbn field</td></tr>
          <tr><td className={td}><code className={code}>{`$.orders[?(@.total >= 100 && @.status == "shipped")]`}</code></td><td className={td}>Shipped orders over $100</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Practical examples</h2>
      <p className={prose}>Given this document:</p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`{
  "store": {
    "books": [
      { "title": "Clean Code",    "price": 29.99, "inStock": true  },
      { "title": "Refactoring",   "price": 34.99, "inStock": false },
      { "title": "The Pragmatic Programmer", "price": 39.99, "inStock": true }
    ]
  }
}`}</code></pre>
      <table className={table}>
        <thead><tr><th className={th}>Expression</th><th className={th}>Result</th></tr></thead>
        <tbody>
          <tr><td className={td}><code className={code}>$.store.books[*].title</code></td><td className={td}>All three titles</td></tr>
          <tr><td className={td}><code className={code}>$.store.books[-1].title</code></td><td className={td}><code className={code}>"The Pragmatic Programmer"</code></td></tr>
          <tr><td className={td}><code className={code}>{`$.store.books[?(@.inStock)].title`}</code></td><td className={td}><code className={code}>"Clean Code"</code>, <code className={code}>"The Pragmatic Programmer"</code></td></tr>
          <tr><td className={td}><code className={code}>{`$.store.books[?(@.price < 35)].title`}</code></td><td className={td}><code className={code}>"Clean Code"</code>, <code className={code}>"Refactoring"</code></td></tr>
          <tr><td className={td}><code className={code}>$..price</code></td><td className={td}>All three prices (recursive)</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>JSONPath in JavaScript</h2>
      <p className={prose}>No native browser or Node.js API supports JSONPath — you need a library. The most widely used is <code className={code}>jsonpath-plus</code>:</p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`import { JSONPath } from "jsonpath-plus";

const result = JSONPath({
  path: "$.store.books[?(@.price < 35)].title",
  json: document,
});
// ["Clean Code", "Refactoring"]`}</code></pre>

      <h2 className={h2}>JSONPath in PostgreSQL</h2>
      <p className={prose}>PostgreSQL 12+ supports the SQL/JSON standard path language (similar to JSONPath) via <code className={code}>jsonb_path_query</code>:</p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`SELECT jsonb_path_query(data, '$.store.books[*] ? (@.price < 35).title')
FROM products;`}</code></pre>

      <h2 className={h2}>Gotchas</h2>
      <ul className={ul}>
        <li><strong>No universal standard</strong> — RFC 9535 (2024) finally standardised JSONPath, but many tools pre-date it and differ in filter syntax and recursion behaviour. Test your expressions against your specific library.</li>
        <li><strong>Recursive descent is slow on large documents</strong> — <code className={code}>$..key</code> traverses the entire tree. Use specific paths in performance-sensitive code.</li>
        <li><strong>Missing nodes return an empty array</strong>, not null — account for this in your error handling.</li>
      </ul>
    </div>
  );
}

function UrlEncodingExplained() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Open your browser's network panel and look at a real URL. You will see strings like <code className={code}>Hello%20World</code>, <code className={code}>price%3D99</code>, or <code className={code}>tag=c%2B%2B</code>. These are percent-encoded characters — a transformation applied because URLs can only safely contain a limited set of ASCII characters.
      </p>

      <h2 className={h2}>Why URL encoding exists</h2>
      <p className={prose}>
        The URI specification (RFC 3986) defines a small set of <strong>unreserved characters</strong> that are always safe in a URL: <code className={code}>A–Z a–z 0–9 - _ . ~</code>. Everything else — spaces, slashes, equals signs, question marks, Unicode characters — must be percent-encoded before being placed in a URL component.
      </p>
      <p className={prose}>
        Percent-encoding works by replacing the character with <code className={code}>%</code> followed by its two-digit hexadecimal UTF-8 byte value. A space (byte 0x20) becomes <code className={code}>%20</code>. The <code className={code}>/</code> character (byte 0x2F) becomes <code className={code}>%2F</code>.
      </p>

      <h2 className={h2}>Reserved vs unreserved characters</h2>
      <table className={table}>
        <thead><tr><th className={th}>Category</th><th className={th}>Characters</th><th className={th}>Rule</th></tr></thead>
        <tbody>
          <tr><td className={td}>Unreserved</td><td className={td}><code className={code}>A-Z a-z 0-9 - _ . ~</code></td><td className={td}>Never encoded — always safe</td></tr>
          <tr><td className={td}>Reserved (general delimiters)</td><td className={td}><code className={code}>: / ? # [ ] @</code></td><td className={td}>Have structural meaning — encode when used as data</td></tr>
          <tr><td className={td}>Reserved (sub-delimiters)</td><td className={td}><code className={code}>! $ & {"'"} ( ) * + , ; =</code></td><td className={td}>Have component-specific meaning — encode when used as data</td></tr>
          <tr><td className={td}>Everything else</td><td className={td}>Spaces, Unicode, <code className={code}>{`<>`}</code>, <code className={code}>%</code> itself</td><td className={td}>Must always be encoded</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>%20 vs + for spaces</h2>
      <p className={prose}>
        You will see both <code className={code}>%20</code> and <code className={code}>+</code> used for spaces, and they are <em>not</em> interchangeable:
      </p>
      <ul className={ul}>
        <li><code className={code}>%20</code> is the correct percent-encoding of a space in any URL component (path, query, fragment)</li>
        <li><code className={code}>+</code> means a space <strong>only</strong> in <code className={code}>application/x-www-form-urlencoded</code> bodies — the format used by HTML forms. It does NOT mean a space in a path segment.</li>
      </ul>
      <p className={prose}>
        If you are building a URL by hand, always use <code className={code}>%20</code> for spaces. Use <code className={code}>+</code> only when serialising HTML form data.
      </p>

      <h2 className={h2}>Common percent-encoded characters</h2>
      <table className={table}>
        <thead><tr><th className={th}>Character</th><th className={th}>Encoded</th><th className={th}>Where it appears</th></tr></thead>
        <tbody>
          <tr><td className={td}>Space</td><td className={td}><code className={code}>%20</code></td><td className={td}>Search queries, file names with spaces</td></tr>
          <tr><td className={td}><code className={code}>/</code></td><td className={td}><code className={code}>%2F</code></td><td className={td}>Slash inside a path segment (not as path separator)</td></tr>
          <tr><td className={td}><code className={code}>?</code></td><td className={td}><code className={code}>%3F</code></td><td className={td}>Literal question mark in query value</td></tr>
          <tr><td className={td}><code className={code}>=</code></td><td className={td}><code className={code}>%3D</code></td><td className={td}>Equals sign in a query value</td></tr>
          <tr><td className={td}><code className={code}>&</code></td><td className={td}><code className={code}>%26</code></td><td className={td}>Ampersand in a query value</td></tr>
          <tr><td className={td}><code className={code}>+</code></td><td className={td}><code className={code}>%2B</code></td><td className={td}>Literal plus in query value (to avoid space confusion)</td></tr>
          <tr><td className={td}><code className={code}>#</code></td><td className={td}><code className={code}>%23</code></td><td className={td}>Hash in a query value (prevents fragment confusion)</td></tr>
          <tr><td className={td}>€ (U+20AC)</td><td className={td}><code className={code}>%E2%82%AC</code></td><td className={td}>Non-ASCII — UTF-8 bytes, each percent-encoded</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>encodeURIComponent vs encodeURI</h2>
      <p className={prose}>
        JavaScript has two built-in encoding functions. The key difference is what they leave alone:
      </p>
      <ul className={ul}>
        <li><code className={code}>encodeURIComponent(str)</code> — encodes everything except <code className={code}>A-Z a-z 0-9 - _ . ! ~ * {"'"} ( )</code>. Use this for <strong>individual query parameter values</strong> — it encodes <code className={code}>/</code>, <code className={code}>?</code>, <code className={code}>&</code>, <code className={code}>=</code>, and <code className={code}>#</code>.</li>
        <li><code className={code}>encodeURI(str)</code> — leaves reserved characters alone (assumes the input is already a complete URL). Use this only if you have a full URL and want to encode stray non-ASCII characters in it without breaking the URL structure.</li>
      </ul>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`// Building a URL with query params — use encodeURIComponent
const q = encodeURIComponent("C++ programming & design");
const url = \`https://example.com/search?q=\${q}\`;
// https://example.com/search?q=C%2B%2B%20programming%20%26%20design

// Using encodeURI on an existing URL — leaves / ? & = intact
encodeURI("https://example.com/path with spaces?q=hello");
// https://example.com/path%20with%20spaces?q=hello`}</code></pre>

      <h2 className={h2}>Decoding</h2>
      <p className={prose}>
        The reverse functions are <code className={code}>decodeURIComponent()</code> and <code className={code}>decodeURI()</code>. Use <code className={code}>decodeURIComponent()</code> for individual query values. Calling <code className={code}>decodeURIComponent()</code> on a full URL will decode structural characters like <code className={code}>%2F</code> back to <code className={code}>/</code>, which may break path parsing.
      </p>
      <p className={prose}>
        Always decode query values on the server side — never in a browser URL bar. Most server frameworks (Express, FastAPI, Laravel) decode query parameters automatically.
      </p>
    </div>
  );
}

function AesVsRsaEncryption() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        AES and RSA are both encryption algorithms, but they solve different problems. You need to understand both — not to choose one over the other, but because real-world systems use them together: RSA to exchange a key, AES to encrypt the actual data. TLS, PGP, and SSH all work this way.
      </p>

      <h2 className={h2}>AES — symmetric encryption</h2>
      <p className={prose}>
        AES (Advanced Encryption Standard) is a <strong>symmetric</strong> cipher: the same key is used to encrypt and decrypt. It operates on fixed-size 128-bit blocks using key sizes of 128, 192, or 256 bits. AES-256 is the current gold standard for data-at-rest encryption.
      </p>
      <ul className={ul}>
        <li><strong>Speed</strong> — extremely fast, hardware-accelerated on modern CPUs (AES-NI instructions). Can encrypt gigabytes per second.</li>
        <li><strong>Key size</strong> — 128, 192, or 256 bits. AES-256 provides 2²⁵⁶ possible keys — computationally unbreakable.</li>
        <li><strong>Modes of operation</strong> — the mode determines how blocks are chained. Use GCM (Galois/Counter Mode) for authenticated encryption. Avoid ECB (Electronic Codebook) — it leaks patterns.</li>
        <li><strong>The problem</strong> — both parties must share the same secret key. How do you securely exchange it with someone you have never met before?</li>
      </ul>

      <h2 className={h2}>RSA — asymmetric encryption</h2>
      <p className={prose}>
        RSA is an <strong>asymmetric</strong> cipher: it uses a key pair — a <strong>public key</strong> that anyone can have, and a <strong>private key</strong> that only you hold. Data encrypted with the public key can only be decrypted with the private key.
      </p>
      <ul className={ul}>
        <li><strong>Speed</strong> — slow. RSA-2048 encryption is roughly 1000× slower than AES-256. Never use RSA to encrypt large payloads directly.</li>
        <li><strong>Key size</strong> — 2048-bit minimum (4096-bit for long-lived keys). The security comes from the difficulty of factoring large integers.</li>
        <li><strong>What it solves</strong> — the key distribution problem. You can publish your RSA public key anywhere. Anyone can encrypt a message that only your private key can read.</li>
        <li><strong>Signatures</strong> — RSA works in reverse for signing: you sign with the private key, anyone with the public key can verify. This is how code signing, SSL certificates, and JWT RS256 work.</li>
      </ul>

      <h2 className={h2}>Side-by-side comparison</h2>
      <table className={table}>
        <thead><tr><th className={th}>Property</th><th className={th}>AES</th><th className={th}>RSA</th></tr></thead>
        <tbody>
          <tr><td className={td}>Key type</td><td className={td}>Symmetric (one shared key)</td><td className={td}>Asymmetric (public + private pair)</td></tr>
          <tr><td className={td}>Speed</td><td className={td}>Very fast (GB/s with AES-NI)</td><td className={td}>Slow (~1 ms per operation)</td></tr>
          <tr><td className={td}>Max plaintext</td><td className={td}>Unlimited</td><td className={td}>Key size minus padding (~245 bytes for RSA-2048)</td></tr>
          <tr><td className={td}>Key exchange</td><td className={td}>Requires a secure channel</td><td className={td}>Public key can be distributed openly</td></tr>
          <tr><td className={td}>Use for</td><td className={td}>Bulk data encryption, file encryption, disk encryption</td><td className={td}>Key exchange, digital signatures, certificates</td></tr>
          <tr><td className={td}>Common key sizes</td><td className={td}>128, 256 bits</td><td className={td}>2048, 4096 bits</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>How TLS combines both</h2>
      <p className={prose}>
        TLS (the protocol behind HTTPS) uses RSA (or Elliptic Curve Diffie-Hellman) to establish a shared secret, then switches to AES for the actual data transfer. This is called a <strong>hybrid encryption scheme</strong>:
      </p>
      <ol className={ol}>
        <li>The server sends its RSA public key (in its SSL certificate)</li>
        <li>The client generates a random AES session key</li>
        <li>The client encrypts the session key with the server's RSA public key and sends it</li>
        <li>The server decrypts the session key with its RSA private key</li>
        <li>Both parties now share a secret AES key — all further communication is AES-encrypted</li>
      </ol>
      <p className={prose}>RSA secures the key exchange; AES handles the fast bulk encryption. Neither could replace the other in this flow.</p>

      <h2 className={h2}>Modern alternatives to RSA</h2>
      <p className={prose}>
        RSA is being phased out in favour of <strong>Elliptic Curve Cryptography (ECC)</strong>. A 256-bit ECC key provides equivalent security to a 3072-bit RSA key, with much smaller key sizes and faster operations. Specifically:
      </p>
      <ul className={ul}>
        <li><strong>ECDH</strong> (Elliptic Curve Diffie-Hellman) — replaces RSA for key exchange in TLS 1.3</li>
        <li><strong>Ed25519</strong> — replaces RSA for signatures (SSH keys, JWT EdDSA)</li>
        <li><strong>X25519</strong> — replaces RSA for key encapsulation in modern protocols</li>
      </ul>
      <p className={prose}>AES-256-GCM remains the standard for symmetric encryption regardless of which asymmetric algorithm you choose.</p>

      <h2 className={h2}>When to use each</h2>
      <ul className={ul}>
        <li><strong>Use AES-256-GCM</strong> when encrypting files, database fields, or any data where both sides already share a key (e.g. a password-derived key)</li>
        <li><strong>Use RSA or ECDH</strong> when you need to establish a shared secret with a party you have no pre-shared key with</li>
        <li><strong>Use RSA or Ed25519 signatures</strong> when you need to prove authenticity without sharing a secret (code signing, JWTs, API request signing)</li>
        <li><strong>Never use RSA directly for bulk data</strong> — it will fail or produce insecure output for payloads over ~245 bytes</li>
      </ul>
    </div>
  );
}

function ChmodPermissionsExplained() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Every file and directory on a Unix system has a permission set that controls who can read it, write to it, or execute it. When a deployment fails because your web server cannot read a config file, or your CI script is not executable, the fix is usually one <code className={code}>chmod</code> command — once you understand what the numbers mean.
      </p>

      <h2 className={h2}>The three permission classes</h2>
      <p className={prose}>Unix permissions apply to three categories of user:</p>
      <table className={table}>
        <thead><tr><th className={th}>Class</th><th className={th}>Symbol</th><th className={th}>Who it applies to</th></tr></thead>
        <tbody>
          <tr><td className={td}>Owner</td><td className={td}><code className={code}>u</code></td><td className={td}>The user who owns the file</td></tr>
          <tr><td className={td}>Group</td><td className={td}><code className={code}>g</code></td><td className={td}>Members of the file's group</td></tr>
          <tr><td className={td}>Others</td><td className={td}><code className={code}>o</code></td><td className={td}>Everyone else</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>The three permission bits</h2>
      <table className={table}>
        <thead><tr><th className={th}>Permission</th><th className={th}>Symbol</th><th className={th}>On a file</th><th className={th}>On a directory</th></tr></thead>
        <tbody>
          <tr><td className={td}>Read</td><td className={td}><code className={code}>r</code></td><td className={td}>View file contents</td><td className={td}>List directory contents (<code className={code}>ls</code>)</td></tr>
          <tr><td className={td}>Write</td><td className={td}><code className={code}>w</code></td><td className={td}>Modify or delete the file</td><td className={td}>Create, rename, delete files inside</td></tr>
          <tr><td className={td}>Execute</td><td className={td}><code className={code}>x</code></td><td className={td}>Run as a program</td><td className={td}>Enter the directory (<code className={code}>cd</code>)</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Symbolic notation: rwxr-xr--</h2>
      <p className={prose}>Run <code className={code}>ls -l</code> and you will see something like <code className={code}>-rwxr-xr--</code>. Reading left to right:</p>
      <ul className={ul}>
        <li>Position 1: file type (<code className={code}>-</code> regular file, <code className={code}>d</code> directory, <code className={code}>l</code> symlink)</li>
        <li>Positions 2–4: <strong>owner</strong> permissions (<code className={code}>rwx</code> = read, write, execute)</li>
        <li>Positions 5–7: <strong>group</strong> permissions (<code className={code}>r-x</code> = read, no write, execute)</li>
        <li>Positions 8–10: <strong>others</strong> permissions (<code className={code}>r--</code> = read only)</li>
      </ul>
      <p className={prose}>A dash <code className={code}>-</code> in any position means that permission is not granted.</p>

      <h2 className={h2}>Octal notation</h2>
      <p className={prose}>Each permission triplet maps to a single octal digit (0–7) because there are exactly three bits:</p>
      <table className={table}>
        <thead><tr><th className={th}>Binary</th><th className={th}>Octal</th><th className={th}>Symbolic</th><th className={th}>Meaning</th></tr></thead>
        <tbody>
          <tr><td className={td}>111</td><td className={td}><code className={code}>7</code></td><td className={td}>rwx</td><td className={td}>Read + write + execute</td></tr>
          <tr><td className={td}>110</td><td className={td}><code className={code}>6</code></td><td className={td}>rw-</td><td className={td}>Read + write</td></tr>
          <tr><td className={td}>101</td><td className={td}><code className={code}>5</code></td><td className={td}>r-x</td><td className={td}>Read + execute</td></tr>
          <tr><td className={td}>100</td><td className={td}><code className={code}>4</code></td><td className={td}>r--</td><td className={td}>Read only</td></tr>
          <tr><td className={td}>000</td><td className={td}><code className={code}>0</code></td><td className={td}>---</td><td className={td}>No permissions</td></tr>
        </tbody>
      </table>
      <p className={prose}>So <code className={code}>chmod 755</code> means: owner=7(rwx), group=5(r-x), others=5(r-x).</p>

      <h2 className={h2}>Common permission patterns</h2>
      <table className={table}>
        <thead><tr><th className={th}>Octal</th><th className={th}>Symbolic</th><th className={th}>Typical use</th></tr></thead>
        <tbody>
          <tr><td className={td}><code className={code}>755</code></td><td className={td}><code className={code}>rwxr-xr-x</code></td><td className={td}>Directories, public executables (web server binaries, scripts)</td></tr>
          <tr><td className={td}><code className={code}>644</code></td><td className={td}><code className={code}>rw-r--r--</code></td><td className={td}>Regular files, HTML, config files (not secret)</td></tr>
          <tr><td className={td}><code className={code}>600</code></td><td className={td}><code className={code}>rw-------</code></td><td className={td}>Private keys, SSH <code className={code}>id_rsa</code>, secrets (owner read/write only)</td></tr>
          <tr><td className={td}><code className={code}>700</code></td><td className={td}><code className={code}>rwx------</code></td><td className={td}>Private directories (e.g. <code className={code}>~/.ssh</code>)</td></tr>
          <tr><td className={td}><code className={code}>777</code></td><td className={td}><code className={code}>rwxrwxrwx</code></td><td className={td}>Avoid — everyone can write. Temporary workaround only.</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Using chmod</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`# Set permissions using octal
chmod 755 deploy.sh
chmod 644 config.yaml
chmod 600 ~/.ssh/id_rsa

# Set permissions using symbolic mode
chmod u+x deploy.sh        # add execute for owner
chmod go-w sensitive.txt   # remove write from group and others
chmod a+r public.html      # add read for all (a = all)

# Recursive — apply to directory and all contents
chmod -R 755 /var/www/html`}</code></pre>

      <h2 className={h2}>Setuid, setgid, and sticky bit</h2>
      <p className={prose}>A fourth octal digit controls three special bits:</p>
      <ul className={ul}>
        <li><strong>Setuid (4xxx)</strong> — executable runs as the file's owner, not the caller. Used by <code className={code}>sudo</code> and <code className={code}>passwd</code>. Example: <code className={code}>chmod 4755 binary</code></li>
        <li><strong>Setgid (2xxx)</strong> — on files: runs as the file's group. On directories: new files inherit the directory's group, not the creator's. Example: <code className={code}>chmod 2755 shared-dir/</code></li>
        <li><strong>Sticky bit (1xxx)</strong> — on directories: only the owner can delete their own files, even if others have write permission. Used on <code className={code}>/tmp</code>. Example: <code className={code}>chmod 1777 /tmp</code></li>
      </ul>

      <h2 className={h2}>Checking current permissions</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`ls -la            # show permissions for all files in directory
stat file.txt     # detailed permissions, owner, size, timestamps
find . -perm 777  # find world-writable files (security audit)`}</code></pre>
    </div>
  );
}

function DotenvBestPractices() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        The <code className={code}>.env</code> file pattern is ubiquitous in modern development — it is how applications separate configuration from code. It is also one of the most common ways secrets get accidentally leaked. The rules are simple but they are violated constantly.
      </p>

      <h2 className={h2}>.env file syntax</h2>
      <p className={prose}>Each line is a key-value pair in <code className={code}>KEY=value</code> format:</p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# API keys
STRIPE_SECRET_KEY=sk_live_...
OPENAI_API_KEY=sk-...

# App config
PORT=3000
NODE_ENV=production

# Multiline value (most parsers support quoted newlines)
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEow...
-----END RSA PRIVATE KEY-----"`}</code></pre>
      <p className={prose}>Lines starting with <code className={code}>#</code> are comments. Values do not need quotes unless they contain spaces or special characters. Most parsers (<code className={code}>dotenv</code>, <code className={code}>python-dotenv</code>) strip surrounding whitespace from values.</p>

      <h2 className={h2}>Rule 1 — never commit .env to Git</h2>
      <p className={prose}>
        Add <code className={code}>.env</code> to your <code className={code}>.gitignore</code> immediately. One committed <code className={code}>.env</code> file containing production secrets can expose your entire infrastructure — even after you delete it, because secrets remain in git history.
      </p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`# .gitignore
.env
.env.local
.env.production
.env*.local`}</code></pre>
      <p className={prose}>If you have already committed a secret, rotating the credential is not enough — rewrite git history with <code className={code}>git filter-repo</code> or BFG Repo Cleaner, and assume the secret is compromised.</p>

      <h2 className={h2}>Rule 2 — commit .env.example</h2>
      <p className={prose}>
        Every project should have a <code className={code}>.env.example</code> (or <code className={code}>.env.template</code>) file committed to the repo. It lists all the required environment variables with placeholder values or descriptions — no real secrets:
      </p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`# .env.example — commit this, not .env
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
STRIPE_SECRET_KEY=sk_live_<your_stripe_key>
OPENAI_API_KEY=sk-<your_openai_key>
PORT=3000
NODE_ENV=development`}</code></pre>
      <p className={prose}>New team members copy this file, fill in their own values, and are immediately productive. They also know exactly which secrets to obtain, without having to reverse-engineer the codebase.</p>

      <h2 className={h2}>Rule 3 — use different files per environment</h2>
      <ul className={ul}>
        <li><code className={code}>.env</code> — local development defaults (never secrets you cannot afford to lose)</li>
        <li><code className={code}>.env.local</code> — local overrides, not committed (per-developer values)</li>
        <li><code className={code}>.env.test</code> — test environment settings</li>
        <li><code className={code}>.env.production</code> — production values, never stored in the repo; injected by CI/CD</li>
      </ul>
      <p className={prose}>Next.js, Create React App, and Vite all follow this convention, loading files in a defined precedence order.</p>

      <h2 className={h2}>CI/CD: injecting secrets without .env files</h2>
      <p className={prose}>
        In production and CI environments, use the platform's native secret management instead of .env files:
      </p>
      <table className={table}>
        <thead><tr><th className={th}>Platform</th><th className={th}>Mechanism</th></tr></thead>
        <tbody>
          <tr><td className={td}>GitHub Actions</td><td className={td}>Repository Secrets → accessed as <code className={code}>{"${{ secrets.MY_KEY }}"}</code></td></tr>
          <tr><td className={td}>Vercel / Netlify</td><td className={td}>Environment variables dashboard → injected at build time</td></tr>
          <tr><td className={td}>AWS</td><td className={td}>Secrets Manager or Parameter Store → fetched at runtime</td></tr>
          <tr><td className={td}>Docker</td><td className={td}><code className={code}>--env-file</code> flag or Docker Secrets (Swarm/Kubernetes)</td></tr>
          <tr><td className={td}>Kubernetes</td><td className={td}>Secrets objects → mounted as env vars or volume files</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Rule 4 — validate required variables at startup</h2>
      <p className={prose}>
        Your application should fail fast with a clear error if a required environment variable is missing, rather than crashing later with a cryptic error:
      </p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`// Node.js — validate at startup
const required = ["DATABASE_URL", "STRIPE_SECRET_KEY", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(\`Missing required environment variable: \${key}\`);
  }
}

// Or use a validation library like zod
import { z } from "zod";

const env = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  PORT: z.coerce.number().default(3000),
}).parse(process.env);`}</code></pre>

      <h2 className={h2}>Common mistakes</h2>
      <ul className={ul}>
        <li><strong>Committing .env to a public repo</strong> — automated scanners (like GitHub's secret scanning) will find it immediately, but so will attackers</li>
        <li><strong>Logging environment variables</strong> — never <code className={code}>console.log(process.env)</code> in production; this prints all secrets to stdout/logs</li>
        <li><strong>Sharing .env files over Slack or email</strong> — use a password manager or a tool like 1Password Secrets Automation</li>
        <li><strong>Using the same secrets across environments</strong> — production and staging should have different credentials so a staging breach does not affect production</li>
        <li><strong>Storing secrets in .env and also in code</strong> — the .env pattern only works if the code truly has no hardcoded fallbacks</li>
      </ul>
    </div>
  );
}

function SemanticVersioningExplained() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        If you have ever run <code className={code}>npm install</code> and seen a dependency jump from <code className={code}>2.3.1</code> to <code className={code}>3.0.0</code> and break everything, you have experienced a SemVer violation. Semantic versioning is a contract between package maintainers and their users — when followed correctly, version numbers communicate intent, not just change.
      </p>

      <h2 className={h2}>The format: MAJOR.MINOR.PATCH</h2>
      <p className={prose}>A SemVer version has exactly three dot-separated numeric components:</p>
      <table className={table}>
        <thead><tr><th className={th}>Component</th><th className={th}>When to increment</th><th className={th}>Example bump</th></tr></thead>
        <tbody>
          <tr><td className={td}><strong>MAJOR</strong></td><td className={td}>Breaking changes — existing code will need updating</td><td className={td}><code className={code}>2.4.1 → 3.0.0</code></td></tr>
          <tr><td className={td}><strong>MINOR</strong></td><td className={td}>New backward-compatible features</td><td className={td}><code className={code}>2.3.1 → 2.4.0</code></td></tr>
          <tr><td className={td}><strong>PATCH</strong></td><td className={td}>Backward-compatible bug fixes</td><td className={td}><code className={code}>2.3.1 → 2.3.2</code></td></tr>
        </tbody>
      </table>
      <p className={prose}>When you increment MAJOR, reset MINOR and PATCH to 0. When you increment MINOR, reset PATCH to 0.</p>

      <h2 className={h2}>What counts as a breaking change?</h2>
      <p className={prose}>A change is breaking if existing consumers of the public API need to change their code to keep working:</p>
      <ul className={ul}>
        <li>Removing a function, method, class, or exported value</li>
        <li>Renaming a public API (even a typo fix)</li>
        <li>Changing a function's signature (parameter types, order, or return type)</li>
        <li>Changing default behaviour in a way that alters existing results</li>
        <li>Raising the minimum Node.js / runtime version requirement</li>
      </ul>
      <p className={prose}>Adding new optional parameters, adding new exports, or fixing a bug without changing the interface are <em>not</em> breaking changes.</p>

      <h2 className={h2}>Pre-release versions</h2>
      <p className={prose}>Pre-release identifiers follow the patch number with a hyphen:</p>
      <table className={table}>
        <thead><tr><th className={th}>Version</th><th className={th}>Meaning</th></tr></thead>
        <tbody>
          <tr><td className={td}><code className={code}>1.0.0-alpha.1</code></td><td className={td}>Early unstable release, no API guarantees</td></tr>
          <tr><td className={td}><code className={code}>1.0.0-beta.2</code></td><td className={td}>Feature-complete but potentially buggy</td></tr>
          <tr><td className={td}><code className={code}>1.0.0-rc.1</code></td><td className={td}>Release candidate — API locked, final testing</td></tr>
        </tbody>
      </table>
      <p className={prose}>Pre-release versions have lower precedence than the release: <code className={code}>1.0.0-rc.1 {"<"} 1.0.0</code>. They are not installed by npm unless you explicitly request them or use <code className={code}>@next</code> / <code className={code}>@beta</code> dist-tags.</p>

      <h2 className={h2}>npm version range operators</h2>
      <p className={prose}>npm's <code className={code}>package.json</code> uses a range syntax to specify which versions are acceptable:</p>
      <table className={table}>
        <thead><tr><th className={th}>Operator</th><th className={th}>Meaning</th><th className={th}>Example</th><th className={th}>Installs</th></tr></thead>
        <tbody>
          <tr><td className={td}><code className={code}>^</code></td><td className={td}>Compatible — same MAJOR, any higher MINOR/PATCH</td><td className={td}><code className={code}>^2.3.1</code></td><td className={td}><code className={code}>{">=2.3.1 <3.0.0"}</code></td></tr>
          <tr><td className={td}><code className={code}>~</code></td><td className={td}>Approximately — same MAJOR.MINOR, any higher PATCH</td><td className={td}><code className={code}>~2.3.1</code></td><td className={td}><code className={code}>{">=2.3.1 <2.4.0"}</code></td></tr>
          <tr><td className={td}><code className={code}>{">=2.0.0 <3.0.0"}</code></td><td className={td}>Explicit range</td><td className={td}><code className={code}>{">=2.0.0 <3.0.0"}</code></td><td className={td}>Any v2.x</td></tr>
          <tr><td className={td}><code className={code}>2.3.1</code></td><td className={td}>Exact version (pinned)</td><td className={td}><code className={code}>2.3.1</code></td><td className={td}>Exactly 2.3.1</td></tr>
          <tr><td className={td}><code className={code}>*</code></td><td className={td}>Any version</td><td className={td}><code className={code}>*</code></td><td className={td}>Latest</td></tr>
        </tbody>
      </table>
      <p className={prose}><code className={code}>^</code> is the npm default and usually the right choice for application dependencies. Use <code className={code}>~</code> (or exact pinning) for critical dependencies where unexpected MINOR changes could cause issues.</p>

      <h2 className={h2}>Version 0.x — special case</h2>
      <p className={prose}>
        When MAJOR is 0 (e.g. <code className={code}>0.4.2</code>), SemVer specifies that the API is not yet stable. Any version bump may be breaking. Treat each <code className={code}>0.x</code> release like a MAJOR bump. The <code className={code}>^</code> operator reflects this: <code className={code}>^0.4.2</code> only allows <code className={code}>{">=0.4.2 <0.5.0"}</code>, not <code className={code}>0.5.x</code>.
      </p>

      <h2 className={h2}>Checking compatibility</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`# See what version npm would install for a range
npm info react@"^18.0.0" version

# Check if two versions are compatible
npx semver -r "^2.3.1" 2.4.0    # exits 0 (match)
npx semver -r "^2.3.1" 3.0.0    # exits 1 (no match)`}</code></pre>
    </div>
  );
}

function SqlFormattingBestPractices() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        A well-formatted SQL query communicates intent as clearly as the data it retrieves. Poorly formatted SQL — with mixed casing, unpredictable line breaks, and unexplained aliases — is one of the most common sources of slow code reviews and subtle production bugs. These conventions make queries easier to read, diff, and maintain.
      </p>

      <h2 className={h2}>Keyword casing — UPPERCASE</h2>
      <p className={prose}>
        SQL keywords are case-insensitive, but uppercase keywords are the near-universal convention. They visually separate the structure of a query from its data:
      </p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`-- Bad
select id, name from users where active = true order by created_at desc;

-- Good
SELECT id, name
FROM users
WHERE active = true
ORDER BY created_at DESC;`}</code></pre>
      <p className={prose}>Identifiers (table names, column names) stay lowercase to match the database schema exactly and avoid quoting issues.</p>

      <h2 className={h2}>One clause per line</h2>
      <p className={prose}>Place each major clause (<code className={code}>SELECT</code>, <code className={code}>FROM</code>, <code className={code}>WHERE</code>, <code className={code}>GROUP BY</code>, <code className={code}>ORDER BY</code>, <code className={code}>LIMIT</code>) on its own line. This makes diffs readable — a diff that changes one WHERE condition should not touch the entire query.</p>

      <h2 className={h2}>Column lists</h2>
      <p className={prose}>For queries with multiple columns, put each column on its own line with a leading comma:</p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`SELECT
    u.id
  , u.name
  , u.email
  , o.total AS order_total
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.active = true;`}</code></pre>
      <p className={prose}>Leading commas (the <em>river</em> style) make it easy to spot a missing comma — it is always at the beginning of the line, never at the end where it hides. Some teams prefer trailing commas; consistency within a project matters more than which style you choose.</p>

      <h2 className={h2}>Aliases</h2>
      <ul className={ul}>
        <li>Always use the <code className={code}>AS</code> keyword for aliases — <code className={code}>u.name AS full_name</code> is clearer than <code className={code}>u.name full_name</code></li>
        <li>Table aliases should be short (1–3 characters) and predictable — <code className={code}>u</code> for <code className={code}>users</code>, <code className={code}>o</code> for <code className={code}>orders</code></li>
        <li>Avoid single-letter aliases for tables involved in self-joins — use <code className={code}>e</code> and <code className={code}>m</code> (employee and manager) instead of <code className={code}>a</code> and <code className={code}>b</code></li>
        <li>Column aliases should be snake_case and descriptive — <code className={code}>COUNT(*) AS order_count</code>, not <code className={code}>COUNT(*) AS c</code></li>
      </ul>

      <h2 className={h2}>JOIN formatting</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`SELECT
    u.name
  , p.title
  , c.name AS category_name
FROM users u
INNER JOIN posts p
    ON p.author_id = u.id
   AND p.published = true
LEFT JOIN categories c
    ON c.id = p.category_id
WHERE u.active = true;`}</code></pre>
      <p className={prose}>Indent the <code className={code}>ON</code> clause by two more levels than the <code className={code}>JOIN</code>. Put multi-condition joins on separate lines with <code className={code}>AND</code> aligned. This makes complex joins scannable at a glance.</p>

      <h2 className={h2}>CTEs (Common Table Expressions)</h2>
      <p className={prose}>For queries longer than ~30 lines, use CTEs to name intermediate result sets instead of nesting subqueries:</p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`-- Hard to read — nested subquery
SELECT u.name, order_counts.total
FROM users u
JOIN (
    SELECT user_id, COUNT(*) AS total
    FROM orders
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
) order_counts ON order_counts.user_id = u.id;

-- Easier to read — CTE
WITH recent_orders AS (
    SELECT
        user_id
      , COUNT(*) AS total
    FROM orders
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
)
SELECT
    u.name
  , ro.total AS orders_last_30_days
FROM users u
JOIN recent_orders ro ON ro.user_id = u.id;`}</code></pre>

      <h2 className={h2}>WHERE conditions</h2>
      <ul className={ul}>
        <li>Put each condition on its own line with <code className={code}>AND</code> / <code className={code}>OR</code> at the start</li>
        <li>Group <code className={code}>OR</code> conditions in parentheses to make precedence explicit: <code className={code}>WHERE (status = 'active' OR status = 'trial') AND plan = 'pro'</code></li>
        <li>Prefer <code className={code}>IN (…)</code> over long chains of <code className={code}>OR status = 'a' OR status = 'b'</code></li>
        <li>Avoid functions on indexed columns in WHERE: <code className={code}>WHERE DATE(created_at) = '2026-01-01'</code> prevents index usage; use range comparison instead: <code className={code}>WHERE created_at {">="}  '2026-01-01' AND created_at {"<"} '2026-01-02'</code></li>
      </ul>

      <h2 className={h2}>Avoid SELECT *</h2>
      <p className={prose}>
        <code className={code}>SELECT *</code> fetches every column, including ones your application does not use, breaking silently when the schema changes. Always list the specific columns you need. The one exception is exploratory queries in a database client — never in production application code.
      </p>

      <h2 className={h2}>Comments in SQL</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`-- Single-line comment — explain the WHY, not the WHAT

/*
  Multi-line comment for longer explanations.
  Use when documenting a non-obvious business rule
  or a known performance trade-off.
*/

SELECT
    user_id
  -- Exclude test accounts (emails ending in @example.com)
  , COUNT(*) AS real_user_events
FROM events
WHERE email NOT LIKE '%@example.com'
GROUP BY user_id;`}</code></pre>
    </div>
  );
}

function MarkdownCheatSheet() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Markdown is the universal writing format for developers — README files, documentation, GitHub issues, pull request descriptions, and technical blogs all use it. The syntax is minimal by design: a few punctuation conventions translate to clean HTML. This reference covers standard CommonMark syntax plus the GitHub Flavored Markdown (GFM) extensions that most platforms support.
      </p>

      <h2 className={h2}>Headings</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`# H1 — Page title (use once per document)
## H2 — Major section
### H3 — Subsection
#### H4 — Sub-subsection
##### H5
###### H6`}</code></pre>
      <p className={prose}>Always put a space between the <code className={code}>#</code> and the heading text. Leave a blank line before and after headings.</p>

      <h2 className={h2}>Emphasis</h2>
      <table className={table}>
        <thead><tr><th className={th}>Markdown</th><th className={th}>Output</th></tr></thead>
        <tbody>
          <tr><td className={td}><code className={code}>**bold**</code></td><td className={td}><strong>bold</strong></td></tr>
          <tr><td className={td}><code className={code}>*italic*</code> or <code className={code}>_italic_</code></td><td className={td}><em>italic</em></td></tr>
          <tr><td className={td}><code className={code}>***bold italic***</code></td><td className={td}><strong><em>bold italic</em></strong></td></tr>
          <tr><td className={td}><code className={code}>~~strikethrough~~</code></td><td className={td}><s>strikethrough</s> (GFM)</td></tr>
          <tr><td className={td}><code className={code}>`inline code`</code></td><td className={td}><code className={code}>inline code</code></td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Lists</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`- Unordered item (use - or * or +)
- Second item
  - Nested item (indent 2 spaces)
    - Deeper nested

1. Ordered item
2. Second item
   1. Nested ordered
3. Third item`}</code></pre>
      <p className={prose}>For consistent rendering, use <code className={code}>-</code> for unordered lists. Do not mix marker characters in the same list. Indent nested items by 2 spaces (CommonMark) or 4 spaces (some older parsers).</p>

      <h2 className={h2}>Task lists (GFM)</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`- [x] Completed task
- [ ] Incomplete task
- [ ] Another task`}</code></pre>

      <h2 className={h2}>Links and images</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`[Link text](https://example.com)
[Link with title](https://example.com "Tooltip on hover")

![Alt text](image.png)
![Alt text](https://example.com/image.png "Optional title")

<!-- Reference-style links -->
[Link text][ref]
[ref]: https://example.com "Optional title"`}</code></pre>

      <h2 className={h2}>Blockquotes</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`> This is a blockquote.
> It can span multiple lines.
>
> Separate paragraphs with a blank quoted line.
>
> > Nested blockquote.`}</code></pre>

      <h2 className={h2}>Code blocks</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`\`\`\`javascript
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

\`\`\`python
def greet(name):
    return f"Hello, {name}!"
\`\`\`

\`\`\`sql
SELECT id, name FROM users WHERE active = true;
\`\`\``}</code></pre>
      <p className={prose}>Always specify the language identifier after the opening backticks — it enables syntax highlighting on GitHub, GitLab, and most documentation platforms.</p>

      <h2 className={h2}>Tables (GFM)</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`| Column 1 | Column 2 | Column 3 |
| -------- | :------: | -------: |
| Left     | Center   | Right    |
| aligned  | aligned  | aligned  |`}</code></pre>
      <p className={prose}>The colon in the separator row controls alignment: <code className={code}>:----</code> = left (default), <code className={code}>:----:</code> = center, <code className={code}>----:</code> = right. Pipes at the start and end are optional but recommended for readability.</p>

      <h2 className={h2}>Horizontal rules</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`---

***

___`}</code></pre>
      <p className={prose}>Three or more hyphens, asterisks, or underscores on their own line. Always surround with blank lines to avoid being parsed as an H2 underline.</p>

      <h2 className={h2}>Escaping</h2>
      <p className={prose}>Backslash-escape any Markdown character to output it literally:</p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`\*not italic\*
\[not a link\]
\# not a heading`}</code></pre>

      <h2 className={h2}>HTML in Markdown</h2>
      <p className={prose}>
        Most parsers allow raw HTML inline. Use it sparingly for things Markdown cannot express — centered content, custom attributes, or subscript/superscript:
      </p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`H<sub>2</sub>O and E = mc<sup>2</sup>

<details>
<summary>Click to expand</summary>

Collapsed content here.

</details>`}</code></pre>

      <h2 className={h2}>Quick reference</h2>
      <table className={table}>
        <thead><tr><th className={th}>Element</th><th className={th}>Syntax</th></tr></thead>
        <tbody>
          <tr><td className={td}>Heading</td><td className={td}><code className={code}># H1  ## H2  ### H3</code></td></tr>
          <tr><td className={td}>Bold</td><td className={td}><code className={code}>**text**</code></td></tr>
          <tr><td className={td}>Italic</td><td className={td}><code className={code}>*text*</code></td></tr>
          <tr><td className={td}>Inline code</td><td className={td}><code className={code}>`code`</code></td></tr>
          <tr><td className={td}>Code block</td><td className={td}><code className={code}>```lang … ```</code></td></tr>
          <tr><td className={td}>Link</td><td className={td}><code className={code}>[text](url)</code></td></tr>
          <tr><td className={td}>Image</td><td className={td}><code className={code}>![alt](url)</code></td></tr>
          <tr><td className={td}>Blockquote</td><td className={td}><code className={code}>{"> text"}</code></td></tr>
          <tr><td className={td}>Unordered list</td><td className={td}><code className={code}>- item</code></td></tr>
          <tr><td className={td}>Ordered list</td><td className={td}><code className={code}>1. item</code></td></tr>
          <tr><td className={td}>Horizontal rule</td><td className={td}><code className={code}>---</code></td></tr>
          <tr><td className={td}>Table (GFM)</td><td className={td}><code className={code}>| col | col |</code></td></tr>
          <tr><td className={td}>Task list (GFM)</td><td className={td}><code className={code}>- [x] done  - [ ] todo</code></td></tr>
          <tr><td className={td}>Strikethrough (GFM)</td><td className={td}><code className={code}>~~text~~</code></td></tr>
        </tbody>
      </table>
    </div>
  );
}

function SplitPdfOnline() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Splitting a PDF — extracting a chapter, isolating a single page, or separating a scanned invoice from a contract — is one of the most frequent document tasks. The good news: you can do it entirely in your browser without uploading to a third-party server, or from the command line in a single command.
      </p>

      <h2 className={h2}>Method 1 — Browser-based (no upload)</h2>
      <p className={prose}>
        DevBench's PDF Splitter runs entirely in your browser using PDF.js. Your file is never uploaded to any server:
      </p>
      <ol className={ol}>
        <li>Open the <Link href="/tools/split-pdf" className="text-accent hover:underline">DevBench PDF Splitter</Link></li>
        <li>Drop your PDF or click to browse</li>
        <li>Enter the page range — for example <code className={code}>1-3</code> to extract the first three pages, or <code className={code}>5,8,12</code> for individual pages</li>
        <li>Click Split — the resulting PDF downloads directly to your device</li>
      </ol>
      <p className={prose}>Because everything runs client-side, this is safe for confidential documents. There are no file size limits imposed by upload quotas (only browser memory).</p>

      <h2 className={h2}>Page range syntax</h2>
      <table className={table}>
        <thead><tr><th className={th}>Input</th><th className={th}>Result</th></tr></thead>
        <tbody>
          <tr><td className={td}><code className={code}>1-5</code></td><td className={td}>Pages 1 through 5 (inclusive)</td></tr>
          <tr><td className={td}><code className={code}>3</code></td><td className={td}>Page 3 only</td></tr>
          <tr><td className={td}><code className={code}>1,3,7</code></td><td className={td}>Pages 1, 3, and 7 (non-contiguous)</td></tr>
          <tr><td className={td}><code className={code}>2-4,9-12</code></td><td className={td}>Pages 2–4 and pages 9–12</td></tr>
          <tr><td className={td}><code className={code}>-3</code></td><td className={td}>Pages 1 through 3 (shorthand)</td></tr>
        </tbody>
      </table>

      <h2 className={h2}>Method 2 — macOS Preview (built-in)</h2>
      <ol className={ol}>
        <li>Open the PDF in Preview</li>
        <li>Open the Thumbnails sidebar (<strong>View → Thumbnails</strong>)</li>
        <li>Select the pages you want to extract (Cmd+click for non-contiguous pages)</li>
        <li>Drag the selected thumbnails out of the window to your Desktop — this creates a new PDF with just those pages</li>
      </ol>
      <p className={prose}>Alternatively, print to PDF: select the pages you want, choose <strong>File → Print</strong>, set the page range, then click <strong>PDF → Save as PDF</strong>.</p>

      <h2 className={h2}>Method 3 — Python (pypdf)</h2>
      <p className={prose}><code className={code}>pypdf</code> is the standard Python library for PDF manipulation. Install it with <code className={code}>pip install pypdf</code>:</p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()

# Extract pages 3–7 (0-indexed: 2–6)
for page_num in range(2, 7):
    writer.add_page(reader.pages[page_num])

with open("extracted.pdf", "wb") as f:
    writer.write(f)
print(f"Extracted {len(writer.pages)} pages")`}</code></pre>
      <p className={prose}>To split into individual single-page PDFs:</p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")

for i, page in enumerate(reader.pages):
    writer = PdfWriter()
    writer.add_page(page)
    with open(f"page_{i+1}.pdf", "wb") as f:
        writer.write(f)`}</code></pre>

      <h2 className={h2}>Method 4 — Ghostscript (command line)</h2>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`# Extract pages 3 to 7
gs -sDEVICE=pdfwrite -dNOPAUSE -dBATCH \
   -dFirstPage=3 -dLastPage=7 \
   -sOutputFile=extracted.pdf input.pdf

# macOS/Linux — single page (page 5)
gs -sDEVICE=pdfwrite -dNOPAUSE -dBATCH \
   -dFirstPage=5 -dLastPage=5 \
   -sOutputFile=page5.pdf input.pdf`}</code></pre>
      <p className={prose}>Ghostscript is pre-installed on many Linux distributions. On macOS, install with <code className={code}>brew install ghostscript</code>.</p>

      <h2 className={h2}>Handling password-protected PDFs</h2>
      <p className={prose}>
        If the PDF is password-protected, you need to supply the password before splitting:
      </p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`from pypdf import PdfReader, PdfWriter

reader = PdfReader("protected.pdf")
if reader.is_encrypted:
    reader.decrypt("your-password")

# Now proceed with splitting normally`}</code></pre>

      <h2 className={h2}>When the file size is unexpectedly large after splitting</h2>
      <p className={prose}>
        A PDF may embed fonts and images once for the whole document. When you extract a few pages, each output file may still include those full embedded resources. To optimise file size after splitting, run the output through a PDF compressor or use Ghostscript with the <code className={code}>-dPDFSETTINGS=/ebook</code> flag.
      </p>
    </div>
  );
}

function TimezonesDstForDevelopers() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Time zones cause more production bugs than almost any other single source of complexity. Not because they are mysterious, but because developers encounter three different things — Unix timestamps, UTC offsets, and named time zones — and treat them as interchangeable. They are not.
      </p>

      <h2 className={h2}>The three concepts</h2>
      <table className={table}>
        <thead><tr><th className={th}>Concept</th><th className={th}>Example</th><th className={th}>What it represents</th></tr></thead>
        <tbody>
          <tr><td className={td}><strong>Unix timestamp</strong></td><td className={td}><code className={code}>1719446400</code></td><td className={td}>Seconds since 1970-01-01 00:00:00 UTC. Absolute, unambiguous, time-zone-free.</td></tr>
          <tr><td className={td}><strong>UTC offset</strong></td><td className={td}><code className={code}>+05:30</code></td><td className={td}>A fixed offset from UTC. Does NOT account for DST — it is just a number.</td></tr>
          <tr><td className={td}><strong>Named time zone</strong></td><td className={td}><code className={code}>America/New_York</code></td><td className={td}>A political zone with a history of offsets and DST rules. The IANA database defines ~600 of them.</td></tr>
        </tbody>
      </table>
      <p className={prose}><strong>The critical mistake</strong>: storing <code className={code}>+05:30</code> when you mean <code className={code}>Asia/Kolkata</code>. An offset is a snapshot; a named zone is a policy that changes over time.</p>

      <h2 className={h2}>What DST actually does</h2>
      <p className={prose}>
        Daylight Saving Time (DST) shifts clocks forward by one hour in spring and back in autumn. The effect on a fixed UTC offset:
      </p>
      <ul className={ul}>
        <li><code className={code}>America/New_York</code> is UTC−5 in winter (EST) and UTC−4 in summer (EDT)</li>
        <li><code className={code}>Europe/London</code> is UTC+0 in winter (GMT) and UTC+1 in summer (BST)</li>
        <li>About 40% of the world does not observe DST — <code className={code}>Asia/Tokyo</code> and <code className={code}>Asia/Kolkata</code> are always UTC+9 and UTC+5:30 respectively</li>
      </ul>

      <h2 className={h2}>The two DST edge cases that break code</h2>
      <h3 className={h3}>Gap — spring forward (2:00 AM → 3:00 AM)</h3>
      <p className={prose}>When clocks spring forward, times between 2:00 and 3:00 AM do not exist. Code that constructs a <code className={code}>DateTime</code> at 2:30 AM on that day is creating an invalid time. Different libraries handle this differently — some throw, some silently shift forward, some shift backward. Know what yours does.</p>
      <h3 className={h3}>Fold — fall back (2:00 AM → 1:00 AM)</h3>
      <p className={prose}>When clocks fall back, times between 1:00 and 2:00 AM occur twice. <code className={code}>2026-11-01T01:30:00</code> in <code className={code}>America/New_York</code> is ambiguous — it could be EDT (UTC−4) or EST (UTC−5). A correct representation must specify which fold: <code className={code}>2026-11-01T01:30:00-04:00</code> (first occurrence) or <code className={code}>2026-11-01T01:30:00-05:00</code> (second).</p>

      <h2 className={h2}>Rule: store UTC, display local</h2>
      <p className={prose}>The universal rule for any application that stores timestamps:</p>
      <ol className={ol}>
        <li><strong>Store</strong> all timestamps as UTC (or Unix timestamp integers)</li>
        <li><strong>Convert to local</strong> only at display time, using the user's time zone</li>
        <li><strong>Never</strong> store a local time without its time zone information</li>
      </ol>
      <p className={prose}>A timestamp stored as <code className={code}>2026-06-15 14:00:00</code> with no time zone is a ticking bug. Is that UTC? The server's local time? The user's local time? Nobody knows.</p>

      <h2 className={h2}>JavaScript: Temporal API vs Date</h2>
      <p className={prose}>JavaScript's built-in <code className={code}>Date</code> object is notoriously bad at time zones — it only knows UTC and the local system time zone. For anything more complex, use a library or the new <strong>Temporal API</strong> (Stage 3, available in Node 22+ with the <code className={code}>--experimental-vm-modules</code> flag and via polyfill):</p>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`// Temporal API — the correct modern approach
import { Temporal } from "@js-temporal/polyfill";

const utcNow = Temporal.Now.instant();

// Convert to New York time
const nyTime = utcNow.toZonedDateTimeISO("America/New_York");
console.log(nyTime.toString());
// 2026-06-15T10:00:00-04:00[America/New_York]

// Convert to Kolkata time
const koTime = utcNow.toZonedDateTimeISO("Asia/Kolkata");
console.log(koTime.toString());
// 2026-06-15T19:30:00+05:30[Asia/Kolkata]

// Safe arithmetic — skips DST gaps automatically
const tomorrow = nyTime.add({ days: 1 });`}</code></pre>
      <p className={prose}>For production code today, use <code className={code}>date-fns-tz</code> or <code className={code}>Luxon</code> — both handle named time zones correctly using the IANA database.</p>

      <h2 className={h2}>PostgreSQL: timestamp vs timestamptz</h2>
      <p className={prose}>PostgreSQL has two timestamp types:</p>
      <ul className={ul}>
        <li><code className={code}>timestamp</code> (without time zone) — stores the value as-is with no zone awareness. Dangerous if your app and DB server are in different zones.</li>
        <li><code className={code}>timestamptz</code> (with time zone) — always stored as UTC internally, converted to the session time zone on display. <strong>Always use this.</strong></li>
      </ul>
      <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-auto my-3"><code>{`-- Set session time zone for queries
SET TIME ZONE 'America/New_York';

-- Always use timestamptz for application timestamps
CREATE TABLE events (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert for display
SELECT created_at AT TIME ZONE 'Asia/Kolkata' AS kolkata_time
FROM events;`}</code></pre>

      <h2 className={h2}>REST API: ISO 8601 with offset</h2>
      <p className={prose}>
        Always include a time zone offset in API timestamps. <code className={code}>2026-06-15T14:00:00Z</code> (the <code className={code}>Z</code> means UTC) is unambiguous. <code className={code}>2026-06-15T14:00:00</code> is not — clients may interpret it as local time, UTC, or refuse to parse it.
      </p>
      <ul className={ul}>
        <li>Use <code className={code}>Z</code> suffix for UTC: <code className={code}>2026-06-15T14:00:00Z</code></li>
        <li>Use explicit offsets when storing user-local context: <code className={code}>2026-06-15T10:00:00-04:00</code></li>
        <li>Never return bare local times from an API</li>
      </ul>

      <h2 className={h2}>Common bugs and fixes</h2>
      <table className={table}>
        <thead><tr><th className={th}>Bug</th><th className={th}>Fix</th></tr></thead>
        <tbody>
          <tr><td className={td}>Recurring event fires at wrong time after DST change</td><td className={td}>Schedule in named time zone, not UTC offset</td></tr>
          <tr><td className={td}>Age/duration calculation is off by 1 hour</td><td className={td}>Compute in UTC; convert only for display</td></tr>
          <tr><td className={td}>Dates jump when server time zone differs from user</td><td className={td}>Use <code className={code}>timestamptz</code> in Postgres; store UTC everywhere</td></tr>
          <tr><td className={td}><code className={code}>new Date("2026-06-15")</code> returns previous day in US</td><td className={td}>Date-only strings are parsed as UTC midnight; add time component or use a library</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function ChoosingPrivacyFirstOnlineDeveloperTools() {
  return (
    <div className="space-y-4">
      <p className={prose}>
        Online developer tools are convenient — and often the wrong place for production secrets.
        The problem is rarely the feature itself (decode a JWT, format JSON, merge a PDF). The
        problem is opacity: you cannot tell whether the site is running JavaScript in your tab
        or quietly posting your paste to a server for “processing.”
      </p>
      <p className={prose}>
        This checklist is what we use when evaluating tools for DevBench, and what we recommend
        before you trust any random converter with credentials, customer data, or unreleased
        documents.
      </p>

      <h2 className={h2}>1. Open the Network tab before you paste anything sensitive</h2>
      <p className={prose}>
        In Chrome or Firefox DevTools, open the Network panel, clear it, then perform the action
        (format, decode, hash, merge). For a true browser-only tool you should see{" "}
        <strong>no request that carries your payload</strong> — no{" "}
        <code className={code}>POST /api/…</code>, no WebSocket with the document body, no
        mysterious beacon with a Base64 blob.
      </p>
      <p className={prose}>
        Analytics and ad scripts may still fire on page load. That is different from uploading
        the text you typed into the tool. If you see your JWT or JSON leave the origin, treat
        the site as a third party with a copy of your data — regardless of what the marketing
        copy claims.
      </p>

      <h2 className={h2}>2. Demand an honest list of network exceptions</h2>
      <p className={prose}>
        “100% client-side” is only trustworthy when the product also lists the features that
        <em> do</em> leave the browser. Legitimate exceptions look like:
      </p>
      <ul className={ul}>
        <li>A CORS proxy that forwards an HTTP request you explicitly send (API tester)</li>
        <li>A webhook fire to a URL you typed</li>
        <li>A remote compiler (for example the public Go playground) for a language that cannot run in-browser yet</li>
        <li>An ephemeral convert endpoint that discards the upload after the response</li>
      </ul>
      <p className={prose}>
        Vague claims with zero exceptions are a red flag. So is a privacy policy that never
        mentions relays, proxies, or third-party compile APIs when the UI clearly needs them.
      </p>

      <h2 className={h2}>3. Prefer tools that teach, not only transform</h2>
      <p className={prose}>
        Thin pages that only offer an input box and a green “Success” badge are easy to clone
        and hard to audit. Higher-quality tools explain the format, show common mistakes, and
        link to deeper guides — for example when Base64 is not encryption, or when a decoded
        JWT payload is not proof of authenticity without signature verification.
      </p>
      <p className={prose}>
        If the page cannot explain <em>why</em> a result is correct, you should be sceptical of
        the implementation quality behind the button.
      </p>

      <h2 className={h2}>4. Separate ads from your paste buffer</h2>
      <p className={prose}>
        Many free sites fund hosting with advertising. That can be fine — if ad scripts are
        isolated from tool inputs. What you want to see in a privacy policy is an explicit
        statement that advertising partners do not receive the contents of the tool forms.
        Opt-out links (Google Ad Settings, YourAdChoices) are a good signal that the publisher
        is not pretending ads are invisible.
      </p>
      <p className={prose}>
        Affiliate bars that push unrelated products into every viewport are a different
        problem: they rarely steal your JWT, but they are a strong hint the product is
        optimised for clicks rather than craft.
      </p>

      <h2 className={h2}>5. A short workflow you can reuse</h2>
      <ol className={ol}>
        <li>Skim the privacy policy for “browser,” “client-side,” and any named exceptions.</li>
        <li>Open DevTools → Network; clear; run a harmless sample through the tool.</li>
        <li>If the sample leaves the tab unexpectedly, stop — do not paste real secrets.</li>
        <li>For credentials, prefer offline CLIs or self-hosted utilities when the risk is high.</li>
        <li>Close the tab when finished on a shared machine; clear downloads if you saved files.</li>
      </ol>

      <h2 className={h2}>How DevBench fits this checklist</h2>
      <p className={prose}>
        Most DevBench utilities (JWT debugger, JSON/YAML formatters, hash generators, most PDF
        and image edits) run in your browser with Web Crypto, File APIs, and Web Workers. A
        small set of features use short-lived relays by design — API Tester, Webhook Simulator,
        Notebook → PDF, and the Go playground path to go.dev — and those are called out in the{" "}
        <Link href="/privacy" className="text-accent hover:underline">
          privacy policy
        </Link>
        . Site analytics and AdSense fund hosting; they are not wired to receive tool payloads.
      </p>
      <p className={prose}>
        If you are evaluating us the same way you evaluate anyone else: open the Network tab on
        the{" "}
        <Link href="/jwt-debugger" className="text-accent hover:underline">
          JWT Debugger
        </Link>{" "}
        or{" "}
        <Link href="/json" className="text-accent hover:underline">
          JSON toolkit
        </Link>
        , paste a synthetic sample, and verify the behaviour matches the documentation.
      </p>
    </div>
  );
}

export const POST_CONTENT: Record<string, React.ReactNode> = {
  "choosing-privacy-first-online-developer-tools": <ChoosingPrivacyFirstOnlineDeveloperTools />,
  "browser-code-playground-privacy": <BrowserCodePlaygroundPrivacy />,
  "how-base64-encoding-works-and-when-not-to-use-it": <Base64EncodingExplained />,
  "jwt-security-best-practices-10-things-developers-get-wrong": <JwtSecurityBestPractices />,
  "yaml-vs-json-key-differences-with-real-examples": <YamlVsJsonExplained />,
  "how-to-validate-json-online": <HowToValidateJsonOnline />,
  "jwt-decoder-without-uploading-to-server": <JwtDecoderWithoutUploading />,
  "uuid-vs-ulid-vs-nanoid": <UuidVsUlidVsNanoid />,
  "jwt-explained": <JwtExplained />,
  "encodeuricomponent-vs-encodeuri": <EncodeUriComponentVsEncodeUri />,
  "common-json-errors": <CommonJsonErrors />,
  "regex-cheat-sheet-javascript": <RegexCheatSheet />,
  "how-to-generate-secure-passwords": <HowToGenerateSecurePasswords />,
  "sha256-vs-md5-hash-functions": <Sha256VsMd5 />,
  "cron-expression-syntax-guide": <CronExpressionSyntaxGuide />,
  "unix-timestamps-explained": <UnixTimestampsExplained />,
  "hex-rgb-hsl-css-colors-explained": <HexRgbHslCssColors />,
  "celsius-to-fahrenheit-converter": <CelsiusToFahrenheit />,
  "morse-code-alphabet-chart": <MorseCodeAlphabetChart />,
  "pythagorean-theorem-examples": <PythagoreanTheoremExamples />,
  "merge-pdf-online": <MergePdfOnline />,
  "image-to-pdf": <ImageToPdfPost />,
  "loan-emi-calculator": <LoanEmiCalculator />,
  "bmi-calculator": <BmiCalculatorPost />,
  "json-to-csv": <JsonToCsvPost />,
  "json-schema-validation": <JsonSchemaValidation />,
  "jsonpath-cheat-sheet": <JsonPathCheatSheet />,
  "url-encoding-explained": <UrlEncodingExplained />,
  "aes-vs-rsa-encryption": <AesVsRsaEncryption />,
  "chmod-permissions-explained": <ChmodPermissionsExplained />,
  "dotenv-best-practices": <DotenvBestPractices />,
  "semantic-versioning-explained": <SemanticVersioningExplained />,
  "sql-formatting-best-practices": <SqlFormattingBestPractices />,
  "markdown-cheat-sheet": <MarkdownCheatSheet />,
  "split-pdf-online": <SplitPdfOnline />,
  "timezones-dst-for-developers": <TimezonesDstForDevelopers />,
};
