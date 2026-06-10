import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ cardId: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const { name, color } = await req.json();

  const card = await prisma.card.findFirst({
    where: { id: cardId },
    include: { list: { include: { board: true } } },
  });
  if (!card || card.list.board.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  let label = await prisma.label.findFirst({ where: { name, color } });
  if (!label) label = await prisma.label.create({ data: { name, color } });

  await prisma.cardLabel.upsert({
    where: { cardId_labelId: { cardId, labelId: label.id } },
    create: { cardId, labelId: label.id },
    update: {},
  });

  return NextResponse.json(label);
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const { labelName } = await req.json();

  const card = await prisma.card.findFirst({
    where: { id: cardId },
    include: { list: { include: { board: true } } },
  });
  if (!card || card.list.board.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const label = await prisma.label.findFirst({ where: { name: labelName } });
  if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });

  await prisma.cardLabel.deleteMany({ where: { cardId, labelId: label.id } });
  return NextResponse.json({ success: true });
}
