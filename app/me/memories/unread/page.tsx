"use client";

import { UnreadMemoriesPageContent } from "@/components/UnreadMemoriesPageContent";

export default function MeUnreadMemoriesPage() {
  return <UnreadMemoriesPageContent identityId="me" appSide="owner" />;
}