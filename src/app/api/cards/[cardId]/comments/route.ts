import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ cardId: string }> };

async function verifyCardOwner(cardId: string, userId: string) {
  const card = await prisma.card.findFirst({
    where: { id: cardId },
    include: { list: { include: { board: true } } },
  });
  return card?.list.board.userId === userId ? card : null;
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;
  if (!await verifyCardOwner(cardId, session.user.id))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comments = await prisma.comment.findMany({
    where: { cardId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(comments);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;
  if (!await verifyCardOwner(cardId, session.user.id))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const comment = await prisma.comment.create({
    data: { content: content.trim(), cardId },
  });
  return NextResponse.json(comment, { status: 201 });
}
