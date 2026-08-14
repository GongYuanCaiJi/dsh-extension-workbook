import * as imported from "./vendor/pi-utils/index.ts";

type UtilityName = "resolveUserPath" | "writeFileAtomic" | "runCommand";

function utility<T>(name: UtilityName): T {
  const namespace = imported as unknown as Record<string, unknown>;
  const nestedDefault = namespace.default && typeof namespace.default === "object" ? namespace.default as Record<string, unknown> : undefined;
  const value = namespace[name] ?? nestedDefault?.[name];
  if (typeof value !== "function") throw new Error(`@firstpick/pi-utils does not expose required function ${name}.`);
  return value as T;
}

export const resolveUserPath = utility<typeof import("./vendor/pi-utils/index.ts").resolveUserPath>("resolveUserPath");
export const writeFileAtomic = utility<typeof import("./vendor/pi-utils/index.ts").writeFileAtomic>("writeFileAtomic");
export const runCommand = utility<typeof import("./vendor/pi-utils/index.ts").runCommand>("runCommand");
