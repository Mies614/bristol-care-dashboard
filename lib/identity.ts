import type { LoveNote } from "./types";

export function getUserFacingAuthorLabel(author?: LoveNote["author"] | string) {
  if (author === "admin" || author === "me") return "我";
  return "小乖";
}
