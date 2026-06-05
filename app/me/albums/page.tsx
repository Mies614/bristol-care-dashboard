"use client";

import { AlbumsPageContent } from "@/components/AlbumsPageContent";

export default function MeAlbumsPage() {
  return <AlbumsPageContent identityId="me" appSide="owner" />;
}