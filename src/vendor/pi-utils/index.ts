// Vendored subset of @firstpick/pi-utils@0.2.6 (MIT) — see THIRD_PARTY_NOTICES.md.
//
// The dsh port bundles the five utility modules the workbook engine actually
// uses (paths/json/process via this index; hash/filesystem imported directly
// by src/core/* and src/ooxml/*) because the upstream package ships
// TypeScript sources and Node refuses type-stripping for files under
// node_modules. The module files are byte-identical to the upstream package;
// this index re-exports three of them in place of the upstream 24-module entry.
export * from "./paths.ts";
export * from "./json.ts";
export * from "./process.ts";
