-- Bristol Care Dashboard — S3: Two-Person Authentication
-- Create space_members table for auth-based membership.
-- auth.users is managed by Supabase Auth.
-- space_members maps auth.users to couple_spaces with roles.

BEGIN;

-- Check if table already exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'space_members'
  ) THEN
    CREATE TABLE public.space_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'partner')),
      identity_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (space_id, user_id),
      UNIQUE (space_id, role)
    );

    -- Enable RLS on space_members itself
    ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;

    -- Users can read their own membership
    CREATE POLICY "Users can read own membership" ON public.space_members
      FOR SELECT USING (auth.uid() = user_id);

    RAISE NOTICE 'space_members table created';
  ELSE
    RAISE NOTICE 'space_members table already exists';
  END IF;
END $$;

COMMIT;

-- Post-check
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_members') AS table_exists,
  (SELECT COUNT(*) FROM public.space_members) AS member_count;
