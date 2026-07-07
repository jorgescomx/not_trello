"use client";

import { useState, useEffect, useRef } from "react";
import type { Card, Swimlane } from "@/types/board";

const PRESET_LABELS = [
  { name: "Bug", color: "#E04355" },
  { name: "Feature", color: "#4BBF6B" },
  { name: "Urgent", color: "#F2A21D" },
  { name: "Design", color: "#7B68EE" },
  { name: "Research", color: "#00BCD4" },
  { name: "Blocked", color: "#FF7043" },
];

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  card: Card;
  listTitle: string;
  swimlanes: Swimlane[];
  onClose: () => void;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CardModal({ card, listTitle, swimlanes, onClose, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [dueDate, setDueDate] = useState(
    card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : ""
  );
  const [swimlaneId, setSwimlaneId] = useState<string | null>(card.swimlaneId);
  const [saving, setSaving] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const overlayRef = useRef<HTMLDivElement>(null);

  const activeLabels = card.labels.map((cl) => cl.label);

  // Load comments when modal opens
  useEffect(() => {
    fetch(`/api/cards/${card.id}/comments`)
      .then((r) => r.json())
      .then(setComments)
      .catch(() => {});
  }, [card.id]);

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
        swimlaneId,
      }),
    });
    const updated = await res.json();
    onUpdate({ ...card, ...updated, dueDate: updated.dueDate ?? null });
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
      const res = await fetch(`/api/cards/${card.id}/labels`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelName: name }),
      });
      if (res.ok) onUpdate({ ...card, labels: card.labels.filter((cl) => cl.label.name !== name) });
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

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    const res = await fetch(`/api/cards/${card.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment.trim() }),
    });
    const comment = await res.json();
    setComments((prev) => [...prev, comment]);
    setNewComment("");
    setPostingComment(false);
  }

  async function deleteComment(commentId: string) {
    await fetch(`/api/cards/${card.id}/comments/${commentId}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  async function saveEditComment(commentId: string) {
    if (!editingContent.trim()) return;
    const res = await fetch(`/api/cards/${card.id}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editingContent.trim() }),
    });
    const updated = await res.json();
    setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
    setEditingCommentId(null);
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-16 px-4 pb-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-0">
          <div className="flex-1">
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={2}
              className="w-full text-lg font-semibold text-gray-900 bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white rounded-lg px-2 py-1 -mx-2 -my-1"
            />
            <p className="text-xs text-gray-400 mt-1 ml-1">
              in list <span className="font-medium text-gray-500">{listTitle}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-1">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Swimlane */}
          {swimlanes.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Swimlane</label>
              <select
                value={swimlaneId ?? ""}
                onChange={(e) => setSwimlaneId(e.target.value || null)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="">— General (no swimlane) —</option>
                {swimlanes.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Labels */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Labels</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {activeLabels.map((label) => (
                <span key={label.id} style={{ backgroundColor: label.color }} className="text-white text-xs font-medium px-2 py-0.5 rounded-full">
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
                      className={`text-white text-xs font-medium px-2.5 py-1 rounded-full transition-all ${active ? "opacity-100 ring-2 ring-offset-1 ring-gray-400" : "opacity-60 hover:opacity-100"}`}
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
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            {dueDate && (
              <button
                onClick={() => setDueDate("")}
                className="ml-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Add a description…"
              className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 resize-none text-gray-900 bg-gray-50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Save / Delete */}
          <div className="flex items-center justify-between">
            <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
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

          {/* ── Comments ─────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
              Comments {comments.length > 0 && <span className="text-gray-400">({comments.length})</span>}
            </label>

            {/* Comment history */}
            {comments.length > 0 && (
              <div className="space-y-3 mb-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-xl px-3 py-2.5">
                    {editingCommentId === comment.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          autoFocus
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          rows={2}
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 resize-none text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEditComment(comment.id)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1 rounded-lg"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.content}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-gray-400">{formatDateTime(comment.createdAt)}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditingCommentId(comment.id); setEditingContent(comment.content); }}
                              className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteComment(comment.id)}
                              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {comment.updatedAt !== comment.createdAt && (
                          <p className="text-xs text-gray-300 mt-0.5">edited {formatDateTime(comment.updatedAt)}</p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* New comment form */}
            <form onSubmit={postComment} className="flex flex-col gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    postComment(e as unknown as React.FormEvent);
                  }
                }}
                placeholder="Add a comment… (Enter to submit, Shift+Enter for new line)"
                rows={2}
                className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 resize-none text-gray-900 bg-gray-50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={postingComment || !newComment.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
                >
                  {postingComment ? "Posting…" : "Add comment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
