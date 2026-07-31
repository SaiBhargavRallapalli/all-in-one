// Copyright (c) 2026 DevBench contributors. MIT License.
export type BeautifierLang =
  | "html"
  | "css"
  | "scss"
  | "less"
  | "javascript"
  | "typescript"
  | "tsx"
  | "json"
  | "markdown"
  | "yaml"
  | "graphql"
  | "xml"
  | "sql"
  | "python";

export const BEAUTIFIER_LANGS: {
  id: BeautifierLang;
  label: string;
  hint: string;
}[] = [
  { id: "html", label: "HTML", hint: "Prettier" },
  { id: "xml", label: "XML", hint: "HTML parser" },
  { id: "css", label: "CSS", hint: "Prettier" },
  { id: "scss", label: "SCSS", hint: "Prettier" },
  { id: "less", label: "Less", hint: "Prettier" },
  { id: "javascript", label: "JavaScript", hint: "Prettier" },
  { id: "typescript", label: "TypeScript", hint: "Prettier" },
  { id: "tsx", label: "TSX / JSX", hint: "Prettier" },
  { id: "json", label: "JSON", hint: "Prettier" },
  { id: "markdown", label: "Markdown", hint: "Prettier" },
  { id: "yaml", label: "YAML", hint: "Prettier" },
  { id: "graphql", label: "GraphQL", hint: "Prettier" },
  { id: "sql", label: "SQL", hint: "sql-formatter" },
  {
    id: "python",
    label: "Python",
    hint: "Normalize indents (4 spaces / level)",
  },
];

function leadingWidth(line: string): number {
  const m = line.match(/^[\t ]*/);
  if (!m) return 0;
  return m[0].replace(/\t/g, "    ").length;
}

/** Normalize existing indentation to 4-space steps (preserves block structure from source). */
export function formatPythonNormalize(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const widths = lines.map(leadingWidth);
  const nonemptyIndents = lines
    .map((line, i) => (line.trim() === "" ? null : widths[i]))
    .filter((w): w is number => w !== null);
  const uniqueSorted = [...new Set(nonemptyIndents)].sort((a, b) => a - b);
  const depthOf = new Map(uniqueSorted.map((w, d) => [w, d]));

  const body = lines
    .map((line, i) => {
      if (line.trim() === "") return "";
      const w = widths[i];
      const d = depthOf.get(w) ?? 0;
      return `${"    ".repeat(d)}${line.trim()}`;
    })
    .join("\n");

  const trimmed = body.replace(/\s+$/, "");
  return trimmed + (trimmed ? "\n" : "");
}

const PRETTIER_BASE = {
  printWidth: 100,
  tabWidth: 2,
  trailingComma: "es5" as const,
};

async function loadPrettier() {
  const [
    prettier,
    estreePlugin,
    babelPlugin,
    htmlPlugin,
    postcssPlugin,
    typescriptPlugin,
    markdownPlugin,
    yamlPlugin,
    graphqlPlugin,
  ] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/estree"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/html"),
    import("prettier/plugins/postcss"),
    import("prettier/plugins/typescript"),
    import("prettier/plugins/markdown"),
    import("prettier/plugins/yaml"),
    import("prettier/plugins/graphql"),
  ]);
  return {
    prettier,
    estreePlugin,
    babelPlugin,
    htmlPlugin,
    postcssPlugin,
    typescriptPlugin,
    markdownPlugin,
    yamlPlugin,
    graphqlPlugin,
  };
}


export async function beautifyCode(
  lang: BeautifierLang,
  source: string
): Promise<{ ok: true; output: string } | { ok: false; error: string }> {
  const input = source.replace(/\r\n/g, "\n");

  try {
    if (lang === "python") {
      return { ok: true, output: formatPythonNormalize(input) };
    }

    if (lang === "sql") {
      const { format: formatSql } = await import("sql-formatter");
      const out = formatSql(input, {
        language: "sql",
        keywordCase: "upper",
        tabWidth: 2,
      });
      return { ok: true, output: out.endsWith("\n") ? out : `${out}\n` };
    }

    const {
      prettier,
      estreePlugin,
      babelPlugin,
      htmlPlugin,
      postcssPlugin,
      typescriptPlugin,
      markdownPlugin,
      yamlPlugin,
      graphqlPlugin,
    } = await loadPrettier();

    switch (lang) {
      case "html":
      case "xml": {
        const out = await prettier.format(input, {
          ...PRETTIER_BASE,
          parser: "html",
          plugins: [htmlPlugin],
        });
        return { ok: true, output: out };
      }
      case "css": {
        const out = await prettier.format(input, {
          ...PRETTIER_BASE,
          parser: "css",
          plugins: [postcssPlugin],
        });
        return { ok: true, output: out };
      }
      case "scss": {
        const out = await prettier.format(input, {
          ...PRETTIER_BASE,
          parser: "scss",
          plugins: [postcssPlugin],
        });
        return { ok: true, output: out };
      }
      case "less": {
        const out = await prettier.format(input, {
          ...PRETTIER_BASE,
          parser: "less",
          plugins: [postcssPlugin],
        });
        return { ok: true, output: out };
      }
      case "javascript": {
        const out = await prettier.format(input, {
          ...PRETTIER_BASE,
          parser: "babel",
          plugins: [estreePlugin, babelPlugin],
        });
        return { ok: true, output: out };
      }
      case "typescript": {
        const out = await prettier.format(input, {
          ...PRETTIER_BASE,
          parser: "typescript",
          plugins: [estreePlugin, typescriptPlugin],
        });
        return { ok: true, output: out };
      }
      case "tsx": {
        const out = await prettier.format(input, {
          ...PRETTIER_BASE,
          parser: "typescript",
          plugins: [estreePlugin, typescriptPlugin],
          filepath: "snippet.tsx",
        });
        return { ok: true, output: out };
      }
      case "json": {
        const out = await prettier.format(input, {
          ...PRETTIER_BASE,
          parser: "json",
          plugins: [estreePlugin, babelPlugin],
        });
        return { ok: true, output: out };
      }
      case "markdown": {
        const out = await prettier.format(input, {
          ...PRETTIER_BASE,
          parser: "markdown",
          plugins: [markdownPlugin],
        });
        return { ok: true, output: out };
      }
      case "yaml": {
        const out = await prettier.format(input, {
          ...PRETTIER_BASE,
          parser: "yaml",
          plugins: [yamlPlugin],
        });
        return { ok: true, output: out };
      }
      case "graphql": {
        const out = await prettier.format(input, {
          ...PRETTIER_BASE,
          parser: "graphql",
          plugins: [graphqlPlugin],
        });
        return { ok: true, output: out };
      }
      default: {
        const _exhaustive: never = lang;
        return { ok: false, error: `Unsupported: ${_exhaustive}` };
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export const CODE_SAMPLES: Record<BeautifierLang, string> = {
  html: `<!DOCTYPE html><html><head><title>Demo</title></head><body><div class="wrap"><p>Hello<br/><span>world</span></p></div></body></html>`,
  xml: `<?xml version="1.0"?><root><item id="1"><name>alpha</name></item></root>`,
  css: `.foo{color:#333;display:flex}.foo .bar{padding:8px;margin:0}`,
  scss: `$base:#444;.btn{padding:4px 8px;&:hover{background:darken($base,6%);}}`,
  less: `@x: 10px;.box{padding:@x;&:after{content:'';}}`,
  javascript: `function greet(name){const x=[1,2,3];return {hello:name,sum:x.reduce((a,b)=>a+b,0)};}console.log(greet("dev"));`,
  typescript: `type U={id:number};const f=(x:U)=>{return ({...x,n:x.id+1});};`,
  tsx: `import React from "react";export const Badge=({children}:{children:React.ReactNode})=>(<span className="badge">{children}</span>);`,
  json: `{"a":1,"b":[true,false],"nested":{"x":"y"}}`,
  markdown: `# Title\n\nParagraph with **bold** and *italic*.\n\n- one\n- two\n`,
  yaml: `root:\n  items:\n  - name: first\n    val: 1\n  - name: second\n    val: 2\n`,
  graphql: `query User($id:ID!){user(id:$id){name email posts{title}}}`,
  sql: `select u.id,u.name,count(o.id) as c from users u left join orders o on o.user_id=u.id where u.active=1 group by u.id,u.name order by c desc;`,
  python: `def foo(x):\n if x>0:\n  return x+1\n else:\n  return 0\nclass Bar:\n pass\n`,
};
