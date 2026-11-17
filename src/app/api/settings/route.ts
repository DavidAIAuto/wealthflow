import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { readJson, zodError } from "@/lib/api";
import { SettingsPatch } from "@/lib/validators";

async function getSettings() {
  return prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function PATCH(req: NextRequest) {
  const parsed = SettingsPatch.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  await getSettings();
  const settings = await prisma.appSettings.update({ where: { id: 1 }, data: parsed.data });
  return NextResponse.json(settings);
}
