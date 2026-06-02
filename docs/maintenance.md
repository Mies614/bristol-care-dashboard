# 日常维护指南

## 数据备份

在 `/admin` 页面的「数据维护中心」中：

1. 选择「导出备份」标签。
2. 输入后台密码，点击「从云端导出备份」。
3. 下载 JSON 文件保存到安全位置。

备份内容：小纸条、DDL、课程、相册记录、经期记录、应用设置。
备份不包含：本地设备状态（readState、reactions 等）、任何 secret。

## 数据恢复

1. 选择「导入恢复」标签。
2. 选择之前导出的 JSON 备份文件。
3. 点击「预览导入内容」查看将要导入的数据摘要。
4. 确认后点击「执行导入」。

导入采用 merge 模式：已存在相同 ID 的记录会被跳过，不会覆盖现有数据。

## 已删除纸条恢复

1. 选择「已删除」标签。
2. 查看所有已软删除的小纸条。
3. 点击「恢复」将纸条重新放回纸条墙。
4. 点击「永久删除」彻底移除数据库记录（Storage 文件不会被删除）。

## Storage 孤儿文件检查

1. 选择「孤儿文件」标签。
2. 点击「检查孤儿文件」。

检查两类问题：
- **孤儿文件**：Storage 中存在但数据库未引用的文件 → 可能占用空间
- **缺失引用**：数据库引用了但 Storage 中不存在的文件 → 显示异常

当前版本只检查不自动删除。

## 本地设备状态说明

以下状态仅保存在当前设备的 localStorage 中，不同设备之间不会同步，备份导出也不包含：

| 状态 | 影响 |
|---|---|
| readState | 小纸条已读/未读（按 identity 隔离） |
| reactions | 小纸条互动（❤️ 🫶 🌙，按 identity 隔离） |
| reminderConfig | 每日提醒偏好 |
| updateChecker | 对方更新检测时间戳（按 identity 隔离） |
| PWA install dismissed | 安装提示关闭状态 |
| identities | 身份设置（显示名、emoji、当前身份） |

这些状态可以随时通过清除浏览器数据来重置，不会影响云端数据。

## 身份系统（v1.3）

App 支持多身份切换，comments、interactions、readState、reactions 等均按身份隔离。

- **身份管理**：在 `/settings` 页的「身份设置」区域可以切换身份、编辑显示名和 emoji
- **默认身份**：`xiaoguai`（小乖）为默认普通身份，`me`（我）为自用身份，`admin` 为管理员身份
- **旧数据兼容**：旧 `"default"` 身份自动映射为 `xiaoguai`，无需手动迁移
- **身份隔离**：不同身份的评论、点赞、已读、reaction 互不影响
- **Supabase 不可用**：身份设置仅保存在本机 localStorage
- **备份**：identities 包含在备份导出中，导入时 merge（不覆盖）

### Admin 端身份显示

- Admin 评论管理中显示友好身份标签：`xiaoguai` → 小乖，`me` → 我，`admin` → Admin
- Admin 可查看所有身份的评论和互动
- Admin 可删除任意身份的评论
- 普通端只能删除自己身份的评论

## Supabase 不可用时的行为

- App 自动切换到 localStorage 模式。
- 云同步暂停，数据保留在本地。
- 小纸条上传/相册上传依赖 Supabase Storage，不可用时会提示「云存储未配置」。
- Admin 数据维护中心的导出/导入/软删除/孤儿检查依赖 Supabase，不可用时返回 `503`。

## Push 通知未配置时的行为

- 设置页通知卡片显示「暂未配置」。
- 不会弹出权限请求。
- App 其他功能不受影响。
- 配置 VAPID 密钥后，刷新页面即可看到「开启通知」按钮。

## 定时提醒管理

定时提醒需要以下条件同时满足：

1. `CRON_SECRET` 环境变量已配置
2. Supabase 可正常连接
3. VAPID 密钥已配置
4. `reminder_preferences` 表中有启用的偏好记录
5. 用户在 settings 页开启了提醒并同步到 Supabase

### 提醒发送机制

- Vercel Cron 每天 UTC 09:00 调用 `/api/cron/reminders`
- 每个 space 每种提醒每天只发一次（通过 `reminder_delivery_log` 去重）
- 支持：天气、Deadline（1-3天内的）、Miss-you、经期
- Push 订阅失效（410/404）时自动标记为 inactive

### 测试提醒

1. 在 settings 页→通知设置，点击「发送测试通知」
2. 或用 curl 手动测试 Cron：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

3. 查看返回的 `notificationsGenerated` 和 `notificationsSent` 确认运行正常

## 定时提醒维护

### 查看 Cron 运行状态

访问 `/admin` → 数据维护中心 → **提醒监控** tab：

- 配置状态栏显示 Cron 密钥、Push 密钥、活跃订阅、偏好数量
- 最近运行记录显示每次触发的成功/失败、生成/发送数量
- 自动诊断提示常见问题

### 常见问题

| 提示 | 原因 | 解决方案 |
|---|---|---|
| Cron 密钥还没配置 | `CRON_SECRET` 环境变量缺失 | 在 Vercel 环境变量中设置 |
| Push 密钥未配置 | VAPID keys 缺失 | 运行 `npm run generate:vapid` 并设置环境变量 |
| 还没有设备订阅通知 | 无活跃 push_subscriptions | 在 settings 页开启通知并点击"发送测试通知" |
| 还没有云端提醒偏好 | reminder_preferences 表为空 | 打开 settings 页，调整提醒偏好并保存 |
| Cron 正常运行但 sent=0 | 无可发送的提醒或订阅 | 检查 preferences 是否开启对应类型 |
| delivery log 已去重 | 同天已发送 | 正常，每天每种提醒只发一次 |

### 手动 Dry-run

在提醒监控 tab 点击 **🧪 模拟运行**：

- **不发送真实 Push 通知**
- 展示将要生成哪些提醒（类型、space、标题、内容预览）
- 结果写入 `reminder_run_logs`（trigger_type: `manual_dry_run`），不影响 delivery_log
- 用于验证提醒偏好和空间数据是否正确配置

### Supabase 不可用时

- Cron 返回 `503` 状态，不崩溃
- 提醒监控 tab 显示 "Supabase 未配置"
- 前端提醒偏好仍可保存在 localStorage（仅本设备）