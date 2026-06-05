"use client";

import RecordsPage from "@/app/records/page";

/**
 * Owner-side records page.
 * Reuses the partner side RecordsPage component.
 * The records page is a data hub (schedule, deadlines, period) and doesn't
 * need identity-specific rendering — identity is only relevant for notes.
 */
export default function MeRecordsPage() {
  return <RecordsPage />;
}