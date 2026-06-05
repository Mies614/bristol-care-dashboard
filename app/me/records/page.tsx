"use client";

import RecordsPage from "@/app/records/page";

/**
 * Owner-side records page (schedule, deadlines, period hub).
 * All sub-links within should point to /me/courses, /me/deadlines, /me/period.
 * For now, reuses the partner-side RecordsPage since it's a data hub
 * and identity is only relevant for notes/interactions.
 */
export default function MeRecordsPage() {
  return <RecordsPage />;
}