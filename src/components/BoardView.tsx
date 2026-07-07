"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Board, Card, List, Swimlane } from "@/types/board";
import { CardItem } from "./CardItem";
import { CardModal } from "./CardModal";
import { SwimlaneRow } from "./SwimlaneRow";

// Null sentinel used for the "no swimlane" row
export const NO_SWIMLANE = "__none__";
// Prefix for swimlane drag IDs to distinguish them from card IDs
export const SWIMLANE_PREFIX = "swimlane::";

export function BoardView({ board: initialBoard }: { board: Board }) {
  const [lists, setLists] = useState<List[]>(initialBoard.lists);
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>(initialBoard.swimlanes);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeSwimlane, setActiveSwimlane] = useState<Swimlane | null>(null);
  const [openCard, setOpenCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Find which list a card belongs to
  function findListForCard(cardId: string) {
    return lists.find((l) => l.cards.some((c) => c.id === cardId));
  }

  // Parse a droppable cell id: "listId__swimlaneId" or "listId____none__"
  function parseCellId(id: string): { listId: string; swimlaneId: string | null } | null {
    const sep = id.indexOf("__");
    if (sep === -1) return null;
    const listId = id.slice(0, sep);
    const swimlaneId = id.slice(sep + 2);
    return { listId, swimlaneId: swimlaneId === NO_SWIMLANE ? null : swimlaneId };
  }

  function onDragStart({ active }: DragStartEvent) {
    const activeId = active.id as string;
    if (activeId.startsWith(SWIMLANE_PREFIX)) {
      const swimlaneId = activeId.slice(SWIMLANE_PREFIX.length);
      setActiveSwimlane(swimlanes.find((s) => s.id === swimlaneId) ?? null);
      return;
    }
    const list = findListForCard(activeId);
    if (list) setActiveCard(list.cards.find((c) => c.id === activeId) ?? null);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;

    const activeId = active.id as string;

    // Swimlane reorder
    if (activeId.startsWith(SWIMLANE_PREFIX)) {
      const overIdStr = over.id as string;
      let targetSwimlaneId: string | null = null;

      if (overIdStr.startsWith(SWIMLANE_PREFIX)) {
        // Directly over another swimlane label
        targetSwimlaneId = overIdStr.slice(SWIMLANE_PREFIX.length);
      } else {
        // Over a cell droppable or a card — extract the swimlane from context
        const cell = parseCellId(overIdStr);
        if (cell) {
          targetSwimlaneId = cell.swimlaneId;
        } else {
          // Over a card — find its swimlane
          for (const list of lists) {
            const card = list.cards.find((c) => c.id === overIdStr);
            if (card) { targetSwimlaneId = card.swimlaneId; break; }
          }
        }
      }

      if (!targetSwimlaneId) return; // over uncategorized row or unknown
      const oldIndex = swimlanes.findIndex((s) => s.id === activeId.slice(SWIMLANE_PREFIX.length));
      const newIndex = swimlanes.findIndex((s) => s.id === targetSwimlaneId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      setSwimlanes((prev) => arrayMove(prev, oldIndex, newIndex));
      return;
    }

    const sourceList = findListForCard(activeId);
    if (!sourceList) return;

    const sourceCard = sourceList.cards.find((c) => c.id === active.id)!;

    // Determine target cell
    let targetListId: string | null = null;
    let targetSwimlaneId: string | null = sourceCard.swimlaneId;

    const overIdStr = over.id as string;
    const cell = parseCellId(overIdStr);

    if (cell) {
      // Dropped on a cell container
      targetListId = cell.listId;
      targetSwimlaneId = cell.swimlaneId;
    } else {
      // Dropped on another card
      const targetList = findListForCard(overIdStr);
      if (targetList) {
        targetListId = targetList.id;
        const targetCard = targetList.cards.find((c) => c.id === overIdStr);
        if (targetCard) targetSwimlaneId = targetCard.swimlaneId;
      }
    }

    if (!targetListId) return;

    const isSameCell =
      targetListId === sourceList.id && targetSwimlaneId === sourceCard.swimlaneId;

    if (isSameCell) {
      // Reorder within the same cell
      const oldIndex = sourceList.cards.findIndex((c) => c.id === active.id);
      const newIndex = sourceList.cards.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(sourceList.cards, oldIndex, newIndex);
      setLists((prev) =>
        prev.map((l) => (l.id === sourceList.id ? { ...l, cards: reordered } : l))
      );
      return;
    }

    // Cross-cell move — two-pass to avoid same-list collision
    const movedCard = { ...sourceCard, listId: targetListId, swimlaneId: targetSwimlaneId };
    setLists((prev) => {
      const withoutCard = prev.map((list) =>
        list.id === sourceList.id
          ? { ...list, cards: list.cards.filter((c) => c.id !== active.id) }
          : list
      );
      return withoutCard.map((list) => {
        if (list.id !== targetListId) return list;
        const overIndex = list.cards.findIndex((c) => c.id === over.id);
        const newCards = [...list.cards];
        newCards.splice(overIndex >= 0 ? overIndex : newCards.length, 0, movedCard);
        return { ...list, cards: newCards };
      });
    });
  }

  async function onDragEnd({ active }: DragEndEvent) {
    const activeId = active.id as string;

    if (activeId.startsWith(SWIMLANE_PREFIX)) {
      setActiveSwimlane(null);
      await Promise.all(
        swimlanes.map((s, i) =>
          fetch(`/api/swimlanes/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: (i + 1) * 1000 }),
          })
        )
      );
      return;
    }

    setActiveCard(null);

    // onDragOver already updated the visual state — just read where the card ended up
    // and persist the entire target cell to the server.
    const finalList = findListForCard(activeId);
    if (!finalList) return;

    const finalCard = finalList.cards.find((c) => c.id === activeId)!;
    const cellCards = finalList.cards.filter((c) => c.swimlaneId === finalCard.swimlaneId);
    await persistPositions(cellCards, finalList.id, finalCard.swimlaneId);
  }

  async function persistPositions(
    cards: Card[],
    listId: string,
    swimlaneId: string | null
  ) {
    await Promise.all(
      cards.map((card, i) =>
        fetch(`/api/cards/${card.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: (i + 1) * 1000, listId, swimlaneId }),
        })
      )
    );
  }

  async function addList(title: string) {
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, boardId: initialBoard.id }),
    });
    const list = await res.json();
    setLists((prev) => [...prev, { ...list, cards: [] }]);
  }

  async function updateListTitle(listId: string, title: string) {
    await fetch(`/api/lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, title } : l)));
  }

  async function deleteList(listId: string) {
    await fetch(`/api/lists/${listId}`, { method: "DELETE" });
    setLists((prev) => prev.filter((l) => l.id !== listId));
  }

  async function updateListColor(listId: string, color: string) {
    await fetch(`/api/lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, color } : l)));
  }

  async function addCard(listId: string, title: string, swimlaneId: string | null) {
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, listId, swimlaneId }),
    });
    const card = await res.json();
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, cards: [...l.cards, { ...card, swimlaneId, labels: [] }] }
          : l
      )
    );
  }

  async function addSwimlane(title: string, color: string) {
    const res = await fetch("/api/swimlanes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, boardId: initialBoard.id, color }),
    });
    const swimlane = await res.json();
    setSwimlanes((prev) => [...prev, swimlane]);
  }

  async function updateSwimlane(id: string, title: string) {
    await fetch(`/api/swimlanes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setSwimlanes((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  }

  async function deleteSwimlane(id: string) {
    await fetch(`/api/swimlanes/${id}`, { method: "DELETE" });
    setSwimlanes((prev) => prev.filter((s) => s.id !== id));
    // Cards in that swimlane become unassigned
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        cards: l.cards.map((c) => (c.swimlaneId === id ? { ...c, swimlaneId: null } : c)),
      }))
    );
  }

  const handleCardClick = useCallback((card: Card) => {
    setOpenCard(card);
  }, []);

  function handleCardUpdate(updated: Card) {
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        cards: l.cards.map((c) => (c.id === updated.id ? updated : c)),
      }))
    );
    setOpenCard(updated);
  }

  function handleCardDelete(cardId: string) {
    setLists((prev) =>
      prev.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== cardId) }))
    );
    setOpenCard(null);
  }

  // Rows to render: configured swimlanes + a catch-all "No swimlane" row
  const hasSwimlanes = swimlanes.length > 0;
  const uncategorizedCards = lists.some((l) => l.cards.some((c) => c.swimlaneId === null));

  return (
    <>
      <div className="flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          {/* Column headers + list actions */}
          <div className="flex gap-0 pl-[10rem] pr-4 pt-3 pb-0 sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-sm">
            {lists.map((list) => (
              <ListHeader
                key={list.id}
                list={list}
                onUpdateTitle={updateListTitle}
                onDeleteList={deleteList}
                onUpdateColor={updateListColor}
              />
            ))}
            <AddListButton onAdd={addList} />
          </div>

          {/* Swimlane rows */}
          <div className="px-4 pb-4">
            <SortableContext
              items={swimlanes.map((s) => `${SWIMLANE_PREFIX}${s.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {swimlanes.map((swimlane) => (
                <SwimlaneRow
                  key={swimlane.id}
                  swimlane={swimlane}
                  lists={lists}
                  onAddCard={(listId, title) => addCard(listId, title, swimlane.id)}
                  onCardClick={handleCardClick}
                  onUpdateSwimlane={updateSwimlane}
                  onDeleteSwimlane={deleteSwimlane}
                />
              ))}
            </SortableContext>

            {/* Uncategorized row — always shown when no swimlanes, or when cards exist without one */}
            {(!hasSwimlanes || uncategorizedCards) && (
              <SwimlaneRow
                swimlane={null}
                lists={lists}
                onAddCard={(listId, title) => addCard(listId, title, null)}
                onCardClick={handleCardClick}
                onUpdateSwimlane={() => {}}
                onDeleteSwimlane={() => {}}
              />
            )}
          </div>

          <DragOverlay>
            {activeCard && <CardItem card={activeCard} isDragging onClick={() => {}} />}
            {activeSwimlane && (
              <div
                className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 shadow-lg opacity-90 flex items-center gap-2"
                style={{ backgroundColor: activeSwimlane.color, width: "9rem" }}
              >
                <span className="text-gray-400">⠿</span>
                {activeSwimlane.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Add swimlane button */}
        <div className="px-4 pb-4">
          <AddSwimlaneButton onAdd={addSwimlane} />
        </div>
      </div>

      {openCard && (
        <CardModal
          card={openCard}
          listTitle={lists.find((l) => l.id === openCard.listId)?.title ?? ""}
          swimlanes={swimlanes}
          onClose={() => setOpenCard(null)}
          onUpdate={handleCardUpdate}
          onDelete={handleCardDelete}
        />
      )}
    </>
  );
}

// ── List header (sticky top row) ──────────────────────────────────────────────

const LIST_COLORS = [
  { label: "Default",  value: "#f1f5f9" },
  { label: "Sky",      value: "#e0f2fe" },
  { label: "Mint",     value: "#dcfce7" },
  { label: "Lemon",    value: "#fef9c3" },
  { label: "Rose",     value: "#ffe4e6" },
  { label: "Lavender", value: "#ede9fe" },
  { label: "Peach",    value: "#ffedd5" },
  { label: "Slate",    value: "#e2e8f0" },
];

function ListHeader({
  list,
  onUpdateTitle,
  onDeleteList,
  onUpdateColor,
}: {
  list: List;
  onUpdateTitle: (id: string, title: string) => void;
  onDeleteList: (id: string) => void;
  onUpdateColor: (id: string, color: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(list.title);
  const [menu, setMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  function save() {
    if (value.trim() && value !== list.title) onUpdateTitle(list.id, value.trim());
    setEditing(false);
  }

  return (
    <div className="w-56 shrink-0 mr-2 relative">
      <div className="px-2 py-2.5 flex items-center justify-between gap-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="flex-1 text-xs font-bold bg-white dark:bg-slate-700 rounded-full px-2.5 py-1 border border-blue-400 text-slate-800 dark:text-slate-100 focus:outline-none min-w-0"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-2.5 py-1 rounded-full text-xs font-bold text-slate-700 ring-1 ring-black/10 shadow-sm hover:opacity-90 transition-opacity truncate max-w-[130px]"
              style={{ backgroundColor: list.color }}
              title={list.title}
            >
              {list.title}
            </button>
          )}
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">
            {list.cards.length}
          </span>
        </div>
        <button
          onClick={() => { setMenu((v) => !v); setShowColorPicker(false); }}
          className="text-xs px-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
        >
          ···
        </button>
        {menu && (
          <div className="absolute top-9 right-0 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 min-w-44 py-1 overflow-hidden">
            <button
              onClick={() => setShowColorPicker((v) => !v)}
              className="w-full text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Column color
            </button>
            {showColorPicker && (
              <div className="px-3 pb-2 grid grid-cols-4 gap-1.5">
                {LIST_COLORS.map(({ value: c, label }) => (
                  <button
                    key={c}
                    title={label}
                    onClick={() => { onUpdateColor(list.id, c); setMenu(false); setShowColorPicker(false); }}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${list.color === c ? "border-blue-500 scale-110" : "border-transparent"}`}
                  />
                ))}
              </div>
            )}
            <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
              <button
                onClick={() => { setMenu(false); onDeleteList(list.id); }}
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete list
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add list button ───────────────────────────────────────────────────────────

function AddListButton({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await onAdd(title.trim());
    setTitle("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium rounded-xl px-3 py-1.5 text-sm transition-all whitespace-nowrap self-start border border-slate-200/60 dark:border-slate-700/60 hover:shadow-sm"
      >
        + Add list
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="shrink-0 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-xl border border-slate-100 dark:border-slate-700 flex flex-col gap-2 w-48">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="List title…"
        className="px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-blue-500 transition-colors">Add</button>
        <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
      </div>
    </form>
  );
}

// ── Add swimlane button ───────────────────────────────────────────────────────

const SWIMLANE_COLORS = [
  "#e0e7ff", "#dcfce7", "#fef9c3", "#ffe4e6",
  "#f3e8ff", "#cffafe", "#ffedd5", "#f1f5f9",
];

function AddSwimlaneButton({ onAdd }: { onAdd: (title: string, color: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(SWIMLANE_COLORS[0]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await onAdd(title.trim(), color);
    setTitle("");
    setColor(SWIMLANE_COLORS[0]);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-medium px-4 py-2 rounded-xl transition-all border border-slate-200/60 dark:border-slate-700/60 hover:shadow-sm"
      >
        + Add swimlane
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 inline-flex flex-col gap-3 w-64">
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">New swimlane</p>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Work, Personal…"
        className="px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-1.5 flex-wrap">
        {SWIMLANE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            style={{ backgroundColor: c, border: color === c ? "2px solid #6366f1" : "2px solid transparent" }}
            className="w-6 h-6 rounded-full transition-transform hover:scale-110"
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-blue-600 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-blue-500 transition-colors">Add</button>
        <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
      </div>
    </form>
  );
}
