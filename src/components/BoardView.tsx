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
import type { Board, Card, List } from "@/types/board";
import { ListColumn } from "./ListColumn";
import { CardItem } from "./CardItem";
import { CardModal } from "./CardModal";

export function BoardView({ board: initialBoard }: { board: Board }) {
  const [lists, setLists] = useState<List[]>(initialBoard.lists);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [openCard, setOpenCard] = useState<Card | null>(null);
  const [openCardListId, setOpenCardListId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function findList(cardId: string) {
    return lists.find((l) => l.cards.some((c) => c.id === cardId));
  }

  function onDragStart({ active }: DragStartEvent) {
    const list = findList(active.id as string);
    if (list) {
      const card = list.cards.find((c) => c.id === active.id);
      setActiveCard(card ?? null);
    }
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeListId = findList(active.id as string)?.id;
    const overListId =
      lists.find((l) => l.id === over.id)?.id ??
      findList(over.id as string)?.id;

    if (!activeListId || !overListId || activeListId === overListId) return;

    setLists((prev) =>
      prev.map((list) => {
        if (list.id === activeListId) {
          return { ...list, cards: list.cards.filter((c) => c.id !== active.id) };
        }
        if (list.id === overListId) {
          const overIndex = list.cards.findIndex((c) => c.id === over.id);
          const card = prev
            .find((l) => l.id === activeListId)
            ?.cards.find((c) => c.id === active.id);
          if (!card) return list;
          const newCards = [...list.cards];
          newCards.splice(overIndex >= 0 ? overIndex : newCards.length, 0, {
            ...card,
            listId: overListId,
          });
          return { ...list, cards: newCards };
        }
        return list;
      })
    );
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveCard(null);
    if (!over) return;

    const activeList = findList(active.id as string);
    if (!activeList) return;

    const overList =
      lists.find((l) => l.id === over.id) ?? findList(over.id as string);

    if (!overList) return;

    if (activeList.id === overList.id) {
      const oldIndex = activeList.cards.findIndex((c) => c.id === active.id);
      const newIndex = activeList.cards.findIndex((c) => c.id === over.id);
      if (oldIndex === newIndex) return;

      const reordered = arrayMove(activeList.cards, oldIndex, newIndex);
      setLists((prev) =>
        prev.map((l) => (l.id === activeList.id ? { ...l, cards: reordered } : l))
      );
      await persistCardPositions(reordered, overList.id);
    } else {
      const card = activeList.cards.find((c) => c.id === active.id);
      if (!card) return;

      await fetch(`/api/cards/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: overList.id }),
      });

      const updatedCards = lists
        .find((l) => l.id === overList.id)
        ?.cards ?? [];
      await persistCardPositions(updatedCards, overList.id);
    }
  }

  async function persistCardPositions(cards: Card[], listId: string) {
    await Promise.all(
      cards.map((card, i) =>
        fetch(`/api/cards/${card.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: (i + 1) * 1000, listId }),
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
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, title } : l))
    );
  }

  async function deleteList(listId: string) {
    await fetch(`/api/lists/${listId}`, { method: "DELETE" });
    setLists((prev) => prev.filter((l) => l.id !== listId));
  }

  async function addCard(listId: string, title: string) {
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, listId }),
    });
    const card = await res.json();
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, cards: [...l.cards, { ...card, labels: [] }] }
          : l
      )
    );
  }

  const handleCardClick = useCallback((card: Card, listId: string) => {
    setOpenCard(card);
    setOpenCardListId(listId);
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
      prev.map((l) => ({
        ...l,
        cards: l.cards.filter((c) => c.id !== cardId),
      }))
    );
    setOpenCard(null);
  }

  return (
    <>
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-3 p-4 h-full items-start">
            {lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                onAddCard={addCard}
                onUpdateTitle={updateListTitle}
                onDeleteList={deleteList}
                onCardClick={handleCardClick}
              />
            ))}
            <AddListButton onAdd={addList} />
          </div>

          <DragOverlay>
            {activeCard && (
              <CardItem card={activeCard} isDragging onClick={() => {}} />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {openCard && openCardListId && (
        <CardModal
          card={openCard}
          listTitle={lists.find((l) => l.id === openCardListId)?.title ?? ""}
          onClose={() => setOpenCard(null)}
          onUpdate={handleCardUpdate}
          onDelete={handleCardDelete}
        />
      )}
    </>
  );
}

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
        className="shrink-0 w-64 bg-white/20 hover:bg-white/30 text-white font-medium rounded-xl px-3 py-2.5 text-sm transition-colors text-left cursor-pointer"
      >
        + Add a list
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="shrink-0 w-64 bg-gray-100 rounded-xl p-2 shadow flex flex-col gap-2"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="List title…"
        className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-1">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-blue-700"
        >
          Add list
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 bg-gray-200 text-gray-700 text-xs font-medium py-1.5 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
