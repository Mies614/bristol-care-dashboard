"use client";

import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { AlbumsPageContent } from "@/components/AlbumsPageContent";

export default function AlbumsPage() {
  return <AlbumsPageContent identityId={DEFAULT_NORMAL_IDENTITY_ID} appSide="partner" />;
}