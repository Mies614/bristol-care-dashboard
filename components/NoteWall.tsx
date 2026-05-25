"use client";

import { useState } from "react";
import { NoteCard } from "./NoteCard";
import { NoteEditorModal } from "./NoteEditorModal";
import type { LoveNote } from "@/lib/types";

export function NoteWall({ notes, onPatch }: { notes: LoveNote[]; onPatch?: (body: Record<string, unknown>) => Promise<void> }) {
  const [selected, setSelected] = useState<LoveNote | null>(null);
  const [editing, setEditing] = useState<LoveNote | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    if (!onPatch) return;
    if ((body.action === "delete" || body.action === "soft_delete") && !confirm("确定删除这张小纸条吗？删除后小纸条墙不会再显示。")) return;
    setBusyId(String(body.id || ""));
    await onPatch(body);
    setBusyId(null);
    setEditing(null);
  }

  return (
    <>
      {notes.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => setSelected(note)}
              onEdit={onPatch ? () => setEditing(note) : undefined}
              onPatch={onPatch ? patch : undefined}
              busy={busyId === note.id}
            />
          ))}
        </div>
      ) : <p className="empty-state">这里还没有小纸条，先贴上第一张吧。</p>}
      {selected ? (
        <div className="fixed inset-0 z-50 bg-cocoa/50 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="mx-auto max-h-[92vh] max-w-md overflow-auto rounded-[1.75rem] bg-cream p-4 shadow-float" onClick={(event) => event.stopPropagation()}>
            <NoteCard note={selected} featured />
            <button className="btn-secondary mt-3 w-full" onClick={() => setSelected(null)}>关闭</button>
          </div>
        </div>
      ) : null}
      {editing ? <NoteEditorModal note={editing} onClose={() => setEditing(null)} onSave={patch} /> : null}
    </>
  );
}
