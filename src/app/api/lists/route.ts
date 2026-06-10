import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, boardId } = await req.json();
  if (!title || !boardId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const board = await prisma.board.findFirst({ where: { id: boardId, userId: session.user.id } });
  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

  const last = await prisma.list.findFirst({ where: { boardId }, orderBy: { position: "desc" } });
  const position = (last?.position ?? 0) + 1000;

  const list = await prisma.list.create({ data: { title, boardId, position } });
  return NextResponse.json(list, { status: 201 });
}
