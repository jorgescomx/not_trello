"use client";

import { useState, useEffect, useRef } from "react";
import type { Card } from "@/types/board";

const PRESET_LABELS = [
  { name: "Bug", color: "#E04355" },
  { name: "Feature", color: "#4BBF6B" },
  { name: "Urgent", color: "#F2A21D" },
  { name: "Design", color: "#7B68EE" },
  { name: "Research", color: "#00BCD4" },
  { name: "Blocked", color: "#FF7043" },
];

type Props = {
  card: Card;
  listTitle: string;
  onClose: () => void;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
};

export function CardModal({ card, listTitle, onClose, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [dueDate, setDueDate] = useState(
    card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : ""
  );
  const [saving, setSaving] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const activeLabels = card.labels.map((cl) => cl.label);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate || null,
      }),
    });
    const updated = await res.json();
    onUpdate({ ...card, ...updated });
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this card?")) return;
    await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    onDelete(card.id);
  }

  async function toggleLabel(name: string, color: string) {
    const existing = activeLabels.find((l) => l.name === name);

    if (existing) {
      // remove label — find CardLabel
      const res = await fetch(`/api/cards/${card.id}/labels`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelName: name }),
      });
      if (res.ok) {
        onUpdate({
          ...card,
          labels: card.labels.filter((cl) => cl.label.name !== name),
        });
      }
    } else {
      const res = await fetch(`/api/cards/${card.id}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      const data = await res.json();
      onUpdate({ ...card, labels: [...card.labels, { label: data }] });
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20 px-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-0">
          <div className="flex-1">
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={2}
              className="w-full text-lg font-semibold text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-2 py-1 -mx-2 -my-1"
            />
            <p className="text-xs text-gray-400 mt-1 ml-1">in list <span className="font-medium text-gray-500">{listTitle}</span></p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-1"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Labels */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Labels
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {activeLabels.map((label) => (
                <span
                  key={label.id}
                  style={{ backgroundColor: label.color }}
                  className="text-white text-xs font-medium px-2 py-0.5 rounded-full"
                >
                  {label.name}
                </span>
              ))}
              <button
                onClick={() => setShowLabelPicker((v) => !v)}
                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 hover:border-gray-400 px-2 py-0.5 rounded-full transition-colors"
              >
                {showLabelPicker ? "Close" : "+ Labels"}
              </button>
            </div>
            {showLabelPicker && (
              <div className="flex flex-wrap gap-1.5 bg-gray-50 rounded-xl p-3 border border-gray-200">
                {PRESET_LABELS.map(({ name, color }) => {
                  const active = activeLabels.some((l) => l.name === name);
                  return (
                    <button
                      key={name}
                      onClick={() => toggleLabel(name, color)}
                      style={{ backgroundColor: color }}
                      className={`text-white text-xs font-medium px-2.5 py-1 rounded-full transition-all ${
                        active ? "opacity-100 ring-2 ring-offset-1 ring-gray-400" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Due date */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Add a description…"
              className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleDelete}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Delete card
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
