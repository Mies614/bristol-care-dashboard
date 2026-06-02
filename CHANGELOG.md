# Changelog

## v1.3.0 — 2026-06-02

### 正式身份系统

- 新增 `lib/identity.ts`：统一身份类型、常量和纯函数工具
- 新增 `lib/identityStorage.ts`：身份存储层（Supabase + localStorage fallback）
- 新增 `supabase/schema.sql` 中 `user_identities` 表
- 新增 `components/IdentitySettingsCard.tsx`：设置页身份切换 UI
- comments/interactions/readState/reactions/updateChecker 全部接入正式身份系统
- 旧 `"default"` 身份自动迁移为 `xiaoguai`，无需手动迁移
- 不同身份的评论、点赞、已读、reaction 互不影响
- Admin 评论管理显示友好身份标签，可删除任意身份评论
- 备份导出/导入支持 identities，dry-run 显示 identities 数量
- Cron/reminder preferences 已使用 identity 字段，完全兼容
- 656 个 Vitest 测试全部通过

## v1.1.0 — 2026-06-02

### 服务端定时提醒

- 新增 `app/api/cron/reminders` — Vercel Cron 每天 UTC 09:00 触发，按用户偏好生成并发送天气、Deadline、Miss-you、经期 Push 通知
- `CRON_SECRET` Bearer 鉴权保护，未授权请求不执行
- 新增 `reminder_preferences` 表（Supabase）：服务端提醒偏好存储
- 新增 `reminder_delivery_log` 表：同天同类型提醒去重
- 新增 `reminder_run_logs` 表：每次运行记录（含耗时、跳过、错误）
- `lib/serverReminderScheduler.ts`：纯函数调度逻辑，时间窗口 ±5~15 分钟
- Deadline 只提醒 1-3 天内临近项，避免过早噪音
- 过期 Push 订阅 (410/404) 自动标记 inactive

### 提醒监控

- Admin 数据维护中心新增「提醒监控」tab
- 配置状态一目了然：Cron 密钥、Push 密钥、活跃订阅数、偏好数
- 自动诊断提示（"Cron 密钥未配置"、"还没有设备订阅"等）
- 最近 10 次运行记录，含触发方式、成功/失败、生成/发送、跳过原因
- 最近 7 天统计：运行次数、成功率、生成/发送量、常见跳过/错误
- 手动 Dry-run（模拟运行）：检查将要生成哪些提醒，不真实发送 Push

### 稳定性

- 不泄露任何 secret、push endpoint、VAPID private key
- Supabase 不可用时 Cron 返回 unavailable，不崩溃
- 未授权请求不写入任何日志
- Dry-run 不发送 Push，不写 delivery_log
- 656 个 Vitest 单元测试全部通过

## v1.0.0 — 2026-06-02

Initial stable release.

### 核心功能

- 天气与穿衣推荐（Open-Meteo）
- 课程表 + .ics 日历导出
- Deadline 管理 + 日历导出
- Miss-you 倒计时 + "想你一下"
- 小纸条墙（文字/语音/照片/视频，多种展示风格）
- 情侣相册（照片/实况/视频，精选）
- 经期记录 + 周期预测 + .ics 提醒
- PWA 安装提示
- Push 通知订阅与测试通知
- Supabase Cloud Sync + localStorage fallback
- Admin 数据维护中心：备份导出、导入恢复、软删除恢复、Storage 孤儿文件检查
- 615 个 Vitest 测试