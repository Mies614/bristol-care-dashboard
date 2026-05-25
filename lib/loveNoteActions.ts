export type LoveNotePatchAction = "toggle_active" | "set_active" | "toggle_pinned" | "set_pinned" | "deactivate" | "delete" | "soft_delete";

export type LoveNoteActionInput = {
  action?: LoveNotePatchAction;
  active?: boolean;
  pinned?: boolean;
  current?: {
    active: boolean;
    pinned: boolean;
  };
};

export function getLoveNotePatchUpdate(input: LoveNoteActionInput): Record<string, boolean> {
  if (input.action === "delete" || input.action === "soft_delete") return { active: false, pinned: false };
  if (input.action === "deactivate") return { active: false, pinned: false };
  if (input.action === "set_active") return input.active ? { active: true } : { active: false, pinned: false };
  if (input.action === "toggle_active") {
    const nextActive = !input.current?.active;
    return nextActive ? { active: true } : { active: false, pinned: false };
  }
  if (input.action === "toggle_pinned") {
    const nextPinned = !input.current?.pinned;
    return nextPinned ? { pinned: true, active: true } : { pinned: false };
  }
  if (input.action === "set_pinned") {
    return input.pinned ? { pinned: true, active: true } : { pinned: false };
  }
  return {};
}

export function shouldResetOtherPinnedNotes(action?: LoveNotePatchAction, pinned?: boolean, currentPinned?: boolean) {
  if (action === "set_pinned") return pinned === true;
  if (action === "toggle_pinned") return currentPinned === false;
  return false;
}
