# Cloudflare Free Plan — Optional Protection

## Overview

Cloudflare offers a free tier with basic security features that can protect the Bristol Care Dashboard without changing application code. This is optional and DNS-based.

## Free Features

| Feature | Description | Benefit |
|---|---|---|
| **Bot Fight Mode** | Blocks automated bot traffic | Reduces spam, scraping |
| **Browser Integrity Check** | Blocks browsers commonly used by bots | Additional bot protection |
| **Basic WAF Rules** | OWASP top-10 protections | XSS, SQLi defense |
| **Rate Limiting (limited)** | Free tier allows basic rate limiting | API abuse prevention |

## Cloudflare Access (optional)

Cloudflare Access can add email-based authentication as an external gate:

- Allowlist: you@example.com, partner@example.com
- All other visitors see a Cloudflare login page

⚠️ **Cloudflare Access is an external gate, NOT application authentication.**

- It does NOT replace `ADMIN_PASSWORD` validation
- It does NOT replace Supabase RLS
- It adds an extra layer before the app is reached

## PWA / Push / Cron Bypass Considerations

If using Cloudflare Access, these paths must be excluded:

| Path | Reason |
|---|---|
| `/api/cron/reminders` | Vercel Cron calls this |
| `/api/push/**` | Push notification service worker |
| `/api/weather` | Weather data fetch |
| `manifest.json` | PWA manifest |
| Service worker files | PWA offline support |

## Setup (OPTIONAL — do not do now)

1. Sign up at cloudflare.com
2. Add your domain
3. Update nameservers at domain registrar
4. Enable Bot Fight Mode
5. Add WAF rules as needed

⚠️ **Do NOT change DNS unless you understand the impact on Vercel deployments.**
