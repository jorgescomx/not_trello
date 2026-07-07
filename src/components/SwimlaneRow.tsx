"use client";

import { useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import type { Card, List, Swimlane } from "@/types/board";
import { CardItem } from "./CardItem";
import { NO_SWIMLANE, SWIMLANE_PREFIX } from "./BoardView";

type Props = {
  swimlane: Swimlane | null;
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
  const rowColor = swimlane?.color ?? "#e2e8f0";

  const swimlaneId = swimlane?.id ?? null;
  const cardCount = lists.reduce(
    (sum, list) => sum + list.cards.filter((c) => c.swimlaneId === swimlaneId).length,
    0
  );

  const sortableId = swimlane ? `${SWIMLANE_PREFIX}${swimlane.id}` : "uncategorized";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    disabled: !swimlane,
  });

  const sortableStyle = swimlane
    ? { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }
    : undefined;

  function saveTitle() {
    if (swimlane && titleValue.trim() && titleValue !== swimlane.title) {
      onUpdateSwimlane(swimlane.id, titleValue.trim());
    }
    setEditingTitle(false);
  }

  return (
    <div ref={setNodeRef} style={sortableStyle} className="flex mt-3">
      {/* Swimlane label — pill badge + controls, fixed width to align with header */}
      <div className="w-36 shrink-0 mr-2 pt-1 flex flex-col gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Drag handle */}
          {swimlane && (
            <button
              {...attributes}
              {...listeners}
              className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0 text-base leading-none"
              title="Drag to reorder"
            >
              ⠿
            </button>
          )}

          {/* Pill badge / editable title */}
          {editingTitle && swimlane ? (
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && saveTitle()}
              className="flex-1 text-xs font-semibold bg-white dark:bg-slate-700 border border-blue-400 rounded-full px-2 py-0.5 focus:outline-none min-w-0 text-slate-800 dark:text-slate-100"
            />
          ) : (
            <button
              onClick={() => swimlane && setEditingTitle(true)}
              className="flex-1 text-xs font-bold px-2.5 py-1 rounded-full text-slate-700 text-left truncate ring-1 ring-black/10 shadow-sm hover:opacity-90 transition-opacity min-w-0"
              style={{ backgroundColor: rowColor }}
              title={rowLabel}
            >
              {rowLabel}
            </button>
          )}

          {/* Card count badge */}
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
            {cardCount}
          </span>
        </div>

        {/* Collapse + menu on second line */}
        <div className="flex items-center gap-1 pl-1">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-[10px] font-bold transition-colors"
          >
            {collapsed ? "▶ Show" : "▼ Hide"}
          </button>

          {swimlane && (
            <div className="relative ml-auto">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-xs px-0.5 transition-colors"
              >
                ···
              </button>
              {showMenu && (
                <div className="absolute top-5 left-0 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 min-w-36 py-1 overflow-hidden">
                  <button
                    onClick={() => { setShowMenu(false); onDeleteSwimlane(swimlane.id); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
        className={`min-h-[4rem] rounded-xl p-2 transition-all ${
          isOver
            ? "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-800"
            : "bg-slate-100/80 dark:bg-slate-800/50"
        }`}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>

        {addingCard ? (
          <form onSubmit={submitCard} className="flex flex-col gap-1.5 mt-1">
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
              className="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-2 resize-none text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
            <div className="flex gap-1">
              <button type="submit" className="flex-1 bg-blue-600 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-blue-500 transition-colors">Add</button>
              <button type="button" onClick={() => setAddingCard(false)} className="flex-1 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs font-medium py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors">Cancel</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="w-full text-left text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/60 rounded-lg px-2 py-1.5 transition-all mt-1"
          >
            + Add card
          </button>
        )}
      </div>
    </div>
  );
}
