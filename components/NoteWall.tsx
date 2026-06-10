"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NoteCard } from "./NoteCard";
import { NoteEditorModal } from "./NoteEditorModal";
import { staggerContainer, staggerItem, useAccessibleMotion, safeVariants } from "@/lib/design/motion";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import type { LoveNote } from "@/lib/types";
import type { AppSide } from "@/lib/appIdentity";
import { useCloudReadStates } from "@/hooks/useCloudReadStates";

export function NoteWall({ notes, onPatch, identityId: propIdentityId, side }: { notes: LoveNote[]; onPatch?: (body: Record<string, unknown>) => Promise<void>; identityId?: string; side?: AppSide }) {
  const identityId = propIdentityId || DEFAULT_NORMAL_IDENTITY_ID;
  const spaceCode = getDefaultSpaceCode();
  const [selected, setSelected] = useState<LoveNote | null>(null);
  const [editing, setEditing] = useState<LoveNote | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const reduceMotion = useAccessibleMotion();

  // Cloud-synced read states for the visible notes
  const noteIds = useMemo(
    () => notes.filter((n) => !n.deletedAt && n.author !== identityId).map((n) => n.id),
    [notes, identityId]
  );

  const { readKeySet, markAsRead } = useCloudReadStates({
    spaceCode,
    identity: identityId,
    contentType: "note",
    contentIds: noteIds,
  });

  async function patch(body: Record<string, unknown>) {
    if (!onPatch) return;
    if ((body.action === "delete" || body.action === "soft_delete") && !confirm("确定删除这张小纸条吗？删除后小纸条墙不会再显示。")) return;
    setBusyId(String(body.id || ""));
    await onPatch(body);
    setBusyId(null);
    setEditing(null);
  }

  const isOwner = side === "owner";
  const emptyTitle = isOwner ? "还没有给小乖写的" : "墙上还是空的";
  const emptyDesc = isOwner ? "先写第一张小纸条吧。" : "等他贴上第一张小纸条吧。";

  return (
    <>
      {notes.length ? (
        <motion.div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          variants={safeVariants(staggerContainer, reduceMotion)}
          initial="hidden"
          animate="visible"
          key={notes.length}
        >
          {notes.map((note) => (
            <motion.div variants={safeVariants(staggerItem, reduceMotion)} key={note.id}>
              <NoteCard
                note={note}
                onClick={() => setSelected(note)}
                onEdit={onPatch ? () => setEditing(note) : undefined}
                onPatch={onPatch ? patch : undefined}
                busy={busyId === note.id}
                identityId={identityId}
                readKeySet={readKeySet}
                onNoteRead={(noteId) => markAsRead(noteId)}
                side={side}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <p className="text-lg font-semibold text-cocoa/60">{emptyTitle}</p>
          <p className="mt-1 text-sm text-cocoa/40">{emptyDesc}</p>
        </motion.div>
      )}
      <AnimatePresence>
        {selected ? (
          <motion.div
            className="fixed inset-0 z-50 bg-cocoa/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="mx-auto max-h-[92vh] max-w-md overflow-auto rounded-[1.75rem] bg-cream p-4 shadow-float"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <NoteCard note={selected} featured identityId={identityId} readKeySet={readKeySet} onNoteRead={(noteId) => markAsRead(noteId)} side={side} />
              <button className="btn-secondary mt-3 w-full" onClick={() => setSelected(null)}>关闭</button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {editing ? <NoteEditorModal note={editing} onClose={() => setEditing(null)} onSave={patch} /> : null}
    </>
  );
}
