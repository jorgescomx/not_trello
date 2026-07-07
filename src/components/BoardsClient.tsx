"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Board = { id: string; title: string; color: string; archived: boolean };

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
  const [showArchived, setShowArchived] = useState(false);

  const active = boards.filter((b) => !b.archived);
  const archived = boards.filter((b) => b.archived);

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

  async function archiveBoard(id: string) {
    await fetch(`/api/boards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, archived: true } : b)));
  }

  async function restoreBoard(id: string) {
    await fetch(`/api/boards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, archived: false } : b)));
  }

  async function deleteBoard(id: string) {
    if (!confirm("Permanently delete this board and all its data? This cannot be undone.")) return;
    await fetch(`/api/boards/${id}`, { method: "DELETE" });
    setBoards((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div>
      {/* Active boards */}
      <h2 className="text-slate-400 dark:text-slate-500 font-semibold text-xs mb-6 uppercase tracking-widest">
        Your Boards
      </h2>
      <div className="flex flex-wrap gap-4 mb-10">
        {active.map((board) => (
          <BoardCard
            key={board.id}
            board={board}
            onClick={() => router.push(`/boards/${board.id}`)}
            onArchive={() => archiveBoard(board.id)}
            onDelete={() => deleteBoard(board.id)}
          />
        ))}

        {showForm ? (
          <form onSubmit={createBoard} className="w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 flex flex-col gap-3">
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Board title"
              className="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${
                    color === c ? "scale-110 ring-2 ring-offset-2 ring-blue-400 dark:ring-offset-slate-800" : ""
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2 mt-auto pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-all shadow-sm"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-52 h-32 rounded-2xl font-medium text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="text-2xl font-light leading-none">+</span>
            <span>New board</span>
          </button>
        )}
      </div>

      {/* Archived boards */}
      {archived.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-semibold uppercase tracking-widest mb-5 transition-colors"
          >
            <span className="text-[10px]">{showArchived ? "▼" : "▶"}</span>
            Archived ({archived.length})
          </button>

          {showArchived && (
            <div className="flex flex-wrap gap-4">
              {archived.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  onClick={() => {}}
                  isArchived
                  onRestore={() => restoreBoard(board.id)}
                  onDelete={() => deleteBoard(board.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Board card ────────────────────────────────────────────────────────────────

function BoardCard({
  board,
  onClick,
  isArchived = false,
  onArchive,
  onRestore,
  onDelete,
}: {
  board: Board;
  onClick: () => void;
  isArchived?: boolean;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div className="relative w-52 h-32 group">
      <button
        onClick={onClick}
        style={{ backgroundColor: board.color }}
        className={`w-full h-full rounded-2xl text-left overflow-hidden shadow-md transition-all duration-200 relative ${
          isArchived ? "opacity-50 cursor-default" : "hover:-translate-y-1.5 hover:shadow-xl cursor-pointer"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/25" />
        <div className="absolute bottom-0 left-0 right-0 p-3.5">
          <span className="font-semibold text-white text-sm drop-shadow leading-tight block">{board.title}</span>
          {isArchived && (
            <span className="text-xs font-normal mt-0.5 text-white/70 block">Archived</span>
          )}
        </div>
      </button>

      {/* Menu button */}
      <div ref={menuRef} className="absolute top-2.5 right-2.5 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="opacity-0 group-hover:opacity-100 bg-black/25 hover:bg-black/50 backdrop-blur-sm text-white rounded-lg px-2 py-0.5 text-xs transition-all"
        >
          ···
        </button>

        {menuOpen && (
          <div className="absolute top-8 right-0 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 min-w-40 py-1.5 overflow-hidden">
            {!isArchived && onArchive && (
              <button
                onClick={() => { setMenuOpen(false); onArchive(); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Archive board
              </button>
            )}
            {isArchived && onRestore && (
              <button
                onClick={() => { setMenuOpen(false); onRestore(); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Restore board
              </button>
            )}
            <button
              onClick={() => { setMenuOpen(false); onDelete(); }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete permanently
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
