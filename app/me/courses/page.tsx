"use client";

import SchedulePage from "@/app/schedule/page";

/**
 * Owner-side schedule/courses page.
 * Reuses partner-side component since schedule data is shared.
 */
export default function MeCoursesPage() {
  return <SchedulePage />;
}