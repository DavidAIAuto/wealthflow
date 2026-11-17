import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

export function jsonError(error: string, status = 400, details?: unknown) {
  return NextResponse.json(details ? { error, details } : { error }, { status });
}

export function zodError(err: ZodError) {
  const first = err.issues[0];
  const msg = first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input";
  return jsonError(msg, 400, z.flattenError(err));
}

/** Parse a positive integer route id, or null. */
export function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
