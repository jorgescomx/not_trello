import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/Header";
import { BoardsClient } from "@/components/BoardsClient";

export default async function BoardsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const boards = await prisma.board.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <Header />
      <main className="flex-1 p-8 overflow-y-auto">
        <BoardsClient initialBoards={boards} />
      </main>
    </div>
  );
}
