import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { boardId } = await params;
  const board = await prisma.board.findFirst({
    where: { id: boardId, userId: session.user.id },
    include: {
      lists: {
        orderBy: { position: "asc" },
        include: {
          cards: {
            orderBy: { position: "asc" },
            include: { labels: { include: { label: true } } },
          },
        },
      },
    },
  });

  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(board);
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { boardId } = await params;
  const data = await req.json();

  const board = await prisma.board.updateMany({
    where: { id: boardId, userId: session.user.id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.archived !== undefined && { archived: data.archived }),
    },
  });

  if (board.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { boardId } = await params;
  await prisma.board.deleteMany({ where: { id: boardId, userId: session.user.id } });
  return NextResponse.json({ success: true });
}
