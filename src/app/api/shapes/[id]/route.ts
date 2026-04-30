import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const shape = await prisma.shape.findUnique({ where: { id } });
  if (!shape || shape.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(shape);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const shape = await prisma.shape.findUnique({ where: { id } });
  if (!shape || shape.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.shape.update({
    where: { id },
    data: {
      name: body.name ?? shape.name,
      editorState: body.editorState ?? shape.editorState,
      cssOutput: body.cssOutput ?? shape.cssOutput,
      canvasWidth: body.canvasWidth ?? shape.canvasWidth,
      canvasHeight: body.canvasHeight ?? shape.canvasHeight,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const shape = await prisma.shape.findUnique({ where: { id } });
  if (!shape || shape.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.shape.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
