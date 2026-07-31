"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Copy, Check, Trash2, ExternalLink } from "lucide-react";
import { getToolBySlug } from "@/lib/tools-registry";
import CustomToolOutlet from "@/components/tools/CustomToolOutlet";
import { CUSTOM_TOOL_SLUGS } from "@/lib/custom-tool-slugs";
import {
  type ToolState,
  runTool,
  needsDualInput,
  needsNoInput,
} from "@/lib/tool-runner";
import {
  parseEmbedCommand,
  postEmbedEvent,
  isEmbedMessageFromParent,
  type EmbedConfig,
} from "@/lib/embed-api";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
      }}
      disabled={!text}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function EmbedPage() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = slugParam ?? "";
  const tool = getToolBySlug(slug);

  const [state, setState] = useState<ToolState>({
    input: "",
    input2: "",
    output: "",
    error: "",
    options: {},
  });
  const [embedConfig, setEmbedConfig] = useState<EmbedConfig>({ autoRun: true });
  const stateRef = useRef(state);
  const embedConfigRef = useRef(embedConfig);
  const suppressAutoProcessRef = useRef(false);
  useEffect(() => {
    stateRef.current = state;
  });
  useEffect(() => {
    embedConfigRef.current = embedConfig;
  });

  const process = useCallback(async () => {
    if (CUSTOM_TOOL_SLUGS.has(slug)) return;
    const s = stateRef.current;
    if (!s.input.trim() && !needsNoInput(slug)) {
      setState((prev) => ({ ...prev, output: "", error: "" }));
      postEmbedEvent(window.parent, { type: "OUTPUT", output: "", error: "" });
      return;
    }
    try {
      const result = await runTool(slug, s);
      const output = typeof result === "string" ? result : result.output || "";
      const error = typeof result === "string" ? "" : result.error || "";
      setState((prev) => ({ ...prev, output, error }));
      postEmbedEvent(window.parent, { type: "OUTPUT", output, error });
    } catch (e) {
      const msg = (e as Error).message;
      setState((prev) => ({ ...prev, output: "", error: msg }));
      postEmbedEvent(window.parent, { type: "OUTPUT", output: "", error: msg });
    }
  }, [slug]);

  useEffect(() => {
    if (!tool || CUSTOM_TOOL_SLUGS.has(slug)) return;
    postEmbedEvent(window.parent, { type: "READY", slug, name: tool.name });
  }, [slug, tool]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (!isEmbedMessageFromParent(ev)) return;
      const cmd = parseEmbedCommand(ev.data);
      if (!cmd) return;
      if (cmd.type === "SET_INPUT") {
        suppressAutoProcessRef.current = embedConfigRef.current.autoRun === false;
        setState((s) => ({
          ...s,
          input: cmd.input,
          input2: cmd.input2 ?? s.input2,
        }));
      } else if (cmd.type === "RUN") {
        void process();
      } else if (cmd.type === "CLEAR") {
        setState({ input: "", input2: "", output: "", error: "", options: {} });
      } else if (cmd.type === "GET_STATE") {
        const s = stateRef.current;
        postEmbedEvent(window.parent, {
          type: "STATE",
          input: s.input,
          input2: s.input2 ?? "",
          output: s.output,
          error: s.error,
        });
      } else if (cmd.type === "CONFIGURE") {
        setEmbedConfig(cmd.config);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [process]);

  useEffect(() => {
    if (CUSTOM_TOOL_SLUGS.has(slug)) return;
    if (suppressAutoProcessRef.current) {
      suppressAutoProcessRef.current = false;
      return;
    }
    const timer = setTimeout(process, 150);
    return () => clearTimeout(timer);
  }, [process, slug, state.input, state.input2, state.options]);

  if (!tool) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
        Tool not found
      </div>
    );
  }

  if (CUSTOM_TOOL_SLUGS.has(slug)) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <CustomToolOutlet slug={slug} tool={tool} />
        <EmbedFooter slug={slug} name={tool.name} />
      </div>
    );
  }

  const isDual = needsDualInput(slug);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground p-3 gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-foreground">{tool.name}</span>
      </div>

      <div className={`flex-1 grid gap-3 ${isDual ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        {/* Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              {tool.inputLabel || "Input"}
            </label>
            <button
              onClick={() => setState((s) => ({ ...s, input: "", output: "", error: "" }))}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
              title="Clear"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <textarea
            value={state.input}
            onChange={(e) => setState((s) => ({ ...s, input: e.target.value }))}
            placeholder={`Paste ${tool.inputLabel?.toLowerCase() || "input"} here…`}
            className="flex-1 min-h-[200px] p-3 rounded-lg border border-border bg-card font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground/50"
            spellCheck={false}
          />
        </div>

        {/* Second input (dual-input tools) */}
        {isDual ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                {tool.outputLabel || "Input B"}
              </label>
              <button
                onClick={() => setState((s) => ({ ...s, input2: "" }))}
                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <textarea
              value={state.input2}
              onChange={(e) => setState((s) => ({ ...s, input2: e.target.value }))}
              placeholder="Paste second input here…"
              className="flex-1 min-h-[200px] p-3 rounded-lg border border-border bg-card font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
          </div>
        ) : (
          /* Output */
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                {tool.outputLabel || "Output"}
              </label>
              <CopyBtn text={state.output} />
            </div>
            <textarea
              value={state.output}
              readOnly
              placeholder="Output will appear here…"
              className="flex-1 min-h-[200px] p-3 rounded-lg border border-border bg-muted/50 font-mono text-xs resize-none focus:outline-none placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* Diff output */}
      {isDual && state.output && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Diff</label>
            <CopyBtn text={state.output} />
          </div>
          <pre className="p-3 rounded-lg border border-border bg-card font-mono text-xs overflow-auto max-h-[300px] whitespace-pre-wrap">
            {state.output.split("\n").map((line, i) => (
              <div
                key={i}
                className={
                  line.startsWith("+") ? "text-success bg-success/10" :
                  line.startsWith("-") ? "text-destructive bg-destructive/10" :
                  line.startsWith("@@") ? "text-accent" : ""
                }
              >
                {line}
              </div>
            ))}
          </pre>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <EmbedFooter slug={slug} name={tool.name} />
    </div>
  );
}

function EmbedFooter({ slug, name }: { slug: string; name: string }) {
  const href = slug === "json-formatter"
    ? "/json"
    : slug === "jwt-debugger"
    ? "/jwt-debugger"
    : `/tools/${slug}`;

  return (
    <div className="flex items-center justify-end pt-1 border-t border-border">
      <a
        href={`https://www.devbench.co.in${href}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ExternalLink className="w-2.5 h-2.5" />
        Open {name} on DevBench
      </a>
    </div>
  );
}
