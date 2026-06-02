# Changelog

## v1.0.0 — 2026-06-02

Initial stable release.

### 项目定位

Bristol 留学生手机端生活 Dashboard。给一个人（小乖）的日常陪伴：天气、课程、DDL、想念倒计时、小纸条、情侣相册、经期记录。支持 Supabase 云同步和纯本地 localStorage 两种模式。

### 核心功能

- **天气与穿衣推荐** — 基于 Open-Meteo Bristol 天气，自动推荐穿衣
- **课程表** — 一周课程管理，支持 .ics 日历导出
- **Deadline** — 截止日期管理，按紧急程度排序，支持日历导出
- **Miss-you 倒计时** — 下次见面倒计时、"想你一下"按钮
- **小纸条墙** — 双方上传文字/语音/照片/视频，多种展示风格
- **情侣相册** — 照片/实况照片/视频上传，支持精选
- **经期记录** — 周期记录与预测，.ics 日历提醒
- **PWA** — 可添加到手机桌面，离线缓存
- **Push 通知** — Web Push 订阅与测试通知
- **Cloud Sync** — Supabase 云同步，自动 fallback 到 localStorage

### Admin 数据维护中心

- JSON 备份导出（含完整数据结构）
- 导入恢复（merge 模式，不覆盖已有数据）
- 软删除小纸条恢复 / 永久删除
- Storage 孤儿文件检查

### 稳定性能力

- 上传失败保留草稿，友好错误提示，支持重试
- `/api/health` 环境变量健康检查（不泄露 secret）
- 615 个 Vitest 单元测试
- 本地状态 spaceCode 隔离（readState、reactions、updateChecker）
- 安全日期格式化（无 Invalid Date / NaN）

### 技术栈

Next.js 15.3 · React 19 · Supabase · Tailwind CSS · TypeScript · Vitest · Web Push

## v1.1.0 — 2026-06-02

### 服务端定时提醒

- 新增 `/api/cron/reminders` — 服务端定时提醒 API（CRON_SECRET 鉴权）
- Vercel Cron 配置：每天 UTC 09:00 触发
- 新增 `reminder_preferences` 表（Supabase）：服务端提醒偏好存储
- 新增 `reminder_delivery_log` 表：防止同一天重复发送
- 新增 `lib/serverReminderScheduler.ts`：纯函数调度逻辑（可测试）
- 支持：天气、Deadline、Miss-you、经期提醒
- Push 订阅失效时自动标记 inactive
- `/api/health` 新增 CRON_SECRET 状态检查
