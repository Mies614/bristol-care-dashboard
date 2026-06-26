# Security Phase S2 Storage Policy

## Implemented Path Rule

New client direct uploads use immutable paths:

```text
<space_code>/<identity>/<year>/<month>/<kind>/<uuid>.<ext>
```

Examples:

```text
xiaoguai520/xiaoguai/2026/06/images/123e4567-e89b-12d3-a456-426614174000.webp
xiaoguai520/me/2026/06/backgrounds/123e4567-e89b-12d3-a456-426614174000.webp
```

`lib/storagePathPolicy.ts` validates path parts, rejects traversal, requires UUID filenames, and keeps `upsert: false` in upload helpers.

## What This Solves

- Prevents fixed-path overwrite patterns.
- Keeps one-year cache control compatible with immutable object paths.
- Makes object ownership and origin clearer for future Storage policy work.

## What This Does Not Solve

- Public bucket plus path prefix is not authorization.
- Anon upload plus a known prefix is not secure upload.
- Public URLs remain accessible to anyone who has the URL.

## Future Options

| Option | Benefit | Cost |
|---|---|---|
| Browser direct upload + Storage policies | Lowest app bandwidth | Limited without real Auth |
| Server signed upload URL | Server controls path/token | Still not real user auth |
| Server proxy upload | Centralized validation | Vercel bandwidth/function cost |

Recommended next step: introduce a real auth/device boundary before making strong claims about private Storage access.
