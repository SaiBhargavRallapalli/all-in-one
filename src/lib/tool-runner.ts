// Copyright (c) 2026 DevBench contributors. MIT License.
import * as engines from "@/lib/tool-engines";
import { needsDualInput, needsNoInput } from "@/lib/tool-input-meta";

export type ToolState = {
  input: string;
  input2?: string;
  output: string;
  error: string;
  options: Record<string, string | number | boolean>;
};

export { needsDualInput, needsNoInput };

export async function runTool(
  slug: string,
  state: ToolState
): Promise<string | { output: string; error?: string }> {
  const { input, input2, options } = state;

  switch (slug) {
    // Encoding
    case "base64-encode":
      return engines.base64Encode(input);
    case "base64-decode":
      return engines.base64Decode(input);
    case "url-encode":
      return engines.urlEncode(input);
    case "url-decode":
      return engines.urlDecode(input);
    case "html-entity-encode":
      return engines.htmlEntityEncode(input);
    case "html-entity-decode":
      return engines.htmlEntityDecode(input);
    case "text-to-hex":
      return engines.textToHex(input);
    case "hex-to-text":
      return engines.hexToText(input);
    case "text-to-binary":
      return engines.textToBinary(input);
    case "binary-to-text":
      return engines.binaryToText(input);
    case "rot13":
      return engines.rot13(input);
    case "morse-code":
      return engines.morseEncode(input);

    // Text
    case "case-converter":
      return engines.caseConvert(
        input,
        (options.targetCase as string) || "camelCase"
      );
    case "text-diff":
      return engines.textDiff(input, input2 || "");
    case "word-counter": {
      const stats = engines.wordCount(input);
      return {
        output: Object.entries(stats)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n"),
      };
    }
    case "regex-tester":
      return engines.regexTest(input, (options.pattern as string) || "");
    case "slug-generator":
      return engines.slugify(input);
    case "lorem-ipsum":
      return engines.loremIpsum(
        (options.count as number) || 3,
        (options.unit as "paragraphs" | "sentences" | "words") || "paragraphs"
      );
    case "line-sorter":
      return engines.sortLines(input, (options.mode as string) || "asc");
    case "find-replace":
      return engines.findReplace(
        input,
        (options.find as string) || "",
        (options.replace as string) || "",
        !!options.useRegex,
        !!options.caseInsensitive
      );
    case "whitespace-normalizer":
      return engines.normalizeWhitespace(
        input,
        (options.mode as string) || "collapse"
      );
    case "string-reverse":
      return engines.reverseString(input);
    case "markdown-to-html":
      return engines.markdownToHtml(input);
    case "html-to-markdown":
      return engines.htmlToMarkdown(input);
    case "html-to-text":
      return engines.htmlToText(input);
    case "strip-markdown":
      return engines.stripMarkdown(input);

    // Dev
    case "aes-encrypt-decrypt": {
      const password = (options.password as string) || "";
      if (!password) return { output: "", error: "Password is required" };
      const mode = (options.mode as string) || "encrypt";
      try {
        if (mode === "encrypt") {
          return await engines.aesEncrypt(input, password);
        } else {
          return await engines.aesDecrypt(input, password);
        }
      } catch (e) {
        return { output: "", error: `${mode === "encrypt" ? "Encryption" : "Decryption"} failed: ${(e as Error).message}` };
      }
    }
    case "hash-generator":
      return engines.generateHash(input, (options.algo as string) || "SHA-256");
    case "uuid-generator":
      return engines.generateUuids((options.count as number) || 5).join("\n");
    case "color-converter":
      return engines.convertColor(input);
    case "unix-timestamp":
      return engines.unixTimestamp(input);
    case "cron-parser":
      return engines.parseCron(input);
    case "password-generator":
      return engines.generatePassword((options.length as number) || 16, {
        uppercase: options.uppercase !== false,
        lowercase: options.lowercase !== false,
        digits: options.digits !== false,
        symbols: options.symbols !== false,
      });
    case "url-parser":
      return engines.parseUrl(input);
    case "base-converter":
      return engines.convertBase(
        input,
        (options.fromBase as number) || 10,
        (options.toBase as number) || 16
      );
    case "css-minifier":
      return engines.minifyCss(input);
    case "html-minifier":
      return engines.minifyHtml(input);
    case "sql-formatter":
      return engines.formatSql(input);
    case "curl-to-fetch":
      return engines.curlToFetch(input);
    case "curl-formatter":
      return engines.formatCurl(
        input,
        (options.layout as string) === "oneline" ? "oneline" : "multiline"
      );
    case "string-escape":
      return engines.escapeString(
        input,
        (options.mode as "json" | "js" | "sql" | "regex") || "json"
      );
    case "mime-lookup":
      return engines.mimeLookup(input);
    case "semver-compare":
      return engines.compareSemverVersions(input, input2 || "");
    case "chmod-calculator":
      return engines.chmodCalculator(input);
    case "dotenv-parser":
      return engines.parseDotenv(input);

    // Conversion
    case "unit-converter":
      return engines.convertUnits(
        parseFloat(input) || 0,
        (options.unitFrom as string) || "m",
        (options.unitTo as string) || "km",
        (options.unitCategory as string) || "length"
      );
    case "temperature-converter":
      return engines.convertTemperature(
        parseFloat(input) || 0,
        (options.from as "C" | "F" | "K") || "C"
      );
    case "byte-converter":
      return engines.convertBytes(
        parseFloat(input) || 0,
        (options.fromUnit as string) || "B"
      );
    case "number-to-words":
      return engines.numberToWords(parseInt(input) || 0);
    case "roman-numerals": {
      if (/^\d+$/.test(input.trim())) {
        return engines.toRomanNumeral(parseInt(input));
      }
      const decimal = engines.fromRomanNumeral(input.trim().toUpperCase());
      return typeof decimal === "number" ? String(decimal) : decimal;
    }
    case "duration-converter":
      return engines.convertDuration(parseFloat(input) || 0);
    case "percentage-calc":
      return engines.calculatePercentage(input);
    case "aspect-ratio": {
      const parts = input.split(/[x×:,\s]+/);
      const w = parseFloat(parts[0]) || 0;
      const h = parseFloat(parts[1]) || 0;
      if (w && h) return engines.calculateAspectRatio(w, h);
      return { output: "", error: "Enter dimensions as WxH (e.g. 1920x1080)" };
    }
    case "timezone-converter":
    case "world-clock":
      return engines.convertTimezone(input);

    // Finance & calculators
    case "simple-interest":
      return engines.calcSimpleInterest(input);
    case "gst-calculator":
      return engines.calcGst(
        input,
        (options.gstBasis as string) === "inclusive" ? "inclusive" : "exclusive"
      );
    case "discount-calculator":
      return engines.calcDiscount(input);
    case "tip-calculator":
      return engines.calcTip(input);
    case "roi-calculator":
      return engines.calcRoi(input);
    case "profit-loss-calculator":
      return engines.calcProfitLoss(input);
    case "bmr-calculator":
      return engines.calcBmr(input);
    case "calorie-calculator":
      return engines.calcCalorieCalculator(input);
    case "water-intake-calculator":
      return engines.calcWaterIntake(input);
    case "body-fat-calculator":
      return engines.calcBodyFatEstimate(input);
    case "days-between-dates":
      return engines.calcDaysBetween(input);
    case "countdown-calculator":
      return engines.calcCountdown(input);
    case "week-number-calculator":
      return engines.calcWeekNumber(input);
    case "due-date-calculator":
      return engines.calcDueDateFromLmp(input);
    case "quadratic-solver":
      return engines.solveQuadraticEquation(input);
    case "pythagorean-theorem":
      return engines.solvePythagorean(input);
    case "gcd-lcm-calculator":
      return engines.calcGcdLcmPair(input);

    // JSON conversion tools
    case "json-to-yaml":
      return engines.jsonToYaml(input);
    case "yaml-to-json":
      return engines.yamlToJson(input);
    case "json-to-csv":
      return engines.jsonToCsv(input);
    case "csv-to-json":
      return engines.csvToJson(input);
    case "json-to-tsv":
      return engines.jsonToTsv(input);
    case "tsv-to-json":
      return engines.tsvToJson(input);
    case "log-parser":
      return engines.parseApplicationLogs(input);
    case "json-to-typescript":
      return engines.jsonToTypescript(input);
    case "json-to-xml":
      return engines.jsonToXml(input);
    case "xml-to-json":
      return engines.xmlToJson(input);
    case "json-diff":
      return engines.textDiff(input, input2 || "");
    case "toml-to-json":
      return engines.tomlToJson(input);
    case "html-to-jsx":
      return engines.htmlToJsx(input);

    default:
      return { output: "", error: `Unknown tool: ${slug}` };
  }
}
