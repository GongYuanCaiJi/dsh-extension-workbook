// Adapter tests: the dsh plugin entry seam (name/inject/apply + registered
// tools/commands/skill). These defend the dsh wiring contracts: raw tool
// registration shape, JSON-Schema parameters, sync render, canonical values
// conforming to output.schema, exec-cwd path resolution, and the mutation
// queue actually being wired into workbook_edit.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { apply, name, inject } from "../dist/index.js";
import { materializeFixture } from "./helpers/fixture.mjs";

// Minimal fake ctx that captures registrations and runs inject callbacks
// synchronously, mirroring the dsh service shapes used by the port.
function makeCtx(t) {
  const tools = [];
  const commands = [];
  const skills = [];
  const ctx = {
    tools: { register: (definition) => { tools.push(definition); return () => {}; } },
    inject: (services, callback) => {
      if (services.includes("commands")) callback({ commands: { register: (definition) => { commands.push(definition); return () => {}; } } });
      if (services.includes("skills")) callback({ skills: { register: (definition) => { skills.push(definition); return () => {}; } } });
    },
  };
  apply(ctx, {});
  t.after(() => { tools.length = 0; commands.length = 0; skills.length = 0; });
  return { ctx, tools, commands, skills };
}

const SUPPORTED_SCHEMA_KEYS = new Set([
  "type", "oneOf", "properties", "required", "additionalProperties", "items", "enum", "const",
  "description", "title", "default", "examples",
]);

function assertSupportedSchemaKeywords(schema, pathName = "schema") {
  for (const key of Object.keys(schema)) {
    assert.ok(SUPPORTED_SCHEMA_KEYS.has(key), `${pathName}.${key} is not in the dsh output-schema subset`);
  }
  if (schema.properties) for (const [prop, sub] of Object.entries(schema.properties)) assertSupportedSchemaKeywords(sub, `${pathName}.properties.${prop}`);
  if (schema.items) assertSupportedSchemaKeywords(schema.items, `${pathName}.items`);
  if (schema.oneOf) schema.oneOf.forEach((sub, index) => assertSupportedSchemaKeywords(sub, `${pathName}.oneOf[${index}]`));
}

// Loose value-vs-schema conformance: declared properties must match their
// types; additionalProperties:true tolerates the rest.
function assertConforms(value, schema, pathName = "value") {
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    if (prop.type === "object") continue;
    if (prop.type === "array") {
      assert.ok(Array.isArray(value[key]), `${pathName}.${key} must be an array`);
      continue;
    }
    if (prop.type === "integer") {
      assert.equal(typeof value[key], "number", `${pathName}.${key} must be a number`);
      assert.ok(Number.isInteger(value[key]), `${pathName}.${key} must be an integer`);
      continue;
    }
    assert.equal(typeof value[key], prop.type, `${pathName}.${key} must be ${prop.type}`);
  }
}

test("entry exports the dsh namespace contract", () => {
  assert.equal(name, "dsh-extension-workbook");
  assert.deepEqual(inject, ["tools"]);
  assert.equal(typeof apply, "function");
});

test("apply registers the six workbook tools with JSON-Schema parameters", (t) => {
  const { tools } = makeCtx(t);
  assert.deepEqual(tools.map((tool) => tool.name), ["workbook_inspect", "workbook_read", "workbook_render", "workbook_edit", "workbook_diff", "workbook_validate"]);
  for (const tool of tools) {
    assert.equal(tool.parameters.type, "object", `${tool.name} parameters must be rooted at type object`);
    assert.equal(typeof tool.parameters.properties, "object");
    assert.ok(Array.isArray(tool.parameters.required));
    assert.equal(typeof tool.output.schema, "object");
    assertSupportedSchemaKeywords(tool.output.schema);
    assert.equal(typeof tool.output.render, "function");
    assert.equal(typeof tool.execute, "function");
    assert.equal(typeof tool.presentCall, "function");
    // Upstream promptGuidelines ride in the description (the only model-facing text).
    assert.match(tool.description, /dryRun=true first/);
    assert.match(tool.description, /Never claim macros were executed/);
  }
});

test("apply registers the workbook-doctor command and the workbook-editor skill", (t) => {
  const { commands, skills } = makeCtx(t);
  assert.equal(commands.length, 1);
  assert.equal(commands[0].name, "workbook-doctor");
  assert.equal(typeof commands[0].handler, "function");
  assert.equal(skills.length, 1);
  assert.equal(skills[0].name, "workbook-editor");
  assert.equal(skills[0].source, "bundled");
  assert.match(skills[0].description, /^Use when inspecting/);
  assert.match(skills[0].content, /^# Workbook Editor/);
  assert.match(skills[0].content, /expectedSha256/);
});

test("workbook_read resolves the workbook path against exec.agent cwd, not process.cwd()", async (t) => {
  // Wrong wiring (using process.cwd()) must fail to find the fixture; the
  // exec cwd must win.
  const { sourcePath } = await materializeFixture(t);
  const execCwd = path.dirname(sourcePath);
  const relative = path.basename(sourcePath);
  const { tools } = makeCtx(t);
  const read = tools.find((tool) => tool.name === "workbook_read");
  const value = await read.execute({ path: relative, sheet: "Sheet1", range: "A1:C2" }, { agent: { session: { header: { cwd: execCwd } } } });
  assertConforms(value, read.output.schema);
  const cells = new Map(value.cells.map((cell) => [cell.reference, cell]));
  assert.equal(cells.get("A1").value, "Hello");
  assert.equal(cells.get("B1").value, 42);
  const rendered = read.output.render({}, value);
  assert.equal(rendered[0].type, "text");
  assert.match(rendered[0].text, /"Hello"/);
});

test("workbook_read defaults to process.cwd() when exec has no agent", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const { tools } = makeCtx(t);
  const read = tools.find((tool) => tool.name === "workbook_read");
  const previous = process.cwd();
  process.chdir(dir);
  try {
    const value = await read.execute({ path: path.basename(sourcePath), sheet: "Sheet1", range: "A1" }, {});
    assert.equal(value.cells[0].value, "Hello");
  } finally {
    process.chdir(previous);
  }
});

test("workbook_edit execute produces a canonical value with dryRun/sha256 and bounded renderText", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const { tools } = makeCtx(t);
  const inspect = tools.find((tool) => tool.name === "workbook_inspect");
  const edit = tools.find((tool) => tool.name === "workbook_edit");
  const inspected = await inspect.execute({ path: sourcePath }, { agent: { session: { header: { cwd: dir } } } });
  const value = await edit.execute(
    {
      path: sourcePath,
      dryRun: true,
      operations: [{ type: "setValue", sheet: "Sheet1", range: "A1", value: "Changed" }],
    },
    { agent: { session: { header: { cwd: dir } } } },
  );
  assert.equal(value.dryRun, true);
  assert.equal(value.engine, "ooxml-safe");
  assertConforms(value, edit.output.schema);
  assert.equal(typeof value.renderText, "string");
  assert.match(value.renderText, /"dryRun": true/);
  assert.equal(inspected.sourceSha256, value.sourceSha256);
});

test("workbook_render value excludes the raster and render text points at the saved PNG", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const { tools } = makeCtx(t);
  const render = tools.find((tool) => tool.name === "workbook_render");
  const value = await render.execute({ path: sourcePath, sheet: "Sheet1", range: "A1:C2", outputDir: path.join(dir, "renders") }, { agent: { session: { header: { cwd: dir } } } });
  assertConforms(value, render.output.schema);
  assert.equal("png" in value, false, "raster must not ride in the canonical value");
  assert.ok(value.outputPath.endsWith(".png"));
  const rendered = render.output.render({}, value);
  assert.equal(rendered[0].type, "text");
  assert.match(rendered[0].text, /Saved PNG:/);
  assert.match(rendered[0].text, new RegExp(value.outputPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("workbook_edit tool wires the mutation queue: concurrent commits to one output serialize", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const { tools } = makeCtx(t);
  const inspect = tools.find((tool) => tool.name === "workbook_inspect");
  const edit = tools.find((tool) => tool.name === "workbook_edit");
  const exec = { agent: { session: { header: { cwd: dir } } } };
  const before = await inspect.execute({ path: sourcePath }, exec);
  const outputPath = path.join(dir, "edited.xlsx");
  const base = { path: sourcePath, outputPath, dryRun: false, expectedSha256: before.sourceSha256 };
  const settled = await Promise.allSettled([
    edit.execute({ ...base, operations: [{ type: "setValue", sheet: "Sheet1", range: "A1", value: "First" }] }, exec),
    edit.execute({ ...base, operations: [{ type: "setValue", sheet: "Sheet1", range: "A1", value: "Second" }] }, exec),
  ]);
  const fulfilled = settled.filter((entry) => entry.status === "fulfilled");
  const rejected = settled.filter((entry) => entry.status === "rejected");
  assert.equal(fulfilled.length, 1, "exactly one commit must win when the queue is wired");
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason?.code, "OUTPUT_EXISTS");
});

test("workbook-doctor handler returns a success report", async (t) => {
  const { commands } = makeCtx(t);
  const result = await commands[0].handler({});
  assert.equal(result.kind, "success");
  assert.match(result.text, /workbook-doctor: PASS/);
  assert.match(result.text, /ooxml-safe/);
});

test("bounded output truncation preserves the artifact path in renderText", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const { tools } = makeCtx(t);
  const inspect = tools.find((tool) => tool.name === "workbook_inspect");
  const value = await inspect.execute({ path: sourcePath, limits: { maxVisibleOutputChars: 200 } }, { agent: { session: { header: { cwd: dir } } } });
  assert.match(value.renderText, /"truncated": true/);
  assert.match(value.renderText, /artifactPath/);
  assert.ok(value.renderText.length <= 200 + 400, "truncated render text must stay small");
});

// The harness snapshots the canonical value and rejects members that are not
// lossless JSON (own enumerable properties holding undefined, functions,
// symbols, bigints, or non-finite numbers all fail the snapshot).
function assertLosslessJson(value, pathName = "value") {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number") assert.ok(Number.isFinite(value), `${pathName} must be a finite number`);
    assert.ok(["string", "number", "boolean"].includes(typeof value), `${pathName} must be a JSON primitive`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertLosslessJson(item, `${pathName}[${index}]`));
    return;
  }
  assert.equal(Object.getPrototypeOf(value), Object.prototype, `${pathName} must be a plain object`);
  for (const key of Object.keys(value)) {
    const entry = value[key];
    assert.notEqual(typeof entry, "undefined", `${pathName}.${key} is undefined (not lossless JSON)`);
    assert.notEqual(typeof entry, "function", `${pathName}.${key} is a function`);
    assert.notEqual(typeof entry, "bigint", `${pathName}.${key} is a bigint`);
    assert.notEqual(typeof entry, "symbol", `${pathName}.${key} is a symbol`);
    assertLosslessJson(entry, `${pathName}.${key}`);
  }
}

test("every tool's canonical value is lossless JSON (harness snapshot contract)", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const { tools } = makeCtx(t);
  const exec = { agent: { session: { header: { cwd: dir } } } };
  const inspect = tools.find((tool) => tool.name === "workbook_inspect");
  const read = tools.find((tool) => tool.name === "workbook_read");
  const render = tools.find((tool) => tool.name === "workbook_render");
  const edit = tools.find((tool) => tool.name === "workbook_edit");
  const diff = tools.find((tool) => tool.name === "workbook_diff");
  const validate = tools.find((tool) => tool.name === "workbook_validate");

  const inspected = await inspect.execute({ path: sourcePath }, exec);
  assertLosslessJson(inspected, "inspect value");
  assert.ok(inspected.renderText.length > 0);

  const readValue = await read.execute({ path: sourcePath, sheet: "Sheet1", range: "A1:C2" }, exec);
  assertLosslessJson(readValue, "read value");
  // The engine's style descriptors carry explicit undefined attributes; the
  // normalized value must not (this was the E2E "value is not lossless JSON" bug).
  assert.equal("name" in readValue.styles[0].font, false, "undefined style attributes must be dropped");

  const renderValue = await render.execute({ path: sourcePath, sheet: "Sheet1", range: "A1:C2" }, exec);
  assertLosslessJson(renderValue, "render value");

  const dryRun = await edit.execute(
    { path: sourcePath, dryRun: true, operations: [{ type: "setValue", sheet: "Sheet1", range: "A1", value: "Changed" }] },
    exec,
  );
  assertLosslessJson(dryRun, "edit value");

  const diffValue = await diff.execute({ beforePath: sourcePath, afterPath: sourcePath }, exec);
  assertLosslessJson(diffValue, "diff value");

  const validateValue = await validate.execute({ path: sourcePath }, exec);
  assertLosslessJson(validateValue, "validate value");
});
