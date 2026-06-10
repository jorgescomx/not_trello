"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Board = { id: string; title: string; color: string };

const COLORS = [
  "#026AA7", "#4BBF6B", "#E04355", "#F2A21D",
  "#7B68EE", "#00BCD4", "#FF7043", "#8D6E63",
];

export function BoardsClient({ initialBoards }: { initialBoards: Board[] }) {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), color }),
    });
    const board = await res.json();
    setBoards((prev) => [board, ...prev]);
    setTitle("");
    setColor(COLORS[0]);
    setShowForm(false);
    setLoading(false);
  }

  return (
    <div className="flex flex-wrap gap-4">
      {boards.map((board) => (
        <button
          key={board.id}
          onClick={() => router.push(`/boards/${board.id}`)}
          style={{ backgroundColor: board.color }}
          className="w-48 h-28 rounded-xl text-white font-semibold text-left p-3 shadow hover:brightness-110 transition-all cursor-pointer"
        >
          {board.title}
        </button>
      ))}

      {showForm ? (
        <form
          onSubmit={createBoard}
          className="w-48 h-28 bg-white rounded-xl shadow p-3 flex flex-col gap-2"
        >
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Board title"
            className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-gray-50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
          <div className="flex gap-1 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : ""}`}
              />
            ))}
          </div>
          <div className="flex gap-1 mt-auto">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white text-xs font-medium py-1 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-200 text-gray-700 text-xs font-medium py-1 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-48 h-28 bg-white/60 hover:bg-white/80 rounded-xl text-gray-600 font-medium text-sm shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="text-xl leading-none">+</span> Create board
        </button>
      )}
    </div>
  );
}
