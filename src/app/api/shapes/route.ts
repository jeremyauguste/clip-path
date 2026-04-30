import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shapes = await prisma.shape.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(shapes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, editorState, cssOutput, canvasWidth, canvasHeight } = body;

  const shape = await prisma.shape.create({
    data: {
      userId: session.user.id,
      name: name ?? "Untitled Shape",
      editorState,
      cssOutput,
      canvasWidth: canvasWidth ?? 400,
      canvasHeight: canvasHeight ?? 400,
    },
  });

  return NextResponse.json(shape, { status: 201 });
}
