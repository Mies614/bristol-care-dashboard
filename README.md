# Bristol Care Dashboard

给 Bristol 留学生活的温柔小助手 — 手机端优先的个人生活 Dashboard。默认昵称为「小乖」，支持 Supabase 云同步和纯本地 localStorage 两种模式。

## 技术栈

Next.js 15.3 · React 19 · Supabase · Tailwind CSS · TypeScript · Vitest · Web Push

## 快速启动

```bash
npm install
cp .env.example .env.local   # 复制环境变量模板
npm run dev                   # 启动后访问 http://localhost:3000
```

不配置任何环境变量的情况下，App 以 **本地 localStorage 模式** 运行，所有核心功能可用。

## Supabase 初始化（可选）

如果需要云同步、小纸条云端存储、Admin 数据维护中心等功能：

1. 在 [Supabase](https://supabase.com) 创建项目。
2. 在 SQL Editor 中执行 `supabase/schema.sql`。
3. 在 Storage 中创建三个 public bucket：`love-notes`、`couple-albums`、`backgrounds`。
4. 将 Supabase 的 URL、anon key、service role key 填入 `.env.local`。
5. 设置 `ADMIN_PASSWORD`（自己设定的后台密码）。
6. 重启 `npm run dev`。

## 环境变量

参见 `.env.example`。核心变量：

| 变量 | 必选 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_DEFAULT_SPACE_CODE` | 是 | 默认空间码 `xiaoguai520` |
| `ADMIN_PASSWORD` | 是 | 后台密码 |
| `NEXT_PUBLIC_SUPABASE_URL` | 否 | 不填则使用 localStorage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 否 | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | 否 | 服务端密钥，不暴露 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 否 | Push 通知公钥 |
| `VAPID_PRIVATE_KEY` | 否 | Push 通知私钥 |

## 功能

- **天气与穿衣** — Open-Meteo Bristol 天气，自动穿衣建议
- **课程表** — 一周课程管理，.ics 日历导出
- **Deadline** — 按紧急程度排序，日历提醒
- **Miss-you** — 见面倒计时 + 想你一下
- **小纸条墙** — 文字/语音/照片/视频，多种展示风格
- **情侣相册** — 照片/实况/视频，支持精选
- **经期记录** — 周期预测，.ics 提醒
- **PWA** — 可添加到手机桌面
- **Push 通知** — Web Push 订阅（需 VAPID 密钥）
- **定时提醒** — Vercel Cron 每天发送天气/DDL/想念/经期 Push 提醒（v1.1）
- **Cloud Sync** — Supabase 云同步，自动 fallback 到 localStorage

## Admin 入口

访问 `/admin`，输入 `ADMIN_PASSWORD`。包含：

- **数据维护中心** — 备份导出、导入恢复、已删除纸条、Storage 孤儿文件
- **远程照顾控制台** — Miss-you 计数、课程/DDL/经期摘要

详细使用说明见 `docs/maintenance.md`。

## PWA / Push 配置

- PWA manifest 在 `public/manifest.json`
- 安装提示在用户停留 5 秒后显示，关闭后 30 天内不再提示
- Push 需要 VAPID 密钥：运行 `npm run generate:vapid`，将公钥/私钥填入 `.env.local`

## 数据存储边界

| 类型 | 存储位置 | 备份包含 |
|---|---|---|
| 小纸条/课程/DDL/相册/经期 | Supabase 或 localStorage | ✅ |
| readState / reactions / updateChecker | localStorage（本设备） | ❌ |
| reminderConfig / PWA dismissed | localStorage（本设备） | ❌ |

详见 `docs/maintenance.md`。

## 命令

```bash
npm run lint      # ESLint 检查
npm test          # 运行测试（615 个用例）
npm run build     # 生产构建
npm run dev       # 本地开发
```

## 部署

详见 `docs/deployment.md`。

## 版本

v1.0.0 — 详见 `CHANGELOG.md`。
