"use client";

import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { MemoriesPageContent } from "@/components/MemoriesPageContent";

export default function MemoriesPage() {
  return <MemoriesPageContent identityId={DEFAULT_NORMAL_IDENTITY_ID} appSide="partner" />;
}