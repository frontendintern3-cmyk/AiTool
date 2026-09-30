import type { Prisma } from "@prisma/client";

/** Prisma's Json input type requires structurally-typed plain objects/arrays;
 * our domain types (ImageRef[], LinkRef[], etc.) are close enough at runtime
 * but not structurally identical, so we round-trip through JSON to satisfy
 * both the type checker and Prisma's actual serialization. */
export function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null));
}
