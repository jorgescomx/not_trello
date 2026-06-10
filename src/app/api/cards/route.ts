import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, listId, swimlaneId } = await req.json();
  if (!title || !listId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const list = await prisma.list.findFirst({
    where: { id: listId },
    include: { board: true },
  });
  if (!list || list.board.userId !== session.user.id)
    return NextResponse.json({ error: "List not found" }, { status: 404 });

  const last = await prisma.card.findFirst({ where: { listId }, orderBy: { position: "desc" } });
  const position = (last?.position ?? 0) + 1000;

  const card = await prisma.card.create({ data: { title, listId, position, swimlaneId: swimlaneId ?? null } });
  return NextResponse.json(card, { status: 201 });
}
