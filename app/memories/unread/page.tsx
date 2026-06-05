"use client";

import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { UnreadMemoriesPageContent } from "@/components/UnreadMemoriesPageContent";

export default function UnreadMemoriesPage() {
  return <UnreadMemoriesPageContent identityId={DEFAULT_NORMAL_IDENTITY_ID} appSide="partner" />;
}