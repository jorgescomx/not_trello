import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/Header";
import { BoardView } from "@/components/BoardView";
import type { Board } from "@/types/board";

type Props = { params: Promise<{ boardId: string }> };

export default async function BoardPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { boardId } = await params;

  const raw = await prisma.board.findFirst({
    where: { id: boardId, userId: session.user.id },
    include: {
      swimlanes: { orderBy: { position: "asc" } },
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

  if (!raw) notFound();

  const board: Board = {
    id: raw.id,
    title: raw.title,
    color: raw.color,
    swimlanes: raw.swimlanes.map((s) => ({
      id: s.id,
      title: s.title,
      position: s.position,
      color: s.color,
      boardId: s.boardId,
    })),
    lists: raw.lists.map((l) => ({
      id: l.id,
      title: l.title,
      position: l.position,
      boardId: l.boardId,
      cards: l.cards.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        position: c.position,
        dueDate: c.dueDate ? c.dueDate.toISOString() : null,
        listId: c.listId,
        swimlaneId: c.swimlaneId,
        labels: c.labels.map((cl) => ({ label: cl.label })),
      })),
    })),
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: board.color }}>
      <Header />
      <div className="px-4 py-2 flex items-center gap-3">
        <h1 className="text-white font-bold text-lg">{board.title}</h1>
      </div>
      <BoardView board={board} />
    </div>
  );
}
