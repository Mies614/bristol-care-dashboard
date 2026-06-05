"use client";

import DeadlinesPage from "@/app/deadlines/page";

/**
 * Owner-side deadlines page.
 * Reuses partner-side component since deadlines data is shared.
 */
export default function MeDeadlinesPage() {
  return <DeadlinesPage />;
}