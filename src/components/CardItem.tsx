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
    opacity: isSorting ? 0.4 : 1,
  };

  const hasDueDate = !!card.dueDate;
  const isOverdue = hasDueDate && new Date(card.dueDate!) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={isDragging ? {} : style}
      {...(isDragging ? {} : { ...attributes, ...listeners })}
      onClick={isDragging ? undefined : onClick}
      className={`bg-white rounded-lg shadow-sm mb-1.5 p-2.5 cursor-pointer hover:bg-gray-50 transition-colors select-none ${
        isDragging ? "rotate-2 shadow-lg" : ""
      }`}
    >
      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {card.labels.map(({ label }) => (
            <span
              key={label.id}
              style={{ backgroundColor: label.color }}
              className="h-2 w-8 rounded-full"
              title={label.name}
            />
          ))}
        </div>
      )}

      <p className="text-sm text-gray-800 leading-snug">{card.title}</p>

      {/* Meta row */}
      {hasDueDate && (
        <div className="mt-1.5 flex items-center gap-1">
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              isOverdue
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {new Date(card.dueDate!).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}
