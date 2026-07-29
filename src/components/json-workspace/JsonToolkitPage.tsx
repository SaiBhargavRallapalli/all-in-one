"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import yaml from "js-yaml";
import {
  Copy,
  Check,
  ChevronRight,
  Braces,
  Minimize2,
  Wrench,
  Trash2,
  AlertTriangle,
  FileJson,
  TreePine,
  GitCompareArrows,
  ArrowRightLeft,
  X,
  ClipboardPaste,
  SortAsc,
  Eraser,
  Layers,
  Expand,
  Upload,
  Lock,
  Unlock,
  Sparkles,
  FileCode,
  Shuffle,
  Download,
  Search,
  Replace,
  Undo2,
  Redo2,
  ChevronsUpDown,
  ChevronsDownUp,
  ShieldCheck,
  Filter,
  Table2,
  Plus,
  Minus,
  GripVertical,
  ChevronLeft,
  Columns2,
  Share2,
  BookmarkPlus,
  Library,
} from "lucide-react";
import Header from "@/components/Header";
import {
  decodeJsonWorkspaceState,
  encodeJsonWorkspaceState,
  jsonWorkspaceShareTooLong,
} from "@/lib/json-workspace-share";
import { runTransformQuery } from "@/lib/transform-runner";
import {
  deleteJsonPreset,
  loadJsonPresets,
  upsertJsonPreset,
  type JsonWorkspacePreset,
} from "@/lib/json-workspace-presets";
import {
  trackToolSuccess,
  trackToolError,
  trackToolCopy,
} from "@/lib/analytics-events";
import { formatJsonWorkspace } from "@/lib/format-json-workspace";
import { runJsonWorkspaceOp, shouldUseJsonWorker } from "@/lib/json-workspace-worker-client";
import type { FixResult } from "@/lib/json-repair";
import {
  buildJsonQueryShareUrl,
  fetchRemoteJsonForWorkspace,
  readJsonBootstrapFromSearch,
  readTabFromSearch,
} from "@/lib/json-workspace-bootstrap";
import JsonLoadUrlPanel from "@/components/json-workspace/JsonLoadUrlPanel";
import JsonQuickNav from "@/components/json-workspace/JsonQuickNav";
import JsonRepairExamples from "@/components/json-workspace/JsonRepairExamples";
import ToolPageActions from "@/components/ToolPageActions";
import {
  parseJsonError,
  getJsonStats,
  computeDiff,
  sortKeysDeep,
  jsonToEnv,
  envToJson,
  jsonToUrlEncoded,
  jsonToXmlExport,
  jsonToToml,
  generateJsonSchema,
  generateHtmlForm,
  generateMockData,
  generateTableView,
  jsonToCsv,
  jsonToTypeScript,
  jsonToSql,
  jsonToPython,
  jsonToStringify,
  encryptJson,
  decryptJson,
  jsoncToJson,
  decodeJwt,
  buildQueryFromWizard,
  deepGet,
  deepSet,
  deepDelete,
  deepInsert,
  getFieldsFromData,
  computeLineDiff,
  diffWithContext,
} from "@/lib/json-workspace";
import {
  findMatchingBracket,
  charOffsetToLineCol,
  JsonInputMirrorOverlay,
} from "@/lib/json-workspace/brackets-mirror";
import { validateJsonSchema, type SchemaValidationError } from "@/lib/json-schema-validate";
import {
  InteractiveTreeNode,
  MiniTreeNode,
  TreeContextMenu,
  countTreeMatches,
} from "@/components/json-workspace/JsonTreeView";
import type {
  ConvertTarget,
  JsonError,
  ContextMenuState,
  WizardState,
  WizardFilterOp,
} from "@/lib/json-workspace/types";

const TOOL_SLUG = "json";

import type { JsonWorkspaceTab as Tab } from "@/lib/json-workspace-types";

export type JsonToolkitPageProps = {
  initialTab?: Tab;
  initialInput?: string;
  highlightRepairExamples?: boolean;
};

// ── Main Page Component ──────────────────────────────────────────────────

export default function JsonToolkitPage({
  initialTab = "format",
  initialInput = "",
  highlightRepairExamples = false,
}: JsonToolkitPageProps) {
  const [input, setInput] = useState(initialInput);
  const [jsonFormatBusy, setJsonFormatBusy] = useState(false);
  const [jsonWorkspaceBusy, setJsonWorkspaceBusy] = useState(false);
  const [workerParsedForTree, setWorkerParsedForTree] = useState<unknown>(undefined);
  const [output, setOutput] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [convertTarget, setConvertTarget] = useState<ConvertTarget>("yaml");
  const [copied, setCopied] = useState(false);
  const [autoFormat, setAutoFormat] = useState(false);
  const [error, setError] = useState<JsonError | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [showFixDiff, setShowFixDiff] = useState(false);
  const [diffLeft, setDiffLeft] = useState("");
  const [diffRight, setDiffRight] = useState("");
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [encryptPassword, setEncryptPassword] = useState("");
  const [showEncrypt, setShowEncrypt] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState<"yaml" | "csv" | "env" | "base64" | "jsonc" | "jwt">("yaml");
  const [importText, setImportText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Undo/Redo
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [_redoStack, setRedoStack] = useState<string[]>([]);
  const skipHistoryRef = useRef(false);

  const pushHistory = useCallback((prev: string) => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    setUndoStack((s) => {
      const next = [...s, prev];
      if (next.length > 50) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((s) => {
      if (s.length === 0) return s;
      const prev = s[s.length - 1];
      const rest = s.slice(0, -1);
      setRedoStack((r) => [...r, input]);
      skipHistoryRef.current = true;
      setInput(prev);
      return rest;
    });
  }, [input]);

  const handleRedo = useCallback(() => {
    setRedoStack((s) => {
      if (s.length === 0) return s;
      const next = s[s.length - 1];
      const rest = s.slice(0, -1);
      setUndoStack((u) => [...u, input]);
      skipHistoryRef.current = true;
      setInput(next);
      return rest;
    });
  }, [input]);

  const setInputWithHistory = useCallback((newVal: string | ((prev: string) => string)) => {
    setInput((prev) => {
      const resolved = typeof newVal === "function" ? newVal(prev) : newVal;
      if (resolved !== prev) {
        pushHistory(prev);
      }
      return resolved;
    });
  }, [pushHistory]);

  // Search & Replace
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchRegex, setSearchRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const searchMatches = useMemo(() => {
    if (!searchTerm || !input) return [];
    try {
      const flags = searchCaseSensitive ? "g" : "gi";
      const pattern = searchRegex ? new RegExp(searchTerm, flags) : new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
      const matches: { start: number; end: number }[] = [];
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(input)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length });
        if (match[0].length === 0) pattern.lastIndex++;
      }
      return matches;
    } catch {
      return [];
    }
  }, [input, searchTerm, searchCaseSensitive, searchRegex]);

  const handleSearchReplace = useCallback(() => {
    if (searchMatches.length === 0) return;
    const m = searchMatches[currentMatchIndex % searchMatches.length];
    const newInput = input.slice(0, m.start) + replaceTerm + input.slice(m.end);
    setInputWithHistory(newInput);
  }, [searchMatches, currentMatchIndex, input, replaceTerm, setInputWithHistory]);

  const handleSearchReplaceAll = useCallback(() => {
    if (searchMatches.length === 0) return;
    try {
      const flags = searchCaseSensitive ? "g" : "gi";
      const pattern = searchRegex ? new RegExp(searchTerm, flags) : new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
      setInputWithHistory(input.replace(pattern, replaceTerm));
    } catch { /* ignore */ }
  }, [searchMatches.length, searchCaseSensitive, searchRegex, searchTerm, input, replaceTerm, setInputWithHistory]);

  // Scroll textarea to current search match and select it so the match is visually highlighted.
  useEffect(() => {
    if (!searchTerm || searchMatches.length === 0) return;
    const m = searchMatches[currentMatchIndex % searchMatches.length];
    const ta = inputRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(m.start, m.end);
  }, [currentMatchIndex, searchMatches, searchTerm]);

  // Schema validation
  const [showSchemaPanel, setShowSchemaPanel] = useState(false);
  const [schemaText, setSchemaText] = useState("");
  const [schemaErrors, setSchemaErrors] = useState<SchemaValidationError[] | null>(null);
  const [schemaValid, setSchemaValid] = useState(false);
  const [schemaValidatedAt, setSchemaValidatedAt] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [jsonPresets, setJsonPresets] = useState<JsonWorkspacePreset[]>([]);
  const [presetsRevision, setPresetsRevision] = useState(0);
  const [showLoadUrl, setShowLoadUrl] = useState(false);
  const [loadUrlInput, setLoadUrlInput] = useState("");
  const [loadUrlBusy, setLoadUrlBusy] = useState(false);
  const [loadUrlError, setLoadUrlError] = useState("");
  const jwHydrated = useRef(false);

  const handleSchemaValidate = useCallback(() => {
    let data: unknown;
    try {
      data = JSON.parse(input);
    } catch (e) {
      setSchemaErrors([
        {
          path: "/",
          message: `The JSON in the main editor is invalid: ${(e as Error).message}. Fix or use Auto-fix there first — schema validation uses that document.`,
        },
      ]);
      setSchemaValid(false);
      setShowErrorPanel(true);
      const err = parseJsonError(input);
      if (err) setError(err);
      setSchemaValidatedAt(Date.now());
      return;
    }

    const schemaRaw = schemaText.trim();
    if (!schemaRaw) {
      setSchemaErrors([
        {
          path: "/",
          message:
            "Paste your JSON Schema in the field below. The large editor above is already the JSON instance to validate — you do not paste it again here.",
        },
      ]);
      setSchemaValid(false);
      setSchemaValidatedAt(Date.now());
      return;
    }

    let schema: unknown;
    try {
      schema = JSON.parse(schemaRaw);
    } catch (e) {
      setSchemaErrors([
        { path: "/", message: `Invalid JSON Schema (could not parse): ${(e as Error).message}` },
      ]);
      setSchemaValid(false);
      setSchemaValidatedAt(Date.now());
      return;
    }

    try {
      const errs = validateJsonSchema(data, schema);
      setSchemaErrors(errs);
      setSchemaValid(errs.length === 0);
    } catch (e) {
      setSchemaErrors([{ path: "/", message: (e as Error).message }]);
      setSchemaValid(false);
    }
    setSchemaValidatedAt(Date.now());
  }, [input, schemaText]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJsonPresets(loadJsonPresets());
  }, []);

  useEffect(() => {
    if (jwHydrated.current) return;
    if (typeof window === "undefined") return;

    const tabParam = readTabFromSearch(window.location.search);
    const d = decodeJsonWorkspaceState(window.location.hash);
    if (d) {
      jwHydrated.current = true;
      skipHistoryRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInput(d.input);
       
      setSchemaText(d.schemaText);
       
      setActiveTab(tabParam ?? d.activeTab);
       
      setDiffLeft(d.diffLeft);
       
      setDiffRight(d.diffRight);
       
      if (d.schemaText.trim()) setShowSchemaPanel(true);
      return;
    }

    const bootstrap = readJsonBootstrapFromSearch(window.location.search);
    if (!bootstrap) {
      if (tabParam) {
        jwHydrated.current = true;
         
        setActiveTab(tabParam);
      }
      return;
    }
    jwHydrated.current = true;
    skipHistoryRef.current = true;

    if (bootstrap.kind === "inline") {
       
      setInput(bootstrap.text);
      if (tabParam) {
         
        setActiveTab(tabParam);
      }
      return;
    }

     
    setShowLoadUrl(true);
     
    setLoadUrlInput(bootstrap.url);
    let cancelled = false;
    (async () => {
       
      setLoadUrlBusy(true);
       
      setLoadUrlError("");
      const result = await fetchRemoteJsonForWorkspace(bootstrap.url);
      if (cancelled) return;
       
      setLoadUrlBusy(false);
      if (result.ok) {
        setInputWithHistory(result.text);
        if (tabParam) setActiveTab(tabParam);
        trackToolSuccess(TOOL_SLUG, "load_url", { via: "query" });
      } else {
        setLoadUrlError(result.error);
        trackToolError(TOOL_SLUG, "load_url", result.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setInputWithHistory]);

  useEffect(() => {
    if (!showSchemaPanel) return;
    const schemaRaw = schemaText.trim();
    if (!schemaRaw) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      let data: unknown;
      try {
        data = JSON.parse(input);
      } catch (e) {
        if (cancelled) return;
        setSchemaErrors([
          {
            path: "/",
            message: `Cannot auto-check: main JSON is invalid (${(e as Error).message}).`,
          },
        ]);
        setSchemaValid(false);
        setSchemaValidatedAt(Date.now());
        return;
      }
      let schema: unknown;
      try {
        schema = JSON.parse(schemaRaw);
      } catch (e) {
        if (cancelled) return;
        setSchemaErrors([
          { path: "/", message: `Schema JSON is invalid (${(e as Error).message}).` },
        ]);
        setSchemaValid(false);
        setSchemaValidatedAt(Date.now());
        return;
      }
      if (cancelled) return;
      const errs = validateJsonSchema(data, schema);
      setSchemaErrors(errs);
      setSchemaValid(errs.length === 0);
      setSchemaValidatedAt(Date.now());
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [showSchemaPanel, input, schemaText]);

  // Tree expand/collapse signals
  const [expandAllSignal, setExpandAllSignal] = useState(0);
  const [collapseAllSignal, setCollapseAllSignal] = useState(0);

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Drag and drop
  const [dragOver, setDragOver] = useState(false);

  // Transform tab state
  const [transformQuery, setTransformQuery] = useState("data");
  const [transformPreview, setTransformPreview] = useState<unknown>(null);
  const [transformError, setTransformError] = useState<string | null>(null);
  const [wizard, setWizard] = useState<WizardState>({
    filterField: "",
    filterOp: "==",
    filterValue: "",
    sortField: "",
    sortDir: "asc",
    pickFields: [],
    groupByField: "",
    uniq: false,
  });

  // Table tab state
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const [tableSortCol, setTableSortCol] = useState<string | null>(null);
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("asc");
  const [tableFilter, setTableFilter] = useState("");
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editingCellValue, setEditingCellValue] = useState("");

  const [selectedTreePath, setSelectedTreePath] = useState<(string | number)[] | null>(null);
  const [treeSearchTerm, setTreeSearchTerm] = useState("");
  const [pathCopied, setPathCopied] = useState<"jsonpath" | "pointer" | "bracket" | null>(null);
  const [splitView, setSplitView] = useState(false);
  const [bracketHighlight, setBracketHighlight] = useState<{ open: number; close: number } | null>(null);
  const [activeInputLine, setActiveInputLine] = useState<number | null>(null);
  const bracketOverlayRef = useRef<HTMLDivElement>(null);

  const syncInputEditorOverlays = useCallback(
    (source?: { value: string; selectionStart: number }) => {
      const text = source?.value ?? input;
      const sel = source?.selectionStart ?? inputRef.current?.selectionStart ?? 0;
      const before = text.slice(0, sel);
      setActiveInputLine((before.match(/\n/g) ?? []).length + 1);
      if (text.length > 200_000) {
        setBracketHighlight(null);
        return;
      }
      setBracketHighlight(findMatchingBracket(text, sel));
    },
    [input],
  );

  const syncBracketOverlay = useCallback(() => {
    const ta = inputRef.current;
    const ov = bracketOverlayRef.current;
    if (ta && ov) {
      ov.scrollTop = ta.scrollTop;
      ov.scrollLeft = ta.scrollLeft;
    }
  }, []);

  function copyTreePath(format: "jsonpath" | "pointer" | "bracket") {
    if (!selectedTreePath) return;
    let text = "";
    if (format === "jsonpath") {
      text = "$" + selectedTreePath.map((p) =>
        typeof p === "number" ? `[${p}]` : /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(String(p)) ? `.${p}` : `["${p}"]`
      ).join("");
    } else if (format === "pointer") {
      text = "/" + selectedTreePath.map((p) => String(p).replace(/~/g, "~0").replace(/\//g, "~1")).join("/");
    } else {
      text = "$" + selectedTreePath.map((p) =>
        typeof p === "number" ? `[${p}]` : `['${String(p).replace(/'/g, "\\'")}']`
      ).join("");
    }
    if (!text || text === "$" || text === "/") text = format === "pointer" ? "/" : "$";
    navigator.clipboard.writeText(text).then(() => {
      setPathCopied(format);
      setTimeout(() => setPathCopied(null), 2000);
    }).catch(() => {});
  }

  const stats = useMemo(() => (input ? getJsonStats(input) : null), [input]);

  const clearError = useCallback(() => {
    setError(null);
    setShowErrorPanel(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch((s) => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  // Populate table data when switching to table tab
  useEffect(() => {
    if (activeTab === "table" && input) {
      try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) {
          const items = parsed.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item));
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTableData(items);
          const hdrs = [...new Set(items.flatMap((item) => Object.keys(item)))];
           
          setTableHeaders(hdrs);
        }
      } catch { /* ignore */ }
    }
  }, [activeTab, input]);

  // Sync wizard to query
  useEffect(() => {
    const q = buildQueryFromWizard(wizard);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTransformQuery(q);
  }, [wizard]);

  // Auto-run transform preview — executes inside a Web Worker for DOM isolation.
  useEffect(() => {
    if (activeTab !== "transform" || !input) return;
    let cancelled = false;
    (async () => {
      try {
        const data = JSON.parse(input);
        if (!Array.isArray(data)) throw new Error("Transform requires an array as input");
        const result = await runTransformQuery(data, transformQuery);
        if (cancelled) return;
         
        setTransformPreview(result);
         
        setTransformError(null);
      } catch (e) {
        if (cancelled) return;
         
        setTransformError((e as Error).message);
         
        setTransformPreview(null);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, input, transformQuery]);

  const handleFormat = useCallback(async () => {
    clearError();
    setFixResult(null);
    setJsonFormatBusy(true);
    try {
      const result = await formatJsonWorkspace(input, "format");
      if (result.error) {
        const err = parseJsonError(input);
        if (err) {
          setError(err);
          setShowErrorPanel(true);
          trackToolError(TOOL_SLUG, "format", err.message);
        }
      } else {
        setOutput(result.output);
        trackToolSuccess(TOOL_SLUG, "format", { worker: result.usedWorker ?? false });
      }
    } finally {
      setJsonFormatBusy(false);
    }
  }, [input, clearError]);

  const handleMinify = useCallback(async () => {
    clearError();
    setFixResult(null);
    setJsonFormatBusy(true);
    try {
      const result = await formatJsonWorkspace(input, "minify");
      if (result.error) {
        const err = parseJsonError(input);
        if (err) {
          setError(err);
          setShowErrorPanel(true);
          trackToolError(TOOL_SLUG, "minify", err.message);
        }
      } else {
        setOutput(result.output);
        trackToolSuccess(TOOL_SLUG, "minify", { worker: result.usedWorker ?? false });
      }
    } finally {
      setJsonFormatBusy(false);
    }
  }, [input, clearError]);

  const handleFix = useCallback(async () => {
    clearError();
    const original = input;
    setJsonWorkspaceBusy(true);
    try {
      const r = await runJsonWorkspaceOp({ op: "repair", input });
      if (!r.ok || !r.fixResult) {
        setError({ message: r.ok ? "Repair failed" : r.error, line: 1, column: 1 });
        setShowErrorPanel(true);
        trackToolError(TOOL_SLUG, "auto_fix", r.ok ? "Repair failed" : r.error);
        return;
      }
      const result = r.fixResult;
      setInputWithHistory(result.text);
      if (result.success) {
        const pretty = await runJsonWorkspaceOp({ op: "format", input: result.text });
        if (pretty.ok && pretty.output) setOutput(pretty.output);
        setFixResult({ ...result, original });
        trackToolSuccess(TOOL_SLUG, "auto_fix", {
          fixes: result.fixes.length,
          worker: r.usedWorker,
        });
      } else {
        setFixResult({ ...result, original, success: false });
        const err = parseJsonError(result.text);
        if (err) {
          setError(err);
          setShowErrorPanel(true);
          trackToolError(TOOL_SLUG, "auto_fix", err.message);
        }
      }
    } finally {
      setJsonWorkspaceBusy(false);
    }
  }, [input, clearError, setInputWithHistory]);

  const handleLoadFromUrl = useCallback(async () => {
    setLoadUrlBusy(true);
    setLoadUrlError("");
    const result = await fetchRemoteJsonForWorkspace(loadUrlInput);
    setLoadUrlBusy(false);
    if (result.ok) {
      setInputWithHistory(result.text);
      setShowLoadUrl(false);
      trackToolSuccess(TOOL_SLUG, "load_url", { via: "panel" });
    } else {
      setLoadUrlError(result.error);
      trackToolError(TOOL_SLUG, "load_url", result.error);
    }
  }, [loadUrlInput, setInputWithHistory]);

  const handleTryRepairExample = useCallback(
    (broken: string) => {
      setActiveTab("format");
      setInputWithHistory(broken);
      setFixResult(null);
      clearError();
    },
    [setInputWithHistory, clearError],
  );

  const handleJsonQuickAction = useCallback(
    (action: "validate" | "repair" | "minify") => {
      setActiveTab("format");
      if (action === "validate") void handleFormat();
      else if (action === "repair") void handleFix();
      else void handleMinify();
    },
    [handleFormat, handleFix, handleMinify],
  );

  const handleCopy = useCallback(async () => {
    const textToCopy = activeTab === "convert" || activeTab === "format" || activeTab === "generate" ? output : input;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackToolCopy(TOOL_SLUG, activeTab);
  }, [output, input, activeTab]);

  const copyJsonWorkspaceShareLink = useCallback(async () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const simpleShare =
      activeTab === "format" &&
      !schemaText.trim() &&
      !diffLeft.trim() &&
      !diffRight.trim();
    const queryUrl = simpleShare ? buildJsonQueryShareUrl(origin, pathname, input) : null;
    const fragment = encodeJsonWorkspaceState({
      v: 2,
      input,
      schemaText,
      activeTab,
      diffLeft,
      diffRight,
    });
    if (!queryUrl && jsonWorkspaceShareTooLong(fragment)) {
      window.alert(
        "This workspace is too large to pack into a URL. Shorten the JSON or copy sections manually.",
      );
      return;
    }
    const url = queryUrl ?? `${origin}${pathname}${fragment}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.alert("Could not copy to clipboard. Your browser may block clipboard access.");
    }
  }, [input, schemaText, activeTab, diffLeft, diffRight]);

  const saveCurrentJsonPreset = useCallback(() => {
    const name = window.prompt("Name for this workspace preset", "My JSON workspace");
    if (name === null) return;
    upsertJsonPreset({
      name: name.trim() || "Untitled",
      input,
      schemaText,
      activeTab,
      diffLeft,
      diffRight,
    });
    setJsonPresets(loadJsonPresets());
    setPresetsRevision((n) => n + 1);
  }, [input, schemaText, activeTab, diffLeft, diffRight]);

  const loadPresetById = useCallback(
    (id: string) => {
      const p = jsonPresets.find((x) => x.id === id);
      if (!p) return;
      skipHistoryRef.current = true;
      setInput(p.input);
      setSchemaText(p.schemaText);
      setActiveTab(p.activeTab);
      setDiffLeft(p.diffLeft);
      setDiffRight(p.diffRight);
      if (p.schemaText.trim()) setShowSchemaPanel(true);
    },
    [jsonPresets],
  );

  const handleClear = useCallback(() => {
    setInputWithHistory("");
    setOutput("");
    clearError();
    setFixResult(null);
    setDiffLeft("");
    setDiffRight("");
    setSchemaErrors(null);
    setSchemaValid(false);
    setSchemaValidatedAt(null);
  }, [clearError, setInputWithHistory]);

  const applyJsonWorkspaceOutput = useCallback(
    async (op: Parameters<typeof runJsonWorkspaceOp>[0], updateInput: boolean) => {
      clearError();
      setJsonWorkspaceBusy(true);
      try {
        const r = await runJsonWorkspaceOp(op);
        if (r.ok && r.output !== undefined) {
          if (updateInput) setInputWithHistory(r.output);
          setOutput(r.output);
        } else {
          const err = parseJsonError(input);
          if (err) {
            setError(err);
            setShowErrorPanel(true);
          } else if (!r.ok) {
            setError({ message: r.error, line: 1, column: 1 });
            setShowErrorPanel(true);
          }
        }
      } finally {
        setJsonWorkspaceBusy(false);
      }
    },
    [input, clearError, setInputWithHistory],
  );

  const handleSortKeys = useCallback(() => {
    void applyJsonWorkspaceOutput({ op: "sortKeys", input }, true);
  }, [applyJsonWorkspaceOutput, input]);

  const handleRemoveNulls = useCallback(() => {
    void applyJsonWorkspaceOutput({ op: "removeNulls", input }, true);
  }, [applyJsonWorkspaceOutput, input]);

  const handleFlatten = useCallback(() => {
    void applyJsonWorkspaceOutput({ op: "flatten", input }, false);
  }, [applyJsonWorkspaceOutput, input]);

  const handleUnflatten = useCallback(() => {
    void applyJsonWorkspaceOutput({ op: "unflatten", input }, false);
  }, [applyJsonWorkspaceOutput, input]);

  const handleNdjson = useCallback(() => {
    const mode = input.trim().startsWith("[") ? "to" : "from";
    void applyJsonWorkspaceOutput({ op: "ndjson", input, mode }, false);
  }, [applyJsonWorkspaceOutput, input]);

  const handleEncrypt = useCallback(async () => {
    if (!encryptPassword) return;
    clearError();
    try {
      JSON.parse(input);
      const encrypted = await encryptJson(input, encryptPassword);
      setOutput(encrypted);
    } catch (e) {
      setError({ message: (e as Error).message, line: 1, column: 1 });
      setShowErrorPanel(true);
    }
  }, [input, encryptPassword, clearError]);

  const handleDecrypt = useCallback(async () => {
    if (!encryptPassword) return;
    clearError();
    try {
      const decrypted = await decryptJson(input.trim(), encryptPassword);
      JSON.parse(decrypted);
      setInputWithHistory(decrypted);
      setOutput(JSON.stringify(JSON.parse(decrypted), null, 2));
    } catch {
      setError({ message: "Decryption failed. Wrong password or invalid data.", line: 1, column: 1 });
      setShowErrorPanel(true);
    }
  }, [input, encryptPassword, clearError, setInputWithHistory]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setInputWithHistory(text);
      clearError();
      try {
        const parsed = JSON.parse(text);
        setOutput(JSON.stringify(parsed, null, 2));
      } catch { /* user can fix manually */ }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [clearError, setInputWithHistory]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setInputWithHistory(text);
      clearError();
      try {
        const parsed = JSON.parse(text);
        setOutput(JSON.stringify(parsed, null, 2));
      } catch { /* user can fix manually */ }
    };
    reader.readAsText(file);
  }, [clearError, setInputWithHistory]);

  const handleImportConvert = useCallback(() => {
    clearError();
    try {
      let result: unknown;
      switch (importType) {
        case "yaml": result = yaml.load(importText); break;
        case "csv": {
          const lines = importText.trim().split("\n");
          const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
          result = lines.slice(1).map((line) => {
            const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
            return obj;
          });
          break;
        }
        case "env": result = envToJson(importText); break;
        case "base64": {
          const decoded = atob(importText.trim());
          result = JSON.parse(decoded);
          break;
        }
        case "jsonc": {
          const json = jsoncToJson(importText);
          setInputWithHistory(json);
          setOutput(json);
          setShowImport(false);
          setImportText("");
          return;
        }
        case "jwt": {
          result = decodeJwt(importText);
          break;
        }
      }
      const json = JSON.stringify(result, null, 2);
      setInputWithHistory(json);
      setOutput(json);
      setShowImport(false);
      setImportText("");
    } catch (e) {
      setError({ message: `Import failed: ${(e as Error).message}`, line: 1, column: 1 });
      setShowErrorPanel(true);
    }
  }, [importType, importText, clearError, setInputWithHistory]);

  const formatPastedJson = useCallback(async (raw: string) => {
    const r = await runJsonWorkspaceOp({ op: "format", input: raw });
    if (r.ok && r.output) return r.output;
    throw new Error(r.ok ? "Invalid JSON" : r.error);
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (autoFormat) {
        const text = e.clipboardData.getData("text");
        e.preventDefault();
        void (async () => {
          try {
            const pretty = await formatPastedJson(text);
            setInputWithHistory(pretty);
            setOutput(pretty);
            clearError();
          } catch {
            setInputWithHistory(text);
            const err = parseJsonError(text);
            if (err) {
              setError(err);
              setShowErrorPanel(true);
            }
          }
          requestAnimationFrame(() => {
            const ta = inputRef.current;
            if (ta) syncInputEditorOverlays({ value: ta.value, selectionStart: ta.selectionStart });
          });
        })();
      }
    },
    [autoFormat, clearError, setInputWithHistory, syncInputEditorOverlays, formatPastedJson],
  );

  const handleConvert = useCallback(() => {
    clearError();
    try {
      const parsed = JSON.parse(input);
      switch (convertTarget) {
        case "yaml": setOutput(yaml.dump(parsed, { indent: 2, lineWidth: 120 })); break;
        case "csv": setOutput(jsonToCsv(parsed)); break;
        case "typescript": setOutput(jsonToTypeScript(parsed)); break;
        case "env": setOutput(jsonToEnv(parsed)); break;
        case "base64": setOutput(btoa(unescape(encodeURIComponent(input)))); break;
        case "xml": setOutput(jsonToXmlExport(parsed)); break;
        case "toml": setOutput(jsonToToml(parsed)); break;
        case "urlencoded": setOutput(jsonToUrlEncoded(parsed)); break;
        case "schema": setOutput(JSON.stringify(generateJsonSchema(parsed), null, 2)); break;
        case "htmlform": setOutput(generateHtmlForm(parsed)); break;
        case "tableview": setOutput(generateTableView(parsed)); break;
        case "mockdata": setOutput(JSON.stringify(generateMockData(parsed), null, 2)); break;
        case "sql": setOutput(jsonToSql(parsed)); break;
        case "python": setOutput(jsonToPython(parsed)); break;
        case "stringify": setOutput(jsonToStringify(input)); break;
      }
    } catch {
      const err = parseJsonError(input);
      if (err) { setError(err); setShowErrorPanel(true); }
    }
  }, [input, convertTarget, clearError]);

  useEffect(() => {
    if ((activeTab === "convert" || activeTab === "generate") && input) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleConvert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convertTarget]);

  const diffResult = useMemo(() => {
    if (!diffLeft.trim() || !diffRight.trim()) return null;
    try {
      const a = JSON.stringify(JSON.parse(diffLeft), null, 2);
      const b = JSON.stringify(JSON.parse(diffRight), null, 2);
      return computeDiff(a, b);
    } catch {
      return null;
    }
  }, [diffLeft, diffRight]);

  const syncParsedForTree = useMemo(() => {
    if (!input.trim()) return undefined;
    if (shouldUseJsonWorker(input)) return null;
    try {
      return JSON.parse(input) as unknown;
    } catch {
      return undefined;
    }
  }, [input]);

  useEffect(() => {
    if (!shouldUseJsonWorker(input) || !input.trim()) return;
    let cancelled = false;
    void runJsonWorkspaceOp({ op: "parse", input }).then((r) => {
      if (!cancelled) setWorkerParsedForTree(r.ok ? r.parsed : undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [input]);

  const parsedForTree =
    syncParsedForTree === null ? workerParsedForTree : syncParsedForTree;

  const selectedNodeValue = useMemo(() => {
    if (selectedTreePath === null || parsedForTree === undefined) return undefined;
    let v: unknown = parsedForTree;
    for (const key of selectedTreePath) {
      if (v === null || typeof v !== "object") return undefined;
      v = (v as Record<string | number, unknown>)[key];
    }
    return v;
  }, [selectedTreePath, parsedForTree]);

  const treeMatchCount = useMemo(() => {
    if (!treeSearchTerm || parsedForTree === undefined) return 0;
    // Pass empty string as root key so the virtual "root" label never produces a false match.
    if (Array.isArray(parsedForTree))
      return parsedForTree.reduce((n: number, item, i) => n + countTreeMatches(item, String(i), treeSearchTerm), 0);
    if (parsedForTree !== null && typeof parsedForTree === "object")
      return Object.entries(parsedForTree as Record<string, unknown>).reduce(
        (n: number, [k, v]) => n + countTreeMatches(v, k, treeSearchTerm), 0
      );
    return countTreeMatches(parsedForTree, "", treeSearchTerm);
  }, [treeSearchTerm, parsedForTree]);

  // Context menu actions
  const handleContextAction = useCallback((action: string, ctx: ContextMenuState) => {
    if (!parsedForTree) return;
    let newData: unknown = parsedForTree;

    switch (action) {
      case "copy": {
        const val = deepGet(parsedForTree, ctx.path);
        void navigator.clipboard.writeText(JSON.stringify(val, null, 2)).catch(() => {});
        return;
      }
      case "copyPath": {
        const jsonpath = ctx.path.length === 0 ? "$" : "$" + ctx.path.map((p) =>
          typeof p === "number" ? `[${p}]` : /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(String(p)) ? `.${p}` : `["${p}"]`
        ).join("");
        void navigator.clipboard.writeText(jsonpath).catch(() => {});
        return;
      }
      case "paste": {
        navigator.clipboard.readText().then((text) => {
          try {
            const pasted = JSON.parse(text);
            const updated = deepInsert(parsedForTree, ctx.path, "pasted", pasted);
            setInputWithHistory(JSON.stringify(updated, null, 2));
          } catch { /* invalid clipboard content */ }
        });
        return;
      }
      case "extract": {
        const val = deepGet(parsedForTree, ctx.path);
        setInputWithHistory(JSON.stringify(val, null, 2));
        return;
      }
      case "remove": {
        newData = deepDelete(parsedForTree, ctx.path);
        break;
      }
      case "duplicate": {
        const parentPath = ctx.path.slice(0, -1);
        const parent = parentPath.length > 0 ? deepGet(parsedForTree, parentPath) : parsedForTree;
        const val = deepGet(parsedForTree, ctx.path);
        if (Array.isArray(parent)) {
          newData = deepInsert(parsedForTree, parentPath, parent.length, JSON.parse(JSON.stringify(val)));
        } else if (typeof parent === "object" && parent !== null) {
          const key = String(ctx.path[ctx.path.length - 1]);
          const newKey = key + "_copy";
          newData = deepInsert(parsedForTree, parentPath, newKey, JSON.parse(JSON.stringify(val)));
        }
        break;
      }
      case "sort": {
        const val = deepGet(parsedForTree, ctx.path);
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          const sorted = sortKeysDeep(val);
          newData = deepSet(parsedForTree, ctx.path, sorted);
        } else if (Array.isArray(val)) {
          const sorted = [...val].sort((a, b) => {
            if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
            if (typeof a === "number" && typeof b === "number") return a - b;
            return String(a).localeCompare(String(b));
          });
          newData = deepSet(parsedForTree, ctx.path, sorted);
        }
        break;
      }
      case "insertObject": {
        newData = deepInsert(parsedForTree, ctx.path, "newObject", {});
        break;
      }
      case "insertArray": {
        newData = deepInsert(parsedForTree, ctx.path, "newArray", []);
        break;
      }
      case "insertValue": {
        newData = deepInsert(parsedForTree, ctx.path, "newValue", "");
        break;
      }
      case "editValue": {
        const currentVal = deepGet(parsedForTree, ctx.path);
        const newValStr = prompt("Edit value (JSON-compatible):", typeof currentVal === "string" ? currentVal : JSON.stringify(currentVal));
        if (newValStr === null) return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(newValStr);
        } catch {
          parsed = newValStr;
        }
        newData = deepSet(parsedForTree, ctx.path, parsed);
        break;
      }
      case "editKey": {
        if (ctx.path.length === 0) return;
        const oldKey = String(ctx.path[ctx.path.length - 1]);
        const newKey = prompt("Rename key:", oldKey);
        if (!newKey || newKey === oldKey) return;
        const parentPath = ctx.path.slice(0, -1);
        const parent = parentPath.length > 0 ? deepGet(parsedForTree, parentPath) : parsedForTree;
        if (typeof parent === "object" && parent !== null && !Array.isArray(parent)) {
          const entries = Object.entries(parent as Record<string, unknown>);
          const rebuilt: Record<string, unknown> = {};
          for (const [k, v] of entries) {
            rebuilt[k === oldKey ? newKey : k] = v;
          }
          newData = parentPath.length > 0 ? deepSet(parsedForTree, parentPath, rebuilt) : rebuilt;
        }
        break;
      }
      default:
        return;
    }

    setInputWithHistory(JSON.stringify(newData, null, 2));
  }, [parsedForTree, setInputWithHistory]);

  // Table functions
  const sortedFilteredTable = useMemo(() => {
    let data = [...tableData];
    if (tableFilter) {
      const lower = tableFilter.toLowerCase();
      data = data.filter((row) =>
        Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(lower))
      );
    }
    if (tableSortCol) {
      data.sort((a, b) => {
        const va = a[tableSortCol] ?? "";
        const vb = b[tableSortCol] ?? "";
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return tableSortDir === "desc" ? -cmp : cmp;
      });
    }
    return data;
  }, [tableData, tableFilter, tableSortCol, tableSortDir]);

  const handleTableCellSave = useCallback(() => {
    if (!editingCell) return;
    setTableData((prev) => {
      const next = [...prev];
      const row = { ...next[editingCell.row] };
      let val: unknown = editingCellValue;
      if (editingCellValue === "null") val = null;
      else if (editingCellValue === "true") val = true;
      else if (editingCellValue === "false") val = false;
      else if (!isNaN(Number(editingCellValue)) && editingCellValue.trim() !== "") val = Number(editingCellValue);
      row[editingCell.col] = val;
      next[editingCell.row] = row;
      return next;
    });
    setEditingCell(null);
  }, [editingCell, editingCellValue]);

  const handleTableApply = useCallback(() => {
    setInputWithHistory(JSON.stringify(tableData, null, 2));
  }, [tableData, setInputWithHistory]);

  const handleTableAddRow = useCallback(() => {
    const emptyRow: Record<string, unknown> = {};
    for (const h of tableHeaders) emptyRow[h] = "";
    setTableData((prev) => [...prev, emptyRow]);
  }, [tableHeaders]);

  const handleTableDeleteRow = useCallback((idx: number) => {
    setTableData((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleTransformApply = useCallback(() => {
    if (transformPreview !== null && transformPreview !== undefined) {
      setInputWithHistory(JSON.stringify(transformPreview, null, 2));
    }
  }, [transformPreview, setInputWithHistory]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "format", label: "Format", icon: <Braces size={16} /> },
    { id: "tree", label: "Tree View", icon: <TreePine size={16} /> },
    { id: "diff", label: "Diff", icon: <GitCompareArrows size={16} /> },
    { id: "convert", label: "Convert", icon: <ArrowRightLeft size={16} /> },
    { id: "generate", label: "Generate", icon: <Sparkles size={16} /> },
    { id: "transform", label: "Transform", icon: <Filter size={16} /> },
    { id: "table", label: "Table", icon: <Table2 size={16} /> },
  ];

  const errorLine = error?.line ?? -1;
  const inputLines = input.split("\n");
  const bracketOpenLC = bracketHighlight ? charOffsetToLineCol(input, bracketHighlight.open) : null;
  const bracketCloseLC = bracketHighlight ? charOffsetToLineCol(input, bracketHighlight.close) : null;
  const mirrorOverlaySimple = input.length > 200_000;
  const showInputMirrorOverlay = activeInputLine !== null;
  const inputEditorTextareaClass = `resize-none text-foreground font-mono text-sm p-4 outline-none leading-[1.625] [tab-size:2] scrollbar-thin ${
    showInputMirrorOverlay ? "relative z-10 bg-transparent caret-foreground" : "bg-background"
  }`;

  const nodeCounter = useRef({ current: 0 });

  const handleTreeUpdate = useCallback((path: (string | number)[], newValue: unknown) => {
    if (!parsedForTree || path.length === 0) return;
    const updated = deepSet(parsedForTree, path, newValue);
    setInputWithHistory(JSON.stringify(updated, null, 2));
  }, [parsedForTree, setInputWithHistory]);

  const handleTreeContextMenu = useCallback((e: React.MouseEvent, ctx: ContextMenuState) => {
    setContextMenu(ctx);
  }, []);

  const wizardFields = useMemo(() => {
    try {
      const data = JSON.parse(input);
      return getFieldsFromData(data);
    } catch {
      return [];
    }
  }, [input]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <main id="main" tabIndex={-1} className="flex min-h-0 flex-1 flex-col outline-none">
      {/* Workspace header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <FileJson size={22} className="text-accent" />
          <h1 className="text-lg font-semibold text-foreground tracking-tight">JSON Toolkit</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <ClipboardPaste size={14} />
            <span className="hidden sm:inline">Auto-format on paste</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoFormat}
              onClick={() => setAutoFormat(!autoFormat)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoFormat ? "bg-accent" : "bg-muted"}`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${autoFormat ? "translate-x-[18px]" : "translate-x-[3px]"}`}
              />
            </button>
          </label>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-card px-4 shrink-0">
        <nav className="flex gap-1 overflow-x-auto" role="tablist">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <JsonQuickNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onQuickAction={handleJsonQuickAction}
      />

      {/* Toolbar */}
      <div className="border-b border-border bg-card px-4 py-2 flex flex-wrap items-center gap-1.5 shrink-0">
        {activeTab === "format" && (
          <>
            <ToolButton
              onClick={() => void handleFormat()}
              icon={<Braces size={15} />}
              label={jsonFormatBusy ? "Formatting…" : "Format"}
            />
            <ToolButton
              onClick={() => void handleMinify()}
              icon={<Minimize2 size={15} />}
              label={jsonFormatBusy ? "Compacting…" : "Compact"}
            />
            {shouldUseJsonWorker(input) && (
              <span
                className="text-[10px] text-muted-foreground px-1"
                title="Large payload — CPU work runs in a background Web Worker so the UI stays responsive"
              >
                Worker
              </span>
            )}
            <ToolButton
              onClick={() => void handleFix()}
              icon={<Wrench size={15} />}
              label={jsonWorkspaceBusy ? "Fixing…" : "Fix"}
              variant="warning"
            />
            <div className="w-px h-5 bg-border mx-0.5" />
            <ToolButton onClick={handleSortKeys} icon={<SortAsc size={15} />} label="Sort Keys" />
            <ToolButton onClick={handleRemoveNulls} icon={<Eraser size={15} />} label="Remove Nulls" />
            <ToolButton onClick={handleFlatten} icon={<Layers size={15} />} label="Flatten" />
            <ToolButton onClick={handleUnflatten} icon={<Expand size={15} />} label="Unflatten" />
            <ToolButton onClick={handleNdjson} icon={<Shuffle size={15} />} label="NDJSON" />
            <div className="w-px h-5 bg-border mx-0.5" />
          </>
        )}
        {activeTab === "tree" && (
          <>
            <ToolButton onClick={() => setExpandAllSignal((s) => s + 1)} icon={<ChevronsUpDown size={15} />} label="Expand All" />
            <ToolButton onClick={() => setCollapseAllSignal((s) => s + 1)} icon={<ChevronsDownUp size={15} />} label="Collapse All" />
            <div className="w-px h-5 bg-border mx-0.5" />
          </>
        )}
        {activeTab === "convert" && (
          <>
            <span className="text-xs text-muted-foreground font-medium">Export:</span>
            <select
              value={convertTarget}
              onChange={(e) => setConvertTarget(e.target.value as ConvertTarget)}
              className="text-sm bg-muted text-foreground border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-ring"
            >
              <optgroup label="Data Formats">
                <option value="yaml">YAML</option>
                <option value="csv">CSV</option>
                <option value="xml">XML</option>
                <option value="toml">TOML</option>
                <option value="sql">SQL</option>
                <option value="env">.env</option>
                <option value="base64">Base64</option>
                <option value="urlencoded">URL-encoded</option>
              </optgroup>
              <optgroup label="Code">
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="stringify">JSON Stringify</option>
              </optgroup>
            </select>
            <ToolButton onClick={handleConvert} icon={<ArrowRightLeft size={15} />} label="Convert" />
            <div className="w-px h-5 bg-border mx-0.5" />
            <ToolButton onClick={() => setShowImport(!showImport)} icon={<Upload size={15} />} label="Import" />
            <div className="w-px h-5 bg-border mx-0.5" />
          </>
        )}
        {activeTab === "generate" && (
          <>
            <select
              value={convertTarget}
              onChange={(e) => setConvertTarget(e.target.value as ConvertTarget)}
              className="text-sm bg-muted text-foreground border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="schema">JSON Schema</option>
              <option value="typescript">TypeScript Interfaces</option>
              <option value="htmlform">HTML Form</option>
              <option value="tableview">Table View (Markdown)</option>
              <option value="mockdata">Mock Data (x5)</option>
            </select>
            <ToolButton onClick={handleConvert} icon={<Sparkles size={15} />} label="Generate" />
            <div className="w-px h-5 bg-border mx-0.5" />
          </>
        )}
        <ToolButton onClick={handleUndo} icon={<Undo2 size={15} />} label="Undo" />
        <ToolButton onClick={handleRedo} icon={<Redo2 size={15} />} label="Redo" />
        <div className="w-px h-5 bg-border mx-0.5" />
        <ToolButton onClick={() => setShowLoadUrl(!showLoadUrl)} icon={<Upload size={15} />} label="Load URL" />
        <ToolButton onClick={() => setShowSearch(!showSearch)} icon={<Search size={15} />} label="Find" />
        <ToolButton onClick={() => setShowSchemaPanel(!showSchemaPanel)} icon={<ShieldCheck size={15} />} label="Validate Schema" />
        <ToolButton
          onClick={() => void copyJsonWorkspaceShareLink()}
          icon={shareCopied ? <Check size={15} /> : <Share2 size={15} />}
          label={shareCopied ? "Link copied" : "Share link"}
          variant={shareCopied ? "success" : "default"}
        />
        <ToolPageActions
          slug="json-formatter"
          getContent={() => input}
          getContent2={() => output}
          vaultTitle="JSON workspace"
        />
        <div
          className="flex items-center gap-1 shrink-0 max-sm:flex-wrap"
          title="Presets are stored only in this browser (not sent to a server)."
        >
          <Library size={14} className="text-muted-foreground shrink-0" aria-hidden />
          <select
            value=""
            onChange={(e) => {
              const id = e.target.value;
              e.target.value = "";
              if (id) loadPresetById(id);
            }}
            className="max-w-[10rem] truncate text-xs bg-muted text-foreground border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring"
            aria-label="Load saved JSON workspace preset"
          >
            <option value="">Presets</option>
            {jsonPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ToolButton onClick={saveCurrentJsonPreset} icon={<BookmarkPlus size={15} />} label="Save preset" />
          {jsonPresets.length > 0 ? (
            <select
              key={`rm-${presetsRevision}`}
              defaultValue=""
              aria-label="Delete saved preset"
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                if (window.confirm("Remove this preset from this browser?")) {
                  deleteJsonPreset(id);
                  setJsonPresets(loadJsonPresets());
                  setPresetsRevision((n) => n + 1);
                }
                e.currentTarget.selectedIndex = 0;
              }}
              className="max-w-[8rem] truncate text-xs bg-muted text-foreground border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring text-destructive"
            >
              <option value="">Remove…</option>
              {jsonPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <ToolButton
          onClick={handleCopy}
          icon={copied ? <Check size={15} /> : <Copy size={15} />}
          label={copied ? "Copied!" : "Copy"}
          variant={copied ? "success" : "default"}
        />
        <ToolButton onClick={() => setShowEncrypt(!showEncrypt)} icon={<Lock size={15} />} label="Encrypt" />
        <div className="w-px h-5 bg-border mx-0.5" />
        <ToolButton onClick={() => fileInputRef.current?.click()} icon={<Upload size={15} />} label="File" />
        <ToolButton onClick={handleClear} icon={<Trash2 size={15} />} label="Clear" variant="danger" />
        <input ref={fileInputRef} type="file" accept=".json,.txt" className="hidden" onChange={handleFileUpload} />
        <div className="w-px h-5 bg-border mx-0.5" />
        <button
          onClick={() => setSplitView((v) => !v)}
          title="Toggle split view (JSON + Tree side by side)"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${splitView ? "bg-accent text-accent-foreground" : "bg-muted hover:bg-accent-light text-foreground"}`}
        >
          <Columns2 size={15} />
          Split
        </button>
      </div>

      {/* Search & Replace bar */}
      {showSearch && (
        <div className="border-b border-border bg-card px-4 py-2 flex flex-wrap items-center gap-2 shrink-0 animate-fade-in">
          <Search size={14} className="text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentMatchIndex(0); }}
            placeholder="Search..."
            aria-label="Search text"
            className="px-2.5 py-1 text-sm rounded-md border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring/40 w-40"
            autoFocus
          />
          <span className="text-xs text-muted-foreground min-w-[70px]">
            {searchMatches.length > 0 ? `${(currentMatchIndex % searchMatches.length) + 1} of ${searchMatches.length}` : "No matches"}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMatchIndex((i) => (i - 1 + searchMatches.length) % Math.max(searchMatches.length, 1))}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Previous match"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMatchIndex((i) => (i + 1) % Math.max(searchMatches.length, 1))}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Next match"
          >
            <ChevronRight size={14} />
          </button>
          <div className="w-px h-5 bg-border mx-0.5" />
          <Replace size={14} className="text-muted-foreground" />
          <input
            type="text"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="Replace..."
            aria-label="Replace text"
            className="px-2.5 py-1 text-sm rounded-md border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring/40 w-40"
          />
          <ToolButton onClick={handleSearchReplace} icon={<Replace size={13} />} label="Replace" />
          <ToolButton onClick={handleSearchReplaceAll} icon={<Replace size={13} />} label="All" />
          <div className="w-px h-5 bg-border mx-0.5" />
          <button
            type="button"
            onClick={() => setSearchCaseSensitive(!searchCaseSensitive)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${searchCaseSensitive ? "border-accent text-accent bg-accent-light" : "border-border text-muted-foreground hover:text-foreground"}`}
            aria-label="Toggle case sensitive"
            aria-pressed={searchCaseSensitive}
          >
            Aa
          </button>
          <button
            type="button"
            onClick={() => setSearchRegex(!searchRegex)}
            className={`px-2 py-1 text-xs rounded border transition-colors font-mono ${searchRegex ? "border-accent text-accent bg-accent-light" : "border-border text-muted-foreground hover:text-foreground"}`}
            aria-label="Toggle regex"
            aria-pressed={searchRegex}
          >
            .*
          </button>
          <button type="button" aria-label="Close search" onClick={() => setShowSearch(false)} className="ml-auto text-muted-foreground hover:text-foreground"><X size={14} /></button>
        </div>
      )}

      {/* Schema Validation panel */}
      {showSchemaPanel && (
        <div className="border-b border-border bg-card px-4 py-3 space-y-2 shrink-0 animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">JSON Schema Validation</span>
            <ToolButton onClick={handleSchemaValidate} icon={<Check size={14} />} label="Validate" />
            <button
              type="button"
              aria-label="Close schema panel"
              onClick={() => setShowSchemaPanel(false)}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The <strong className="text-foreground">main editor above</strong> is the JSON instance. Paste only your{" "}
            <strong className="text-foreground">JSON Schema</strong> here, then Validate — you do not re-paste the document.
            {showSchemaPanel && schemaText.trim() ? (
              <span className="block mt-1 text-[11px]">
                With this panel open, validation runs automatically after you stop typing (about half a second).
              </span>
            ) : null}
          </p>
          {schemaValidatedAt !== null ? (
            <p className="text-[11px] text-muted-foreground">
              Last checked{" "}
              {new Date(schemaValidatedAt).toLocaleString(undefined, {
                dateStyle: "short",
                timeStyle: "medium",
              })}
            </p>
          ) : null}
          <textarea
            value={schemaText}
            onChange={(e) => setSchemaText(e.target.value)}
            placeholder='Paste JSON Schema here...\n{\n  "type": "object",\n  "properties": { ... }\n}'
            rows={5}
            spellCheck={false}
            className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring/40 placeholder:text-muted-foreground/40 scrollbar-thin"
          />
          {schemaErrors !== null && (
            <div className={`rounded-md px-3 py-2 text-xs ${schemaValid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {schemaValid ? (
                <div className="flex items-center gap-1.5"><Check size={14} /> Valid! JSON matches the schema.</div>
              ) : (
                <div className="space-y-1">
                  <div className="font-medium">{schemaErrors.length} validation error{schemaErrors.length !== 1 ? "s" : ""}:</div>
                  {schemaErrors.slice(0, 20).map((err, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="font-mono text-destructive/70 shrink-0">{err.path || "/"}</span>
                      <span>{err.message}</span>
                    </div>
                  ))}
                  {schemaErrors.length > 20 && <div className="italic">...and {schemaErrors.length - 20} more</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Encrypt/Decrypt panel */}
      {showEncrypt && (
        <div className="border-b border-border bg-card px-4 py-2.5 flex flex-wrap items-center gap-2 shrink-0 animate-fade-in">
          <Lock size={14} className="text-muted-foreground" />
          <input
            type="password"
            value={encryptPassword}
            onChange={(e) => setEncryptPassword(e.target.value)}
            placeholder="Password"
            className="px-2.5 py-1 text-sm rounded-md border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring/40 w-40"
          />
          <ToolButton onClick={handleEncrypt} icon={<Lock size={14} />} label="Encrypt" />
          <ToolButton onClick={handleDecrypt} icon={<Unlock size={14} />} label="Decrypt" />
          <span className="text-xs text-muted-foreground">AES-256-GCM - client-side only</span>
          <button aria-label="Close encrypt panel" onClick={() => setShowEncrypt(false)} className="ml-auto text-muted-foreground hover:text-foreground"><X size={14} /></button>
        </div>
      )}

      {highlightRepairExamples && activeTab === "format" && (
        <div className="border-b border-border bg-card px-4 py-2.5 shrink-0">
          <JsonRepairExamples onTryExample={handleTryRepairExample} />
        </div>
      )}

      {showLoadUrl && (
        <JsonLoadUrlPanel
          url={loadUrlInput}
          busy={loadUrlBusy}
          error={loadUrlError}
          onUrlChange={setLoadUrlInput}
          onLoad={() => void handleLoadFromUrl()}
          onClose={() => setShowLoadUrl(false)}
        />
      )}

      {/* Import panel */}
      {showImport && (
        <div className="border-b border-border bg-card px-4 py-3 space-y-2 shrink-0 animate-fade-in">
          <div className="flex items-center gap-2">
            <Upload size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium">Import to JSON from:</span>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value as typeof importType)}
              className="text-xs bg-muted text-foreground border border-border rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="yaml">YAML</option>
              <option value="csv">CSV</option>
              <option value="env">.env</option>
              <option value="base64">Base64</option>
              <option value="jsonc">JSONC / JSON5</option>
              <option value="jwt">JWT Token</option>
            </select>
            <ToolButton onClick={handleImportConvert} icon={<ArrowRightLeft size={14} />} label="Convert to JSON" />
            <button aria-label="Close import panel" onClick={() => setShowImport(false)} className="ml-auto text-muted-foreground hover:text-foreground"><X size={14} /></button>
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={
              importType === "yaml" ? "key: value\nnested:\n  child: 1"
              : importType === "csv" ? "name,age\nAlice,30\nBob,25"
              : importType === "env" ? "DB_HOST=localhost\nDB_PORT=5432"
              : importType === "jsonc" ? '// JSON with Comments (JSONC / JSON5)\n{\n  "name": "Alice", // trailing comma ok\n  "scores": [1, 2, 3,]\n}'
              : importType === "jwt" ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
              : "eyJrZXkiOiJ2YWx1ZSJ9"
            }
            rows={4}
            spellCheck={false}
            className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring/40 placeholder:text-muted-foreground/40 scrollbar-thin"
          />
        </div>
      )}

      {/* Fix result banner */}
      {fixResult && (fixResult.fixes.length > 0 || fixResult.success) && (
        <div className={`border-b shrink-0 animate-fade-in ${fixResult.success ? "border-success/30" : "border-warning/30"}`}>
          <div className={`px-4 py-2.5 flex items-start gap-2 ${fixResult.success ? "bg-success/10" : "bg-warning/10"}`}>
            {fixResult.success ? (
              <Check size={16} className="text-success shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
            )}
            <div className="text-sm flex-1 min-w-0">
              {fixResult.success ? (
                <p className="font-medium text-success">
                  JSON is valid now{fixResult.fixes.length > 0 ? " — fixes applied" : ""}.
                </p>
              ) : (
                <p className="font-medium text-warning">
                  Auto-fix ran but JSON is still invalid — see error panel below.
                </p>
              )}
              {fixResult.fixes.length > 0 && (
                <ul className="mt-1 text-muted-foreground space-y-0.5 text-xs">
                  {fixResult.fixes.map((f, i) => (
                    <li key={i}>- {f}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {fixResult.original !== undefined && fixResult.original !== fixResult.text && (
                <button
                  type="button"
                  onClick={() => setShowFixDiff((v) => !v)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors font-mono ${
                    showFixDiff
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-border bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {showFixDiff ? "Hide diff" : "Show diff"}
                </button>
              )}
              <button
                type="button"
                aria-label="Dismiss fix result"
                onClick={() => { setFixResult(null); setShowFixDiff(false); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          {showFixDiff && fixResult.original !== undefined && fixResult.original !== fixResult.text && (
            <div className="max-h-52 overflow-auto scrollbar-thin font-mono text-xs bg-card border-t border-border/50">
              {diffWithContext(computeLineDiff(fixResult.original, fixResult.text)).map((line, i) =>
                line.type === "same" ? (
                  <div key={i} className="px-4 py-px text-muted-foreground/50 whitespace-pre select-none">
                    {line.text === "···" ? "  ···" : `  ${line.text}`}
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`px-4 py-px whitespace-pre ${
                      line.type === "add"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {line.type === "add" ? "+" : "-"} {line.text}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* ── Split view (JSON editor + Tree side by side) ───────────────── */}
        {splitView && (
          <div className="flex h-full">
            {/* Left: JSON editor */}
            <div className="flex-1 flex flex-col min-h-0 border-r border-border">
              <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0">
                JSON INPUT
              </div>
              <div className="flex-1 min-h-0 relative bg-background">
                {showInputMirrorOverlay && (
                  <JsonInputMirrorOverlay
                    lines={inputLines}
                    overlayRef={bracketOverlayRef}
                    bracketOpen={mirrorOverlaySimple ? null : bracketOpenLC}
                    bracketClose={mirrorOverlaySimple ? null : bracketCloseLC}
                    activeLine={activeInputLine}
                  />
                )}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    const v = e.target.value;
                    setInputWithHistory(v);
                    clearError();
                    setFixResult(null);
                    syncInputEditorOverlays({ value: v, selectionStart: e.target.selectionStart });
                  }}
                  onPaste={(e) => {
                    if (!autoFormat) return;
                    const raw = e.clipboardData.getData("text");
                    e.preventDefault();
                    void (async () => {
                      try {
                        const pretty = await formatPastedJson(raw);
                        setInputWithHistory(pretty);
                        clearError();
                      } catch {
                        setInputWithHistory(raw);
                      }
                      requestAnimationFrame(() => {
                        const ta = inputRef.current;
                        if (ta) syncInputEditorOverlays({ value: ta.value, selectionStart: ta.selectionStart });
                      });
                    })();
                  }}
                  onFocus={() => syncInputEditorOverlays()}
                  onClick={() => syncInputEditorOverlays()}
                  onKeyUp={() => syncInputEditorOverlays()}
                  onSelect={() => syncInputEditorOverlays()}
                  onBlur={() => {
                    setBracketHighlight(null);
                    setActiveInputLine(null);
                  }}
                  onScroll={syncBracketOverlay}
                  spellCheck={false}
                  placeholder='Paste or type JSON here…\n\n{\n  "key": "value"\n}'
                  className={`absolute inset-0 placeholder:text-muted-foreground/30 ${inputEditorTextareaClass}`}
                />
              </div>
              {bracketOpenLC && bracketCloseLC && bracketOpenLC.line !== bracketCloseLC.line && (
                <div className="shrink-0 border-t border-border bg-muted/30 px-3 py-1 text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                  <span className="text-sky-600/80 dark:text-sky-400/80">⌥</span>
                  Block: lines {bracketOpenLC.line}–{bracketCloseLC.line}
                  <span className="text-muted-foreground/50">({bracketCloseLC.line - bracketOpenLC.line + 1} lines)</span>
                </div>
              )}
            </div>

            {/* Right: Tree view */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <div className="px-3 py-1.5 text-xs font-medium bg-muted/50 border-b border-border shrink-0 flex items-center gap-2">
                <span className="font-semibold text-foreground/80">TREE VIEW</span>
                {parsedForTree !== undefined && (
                  <span className="text-accent text-xs">
                    {Array.isArray(parsedForTree)
                      ? `Array[${parsedForTree.length}]`
                      : parsedForTree !== null && typeof parsedForTree === "object"
                        ? `Object{${Object.keys(parsedForTree as Record<string, unknown>).length}}`
                        : String(parsedForTree)}
                  </span>
                )}
              </div>

              {/* Path bar */}
              <div className="shrink-0 border-b border-border bg-card px-3 py-2 flex flex-wrap items-center gap-2 min-h-[38px]">
                {selectedTreePath === null ? (
                  <span className="text-xs text-muted-foreground italic">Click any node → copy its JSONPath</span>
                ) : (
                  <>
                    <span className="font-mono text-xs text-accent truncate flex-1 min-w-0 select-all cursor-text">
                      {selectedTreePath.length === 0 ? "$" : "$" + selectedTreePath.map((p) =>
                        typeof p === "number" ? `[${p}]` : /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(String(p)) ? `.${p}` : `["${p}"]`
                      ).join("")}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => copyTreePath("jsonpath")} className={`px-2 py-1 text-[10px] rounded-md border font-mono transition-colors ${pathCopied === "jsonpath" ? "border-success/40 bg-success/10 text-success" : "border-border bg-muted hover:bg-accent/10 hover:text-accent"}`}>
                        {pathCopied === "jsonpath" ? "✓" : "JSONPath"}
                      </button>
                      <button onClick={() => copyTreePath("pointer")} className={`px-2 py-1 text-[10px] rounded-md border font-mono transition-colors ${pathCopied === "pointer" ? "border-success/40 bg-success/10 text-success" : "border-border bg-muted hover:bg-accent/10 hover:text-accent"}`}>
                        {pathCopied === "pointer" ? "✓" : "Pointer"}
                      </button>
                    </div>
                  </>
                )}
              </div>
              {selectedNodeValue !== undefined && typeof selectedNodeValue === "string" && selectedNodeValue.length > 60 && (
                <div className="shrink-0 border-b border-border bg-muted/30 px-3 py-2 max-h-32 overflow-auto scrollbar-thin">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">FULL VALUE</p>
                  <pre className="font-mono text-xs text-success whitespace-pre-wrap break-all select-text">{selectedNodeValue}</pre>
                </div>
              )}

              {/* Tree filter */}
              <div className="shrink-0 border-b border-border bg-card px-2 py-1.5 flex items-center gap-1.5">
                <Search size={12} className="text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={treeSearchTerm}
                  onChange={(e) => setTreeSearchTerm(e.target.value)}
                  placeholder="Filter keys or values…"
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50 font-mono"
                />
                {treeSearchTerm && treeMatchCount > 0 && (
                  <span className="text-[10px] font-mono text-accent shrink-0">{treeMatchCount} match{treeMatchCount !== 1 ? "es" : ""}</span>
                )}
                {treeSearchTerm && treeMatchCount === 0 && (
                  <span className="text-[10px] font-mono text-destructive shrink-0">no matches</span>
                )}
                {treeSearchTerm && (
                  <button onClick={() => setTreeSearchTerm("")} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-auto p-2 scrollbar-thin">
                {!input.trim() ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
                    <span className="text-3xl">{ }</span>
                    <span>Paste JSON on the left to explore the tree</span>
                  </div>
                ) : parsedForTree === undefined ? (
                  <div className="px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-xs font-mono m-2">
                    Invalid JSON — check for syntax errors
                  </div>
                ) : (
                  // eslint-disable-next-line react-hooks/refs
                  (() => {
                    nodeCounter.current = { current: 0 };
                    return (
                      <InteractiveTreeNode
                        nodeKey="root"
                        value={parsedForTree}
                        depth={0}
                        defaultExpanded
                        nodeCount={nodeCounter.current}
                        path={[]}
                        onUpdate={handleTreeUpdate}
                        expandAllSignal={expandAllSignal}
                        collapseAllSignal={collapseAllSignal}
                        onContextMenu={handleTreeContextMenu}
                        onSelect={setSelectedTreePath}
                        searchTerm={treeSearchTerm}
                      />
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab-based view (hidden when split view is active) ──────────── */}
        {!splitView && activeTab === "format" && (
          <div className="flex flex-col md:flex-row h-full">
            <div className="flex-1 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-border">
              <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0">
                INPUT
              </div>
              <div
                className="flex-1 min-h-0 relative"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {dragOver && (
                  <div className="absolute inset-0 z-10 bg-accent/10 border-2 border-dashed border-accent rounded-lg flex items-center justify-center pointer-events-none">
                    <div className="text-accent font-medium flex items-center gap-2">
                      <Upload size={20} />
                      Drop JSON file here
                    </div>
                  </div>
                )}
                {showInputMirrorOverlay && (
                  <JsonInputMirrorOverlay
                    lines={inputLines}
                    overlayRef={bracketOverlayRef}
                    bracketOpen={mirrorOverlaySimple ? null : bracketOpenLC}
                    bracketClose={mirrorOverlaySimple ? null : bracketCloseLC}
                    activeLine={activeInputLine}
                  />
                )}
                {error && (
                  <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
                    <div className="font-mono text-sm p-4 whitespace-pre leading-[1.625] [tab-size:2]">
                      {inputLines.map((line, idx) => (
                        <div
                          key={idx}
                          className={idx + 1 === errorLine ? "bg-destructive/15 -mx-4 px-4" : ""}
                        >
                          <span className="invisible whitespace-pre">{line || "\u00a0"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setInputWithHistory(newVal);
                    clearError();
                    setFixResult(null);
                    syncInputEditorOverlays({ value: newVal, selectionStart: e.target.selectionStart });
                  }}
                  onPaste={handlePaste}
                  onFocus={() => syncInputEditorOverlays()}
                  onClick={() => syncInputEditorOverlays()}
                  onKeyUp={() => syncInputEditorOverlays()}
                  onSelect={() => syncInputEditorOverlays()}
                  onBlur={() => {
                    setBracketHighlight(null);
                    setActiveInputLine(null);
                  }}
                  onScroll={syncBracketOverlay}
                  placeholder='Paste or type JSON here...\n{\n  "hello": "world"\n}'
                  spellCheck={false}
                  className={`w-full h-full placeholder:text-muted-foreground/50 ${inputEditorTextareaClass}`}
                />
              </div>
              {bracketOpenLC && bracketCloseLC && bracketOpenLC.line !== bracketCloseLC.line && (
                <div className="shrink-0 border-t border-border bg-muted/30 px-3 py-1 text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                  <span className="text-sky-600/80 dark:text-sky-400/80">⌥</span>
                  Block: lines {bracketOpenLC.line}–{bracketCloseLC.line}
                  <span className="text-muted-foreground/50">({bracketCloseLC.line - bracketOpenLC.line + 1} lines)</span>
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0">
                OUTPUT
              </div>
              <div className="flex-1 min-h-0">
                <textarea
                  value={output}
                  readOnly
                  placeholder="Formatted JSON will appear here..."
                  spellCheck={false}
                  className="w-full h-full resize-none bg-background text-foreground font-mono text-sm p-4 outline-none placeholder:text-muted-foreground/50 scrollbar-thin"
                />
              </div>
            </div>
          </div>
        )}

        {!splitView && activeTab === "tree" && (
          <div className="h-full flex flex-col">
            <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0 flex items-center gap-2">
              <span className="font-semibold text-foreground/80">TREE EXPLORER</span>
              {parsedForTree !== undefined && (
                <span className="text-accent">
                  ({Array.isArray(parsedForTree)
                    ? `Array[${parsedForTree.length}]`
                    : parsedForTree !== null && typeof parsedForTree === "object"
                      ? `Object{${Object.keys(parsedForTree as Record<string, unknown>).length}}`
                      : String(parsedForTree)})
                </span>
              )}
            </div>

            {/* JSONPath display bar — always visible */}
            <div className="shrink-0 border-b border-border bg-card px-3 py-2 flex flex-wrap items-center gap-2 min-h-[38px]">
              {selectedTreePath === null ? (
                <span className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                  <span>⎘</span>
                  Hover a node and click <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">⎘ path</kbd> — or click any row to see its JSONPath here
                </span>
              ) : (
                <>
                  <span className="font-mono text-xs text-accent truncate flex-1 min-w-0 select-all cursor-text" title="Click to select all">
                    {selectedTreePath.length === 0
                      ? "$"
                      : "$" + selectedTreePath.map((p) =>
                          typeof p === "number" ? `[${p}]` : /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(String(p)) ? `.${p}` : `["${p}"]`
                        ).join("")}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyTreePath("jsonpath")}
                      className={`px-2 py-1 text-[10px] rounded-md border font-mono transition-colors ${pathCopied === "jsonpath" ? "border-success/40 bg-success/10 text-success" : "border-border bg-muted hover:bg-accent/10 hover:border-accent/40 hover:text-accent"}`}
                      title="Copy as JSONPath ($.a.b[0])"
                    >
                      {pathCopied === "jsonpath" ? "✓ copied" : "JSONPath"}
                    </button>
                    <button
                      onClick={() => copyTreePath("pointer")}
                      className={`px-2 py-1 text-[10px] rounded-md border font-mono transition-colors ${pathCopied === "pointer" ? "border-success/40 bg-success/10 text-success" : "border-border bg-muted hover:bg-accent/10 hover:border-accent/40 hover:text-accent"}`}
                      title="Copy as JSON Pointer (/a/b/0)"
                    >
                      {pathCopied === "pointer" ? "✓ copied" : "Pointer"}
                    </button>
                    <button
                      onClick={() => copyTreePath("bracket")}
                      className={`px-2 py-1 text-[10px] rounded-md border font-mono transition-colors ${pathCopied === "bracket" ? "border-success/40 bg-success/10 text-success" : "border-border bg-muted hover:bg-accent/10 hover:border-accent/40 hover:text-accent"}`}
                      title="Copy as bracket notation ($['a']['b'][0])"
                    >
                      {pathCopied === "bracket" ? "✓ copied" : "Bracket"}
                    </button>
                  </div>
                </>
              )}
            </div>
            {selectedNodeValue !== undefined && typeof selectedNodeValue === "string" && selectedNodeValue.length > 60 && (
              <div className="shrink-0 border-b border-border bg-muted/30 px-3 py-2 max-h-40 overflow-auto scrollbar-thin">
                <p className="text-[10px] font-medium text-muted-foreground mb-1">FULL VALUE</p>
                <pre className="font-mono text-xs text-success whitespace-pre-wrap break-all select-text">{selectedNodeValue}</pre>
              </div>
            )}

            {/* Tree filter */}
            <div className="shrink-0 border-b border-border bg-card px-2 py-1.5 flex items-center gap-1.5">
              <Search size={12} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                value={treeSearchTerm}
                onChange={(e) => setTreeSearchTerm(e.target.value)}
                placeholder="Filter keys or values…"
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50 font-mono"
              />
              {treeSearchTerm && treeMatchCount > 0 && (
                <span className="text-[10px] font-mono text-accent shrink-0">{treeMatchCount} match{treeMatchCount !== 1 ? "es" : ""}</span>
              )}
              {treeSearchTerm && treeMatchCount === 0 && (
                <span className="text-[10px] font-mono text-destructive shrink-0">no matches</span>
              )}
              {treeSearchTerm && (
                <button onClick={() => setTreeSearchTerm("")} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto p-2 scrollbar-thin">
              {!input.trim() ? (
                <EmptyState message="Paste JSON in the Format tab, then explore it here." />
              ) : parsedForTree === undefined ? (
                <EmptyState message="Invalid JSON. Fix errors in the Format tab first." variant="error" />
              ) : (
                // eslint-disable-next-line react-hooks/refs
                (() => {
                  nodeCounter.current = { current: 0 };
                  return (
                    <InteractiveTreeNode
                      nodeKey="root"
                      value={parsedForTree}
                      depth={0}
                      defaultExpanded
                      nodeCount={nodeCounter.current}
                      path={[]}
                      onUpdate={handleTreeUpdate}
                      expandAllSignal={expandAllSignal}
                      collapseAllSignal={collapseAllSignal}
                      onContextMenu={handleTreeContextMenu}
                      onSelect={setSelectedTreePath}
                      searchTerm={treeSearchTerm}
                    />
                  );
                })()
              )}
            </div>
          </div>
        )}

        {!splitView && activeTab === "diff" && (
          <div className="h-full flex flex-col">
            <div className="flex flex-col md:flex-row flex-1 min-h-0">
              <div className="flex-1 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-border">
                <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0">
                  ORIGINAL (A)
                </div>
                <textarea
                  value={diffLeft}
                  onChange={(e) => setDiffLeft(e.target.value)}
                  placeholder="Paste first JSON..."
                  spellCheck={false}
                  className="flex-1 min-h-0 w-full resize-none bg-background text-foreground font-mono text-sm p-4 outline-none placeholder:text-muted-foreground/50 scrollbar-thin"
                />
              </div>
              <div className="flex-1 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-border">
                <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0">
                  MODIFIED (B)
                </div>
                <textarea
                  value={diffRight}
                  onChange={(e) => setDiffRight(e.target.value)}
                  placeholder="Paste second JSON..."
                  spellCheck={false}
                  className="flex-1 min-h-0 w-full resize-none bg-background text-foreground font-mono text-sm p-4 outline-none placeholder:text-muted-foreground/50 scrollbar-thin"
                />
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0">
                  DIFF RESULT
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-sm scrollbar-thin">
                  {!diffLeft.trim() && !diffRight.trim() ? (
                    <EmptyState message="Paste two JSON objects to compare." />
                  ) : diffResult === null ? (
                    <EmptyState message="One or both inputs contain invalid JSON." variant="error" />
                  ) : (
                    <div>
                      {diffResult.map((line, idx) => (
                        <div
                          key={idx}
                          className={`px-2 -mx-2 whitespace-pre ${
                            line.type === "add"
                              ? "bg-success/15 text-success"
                              : line.type === "remove"
                                ? "bg-destructive/15 text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          <span className="select-none opacity-60 mr-2">
                            {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                          </span>
                          {line.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!splitView && (activeTab === "convert" || activeTab === "generate") && (
          <div className="flex flex-col md:flex-row h-full">
            <div className="flex-1 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-border">
              <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0">
                JSON INPUT
              </div>
              <textarea
                value={input}
                onChange={(e) => {
                  setInputWithHistory(e.target.value);
                  clearError();
                }}
                placeholder="Paste JSON to convert..."
                spellCheck={false}
                className="flex-1 min-h-0 w-full resize-none bg-background text-foreground font-mono text-sm p-4 outline-none placeholder:text-muted-foreground/50 scrollbar-thin"
              />
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0 flex items-center justify-between">
                <span>{convertTarget.toUpperCase()} OUTPUT</span>
                {output && (
                  <button
                    onClick={() => {
                      const blob = new Blob([output], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      const ext = convertTarget === "yaml" ? "yaml" : convertTarget === "csv" ? "csv" : convertTarget === "xml" ? "xml" : convertTarget === "toml" ? "toml" : convertTarget === "env" ? "env" : convertTarget === "typescript" ? "ts" : convertTarget === "htmlform" ? "html" : convertTarget === "schema" ? "json" : convertTarget === "sql" ? "sql" : convertTarget === "python" ? "py" : convertTarget === "stringify" ? "js" : "txt";
                      a.download = `output.${ext}`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    <Download size={12} />
                    Download
                  </button>
                )}
              </div>
              <textarea
                value={output}
                readOnly
                placeholder={activeTab === "generate" ? "Generated output will appear here..." : `Converted ${convertTarget.toUpperCase()} will appear here...`}
                spellCheck={false}
                className="flex-1 min-h-0 w-full resize-none bg-background text-foreground font-mono text-sm p-4 outline-none placeholder:text-muted-foreground/50 scrollbar-thin"
              />
            </div>
          </div>
        )}

        {/* Transform Tab */}
        {!splitView && activeTab === "transform" && (
          <div className="h-full flex flex-col">
            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
              {/* Wizard + Query */}
              <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border flex flex-col shrink-0 overflow-auto">
                <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0">
                  TRANSFORM WIZARD
                </div>
                <div className="p-3 space-y-3 text-sm overflow-auto scrollbar-thin">
                  {/* Filter */}
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Filter size={12} /> Filter</legend>
                    <select
                      value={wizard.filterField}
                      onChange={(e) => setWizard((w) => ({ ...w, filterField: e.target.value }))}
                      className="w-full text-xs bg-muted border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Select field...</option>
                      {wizardFields.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select
                      value={wizard.filterOp}
                      onChange={(e) => setWizard((w) => ({ ...w, filterOp: e.target.value as WizardFilterOp }))}
                      className="w-full text-xs bg-muted border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
                    >
                      {(["==", "!=", ">", "<", ">=", "<=", "contains", "startsWith"] as const).map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={wizard.filterValue}
                      onChange={(e) => setWizard((w) => ({ ...w, filterValue: e.target.value }))}
                      placeholder="Value..."
                      className="w-full text-xs bg-background border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring/40 font-mono"
                    />
                  </fieldset>

                  {/* Sort */}
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-medium text-muted-foreground flex items-center gap-1"><SortAsc size={12} /> Sort</legend>
                    <select
                      value={wizard.sortField}
                      onChange={(e) => setWizard((w) => ({ ...w, sortField: e.target.value }))}
                      className="w-full text-xs bg-muted border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Select field...</option>
                      {wizardFields.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setWizard((w) => ({ ...w, sortDir: "asc" }))}
                        className={`flex-1 text-xs py-1 rounded border transition-colors ${wizard.sortDir === "asc" ? "bg-accent-light border-accent text-accent" : "border-border text-muted-foreground"}`}
                      >
                        Ascending
                      </button>
                      <button
                        onClick={() => setWizard((w) => ({ ...w, sortDir: "desc" }))}
                        className={`flex-1 text-xs py-1 rounded border transition-colors ${wizard.sortDir === "desc" ? "bg-accent-light border-accent text-accent" : "border-border text-muted-foreground"}`}
                      >
                        Descending
                      </button>
                    </div>
                  </fieldset>

                  {/* Pick */}
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-medium text-muted-foreground flex items-center gap-1"><FileCode size={12} /> Pick Fields</legend>
                    <div className="flex flex-wrap gap-1">
                      {wizardFields.map((f) => (
                        <button
                          key={f}
                          onClick={() => setWizard((w) => ({
                            ...w,
                            pickFields: w.pickFields.includes(f) ? w.pickFields.filter((x) => x !== f) : [...w.pickFields, f]
                          }))}
                          className={`text-xs px-2 py-0.5 rounded border transition-colors ${wizard.pickFields.includes(f) ? "bg-accent-light border-accent text-accent" : "border-border text-muted-foreground"}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {/* Group By */}
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-medium text-muted-foreground flex items-center gap-1"><GripVertical size={12} /> Group By</legend>
                    <select
                      value={wizard.groupByField}
                      onChange={(e) => setWizard((w) => ({ ...w, groupByField: e.target.value }))}
                      className="w-full text-xs bg-muted border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">None</option>
                      {wizardFields.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </fieldset>

                  {/* Uniq */}
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wizard.uniq}
                      onChange={(e) => setWizard((w) => ({ ...w, uniq: e.target.checked }))}
                      className="rounded border-border"
                    />
                    Remove duplicates (uniq)
                  </label>

                  {/* Query textarea */}
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Query:</span>
                    <textarea
                      value={transformQuery}
                      onChange={(e) => setTransformQuery(e.target.value)}
                      rows={4}
                      spellCheck={false}
                      className="w-full px-2 py-1.5 text-xs rounded border border-border bg-background font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring/40 scrollbar-thin"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Examples: <code className="bg-muted px-1 rounded">data.filter(i =&gt; i.age &gt; 25)</code>{" "}
                    <code className="bg-muted px-1 rounded">data.map(i =&gt; i.name)</code>
                  </p>
                  <button
                    onClick={handleTransformApply}
                    disabled={transformPreview === null}
                    className="w-full py-1.5 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    Apply Transform
                  </button>
                </div>
              </div>

              {/* Original preview */}
              <div className="flex-1 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-border">
                <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0">
                  ORIGINAL
                </div>
                <div className="flex-1 overflow-auto p-2 scrollbar-thin">
                  {parsedForTree !== undefined ? (
                    <MiniTreeNode nodeKey="root" value={parsedForTree} depth={0} defaultExpanded />
                  ) : (
                    <EmptyState message="No valid JSON input." />
                  )}
                </div>
              </div>

              {/* Preview result */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0">
                  PREVIEW
                </div>
                <div className="flex-1 overflow-auto p-2 scrollbar-thin">
                  {transformError ? (
                    <div className="text-destructive text-xs p-2 font-mono">{transformError}</div>
                  ) : transformPreview !== null ? (
                    <MiniTreeNode nodeKey="result" value={transformPreview} depth={0} defaultExpanded />
                  ) : (
                    <EmptyState message="Write a query to preview the result." />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table Tab */}
        {!splitView && activeTab === "table" && (
          <div className="h-full flex flex-col">
            {!Array.isArray(parsedForTree) ? (
              <EmptyState message="Table view requires an array of objects. Paste a JSON array in the Format tab." />
            ) : (
              <>
                <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/50 border-b border-border shrink-0 flex items-center gap-2">
                  <span>TABLE VIEW</span>
                  <span className="text-accent">{tableData.length} rows x {tableHeaders.length} cols</span>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="relative">
                      <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={tableFilter}
                        onChange={(e) => setTableFilter(e.target.value)}
                        placeholder="Filter rows..."
                        className="pl-6 pr-2 py-1 text-xs rounded border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring/40 w-40"
                      />
                    </div>
                    <button
                      onClick={handleTableAddRow}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted hover:bg-accent-light text-foreground transition-colors"
                    >
                      <Plus size={12} /> Add Row
                    </button>
                    <button
                      onClick={handleTableApply}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
                    >
                      <Check size={12} /> Apply Changes
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto scrollbar-thin">
                  <table className="w-full text-sm font-mono border-collapse min-w-max">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-muted/80 backdrop-blur">
                        <th className="px-2 py-1.5 text-xs text-muted-foreground font-medium border-b border-r border-border w-10">#</th>
                        {tableHeaders.map((h) => (
                          <th
                            key={h}
                            className="px-3 py-1.5 text-xs text-left font-medium border-b border-r border-border cursor-pointer select-none hover:bg-accent-light transition-colors"
                            onClick={() => {
                              if (tableSortCol === h) {
                                setTableSortDir((d) => d === "asc" ? "desc" : "asc");
                              } else {
                                setTableSortCol(h);
                                setTableSortDir("asc");
                              }
                            }}
                          >
                            <span className="flex items-center gap-1">
                              {h}
                              {tableSortCol === h && (
                                <span className="text-accent">{tableSortDir === "asc" ? "\u2191" : "\u2193"}</span>
                              )}
                            </span>
                          </th>
                        ))}
                        <th className="px-2 py-1.5 text-xs text-muted-foreground font-medium border-b border-border w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFilteredTable.map((row, _rowIdx) => {
                        const realIdx = tableData.indexOf(row);
                        return (
                          <tr key={realIdx} className="hover:bg-muted/30 transition-colors">
                            <td className="px-2 py-1 text-xs text-muted-foreground border-b border-r border-border text-center">{realIdx + 1}</td>
                            {tableHeaders.map((h) => {
                              const isEditing = editingCell?.row === realIdx && editingCell?.col === h;
                              return (
                                <td
                                  key={h}
                                  className="px-3 py-1 border-b border-r border-border text-xs"
                                  onDoubleClick={() => {
                                    setEditingCell({ row: realIdx, col: h });
                                    setEditingCellValue(row[h] === null ? "null" : String(row[h] ?? ""));
                                  }}
                                >
                                  {isEditing ? (
                                    <input
                                      autoFocus
                                      value={editingCellValue}
                                      onChange={(e) => setEditingCellValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleTableCellSave();
                                        if (e.key === "Escape") setEditingCell(null);
                                      }}
                                      onBlur={handleTableCellSave}
                                      className="w-full px-1 py-0.5 text-xs border border-accent rounded bg-background font-mono outline-none"
                                    />
                                  ) : (
                                    <span className={row[h] === null ? "text-muted-foreground italic" : ""}>
                                      {row[h] === null ? "null" : String(row[h] ?? "")}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-1 py-1 border-b border-border text-center">
                              <button
                                onClick={() => handleTableDeleteRow(realIdx)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                                title="Delete row"
                              >
                                <Minus size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {sortedFilteredTable.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">No matching rows.</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="border-t border-border bg-card px-4 py-1.5 flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        {stats ? (
          <>
            <span className="flex items-center gap-1">
              <span
                className={`inline-block w-2 h-2 rounded-full ${stats.valid ? "bg-success" : "bg-destructive"}`}
              />
              {stats.valid ? "Valid JSON" : "Invalid JSON"}
            </span>
            <span>{stats.size}</span>
            {!stats.valid && input.trim() && (
              <button
                type="button"
                onClick={() => void handleFix()}
                className="inline-flex items-center gap-1 rounded-md border border-warning/50 bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-amber-950 dark:text-amber-50 hover:bg-warning/25 transition-colors"
                title="Trailing commas, single quotes, comments, missing commas, truncated JSON, …"
              >
                <Wrench size={12} aria-hidden />
                Fix JSON
              </button>
            )}
            {stats.valid && (
              <>
                <span>{stats.keys.toLocaleString()} keys</span>
                <span>Depth: {stats.depth}</span>
              </>
            )}
          </>
        ) : (
          <span>Ready</span>
        )}
        {undoStack.length > 0 && (
          <span className="text-muted-foreground">Undo: {undoStack.length}</span>
        )}
        {error && (
          <button
            type="button"
            onClick={() => setShowErrorPanel(!showErrorPanel)}
            className="ml-auto flex items-center gap-1 text-destructive hover:underline"
          >
            <AlertTriangle size={12} />
            Error at line {error.line}, column {error.column}
          </button>
        )}
      </div>

      {/* Error panel */}
      {showErrorPanel && error && (
        <div className="border-t border-destructive/30 bg-destructive/5 px-4 py-3 shrink-0 animate-slide-up">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
              <div className="text-sm flex-1 min-w-0">
                <p className="font-medium text-destructive">
                  Parse Error — Line {error.line}, Column {error.column}
                </p>
                <p className="text-muted-foreground mt-0.5 font-mono text-xs break-words">{error.message}</p>
                {errorLine > 0 && errorLine <= inputLines.length && (
                  <pre className="mt-2 bg-muted rounded-lg px-3 py-2 text-xs overflow-x-auto font-mono">
                    <span className="text-muted-foreground select-none">{errorLine} | </span>
                    <span className="text-destructive">{inputLines[errorLine - 1]}</span>
                  </pre>
                )}
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Try automatic repair:</span>
                    <button
                      type="button"
                      onClick={() => void handleFix()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/15 px-3 py-1.5 text-xs font-semibold text-amber-950 dark:text-amber-50 hover:bg-warning/25 transition-colors"
                    >
                      <Wrench size={14} />
                      Auto-fix JSON
                    </button>
                  </div>
                  <JsonRepairExamples onTryExample={handleTryRepairExample} />
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setShowErrorPanel(false)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <TreeContextMenu
          ctx={contextMenu}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}
      </main>
    </div>
  );
}

function ToolButton({
  onClick,
  icon,
  label,
  variant = "default",
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "success" | "danger" | "warning";
}) {
  const variantClasses = {
    default: "bg-muted hover:bg-accent-light text-foreground",
    success: "bg-success/10 text-success",
    danger: "bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
    warning: "bg-muted hover:bg-warning/10 text-muted-foreground hover:text-warning",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${variantClasses[variant]}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function EmptyState({ message, variant = "info" }: { message: string; variant?: "info" | "error" }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
      {variant === "error" ? (
        <AlertTriangle size={32} className="text-destructive/50 mb-2" />
      ) : (
        <FileJson size={32} className="text-muted-foreground/30 mb-2" />
      )}
      <p className="text-sm">{message}</p>
    </div>
  );
}
