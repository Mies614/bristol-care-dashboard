# Security Phase S2.1 Production Deployment

## Status

Not ready for production deployment.

The draft migration files remain marked:

```text
DRAFT — DO NOT APPLY UNTIL PRODUCTION RLS VERIFICATION IS COMPLETE
```

## Gate To Remove Draft

Only remove the draft marker after all are true:

- production verification SQL output is reviewed;
- schema drift report has no unresolved high-risk mismatch;
- non-production migration dry run succeeds;
- rollback dry run succeeds;
- Storage policy impact is reviewed;
- `user_identities` browser dependency has a documented handling plan.

## Deployment Shape

Current intended architecture remains:

```text
Browser -> Next.js API -> server-only Supabase service role -> Postgres
```

RLS is defense in depth against direct anon/authenticated Data API access.
The service role bypasses RLS, so API boundary checks remain required.

## Do Not Do In S2.1

- Do not introduce Supabase Auth.
- Do not add login UI.
- Do not change `/` or `/me` identity semantics.
- Do not apply production SQL from Codex.
- Do not modify production Storage policies automatically.
