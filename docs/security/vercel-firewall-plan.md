# Vercel Firewall Plan

## Overview

Vercel provides a Web Application Firewall (WAF) that can be configured per project. This document outlines recommended rules for the Bristol Care Dashboard production deployment.

## Recommended Rules

### Admin API Protection

| Path | Rule | Action |
|---|---|---|
| `/api/admin/login` | Rate limit: 10 req/min per IP | Block (429) |
| `/api/admin/**` | IP allowlist (optional) | Challenge or Block |
| `/api/admin/**` | Method: only POST/GET allowed | Block others |

### Write API Rate Limits

| Path | Rule | Action |
|---|---|---|
| `/api/comments` (POST/DELETE) | Rate limit: 30 req/min per IP | Block (429) |
| `/api/interactions` (POST/DELETE) | Rate limit: 60 req/min per IP | Block (429) |
| `/api/miss-you` (POST) | Rate limit: 10 req/min per IP | Block (429) |

### Blocked Patterns

| Pattern | Action |
|---|---|
| `/wp-admin` | Block |
| `/adminer` | Block |
| `/.env` | Block |
| `/phpmyadmin` | Block |
| `/.git` | Block |
| SQL injection patterns | Block |

## Distinction

| Layer | Tool | Purpose |
|---|---|---|
| **Code-level** | `lib/adminRateLimit.ts` | App-specific rate limiting |
| **Edge** | Vercel Firewall | IP-based rate limiting, pattern blocking |
| **External** | Cloudflare WAF (optional) | DDoS, bot protection |

## Production Setup

1. Vercel Dashboard → Project → Security → Firewall
2. Add custom rules as defined above
3. Enable Attack Challenge Mode for suspicious traffic

⚠️ Vercel Firewall is a paid feature on some plans. Verify your plan before enabling.
