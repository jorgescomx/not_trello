"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "@/types/board";

type Props = {
  card: Card;
  isDragging?: boolean;
  onClick: () => void;
};

export function CardItem({ card, isDragging = false, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSorting ? 0.35 : 1,
  };

  const hasDueDate = !!card.dueDate;
  const isOverdue = hasDueDate && new Date(card.dueDate!) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={isDragging ? {} : style}
      {...(isDragging ? {} : { ...attributes, ...listeners })}
      onClick={isDragging ? undefined : onClick}
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm mb-1.5 p-2.5 cursor-pointer select-none transition-all duration-150 ${
        isDragging
          ? "rotate-1 shadow-2xl ring-2 ring-blue-400/20 scale-[1.02]"
          : "hover:shadow-md hover:-translate-y-0.5 hover:border-slate-200 dark:hover:border-slate-600"
      }`}
    >
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {card.labels.map(({ label }) => (
            <span
              key={label.id}
              style={{ backgroundColor: label.color }}
              className="h-1.5 w-8 rounded-full"
              title={label.name}
            />
          ))}
        </div>
      )}

      <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{card.title}</p>

      {hasDueDate && (
        <div className="mt-2 flex items-center gap-1">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isOverdue
                ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 ring-1 ring-red-100 dark:ring-red-900"
                : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
            }`}
          >
            {isOverdue ? "⚠ " : ""}
            {new Date(card.dueDate!).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}
