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
import { arrayMove } from "@dnd-kit/sortable";
import type { Board, Card, List, Swimlane } from "@/types/board";
import { CardItem } from "./CardItem";
import { CardModal } from "./CardModal";
import { SwimlaneRow } from "./SwimlaneRow";

// Null sentinel used for the "no swimlane" row
export const NO_SWIMLANE = "__none__";

export function BoardView({ board: initialBoard }: { board: Board }) {
  const [lists, setLists] = useState<List[]>(initialBoard.lists);
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>(initialBoard.swimlanes);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
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
    const list = findListForCard(active.id as string);
    if (list) setActiveCard(list.cards.find((c) => c.id === active.id) ?? null);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;

    const sourceList = findListForCard(active.id as string);
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
    if (targetListId === sourceList.id && targetSwimlaneId === sourceCard.swimlaneId) return;

    const movedCard = { ...sourceCard, listId: targetListId, swimlaneId: targetSwimlaneId };

    // Two-pass update: remove first, then insert — avoids same-list collision
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
    setActiveCard(null);

    // onDragOver already updated the visual state — just read where the card ended up
    // and persist the entire target cell to the server.
    const finalList = findListForCard(active.id as string);
    if (!finalList) return;

    const finalCard = finalList.cards.find((c) => c.id === active.id)!;
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
          <div className="flex gap-0 pl-[10rem] pr-4 pt-3 pb-0 sticky top-0 z-10 bg-black/10">
            {lists.map((list) => (
              <ListHeader
                key={list.id}
                list={list}
                onUpdateTitle={updateListTitle}
                onDeleteList={deleteList}
              />
            ))}
            <AddListButton onAdd={addList} />
          </div>

          {/* Swimlane rows */}
          <div className="px-4 pb-4">
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

function ListHeader({
  list,
  onUpdateTitle,
  onDeleteList,
}: {
  list: List;
  onUpdateTitle: (id: string, title: string) => void;
  onDeleteList: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(list.title);
  const [menu, setMenu] = useState(false);

  function save() {
    if (value.trim() && value !== list.title) onUpdateTitle(list.id, value.trim());
    setEditing(false);
  }

  return (
    <div className="w-56 shrink-0 mr-2 relative">
      <div className="bg-white/20 backdrop-blur rounded-t-lg px-3 py-2 flex items-center justify-between">
        {editing ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="flex-1 text-sm font-semibold text-white bg-transparent border-b border-white focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex-1 text-sm font-semibold text-white text-left truncate hover:text-white/80"
          >
            {list.title}
          </button>
        )}
        <button onClick={() => setMenu((v) => !v)} className="text-white/60 hover:text-white ml-1 text-xs px-1">···</button>
        {menu && (
          <div className="absolute top-9 right-0 bg-white rounded-lg shadow-lg border border-gray-200 z-20 min-w-32 py-1">
            <button
              onClick={() => { setMenu(false); onDeleteList(list.id); }}
              className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Delete list
            </button>
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
        className="shrink-0 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg px-3 py-1.5 text-sm transition-colors whitespace-nowrap self-start"
      >
        + Add list
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="shrink-0 bg-white rounded-lg p-2 shadow flex flex-col gap-2 w-48">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="List title…"
        className="px-2 py-1.5 text-sm rounded border border-gray-300 text-gray-900 bg-gray-50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white text-xs font-medium py-1.5 rounded hover:bg-blue-700">Add</button>
        <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-gray-200 text-gray-700 text-xs font-medium py-1.5 rounded hover:bg-gray-300">Cancel</button>
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
        className="bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        + Add swimlane
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow p-3 inline-flex flex-col gap-2 w-64">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">New swimlane</p>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Work, Personal…"
        className="px-2 py-1.5 text-sm rounded border border-gray-300 text-gray-900 bg-gray-50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-1 flex-wrap">
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
      <div className="flex gap-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-blue-700">Add</button>
        <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-gray-200 text-gray-700 text-xs font-medium py-1.5 rounded-lg hover:bg-gray-300">Cancel</button>
      </div>
    </form>
  );
}
