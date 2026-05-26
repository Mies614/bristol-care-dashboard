"use client";

export type CurrentIdentity = "me" | "xiaoguai";
export const CURRENT_IDENTITY_KEY = "bristol_dashboard_current_identity";

export function getCurrentIdentity(): CurrentIdentity {
  if (typeof window === "undefined") return "xiaoguai";
  try {
    const value = window.localStorage.getItem(CURRENT_IDENTITY_KEY);
    return value === "me" ? "me" : "xiaoguai";
  } catch {
    return "xiaoguai";
  }
}

export function saveCurrentIdentity(value: CurrentIdentity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CURRENT_IDENTITY_KEY, value);
  window.dispatchEvent(new Event("bristol-care-identity"));
}

export function getIdentityLabel(value: CurrentIdentity) {
  return value === "me" ? "我" : "小乖";
}
