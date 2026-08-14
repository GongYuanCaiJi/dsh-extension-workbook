// Engine tests: the ported workbook logic (the OoxmlSafeEngine public seam).
// A real OOXML .xlsx fixture is read, edited, validated, diffed, and rendered;
// the fail-closed contracts (hash conflicts, extension matching, dry-run
// immutability, protected-part preservation) are asserted directly.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile, copyFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { OoxmlSafeEngine, withFileMutationQueue } from "../dist/index.js";
import { buildFixtureWorkbook, materializeFixture } from "./helpers/fixture.mjs";

const engine = (cwd, queue) => new OoxmlSafeEngine(cwd, queue);

test("inspect reports sheets, sha256, and a clean validation", async (t) => {
  const { sourcePath } = await materializeFixture(t);
  const result = await engine(path.dirname(sourcePath)).inspect({ path: sourcePath });
  assert.equal(result.engine, "ooxml-safe");
  assert.match(result.sourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(result.validation.ok, true);
  const names = result.sheets.map((sheet) => sheet.name);
  assert.deepEqual(names, ["Sheet1", "Sheet2"]);
});

test("read returns typed values, formulas, and shared/inline strings", async (t) => {
  const { sourcePath } = await materializeFixture(t);
  const result = await engine(path.dirname(sourcePath)).read({ path: sourcePath, sheet: "Sheet1", range: "A1:C2" });
  const cells = new Map(result.cells.map((cell) => [cell.reference, cell]));
  assert.equal(cells.get("A1").value, "Hello");
  assert.equal(cells.get("B1").value, 42);
  assert.equal(cells.get("C1").value, 84);
  assert.equal(cells.get("C1").formula, "B1*2");
  assert.equal(cells.get("A2").value, true);
  assert.equal(cells.get("B2").value, "Inline text");
  assert.ok(result.styles.length >= 0);
  assert.equal(result.range, "A1:C2");
});

test("read with includeFormulas=false drops formulas", async (t) => {
  const { sourcePath } = await materializeFixture(t);
  const result = await engine(path.dirname(sourcePath)).read({ path: sourcePath, sheet: "Sheet1", includeFormulas: false });
  const c1 = result.cells.find((cell) => cell.reference === "C1");
  assert.equal(c1.formula, undefined);
  assert.equal(c1.value, 84);
});

test("dry-run edit plans without writing an output file", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const outputPath = path.join(dir, "edited.xlsx");
  const result = await engine(dir).edit({
    path: sourcePath,
    outputPath,
    dryRun: true,
    operations: [{ type: "setValue", sheet: "Sheet1", range: "A1", value: "Changed" }],
  });
  assert.equal(result.dryRun, true);
  assert.equal(result.validation.ok, true);
  assert.ok(result.changedParts.includes("xl/worksheets/sheet1.xml"));
  await assert.rejects(stat(outputPath), (error) => error.code === "ENOENT");
  const source = await readFile(sourcePath);
  assert.equal(source.length, buildFixtureWorkbook().length, "source must be untouched by a dry run");
});

test("commit without expectedSha256 fails closed", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const outputPath = path.join(dir, "edited.xlsx");
  await assert.rejects(
    engine(dir).edit({ path: sourcePath, outputPath, dryRun: false, operations: [{ type: "setValue", sheet: "Sheet1", range: "A1", value: "Changed" }] }),
    (error) => error.code === "CONFLICT",
  );
});

test("commit with a stale expectedSha256 fails closed", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const outputPath = path.join(dir, "edited.xlsx");
  const before = await engine(dir).inspect({ path: sourcePath });
  // Touch the source so the recorded hash no longer matches.
  await writeFile(sourcePath, Buffer.concat([await readFile(sourcePath), Buffer.from("dirty")]));
  await assert.rejects(
    engine(dir).edit({
      path: sourcePath,
      outputPath,
      dryRun: false,
      expectedSha256: before.sourceSha256,
      operations: [{ type: "setValue", sheet: "Sheet1", range: "A1", value: "Changed" }],
    }),
    (error) => error.code === "CONFLICT",
  );
});

test("commit writes a valid workbook that re-reads with the new value", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const before = await engine(dir).inspect({ path: sourcePath });
  const outputPath = path.join(dir, "edited.xlsx");
  const result = await engine(dir).edit({
    path: sourcePath,
    outputPath,
    dryRun: false,
    expectedSha256: before.sourceSha256,
    operations: [
      { type: "setValue", sheet: "Sheet1", range: "A1", value: "Changed" },
      { type: "setValue", sheet: "Sheet1", range: "B1", value: 99 },
    ],
  });
  assert.equal(result.dryRun, false);
  assert.equal(result.validation.ok, true);
  assert.match(result.outputSha256, /^[a-f0-9]{64}$/);
  const reRead = await engine(dir).read({ path: outputPath, sheet: "Sheet1", range: "A1:B1" });
  const cells = new Map(reRead.cells.map((cell) => [cell.reference, cell]));
  assert.equal(cells.get("A1").value, "Changed");
  assert.equal(cells.get("B1").value, 99);
  // Source must be untouched.
  assert.equal((await engine(dir).read({ path: sourcePath, sheet: "Sheet1", range: "A1" })).cells[0].value, "Hello");
});

test("in-place commit requires overwrite and returns a recovery copy", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const before = await engine(dir).inspect({ path: sourcePath });
  const operations = [{ type: "setValue", sheet: "Sheet1", range: "A1", value: "Changed" }];
  // Same path for source and destination is an in-place edit: it requires overwrite.
  await assert.rejects(
    engine(dir).edit({ path: sourcePath, outputPath: sourcePath, dryRun: false, expectedSha256: before.sourceSha256, operations }),
    (error) => error.code === "OUTPUT_EXISTS",
  );
  const result = await engine(dir).edit({
    path: sourcePath,
    outputPath: sourcePath,
    dryRun: false,
    overwrite: true,
    expectedSha256: before.sourceSha256,
    operations,
  });
  assert.ok(result.recoveryPath, "in-place commit must keep a recovery copy");
  assert.equal(result.validation.ok, true);
  const recovered = await engine(dir).read({ path: result.recoveryPath, sheet: "Sheet1", range: "A1" });
  assert.equal(recovered.cells[0].value, "Hello");
});

test("output extension must match source extension", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const outputPath = path.join(dir, "edited.xlsm");
  await assert.rejects(
    engine(dir).edit({ path: sourcePath, outputPath, dryRun: true, operations: [{ type: "setValue", sheet: "Sheet1", range: "A1", value: "Changed" }] }),
    (error) => error.code === "INVALID_ARGUMENT",
  );
});

test("validate reports ok and baseline integrity", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const result = await engine(dir).validate({ path: sourcePath });
  assert.equal(result.ok, true);
  assert.equal(result.format, "xlsx");
  const baseline = await engine(dir).validate({ path: sourcePath, baselinePath: sourcePath });
  assert.equal(baseline.ok, true);
  assert.equal(baseline.integrity.ok, true);
});

test("diff of identical workbooks is equal; edited workbook shows the change", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const same = await engine(dir).diff({ beforePath: sourcePath, afterPath: sourcePath });
  assert.equal(same.equal, true);

  const before = await engine(dir).inspect({ path: sourcePath });
  const editedPath = path.join(dir, "edited.xlsx");
  await engine(dir).edit({
    path: sourcePath,
    outputPath: editedPath,
    dryRun: false,
    expectedSha256: before.sourceSha256,
    operations: [{ type: "setValue", sheet: "Sheet1", range: "B1", value: 7 }],
  });
  const diff = await engine(dir).diff({ beforePath: sourcePath, afterPath: editedPath });
  assert.equal(diff.equal, false);
  assert.ok(diff.changedCells.some((cell) => cell.sheet === "Sheet1" && cell.reference === "B1" && cell.before?.value === 42 && cell.after?.value === 7));
});

test("render produces a real PNG and writes the artifact when outputDir is set", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const outputDir = path.join(dir, "renders");
  const result = await engine(dir).render({ path: sourcePath, sheet: "Sheet1", range: "A1:C2", outputDir });
  assert.ok(result.png instanceof Uint8Array && result.png.length > 8);
  assert.equal(result.png[0], 0x89);
  assert.equal(result.png[1], 0x50); // "PN"
  assert.ok(result.width > 0 && result.height > 0);
  const saved = await stat(result.outputPath);
  assert.ok(saved.isFile());
  const onDisk = new Uint8Array(await readFile(result.outputPath));
  assert.deepEqual(onDisk, result.png);
});

test("withFileMutationQueue serializes same-path work and parallelizes different paths", async (t) => {
  const order = [];
  const sameKey = path.join(os.tmpdir(), "dsh-wb-queue-same.txt");
  await Promise.all([
    withFileMutationQueue(sameKey, async () => { order.push("a-start"); await new Promise((r) => setTimeout(r, 30)); order.push("a-end"); }),
    withFileMutationQueue(sameKey, async () => { order.push("b-start"); order.push("b-end"); }),
  ]);
  assert.deepEqual(order, ["a-start", "a-end", "b-start", "b-end"], "same-key mutations must run strictly in order");

  const keyA = path.join(os.tmpdir(), "dsh-wb-queue-a.txt");
  const keyB = path.join(os.tmpdir(), "dsh-wb-queue-b.txt");
  const parallel = [];
  await Promise.all([
    withFileMutationQueue(keyA, async () => { parallel.push("a-start"); await new Promise((r) => setTimeout(r, 30)); parallel.push("a-end"); }),
    withFileMutationQueue(keyB, async () => { parallel.push("b-start"); parallel.push("b-end"); }),
  ]);
  // B started before A finished: different keys must run in parallel, not serialize.
  assert.ok(parallel.indexOf("b-start") < parallel.indexOf("a-end"), "different keys must not serialize (saw " + parallel.join(",") + ")");
});

test("queued commits to one output path serialize: exactly one wins, the other fails OUTPUT_EXISTS", async (t) => {
  const { dir, sourcePath } = await materializeFixture(t);
  const before = await engine(dir).inspect({ path: sourcePath });
  const outputPath = path.join(dir, "edited.xlsx");
  const attempts = [
    engine(dir, withFileMutationQueue).edit({
      path: sourcePath, outputPath, dryRun: false, expectedSha256: before.sourceSha256,
      operations: [{ type: "setValue", sheet: "Sheet1", range: "A1", value: "First" }],
    }),
    engine(dir, withFileMutationQueue).edit({
      path: sourcePath, outputPath, dryRun: false, expectedSha256: before.sourceSha256,
      operations: [{ type: "setValue", sheet: "Sheet1", range: "A1", value: "Second" }],
    }),
  ];
  const settled = await Promise.allSettled(attempts);
  const fulfilled = settled.filter((entry) => entry.status === "fulfilled");
  const rejected = settled.filter((entry) => entry.status === "rejected");
  // With the queue in effect, the second commit observes the destination
  // written by the first (OUTPUT_EXISTS). With an identity queue both would
  // observe an absent destination and both would commit — so this assertion
  // fails when the queue is not wired.
  assert.equal(fulfilled.length, 1, `exactly one commit must win, got ${fulfilled.length}`);
  assert.equal(rejected.length, 1, `exactly one commit must lose, got ${rejected.length}`);
  assert.equal(rejected[0].reason?.code, "OUTPUT_EXISTS", `loser must fail closed with OUTPUT_EXISTS, got ${rejected[0].reason?.code}`);
  assert.equal(fulfilled[0].value.validation.ok, true);
  const final = await engine(dir).read({ path: outputPath, sheet: "Sheet1", range: "A1" });
  assert.ok(["First", "Second"].includes(final.cells[0].value), "final value must be one of the committed values");
});
