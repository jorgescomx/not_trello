import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const boards = await prisma.board.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(boards);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, color } = await req.json();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const board = await prisma.board.create({
    data: { title, color: color ?? "#026AA7", userId: session.user.id },
  });
  return NextResponse.json(board, { status: 201 });
}
