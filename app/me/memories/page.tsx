"use client";

import MemoriesPage from "@/app/memories/page";
import { useMeIdentity } from "@/app/me/layout";

export default function MeMemoriesPage() {
  const { identityId } = useMeIdentity();
  void identityId; // Available for future prop injection in Phase 3
  return <MemoriesPage />;
}