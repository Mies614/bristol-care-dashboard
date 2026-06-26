# S3 User Onboarding

## Step 1: Create users in Supabase Auth

In Supabase Dashboard → Authentication → Users → Add User:
- Email: owner@example.com
- Email: partner@example.com

Or use Supabase SQL:
```sql
-- This requires admin access
SELECT * FROM auth.users;
```

## Step 2: Get auth.users.id values

After users confirm their emails (or you create them), note their UUIDs from `auth.users`.

## Step 3: Insert space_members

```sql
INSERT INTO space_members (space_id, user_id, role, identity_id)
VALUES
  ('<couple_spaces.id>', '<owner-uuid>', 'owner', 'me'),
  ('<couple_spaces.id>', '<partner-uuid>', 'partner', 'xiaoguai');
```

## Step 4: Set ALLOWED_AUTH_EMAILS

In Vercel env:
```
ALLOWED_AUTH_EMAILS=owner@example.com,partner@example.com
```

## Step 5: Test login

Both users visit `/login`, enter their email, click the magic link.
