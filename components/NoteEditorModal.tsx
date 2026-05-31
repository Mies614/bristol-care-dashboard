"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { LoveNote } from "@/lib/types";

const styles: Array<[NonNullable<LoveNote["displayStyle"]>, string]> = [
  ["sticky", "便签"],
  ["postcard", "明信片"],
  ["bubble", "气泡"],
  ["photo_card", "照片卡"],
  ["timeline", "时间线"],
  ["minimal", "极简"],
  ["romantic", "浪漫"]
];
const moods = ["", "开心", "想你", "累了", "记录一下", "加油", "今日小事", "重要", "悄悄话"];

export function NoteEditorModal({ note, onClose, onSave }: { note: LoveNote; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<void> }) {
  const [draft, setDraft] = useState({
    content: note.content || "",
    mood: note.mood || "",
    displayStyle: note.displayStyle || "sticky",
    imageAlt: note.imageAlt || "",
    active: note.active
  });
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    await onSave({
      id: note.id,
      action: "update",
      content: draft.content,
      mood: draft.mood,
      display_style: draft.displayStyle,
      image_alt: draft.imageAlt,
      active: draft.active
    });
    setSaving(false);
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-cocoa/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.form
        className="mx-auto max-w-md space-y-3 rounded-[1.75rem] bg-cream p-4 shadow-float"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h2 className="font-semibold text-cocoa">编辑小纸条</h2>
        <textarea className="field min-h-32" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} />
        <div className="grid grid-cols-1 gap-2">
          <select className="field" value={draft.displayStyle} onChange={(event) => setDraft({ ...draft, displayStyle: event.target.value as typeof draft.displayStyle })}>
            {styles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <select className="field" value={draft.mood} onChange={(event) => setDraft({ ...draft, mood: event.target.value })}>
          {moods.map((mood) => <option key={mood || "none"} value={mood}>{mood || "无心情标签"}</option>)}
        </select>
        <input className="field" placeholder="图片 alt" value={draft.imageAlt} onChange={(event) => setDraft({ ...draft, imageAlt: event.target.value })} />
        <label className="check-card">
          <input checked={draft.active} type="checkbox" onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
          展示这张小纸条
        </label>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={saving} type="submit">{saving ? "保存中..." : "保存"}</button>
          <button className="btn-secondary flex-1" type="button" onClick={onClose}>取消</button>
        </div>
      </motion.form>
    </motion.div>
  );
}