// Copyright (c) 2026 DevBench contributors. MIT License.
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, LayoutGrid } from "lucide-react";
import { CATEGORIES, type Tool } from "@/lib/tools-registry";
import { filterWorkspaces, publicHrefForToolSlug, type WorkspaceShortcut } from "@/lib/devbench-workspaces";
import { useExternalNavOrigin } from "@/hooks/use-external-nav-origin";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { resolveToolHref } from "@/lib/site-config";

function toolHref(slug: string) {
  return publicHrefForToolSlug(slug);
}

type PaletteRow =
  | { kind: "workspace"; workspace: WorkspaceShortcut }
  | { kind: "tool"; tool: Tool };

export default function CommandPalette({ tools }: { tools: Tool[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const { origin: navOrigin, homePath } = useExternalNavOrigin();

  const closePalette = useCallback(() => setOpen(false), []);

  useFocusTrap(open, dialogRef, {
    onEscape: closePalette,
    initialFocusRef: inputRef,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setActiveIdx(0);
      }
    }
    function onOpen() {
      setOpen(true);
      setQuery("");
      setActiveIdx(0);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("devbench:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("devbench:open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep active item visible when navigating with keyboard
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const rows = useMemo((): PaletteRow[] => {
    const q = query.toLowerCase().trim();
    const workspaces = filterWorkspaces(query);
    const toolMatches = !q
      ? tools.slice(0, 10)
      : tools
          .filter(
            (t) =>
              t.name.toLowerCase().includes(q) ||
              t.shortName.toLowerCase().includes(q) ||
              t.description.toLowerCase().includes(q) ||
              t.category.includes(q),
          )
          .slice(0, 12);

    const out: PaletteRow[] = [];
    for (const w of workspaces) out.push({ kind: "workspace", workspace: w });
    for (const t of toolMatches) out.push({ kind: "tool", tool: t });
    return out;
  }, [tools, query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeIdx >= rows.length) setActiveIdx(Math.max(0, rows.length - 1));
  }, [rows.length, activeIdx]);

  const goToRow = useCallback(
    (row: PaletteRow) => {
      const raw =
        row.kind === "workspace" ? row.workspace.href : toolHref(row.tool.slug);
      const href = resolveToolHref(raw, navOrigin, homePath);
      if (href.startsWith("http")) {
        window.location.assign(href);
      } else {
        router.push(href);
      }
      setOpen(false);
    },
    [navOrigin, homePath, router],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!rows.length) return;
      setActiveIdx((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!rows.length) return;
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && rows[activeIdx]) {
      goToRow(rows[activeIdx]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      onMouseDown={closePalette}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search workspaces and tools"
        tabIndex={-1}
        className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden outline-none"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search workspaces & tools…"
            aria-label="Search workspaces and tools"
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
            >
              clear
            </button>
          )}
        </div>

        {/* Results */}
        <ul ref={listRef} className="max-h-[55vh] overflow-y-auto py-1.5" role="listbox">
          {!query.trim() && (
            <li className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
              Workspaces & tools
            </li>
          )}
          {rows.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              <p>No results for &ldquo;{query}&rdquo;</p>
              <p className="mt-1 text-xs">Try a shorter keyword, or press <kbd className="font-mono px-1 rounded border border-border bg-muted">Esc</kbd> to browse all tools.</p>
            </li>
          ) : (
            rows.map((row, i) =>
              row.kind === "workspace" ? (
                <li key={`w:${row.workspace.id}`} role="option" aria-selected={activeIdx === i}>
                  <button
                    type="button"
                    onClick={() => goToRow(row)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      activeIdx === i ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-accent/15 text-accent">
                      <LayoutGrid className="w-4 h-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{row.workspace.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.workspace.description}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                      Workspace
                    </span>
                  </button>
                </li>
              ) : (
                <li key={`t:${row.tool.slug}`} role="option" aria-selected={activeIdx === i}>
                  <button
                    type="button"
                    onClick={() => goToRow(row)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      activeIdx === i ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <span
                      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${CATEGORIES[row.tool.category].color}`}
                    >
                      {row.tool.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{row.tool.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.tool.description}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                      {CATEGORIES[row.tool.category].label}
                    </span>
                  </button>
                </li>
              ),
            )
          )}
        </ul>

        {/* Footer hints */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-border font-mono bg-muted">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-border font-mono bg-muted">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-border font-mono bg-muted">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
