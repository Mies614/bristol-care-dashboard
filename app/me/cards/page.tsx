"use client";

import CardsPage from "@/app/cards/page";

/**
 * Owner-side cards page.
 * Reuses the partner side CardsPage component.
 * The cards page is a card wallet / tool hub and doesn't need identity-specific rendering.
 * Admin entry is available via /me/settings → /me/admin.
 */
export default function MeCardsPage() {
  return <CardsPage />;
}