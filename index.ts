// dsh-extension-workbook — DeepSeek Harness port of @firstpick/pi-extension-workbook (0.1.5, MIT).
//
// Entry shape: the Cordis "namespace" contract (`name` / `inject` / `apply`),
// NOT `export default` — the dsh loader's unwrapExports drops named exports
// when a default export is present.
//
// The upstream Pi entry exported a single `workbookExtension(pi)` factory that
// called `pi.registerTool(...)` and `pi.registerCommand(...)`. dsh has no
// extension factory: tools register on `ctx.tools`, commands on the
// `commands` service, and skills on the `skills` service. Every deviation
// from the upstream entry is listed in the delivery report; the engine under
// src/ is upstream-verbatim apart from the three harness-import reroutes
// documented in THIRD_PARTY_NOTICES.md (src/pi-utils.ts, src/schemas.ts,
// src/doctor.ts).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Type } from "typebox";
import { OoxmlSafeEngine, OOXML_CAPABILITIES } from "./src/backends/ooxml-safe.ts";
import { probeAllBackends } from "./src/backends/probes.ts";
import type {
  WorkbookDiffRequest,
  WorkbookEditRequest,
  WorkbookInspectRequest,
  WorkbookReadRequest,
  WorkbookRenderRequest,
  WorkbookValidateRequest,
} from "./src/contracts.ts";
import { WORKBOOK_CONTRACT_VERSION } from "./src/contracts.ts";
import { DiffSchema, EditSchema, InspectSchema, ReadSchema, RenderSchema, ValidateSchema } from "./src/schemas.ts";
import { boundedJsonResult, visibleLimitFrom } from "./src/output.ts";
import { formatDoctorReport, workbookDoctorReport } from "./src/doctor.ts";
import { withFileMutationQueue } from "./src/file-mutation-queue.ts";
import { StringEnum } from "./src/string-enum.ts";

export const name = "dsh-extension-workbook";
export const inject = ["tools"];

const TOOL_GUIDELINES = [
  "Inspect unfamiliar workbooks before editing and use the returned SHA-256 as expectedSha256.",
  "Use dryRun=true first; every commit requires expectedSha256 and defaults to a new output file.",
  "Never claim macros were executed or edited. This package only inventories, preserves, and verifies active content.",
  "Render focused ranges when layout or formatting matters; use workbook_read for exact values and formulas.",
  "Validate and diff edited outputs before relying on them. Unsupported or lossy operations must fail closed.",
];

// Pi exposed these as `promptGuidelines`; dsh tools have no such field, so the
// upstream-authored guidance rides in the description (the only model-facing
// tool text dsh has).
function withGuidelines(description: string): string {
  return `${description} ${TOOL_GUIDELINES.join(" ")}`;
}

// Pi's tool `execute(_id, params, signal, onUpdate, ctx)` received the
// session cwd via `ctx.cwd`. dsh passes `exec` instead; the community pattern
// for the owning agent's cwd is `exec.agent.session.header.cwd`
// (dsh-email, dsh-agent-loop).
type ToolExec = { agent?: { session?: { header?: { cwd?: string } } }; signal?: AbortSignal };

function cwdOf(exec: ToolExec | undefined): string {
  return exec?.agent?.session?.header?.cwd ?? process.cwd();
}

// Pi's `status(onUpdate, text)` progressive-update callback has no dsh
// equivalent (dsh tools are execute-then-render); the calls are dropped.

// dsh's `output.render` is synchronous, while the upstream bounded renderer
// (`boundedJsonResult`) may write a truncation artifact asynchronously, so
// `execute` precomputes the bounded text and carries it in the value under
// `renderText`; `render` emits it verbatim.
function textRender(_args: unknown, value: Record<string, unknown>): Array<{ type: "text"; text: string }> {
  return [{ type: "text", text: String(value.renderText) }];
}
async function withRenderText(
  payload: Record<string, unknown>,
  label: string,
  input: { limits?: Partial<import("./src/core/limits.ts").WorkbookLimits> },
): Promise<Record<string, unknown>> {
  const json = toLosslessJson(payload);
  const { content } = await boundedJsonResult(json, label, visibleLimitFrom(input));
  return { ...json, renderText: content[0]?.text ?? "" };
}

function toJsonSchema(schema: unknown): Record<string, unknown> {
  return toLosslessJson(schema) as Record<string, unknown>;
}

// The harness snapshots every canonical tool value and rejects members that
// are not lossless JSON (the engine's style descriptors, for example, carry
// explicit `undefined` attribute values). A JSON round-trip is the honest
// normalization: it drops undefined members and coerces non-finite numbers.
function toLosslessJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function resultSchema(properties: Record<string, unknown>): Record<string, unknown> {
  return { type: "object", additionalProperties: true, properties };
}

const stringProp = { type: "string" } as const;

const inspectOutputSchema = resultSchema({
  sourcePath: stringProp,
  sourceSha256: stringProp,
  engine: stringProp,
  renderText: stringProp,
});
const readOutputSchema = resultSchema({
  sourcePath: stringProp,
  sourceSha256: stringProp,
  engine: stringProp,
  sheet: { type: "object" },
  range: stringProp,
  cells: { type: "array" },
  renderText: stringProp,
});
const renderOutputSchema = resultSchema({
  sourcePath: stringProp,
  sourceSha256: stringProp,
  engine: stringProp,
  renderer: stringProp,
  sheet: { type: "object" },
  range: stringProp,
  width: { type: "integer" },
  height: { type: "integer" },
  outputPath: stringProp,
});
const editOutputSchema = resultSchema({
  dryRun: { type: "boolean" },
  sourcePath: stringProp,
  outputPath: stringProp,
  sourceSha256: stringProp,
  outputSha256: stringProp,
  engine: stringProp,
  renderText: stringProp,
});
const diffOutputSchema = resultSchema({
  beforePath: stringProp,
  afterPath: stringProp,
  beforeSha256: stringProp,
  afterSha256: stringProp,
  engine: stringProp,
  equal: { type: "boolean" },
  renderText: stringProp,
});
const validateOutputSchema = resultSchema({
  sourcePath: stringProp,
  sourceSha256: stringProp,
  engine: stringProp,
  ok: { type: "boolean" },
  renderText: stringProp,
});

// workbook_render's raster is not JSON-safe and dsh cannot render
// assistant-side image blocks yet, so the canonical value carries the render
// details (including the saved PNG path) and the model-facing text is the
// same summary the upstream `renderImageResult` produced.
function renderTextForImage(value: Record<string, unknown>): string {
  const lines = [
    `Rendered workbook range with ${String(value.renderer)}: ${String(value.sourcePath)}`,
    `Sheet/range: ${String(value.sheet)}!${String(value.range)}`,
    `Image: ${String(value.width)}x${String(value.height)}`,
    `Saved PNG: ${String(value.outputPath)}`,
  ];
  const warnings = Array.isArray(value.warnings) ? value.warnings : [];
  if (warnings.length) lines.push("Warnings:", ...warnings.slice(0, 10).map((warning) => `- ${String(warning)}`));
  return lines.join("\n");
}

// Upstream `pi.skills: ["./skills"]` auto-loaded the skill; dsh has no
// package-declared skills field, so the shipped SKILL.md is registered on the
// `skills` service (the community pattern: ctx.inject(['skills'], ...)).
// The path resolves for both load modes: source index.ts at the package root
// (dev/tests) and the esbuild bundle at dist/index.js (installed package).
function resolveSkillMarkdown(): { description: string; content: string; path: string } | undefined {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(moduleDir, "skills/workbook-editor/SKILL.md"),
    path.join(moduleDir, "../skills/workbook-editor/SKILL.md"),
  ];
  const skillPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!skillPath) return undefined;
  const text = fs.readFileSync(skillPath, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return undefined;
  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) frontmatter[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  const description = frontmatter.description;
  if (!description) return undefined;
  return { description, content: text.slice(match[0].length).replace(/^\n+/, ""), path: skillPath };
}

export function apply(ctx: {
  tools: { register(definition: unknown): unknown };
  inject(services: string[], callback: (scope: Record<string, any>) => void): unknown;
}): void {
  // 1) The six model-callable tools (upstream registerTool calls).
  ctx.tools.register({
    name: "workbook_inspect",
    description: withGuidelines(
      "Inspect an XLSX/XLSM workbook's sheets, ranges, OOXML parts, links, protected active content, hashes, validation state, and safe-engine capabilities.",
    ),
    parameters: toJsonSchema(InspectSchema),
    output: {
      schema: inspectOutputSchema,
      render: textRender,
    },
    presentCall: () => ({ card: "generic", title: "Inspect Workbook", kind: "read" }),
    async execute(args: WorkbookInspectRequest, exec: ToolExec) {
      const result = await new OoxmlSafeEngine(cwdOf(exec)).inspect(args, exec.signal);
      return withRenderText(result as Record<string, unknown>, "workbook-inspect", args);
    },
  });

  ctx.tools.register({
    name: "workbook_read",
    description: withGuidelines(
      "Read a bounded worksheet range with typed values, formulas, style IDs, normalized style descriptors, merges, and hidden-state metadata.",
    ),
    parameters: toJsonSchema(ReadSchema),
    output: {
      schema: readOutputSchema,
      render: textRender,
    },
    presentCall: () => ({ card: "generic", title: "Read Workbook Range", kind: "read" }),
    async execute(args: WorkbookReadRequest, exec: ToolExec) {
      const result = await new OoxmlSafeEngine(cwdOf(exec)).read(args, exec.signal);
      return withRenderText(result as Record<string, unknown>, "workbook-read", args);
    },
  });

  ctx.tools.register({
    name: "workbook_render",
    description: withGuidelines(
      "Render a focused worksheet range to a deterministic PNG image and return the saved artifact path and fidelity metadata.",
    ),
    parameters: toJsonSchema(RenderSchema),
    output: {
      schema: renderOutputSchema,
      render: (_args: unknown, value: Record<string, unknown>) => [{ type: "text", text: renderTextForImage(value) }],
    },
    presentCall: () => ({ card: "generic", title: "Render Workbook Range", kind: "read" }),
    async execute(args: WorkbookRenderRequest, exec: ToolExec) {
      const result = (await new OoxmlSafeEngine(cwdOf(exec)).render(args, exec.signal)) as Record<string, unknown> & { png: Uint8Array };
      const { png, ...details } = result;
      return toLosslessJson(details);
    },
  });

  ctx.tools.register({
    name: "workbook_edit",
    description: withGuidelines(
      "Dry-run or transactionally apply ordered value, formula, rich-formatting, layout, structural, metadata, table, image, chart, print, and protection operations to XLSX/XLSM without changing protected active-content parts.",
    ),
    parameters: toJsonSchema(EditSchema),
    output: {
      schema: editOutputSchema,
      render: textRender,
    },
    presentCall: () => ({ card: "generic", title: "Edit Workbook", kind: "edit" }),
    async execute(args: WorkbookEditRequest, exec: ToolExec) {
      const params = { ...args, schemaVersion: args.schemaVersion ?? WORKBOOK_CONTRACT_VERSION };
      const engine = new OoxmlSafeEngine(cwdOf(exec), withFileMutationQueue);
      const result = await engine.edit(params, exec.signal);
      return withRenderText(result as unknown as Record<string, unknown>, "workbook-edit", args);
    },
  });

  ctx.tools.register({
    name: "workbook_diff",
    description: withGuidelines(
      "Compare two XLSX/XLSM workbooks by sheets, bounded cell values/formulas/styles, OOXML part hashes, and protected active-content changes.",
    ),
    parameters: toJsonSchema(DiffSchema),
    output: {
      schema: diffOutputSchema,
      render: textRender,
    },
    presentCall: () => ({ card: "generic", title: "Diff Workbooks", kind: "read" }),
    async execute(args: WorkbookDiffRequest, exec: ToolExec) {
      const result = await new OoxmlSafeEngine(cwdOf(exec)).diff(args, exec.signal);
      return withRenderText(result as Record<string, unknown>, "workbook-diff", args);
    },
  });

  ctx.tools.register({
    name: "workbook_validate",
    description: withGuidelines(
      "Validate XLSX/XLSM package structure, extension/content types, relationships, macro state, and optional protected-part integrity against a baseline workbook.",
    ),
    parameters: toJsonSchema(ValidateSchema),
    output: {
      schema: validateOutputSchema,
      render: textRender,
    },
    presentCall: () => ({ card: "generic", title: "Validate Workbook", kind: "read" }),
    async execute(args: WorkbookValidateRequest, exec: ToolExec) {
      const result = await new OoxmlSafeEngine(cwdOf(exec)).validate(args, exec.signal);
      return withRenderText(result as Record<string, unknown>, "workbook-validate", args);
    },
  });

  // 2) The workbook-doctor command (upstream registerCommand + ctx.ui.notify).
  // dsh has no notify API; the command returns the report as its response
  // text — the same content the Pi notification carried.
  ctx.inject(["commands"], (commandCtx) => {
    commandCtx.commands.register({
      name: "workbook-doctor",
      description: "Report workbook backend, host, dependency, and safety capabilities without opening a workbook.",
      async handler() {
        const report = await workbookDoctorReport(OOXML_CAPABILITIES);
        return { kind: "success", text: formatDoctorReport(report) };
      },
    });
  });

  // 3) The workbook-editor skill (upstream pi.skills auto-load).
  ctx.inject(["skills"], (skillCtx) => {
    const skill = resolveSkillMarkdown();
    if (!skill) {
      console.warn("[dsh-extension-workbook] skills/workbook-editor/SKILL.md not found; skill not registered.");
      return;
    }
    skillCtx.skills.register({
      name: "workbook-editor",
      description: skill.description,
      source: "bundled",
      content: skill.content,
      path: skill.path,
    });
  });
}

// Re-exports preserved from the upstream entry (used by tests and by
// downstream consumers of the engine).
export { OoxmlSafeEngine, OOXML_CAPABILITIES } from "./src/backends/ooxml-safe.ts";
export { probeAllBackends } from "./src/backends/probes.ts";
export { withFileMutationQueue } from "./src/file-mutation-queue.ts";
export { workbookDoctorReport, formatDoctorReport } from "./src/doctor.ts";
export { WORKBOOK_CONTRACT_VERSION } from "./src/contracts.ts";
export const WorkbookBackendSchema = StringEnum(["ooxml-safe", "excel-native", "aspose"] as const);
export const WorkbookContractSchema = Type.Literal(WORKBOOK_CONTRACT_VERSION);
