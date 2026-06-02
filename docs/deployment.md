# 部署指南

## Vercel 部署

1. 将项目推送到 GitHub。
2. 在 Vercel 中 Import 该仓库。
3. 配置环境变量（见下方）。
4. Deploy。

## 环境变量

在 Vercel Project Settings → Environment Variables 中添加：

| 变量 | 必选 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 否 | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 否 | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | 否 | Supabase 服务端密钥 |
| `NEXT_PUBLIC_DEFAULT_SPACE_CODE` | 是 | 默认空间码，如 `xiaoguai520` |
| `ADMIN_PASSWORD` | 是 | 后台密码 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 否 | Web Push 公钥 |
| `VAPID_PRIVATE_KEY` | 否 | Web Push 私钥 |
| `VAPID_SUBJECT` | 否 | 如 `mailto:you@example.com` |

- 不配置 Supabase 相关变量时，App 以 localStorage 模式运行。
- 不配置 VAPID 时，Push 通知功能不可用，但不影响 App 其他功能。

## Supabase 初始化

1. 登录 [Supabase](https://supabase.com)，创建项目。
2. 在 SQL Editor 中执行 `supabase/schema.sql`。
3. 创建 Storage Buckets（均设为 public）：

   - `love-notes` — 小纸条附件
   - `couple-albums` — 情侣相册文件
   - `backgrounds` — 背景图片

4. 在 Project Settings → API 中获取 URL 和 Keys。

## VAPID Key 生成

```bash
npm run generate:vapid
```

将输出的公钥填入 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`，私钥填入 `VAPID_PRIVATE_KEY`。

## 部署后验证

| 路径 | 检查内容 |
|---|---|
| `/` | 首页正常加载 |
| `/api/health` | 返回环境变量状态（不泄露 secret） |
| `/api/ping` | 返回 `{ ok: true }` |
| `/admin` | 输入 `ADMIN_PASSWORD` 可登录 |
| `/settings` | 云同步状态、通知设置正常 |
| `/debug` | 诊断页面可加载 |
| `/manifest.json` | PWA manifest 可访问 |

## 注意事项

- `.env.local` 和 `.env*.local` 已加入 `.gitignore`，不会提交到仓库。
- `SUPABASE_SERVICE_ROLE_KEY` 只在服务端 Route Handler 中使用，不会暴露到浏览器。
- VAPID 私钥只在服务端使用，`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 可以安全暴露给客户端。
