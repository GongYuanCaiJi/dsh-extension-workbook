# Third-Party Notices

`dsh-extension-workbook` is a DeepSeek Harness (dsh) port of the Pi-ecosystem
extension [`@firstpick/pi-extension-workbook`](https://www.npmjs.com/package/@firstpick/pi-extension-workbook).
This file pins the upstream artifact and documents every non-verbatim file so
"the port is a verbatim copy except where documented" can be verified by
anyone with a shell.

All upstream code is MIT licensed; the MIT license text is preserved in
`LICENSE` with both copyright holders.

---

## 1. Upstream artifact (pinned)

| Field | Value |
|---|---|
| Package | `@firstpick/pi-extension-workbook` |
| Version | `0.1.5` |
| Published | 2026-08-07T20:46:24.917Z |
| Registry integrity | `sha512-Yz4Ce86OfL/SkOg/NWefgDrPAdvC1WRsbzySb9ZFwvC+T/FKh5WONUsA+ds1HiM8tOvhxLSuH7Qhg+pl6H+rgw==` |
| Registry shasum | `2a2f92cad262afd143d88083574aaf9b970b715d` |
| gitHead | `239829d747deae4d9c0f039421ab29440f40f1a2` |
| Source repo | https://github.com/Firstp1ck/pi-coding-agent-forge/tree/main/pi-extension-workbook |

Verifiable download:

```bash
npm pack @firstpick/pi-extension-workbook@0.1.5
shasum -a 256 pi-extension-workbook-0.1.5.tgz   # == 2a2f92cad262afd143d88083574aaf9b970b715d
```

## 2. Files copied byte-for-byte from the upstream tarball

The following files in this repository are **byte-identical** to the
`@firstpick/pi-extension-workbook@0.1.5` tarball (SHA-256):

```text
a6188383b5087a87da815a17a44bcd7a537576aaadae59f9cd0c93e71963bbeb  src/backends/excel-native.ts
74fc072ccd7f0f9da42c0ebb5e8c4e7921895a662585f5d9484dcd6db7e2a1a3  src/backends/index.ts
4a1da61e7f3de8c9dbcf5df24a165365971f936460ec161e9909a4328a89dee4  src/backends/interface.ts
a5e9bcf8eab0aef265b630fc1b67a7d4e75f07bbb2c5044cf4a83d8556988dac  src/backends/ooxml-safe.ts
7ddb2bf5759a9e96378e96afc77f63daab65cb7a6dd306e3055ebfb321968e5f  src/backends/probes.ts
e049301fe70da61d1159d73625b9aeb19dbb2610a03c8e0fb48fefc2eb821e39  src/backends/selector.ts
608b722dc7f9d23ff5c6f88bccbd56b9ebeb01e193a9e23f6b4ad21736d90571  src/core/limits.ts
29c5bf46a7fffa4a099713038d68a153d75657663d8d3d8e00a90b17e66cce62  src/core/paths.ts
8f810dbe2cbd91fc3b2985fe2e80201178c6113a2d7224abb866ddc550c100a3  src/ooxml/advanced-objects.ts
707fcf7616bc519780d6cbc97ff53e701fe88043a95eea091683360cd4ae4f7a  src/ooxml/advanced-package.ts
03e12c46ff94fdc6be3ec5cb9d0a72a96048046eeffc26ede1fe7f1577fee5c3  src/ooxml/advanced-worksheet.ts
e641baa2788fc9ba51ea26642e933b145856c26017824649b060925657c96952  src/ooxml/cell-ref.ts
48180240d577b4600122a3d34a57a446f5990769af7a689d7e021446087eaccc  src/ooxml/diff.ts
e6709622aad5fe3268e311562169256452bd90ebc349776feef6bae48b52325d  src/ooxml/edit.ts
9550a3713a6d21c60054c2bc6027a9492114becd745bfe6d84505c774dee7628  src/ooxml/formula-policy.ts
bcab8f0683919fcf305cba9ce779fee3a8dfb32f8347dcccca6f01ad95983679  src/ooxml/package-edit.ts
f137e36f3728e722a1e7a4763b30e26de3382e18dfd0c8e18b22eac07f95da15  src/ooxml/package.ts
9af43bd5fc2400910f8e138f950b55e131852014c388dbbee29f55a7573c2c4d  src/ooxml/preview-cache.ts
84d59117218141ef663b7f985e72dd202609501af5bc4b381bd69aeab54b6b8c  src/ooxml/render.ts
c90e07be83aac9dae8e0ec558b6d2589b12114ebc86222b7618ace5a87669cbf  src/ooxml/styles.ts
8745f34b729e70e4cccdf547495c50bf105444795d284d7e92ba4332f7a7cb5d  src/ooxml/validate.ts
56a6a74a9de8b65eaae0998ab17a39252147fbfbb1565f1c3c649675036c7801  src/ooxml/workbook.ts
fea3ec22dc8e894f973d040efd15cb7f7fa78dc848560d01c559225a06e90d69  src/ooxml/xml.ts
199e1e54f6d9827105e991e2a9da65c7a2c886ab2f25a2d26b2023309b123201  src/output.ts
735dd70867f66101c54c787e0ad43296be54d1cdee2f4dae812951a4b9eea493  src/contracts.ts
a8f929739240bd5b8bc9713da4151b6bd42e05b42f39b4f282de04da1f0423de  src/errors.ts
c86cd4a3d6303c33c1deabc8456bdcbfbbb5c6d576ab25cd473ff881e963a6eb  workers/excel-native.ps1
5a441b4f09971c7bcc200e87c04782107f291d323ed831ef1b63b71f1d4580ba  workers/README.md
3c520173ab1828ace937ec87f1dee3d0a81135d7ddf754c4641d93fc68b2e10d  skills/workbook-editor/SKILL.md
0178c8e1f8e719ba3f8e626adc1a575d5810563c4825225647a0ad6059d5608f  docs/ADR-0001-primary-backend.md
f3124a6fff4e7b03b0b7523e67116a7be5cbfccaa45c74072181e8f24953dead  docs/CAPABILITY-MATRIX.md
1b8d38dfb931643b784ecb7ddffeb7cd43b58b71456f5085535fa9f7847cbe17  docs/IMPLEMENTATION-STATUS.md
ecdfc02ceca5a20c7363ef9b3a65572f0c6bf9d7e14af589dd7eecb15ce4d0e6  docs/MIGRATION.md
72f75d9df1b5a40a9fc857715f3d37a70f09414bbbc5dc347f795e0026c90fc6  docs/VBA-THREAT-MODEL.md
```

Self-check (unpack the pinned tarball next to this repo, then):

```bash
cd <unpacked-upstream-package> && for f in <any file above>; do cmp "$f" "<this repo>/$f" || echo "DIFFERS: $f"; done
```

## 3. Files adapted from upstream (each change is required and minimal)

Every upstream file below is preserved except the one documented change;
`git diff` against the pinned upstream commit `239829d747deae4d9c0f039421ab29440f40f1a2`
shows the full extent.

| File | Upstream SHA-256 | Change (and why it cannot stay verbatim) |
|---|---|---|
| `index.ts` | `2c83c7b3b59f66bc4a58f0d3bf51f9e0037f1eb518be1f49bc8e9b622374ee1f` | **Rewritten as the dsh plugin entry.** Pi extensions are `(pi) => void` factories; dsh plugins export `name`/`inject`/`apply(ctx)` (Cordis namespace contract, no `export default`). Tool registrations become `ctx.tools.register(...)`, the command becomes `commands.register(...)`, and the skill becomes a `skills.register(...)` of the shipped `SKILL.md`. The six tools, their parameters (TypeBox → JSON Schema), the command, and all re-exports are preserved. Two post-review additions, each forced by the harness and found in the E2E: (1) canonical values are normalized to lossless JSON (the harness snapshots tool values and rejects members like the engine's explicit-`undefined` style attributes); (2) the skill registration carries `source: "bundled"` (dsh's skill validation requires a source string). |
| `README.md` | `d8e2ff46d5de75ddbfe7a2042b0f714020f2cb2802aeae46541e4c4ad8a2f461` | Bilingual rewrite (zh/en) with a language switcher, per the port playbook's presentation conventions; install instructions target dsh instead of Pi. |
| `src/core/hash.ts` | `2b5c75ac9314e6c59be58eae5765ace8990f9932eea98b308ceb01d8c18e6102` | Import reroute: `@firstpick/pi-utils/hash` → `../vendor/pi-utils/hash.ts`. The upstream dependency ships TypeScript sources; Node refuses type-stripping under `node_modules`, so the used modules are vendored (see section 4) and bundled at build time. |
| `src/core/io.ts` | `149d4ad90e9d568782be98a26066b04e0e68e5fb1d6ad8b9a6a2ec065670c4e3` | Import reroute: `@firstpick/pi-utils/filesystem` → `../vendor/pi-utils/filesystem.ts` (same reason). |
| `src/core/transaction.ts` | `e66399e67ee5bcb0260dd47af5c75513c8ca0264c1a963a0c58a1600f70a0848` | Import reroute: `@firstpick/pi-utils/paths` → `../vendor/pi-utils/paths.ts` (same reason). |
| `src/ooxml/zip.ts` | `fb713d096bedee40aadb5b44e6a06bcb40e64be72e018634006abe5d20fb7f3b` | Import reroute: `@firstpick/pi-utils/hash` → `../vendor/pi-utils/hash.ts` (same reason). |
| `src/doctor.ts` | `72b35b94f8c93405814842e1baa258d4ce0004ab40129d16d2d588f9fc2813d9` | Dependency probe list: `@firstpick/pi-utils` removed (it is bundled, not a runtime dependency); the check now reflects the actual runtime dependencies (`@xmldom/xmldom`, `fflate`). |
| `src/pi-utils.ts` | `c153a456970d5f8dd09424c3ef48bed8103fc42b08fdcf6f983db096c3dd3f96` | Import reroute: `@firstpick/pi-utils` → `./vendor/pi-utils/index.ts` (same reason). |
| `src/schemas.ts` | `82c0cca725bba3bdb68e8f6c5ed9dede579c919470f5f67cbb46ba5e3b2c067e` | `StringEnum` import rerouted from `@earendil-works/pi-ai` (a Pi harness package) to the local `src/string-enum.ts`, an identical three-line TypeBox wrapper (see section 5). |
| `scripts/check.mjs` | `a8c4a97d633bc7d4cd0586328f8a19910c834c06a6b38571ac0bd2b00cf0cbb0` | Package-identity assertions updated to the dsh package (`dsh-extension-workbook`, `dsh.bundle.patch`, `main: dist/index.js`). All safety assertions (skill regex, native-worker safety patterns, no `child_process` in the entry) are unchanged. |

## 4. Vendored utility modules (from `@firstpick/pi-utils@0.2.6`, MIT)

`@firstpick/pi-utils` ships TypeScript sources; Node refuses type-stripping for
files under `node_modules`, so the workbook engine's used modules are vendored
byte-for-byte under `src/vendor/pi-utils/` and compiled into the bundle.

| File | Upstream module | SHA-256 (matches `@firstpick/pi-utils@0.2.6`) |
|---|---|---|
| `src/vendor/pi-utils/paths.ts` | `src/paths.ts` | `33c6b7e0addf25b549af235a26f832734a7b375ada37e25c7b05dc19d2623361` |
| `src/vendor/pi-utils/json.ts` | `src/json.ts` | `95661334baf879b5a4c191f0235c20bebe73ba9a210b971bec08b7055c789c40` |
| `src/vendor/pi-utils/process.ts` | `src/process.ts` | `d580ef8fe7dfbfdb5851ab797bea5984f9ccc88273b17cb5b70b4e93c241c938` |
| `src/vendor/pi-utils/hash.ts` | `src/hash.ts` | `85f2a2698b04fa92ece8589557f3dd4592d401af36fbf626492b951df4dd0d7c` |
| `src/vendor/pi-utils/filesystem.ts` | `src/filesystem.ts` | `469fe9369eb1be2607df259fe69c3f4062532a41faa8f8f5fc7797759ab4cb61` |

`src/vendor/pi-utils/index.ts` is a three-line re-export of the five modules
(in place of the upstream 24-module entry); it is port code, not upstream code.

Self-check:

```bash
npm pack @firstpick/pi-utils@0.2.6
tar xzf firstpick-pi-utils-0.2.6.tgz
for f in paths json process hash filesystem; do cmp "package/src/$f.ts" "<this repo>/src/vendor/pi-utils/$f.ts" || echo "DIFFERS: $f"; done
```

## 5. Reimplemented harness helpers (port code)

- `src/file-mutation-queue.ts` — `withFileMutationQueue`, ported from
  `@earendil-works/pi-coding-agent@0.84.2` (`dist/core/tools/file-mutation-queue.js`,
  MIT). The dsh port cannot import the Pi SDK; the ~40-line keyed promise
  queue is reimplemented with identical behavior (realpath-keyed, serialized
  per file, parallel across files) and is covered by tests.
- `src/string-enum.ts` — `StringEnum`, replicated from
  `@earendil-works/pi-ai@0.80.6` (`src/utils/typebox-helpers.ts`, MIT): a
  `Type.Unsafe({ type: "string", enum: [...] })` wrapper with identical
  semantics.

## 6. Port-only files (not upstream)

`index.ts` (adapted entry, section 3), `cordis.patch.yml`, `package.json`
(port manifest), `tsconfig.json`, `test/`, `src/string-enum.ts`,
`src/file-mutation-queue.ts`, `src/vendor/pi-utils/index.ts`,
`THIRD_PARTY_NOTICES.md`, and the bilingual `README.md`.
