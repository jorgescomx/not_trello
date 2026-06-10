"use client";

import { useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Card, List, Swimlane } from "@/types/board";
import { CardItem } from "./CardItem";
import { NO_SWIMLANE } from "./BoardView";

type Props = {
  swimlane: Swimlane | null; // null = uncategorized row
  lists: List[];
  onAddCard: (listId: string, title: string) => void;
  onCardClick: (card: Card) => void;
  onUpdateSwimlane: (id: string, title: string) => void;
  onDeleteSwimlane: (id: string) => void;
};

export function SwimlaneRow({
  swimlane,
  lists,
  onAddCard,
  onCardClick,
  onUpdateSwimlane,
  onDeleteSwimlane,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(swimlane?.title ?? "");
  const [showMenu, setShowMenu] = useState(false);

  const rowLabel = swimlane?.title ?? "General";
  const rowColor = swimlane?.color ?? "#f8fafc";

  function saveTitle() {
    if (swimlane && titleValue.trim() && titleValue !== swimlane.title) {
      onUpdateSwimlane(swimlane.id, titleValue.trim());
    }
    setEditingTitle(false);
  }

  return (
    <div className="flex mt-2">
      {/* Swimlane label */}
      <div
        className="w-36 shrink-0 mr-2 rounded-lg flex flex-col"
        style={{ backgroundColor: rowColor }}
      >
        <div className="flex items-center gap-1 px-2 py-2">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="text-gray-500 hover:text-gray-700 text-xs font-bold w-4 shrink-0"
          >
            {collapsed ? "▶" : "▼"}
          </button>

          {editingTitle && swimlane ? (
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && saveTitle()}
              className="flex-1 text-xs font-semibold bg-white border border-blue-400 rounded px-1 py-0.5 focus:outline-none min-w-0"
            />
          ) : (
            <button
              onClick={() => swimlane && setEditingTitle(true)}
              className="flex-1 text-xs font-semibold text-gray-700 text-left truncate hover:text-gray-900"
              title={rowLabel}
            >
              {rowLabel}
            </button>
          )}

          {swimlane && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="text-gray-400 hover:text-gray-600 text-xs px-0.5"
              >
                ···
              </button>
              {showMenu && (
                <div className="absolute top-5 right-0 bg-white rounded-lg shadow-lg border border-gray-200 z-20 min-w-36 py-1">
                  <button
                    onClick={() => { setShowMenu(false); onDeleteSwimlane(swimlane.id); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete swimlane
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cells */}
      {!collapsed && (
        <div className="flex gap-2 flex-1">
          {lists.map((list) => (
            <SwimlaneCell
              key={list.id}
              list={list}
              swimlaneId={swimlane?.id ?? null}
              onAddCard={(title) => onAddCard(list.id, title)}
              onCardClick={onCardClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── One cell: (list × swimlane) ───────────────────────────────────────────────

function SwimlaneCell({
  list,
  swimlaneId,
  onAddCard,
  onCardClick,
}: {
  list: List;
  swimlaneId: string | null;
  onAddCard: (title: string) => void;
  onCardClick: (card: Card) => void;
}) {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");

  const cellId = `${list.id}__${swimlaneId ?? NO_SWIMLANE}`;
  const { setNodeRef, isOver } = useDroppable({ id: cellId });

  const cards = list.cards.filter((c) => c.swimlaneId === swimlaneId);

  async function submitCard(e: React.FormEvent) {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    await onAddCard(newCardTitle.trim());
    setNewCardTitle("");
    setAddingCard(false);
  }

  return (
    <div className="w-56 shrink-0">
      <div
        ref={setNodeRef}
        className={`min-h-[3rem] rounded-lg p-1.5 transition-colors ${
          isOver ? "bg-blue-100/60" : "bg-white/30"
        }`}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>

        {addingCard ? (
          <form onSubmit={submitCard} className="flex flex-col gap-1 mt-1">
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
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 resize-none text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-1">
              <button type="submit" className="flex-1 bg-blue-600 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-blue-700">Add</button>
              <button type="button" onClick={() => setAddingCard(false)} className="flex-1 bg-gray-200 text-gray-700 text-xs font-medium py-1.5 rounded-lg hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="w-full text-left text-xs text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded px-1 py-1 transition-colors mt-1"
          >
            + Add card
          </button>
        )}
      </div>
    </div>
  );
}
