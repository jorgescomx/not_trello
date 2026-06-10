import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ cardId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const card = await prisma.card.findFirst({
    where: { id: cardId },
    include: {
      labels: { include: { label: true } },
      list: { include: { board: true } },
    },
  });
  if (!card || card.list.board.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(card);
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const data = await req.json();

  const card = await prisma.card.findFirst({
    where: { id: cardId },
    include: { list: { include: { board: true } } },
  });
  if (!card || card.list.board.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.listId !== undefined && { listId: data.listId }),
      ...(data.swimlaneId !== undefined && { swimlaneId: data.swimlaneId ?? null }),
    },
    include: { labels: { include: { label: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const card = await prisma.card.findFirst({
    where: { id: cardId },
    include: { list: { include: { board: true } } },
  });
  if (!card || card.list.board.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.card.delete({ where: { id: cardId } });
  return NextResponse.json({ success: true });
}
