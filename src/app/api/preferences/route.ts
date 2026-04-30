import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(prefs ?? null);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const prefs = await prisma.userPreferences.upsert({
    where: { userId: session.user.id },
    update: {
      previewMode: body.previewMode,
      previewColor: body.previewColor,
      canvasWidth: body.canvasWidth,
      canvasHeight: body.canvasHeight,
    },
    create: {
      userId: session.user.id,
      previewMode: body.previewMode ?? "solid",
      previewColor: body.previewColor ?? "#6366f1",
      canvasWidth: body.canvasWidth ?? 400,
      canvasHeight: body.canvasHeight ?? 400,
    },
  });

  return NextResponse.json(prefs);
}
