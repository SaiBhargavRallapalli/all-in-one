// Copyright (c) 2026 DevBench contributors. MIT License.

/** Primary header navigation — short visible labels with descriptive names for assistive tech. */
export type HeaderNavLink = {
  href: string;
  /** Compact label shown in the header bar */
  label: string;
  /** Descriptive link purpose (WCAG 2.4.4) */
  ariaLabel: string;
  /** Optional group for the “All tools” drawer */
  group?: "Workspaces" | "Developer" | "More";
};

/**
 * Compact top-bar links — hubs users open most often.
 * Full catalogue stays in the side drawer + command palette (⌘K).
 */
export const HEADER_NAV_LINKS: HeaderNavLink[] = [
  { href: "/json", label: "JSON", ariaLabel: "Access JSON Formatter Tool" },
  { href: "/yaml", label: "YAML", ariaLabel: "Access YAML Formatter Tool" },
  { href: "/pdf", label: "PDF", ariaLabel: "Access PDF Tools" },
  { href: "/image", label: "Image", ariaLabel: "Access Image Tools" },
  { href: "/notepad", label: "Notepad", ariaLabel: "Access Notepad++ Editor" },
  { href: "/api-tester", label: "API", ariaLabel: "Access API Tester Tool" },
  { href: "/jwt-debugger", label: "JWT", ariaLabel: "Access JWT Debugger Tool" },
  { href: "/diff-checker", label: "Diff", ariaLabel: "Access Diff Checker Tool" },
  { href: "/playground", label: "Playground", ariaLabel: "Access Code Playground" },
  { href: "/blog", label: "Blog", ariaLabel: "Read DevBench developer blog" },
];

/** Full navigation for the side drawer — grouped for faster scanning. */
export const SIDE_NAV_LINKS: HeaderNavLink[] = [
  { href: "/json", label: "JSON", ariaLabel: "Access JSON Formatter Tool", group: "Workspaces" },
  { href: "/yaml", label: "YAML", ariaLabel: "Access YAML Formatter Tool", group: "Workspaces" },
  { href: "/pdf", label: "PDF", ariaLabel: "Access PDF Tools", group: "Workspaces" },
  { href: "/image", label: "Image", ariaLabel: "Access Image Tools", group: "Workspaces" },
  { href: "/notepad", label: "Notepad", ariaLabel: "Access Notepad++ Editor", group: "Workspaces" },
  { href: "/playground", label: "Playground", ariaLabel: "Access Code Playground", group: "Workspaces" },
  { href: "/workflows", label: "Pipelines", ariaLabel: "Access Tool Pipelines", group: "Workspaces" },
  { href: "/vault", label: "Vault", ariaLabel: "Access DevBench Vault", group: "Workspaces" },
  { href: "/api-tester", label: "API Tester", ariaLabel: "Access API Tester Tool", group: "Developer" },
  { href: "/lambda-sandbox", label: "Lambda", ariaLabel: "Access AWS Lambda Sandbox", group: "Developer" },
  { href: "/webhook-simulator", label: "Webhook", ariaLabel: "Access Webhook Simulator", group: "Developer" },
  { href: "/jwt-debugger", label: "JWT", ariaLabel: "Access JWT Debugger Tool", group: "Developer" },
  { href: "/diff-checker", label: "Diff", ariaLabel: "Access Diff Checker Tool", group: "Developer" },
  { href: "/code-beautify", label: "Beautify", ariaLabel: "Access Code Beautifier Tool", group: "Developer" },
  { href: "/epoch", label: "Epoch", ariaLabel: "Access Unix Epoch Converter", group: "Developer" },
  { href: "/linux-cheatsheet", label: "CLI", ariaLabel: "Access Linux CLI Cheatsheet", group: "Developer" },
  { href: "/cron-editor", label: "Cron", ariaLabel: "Access Cron Expression Editor", group: "Developer" },
  { href: "/date-calculator", label: "Date", ariaLabel: "Access Date Calculator Tool", group: "More" },
  { href: "/astronomy", label: "Sun/Moon", ariaLabel: "Access Sun and Moon Calculator", group: "More" },
  { href: "/graph-calculator", label: "Math", ariaLabel: "Access Graph Calculator Tool", group: "More" },
  { href: "/blog", label: "Blog", ariaLabel: "Read DevBench developer blog", group: "More" },
  { href: "/contact", label: "Contact", ariaLabel: "Contact DevBench", group: "More" },
];

export const SIDE_NAV_GROUPS = ["Workspaces", "Developer", "More"] as const;
