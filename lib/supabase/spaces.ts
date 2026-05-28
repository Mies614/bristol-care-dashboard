import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSpaceCode } from "@/lib/spaceCode";

export interface SpaceRecord {
  id: string;
  code: string;
  name: string;
  girlfriend_name: string;
}

/**
 * Get a space by code from couple_spaces table.
 * Returns null if not found. Never throws for missing space.
 */
export async function getSpaceByCode(
  client: SupabaseClient,
  code?: string | null
): Promise<SpaceRecord | null> {
  const normalized = normalizeSpaceCode(code);
  const { data, error } = await client
    .from("couple_spaces")
    .select("id, code, name, girlfriend_name")
    .eq("code", normalized)
    .maybeSingle();

  if (error) {
    throw new Error(`couple_spaces query failed: ${error.message}`);
  }

  return data as SpaceRecord | null;
}

/**
 * Get a space by code, throwing if not found.
 */
export async function requireSpaceByCode(
  client: SupabaseClient,
  code?: string | null
): Promise<SpaceRecord> {
  const space = await getSpaceByCode(client, code);
  if (!space) {
    const normalized = normalizeSpaceCode(code);
    throw new Error(`SPACE_NOT_FOUND: space with code "${normalized}" not found in couple_spaces`);
  }
  return space;
}