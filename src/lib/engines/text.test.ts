import { describe, expect, it } from "vitest";
import {
  caseConvert,
  slugify,
  wordCount,
  sortLines,
  findReplace,
  normalizeWhitespace,
  reverseString,
  markdownToHtml,
} from "./text";

function str(r: unknown): string {
  if (typeof r === "string") return r;
  if (r && typeof r === "object" && "output" in r) return (r as { output: string }).output;
  return String(r);
}

describe("caseConvert", () => {
  it("converts to camelCase", () => {
    expect(str(caseConvert("hello world", "camelCase"))).toBe("helloWorld");
  });

  it("converts to PascalCase", () => {
    expect(str(caseConvert("hello world", "PascalCase"))).toBe("HelloWorld");
  });

  it("converts to snake_case", () => {
    expect(str(caseConvert("Hello World", "snake_case"))).toBe("hello_world");
  });

  it("converts to kebab-case", () => {
    expect(str(caseConvert("Hello World Test", "kebab-case"))).toBe("hello-world-test");
  });

  it("converts to UPPER_CASE", () => {
    expect(str(caseConvert("hello world", "UPPER_CASE"))).toBe("HELLO_WORLD");
  });

  it("converts to lower", () => {
    expect(str(caseConvert("HELLO WORLD", "lower"))).toBe("hello world");
  });

  it("handles empty input", () => {
    expect(str(caseConvert("", "snake_case"))).toBe("");
  });
});

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(str(slugify("Hello World"))).toBe("hello-world");
  });

  it("strips special characters", () => {
    expect(str(slugify("Hello, World!"))).toBe("hello-world");
  });

  it("collapses multiple hyphens", () => {
    expect(str(slugify("a  --  b"))).toBe("a-b");
  });

  it("trims leading and trailing hyphens", () => {
    expect(str(slugify("  hello  "))).toBe("hello");
  });
});

describe("wordCount", () => {
  it("counts words correctly", () => {
    expect(wordCount("one two three").words).toBe(3);
  });

  it("returns zero for empty string", () => {
    expect(wordCount("").words).toBe(0);
  });

  it("counts characters", () => {
    expect(wordCount("abc").characters).toBe(3);
  });

  it("counts characters without spaces", () => {
    expect(wordCount("a b c")["characters (no spaces)"]).toBe(3);
  });
});

describe("sortLines", () => {
  it("sorts ascending", () => {
    expect(str(sortLines("b\na\nc", "asc"))).toBe("a\nb\nc");
  });

  it("sorts descending", () => {
    expect(str(sortLines("a\nb\nc", "desc"))).toBe("c\nb\na");
  });

  it("reverses lines", () => {
    expect(str(sortLines("a\nb\nc", "reverse"))).toBe("c\nb\na");
  });

  it("removes duplicates", () => {
    const result = str(sortLines("a\nb\na\nc", "unique"));
    // unique mode appends a summary separator line — filter it out
    const uniqueLines = result.split("\n").filter((l) => !l.startsWith("---") && l !== "");
    expect(uniqueLines).toHaveLength(3);
    expect(result).toContain("a");
  });
});

describe("findReplace", () => {
  it("replaces literal text", () => {
    expect(str(findReplace("hello world", "world", "earth", false, false))).toBe("hello earth");
  });

  it("replaces with regex", () => {
    expect(str(findReplace("foo123bar", "\\d+", "NUM", true, false))).toBe("fooNUMbar");
  });

  it("case insensitive replacement", () => {
    expect(str(findReplace("Hello HELLO hello", "hello", "hi", false, true))).toBe("hi hi hi");
  });

  it("returns original when find is empty", () => {
    expect(str(findReplace("hello", "", "x", false, false))).toBe("hello");
  });
});

describe("normalizeWhitespace", () => {
  it("collapses multiple spaces", () => {
    expect(str(normalizeWhitespace("a   b   c", "collapse"))).toBe("a b c");
  });

  it("trims lines", () => {
    expect(str(normalizeWhitespace("  hello  \n  world  ", "trim"))).toBe("hello\nworld");
  });

  it("removes blank lines", () => {
    const result = str(normalizeWhitespace("a\n\nb\n\nc", "remove-blank"));
    expect(result.split("\n").filter(Boolean)).toHaveLength(3);
  });
});

describe("reverseString", () => {
  it("reverses ASCII", () => {
    expect(str(reverseString("hello"))).toBe("olleh");
  });

  it("handles empty string", () => {
    expect(str(reverseString(""))).toBe("");
  });
});

describe("markdownToHtml", () => {
  it("renders safe https links", () => {
    const html = str(markdownToHtml("[docs](https://example.com/path)"));
    expect(html).toContain('href="https://example.com/path"');
    expect(html).toContain("docs");
  });

  it("blocks attribute breakout in href", () => {
    const html = str(markdownToHtml('[click](https://evil.com" onmouseover="alert(1))'));
    expect(html).not.toContain("onmouseover");
    expect(html).toContain('href="#"');
  });

  it("blocks javascript: URLs", () => {
    const html = str(markdownToHtml("[x](javascript:alert(1))"));
    expect(html).toContain('href="#"');
    expect(html).not.toContain("javascript:");
  });
});
