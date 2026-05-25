"use client";

import { useState } from "react";
import { NoteCard } from "./NoteCard";
import type { LoveNote } from "@/lib/types";

export function NoteWall({ notes }: { notes: LoveNote[] }) {
  const [selected, setSelected] = useState<LoveNote | null>(null);

  return (
    <>
      {notes.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {notes.map((note) => <NoteCard key={note.id} note={note} onClick={() => setSelected(note)} />)}
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
    </>
  );
}
