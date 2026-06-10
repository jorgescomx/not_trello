import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ swimlaneId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { swimlaneId } = await params;
  const data = await req.json();

  const swimlane = await prisma.swimlane.findFirst({
    where: { id: swimlaneId },
    include: { board: true },
  });
  if (!swimlane || swimlane.board.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.swimlane.update({
    where: { id: swimlaneId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.position !== undefined && { position: data.position }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { swimlaneId } = await params;
  const swimlane = await prisma.swimlane.findFirst({
    where: { id: swimlaneId },
    include: { board: true },
  });
  if (!swimlane || swimlane.board.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.swimlane.delete({ where: { id: swimlaneId } });
  return NextResponse.json({ success: true });
}
