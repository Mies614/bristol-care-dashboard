import { isValidAuthor, isValidDisplayStyle } from "./noteValidation";
import type { LoveNote } from "./types";

export type NotePatchAction =
  | "update"
  | "toggle_pinned"
  | "set_pinned"
  | "set_active"
  | "delete"
  | "soft_delete"
  | "change_style"
  | "change_mood";

export function getNotePatchUpdate(input: {
  action?: string;
  body: Record<string, unknown>;
  current: Pick<LoveNote, "active" | "pinned">;
  now?: string;
}): Record<string, unknown> {
  const now = input.now || new Date().toISOString();
  const { body, current } = input;
  const action = input.action || "update";
  const patch: Record<string, unknown> = { updated_at: now };

  if (action === "delete" || action === "soft_delete") {
    return { deleted_at: now, active: false, pinned: false, updated_at: now };
  }
  if (action === "toggle_pinned") {
    return { pinned: !current.pinned, active: !current.pinned ? true : current.active, updated_at: now };
  }
  if (action === "set_pinned") {
    const pinned = Boolean(body.pinned);
    return { pinned, active: pinned ? true : current.active, updated_at: now };
  }
  if (action === "set_active") {
    const active = Boolean(body.active);
    return { active, pinned: active ? current.pinned : false, updated_at: now };
  }
  if (action === "change_style") {
    if (isValidDisplayStyle(body.display_style)) patch.display_style = body.display_style;
    return patch;
  }
  if (action === "change_mood") {
    patch.mood = typeof body.mood === "string" && body.mood ? body.mood : null;
    return patch;
  }

  if ("content" in body) patch.content = typeof body.content === "string" ? body.content : "";
  if ("author" in body && isValidAuthor(body.author)) patch.author = body.author;
  if ("mood" in body) patch.mood = typeof body.mood === "string" && body.mood ? body.mood : null;
  if ("display_style" in body && isValidDisplayStyle(body.display_style)) patch.display_style = body.display_style;
  if ("image_alt" in body) patch.image_alt = typeof body.image_alt === "string" ? body.image_alt : null;
  if ("active" in body) {
    const active = Boolean(body.active);
    patch.active = active;
    if (!active) patch.pinned = false;
  }
  return patch;
}
