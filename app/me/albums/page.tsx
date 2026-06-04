"use client";

import AlbumsPage from "@/app/albums/page";
import { useMeIdentity } from "@/app/me/layout";

export default function MeAlbumsPage() {
  const { identityId } = useMeIdentity();
  // AlbumsPage currently uses useCurrentIdentity from its own code.
  // In Phase 3 we'll refactor to accept identityId prop.
  // For now, identityId is available via context for future use.
  void identityId;

  return <AlbumsPage />;
}