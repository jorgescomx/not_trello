import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ cardId: string; commentId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId, commentId } = await params;

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, cardId },
    include: { card: { include: { list: { include: { board: true } } } } },
  });
  if (!comment || comment.card.list.board.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId, commentId } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, cardId },
    include: { card: { include: { list: { include: { board: true } } } } },
  });
  if (!comment || comment.card.list.board.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content: content.trim() },
  });
  return NextResponse.json(updated);
}
