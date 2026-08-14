// Local replacement for `StringEnum` from @earendil-works/pi-ai (Pi harness).
// The dsh port must not depend on Pi packages; the helper is a three-line
// TypeBox wrapper (string + enum), replicated here with identical semantics:
// https://github.com/earendil-works/pi/blob/main/packages/ai/src/utils/typebox-helpers.ts
import { Type } from "typebox";

export function StringEnum<T extends readonly string[]>(
  values: T,
  options?: { description?: string; default?: T[number] },
): { type: "string"; enum: T } & Record<string, unknown> {
  return Type.Unsafe<T[number]>({
    type: "string",
    enum: [...values],
    ...(options?.description ? { description: options.description } : {}),
    ...(options?.default !== undefined ? { default: options.default } : {}),
  }) as never;
}
