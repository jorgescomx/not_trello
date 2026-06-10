"use client";

import { useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Card, List } from "@/types/board";
import { CardItem } from "./CardItem";

type Props = {
  list: List;
  onAddCard: (listId: string, title: string) => void;
  onUpdateTitle: (listId: string, title: string) => void;
  onDeleteList: (listId: string) => void;
  onCardClick: (card: Card, listId: string) => void;
};

export function ListColumn({ list, onAddCard, onUpdateTitle, onDeleteList, onCardClick }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(list.title);
  const [showMenu, setShowMenu] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");

  const { setNodeRef } = useDroppable({ id: list.id });

  function saveTitle() {
    if (titleValue.trim() && titleValue !== list.title) {
      onUpdateTitle(list.id, titleValue.trim());
    }
    setEditingTitle(false);
  }

  async function submitCard(e: React.FormEvent) {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    await onAddCard(list.id, newCardTitle.trim());
    setNewCardTitle("");
    setAddingCard(false);
  }

  return (
    <div className="shrink-0 w-64 bg-gray-100 rounded-xl shadow flex flex-col max-h-full">
      {/* List header */}
      <div className="flex items-center justify-between px-3 py-2.5 relative">
        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && saveTitle()}
            className="flex-1 text-sm font-semibold bg-white border border-blue-400 rounded px-2 py-0.5 focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="flex-1 text-sm font-semibold text-gray-700 text-left hover:text-gray-900 truncate"
          >
            {list.title}
          </button>
        )}
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="ml-1 text-gray-400 hover:text-gray-600 px-1"
        >
          ···
        </button>
        {showMenu && (
          <div className="absolute top-8 right-2 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-32 py-1">
            <button
              onClick={() => { setShowMenu(false); onDeleteList(list.id); }}
              className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Delete list
            </button>
          </div>
        )}
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-2 pb-1 min-h-[2rem]">
        <SortableContext items={list.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {list.cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onClick={() => onCardClick(card, list.id)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add card */}
      <div className="px-2 pb-2">
        {addingCard ? (
          <form onSubmit={submitCard} className="flex flex-col gap-1.5">
            <textarea
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitCard(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Card title…"
              rows={2}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 resize-none text-gray-900 bg-gray-50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            <div className="flex gap-1">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-blue-700"
              >
                Add card
              </button>
              <button
                type="button"
                onClick={() => setAddingCard(false)}
                className="flex-1 bg-gray-200 text-gray-700 text-xs font-medium py-1.5 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="w-full text-left text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg px-2 py-1.5 transition-colors"
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
}
