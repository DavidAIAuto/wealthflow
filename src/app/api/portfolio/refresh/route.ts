import { NextResponse } from "next/server";
import { getPortfolio } from "@/lib/stocks";

/** Force-refresh every holding's price regardless of cache age. Never fails on provider errors. */
export async function POST() {
  return NextResponse.json(await getPortfolio({ sync: "force" }));
}
