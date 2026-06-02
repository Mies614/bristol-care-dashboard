# Bristol Care Dashboard

一个手机端优先的 Bristol 留学生活首页。默认昵称为“小乖”，支持本地 localStorage 使用，也可以开启 Supabase 云同步和远程小纸条。

## 功能

- Bristol 天气，使用 Open-Meteo，不需要 API key
- 推荐穿衣
- 课程表
- Deadline
- 下次见面倒计时
- 小纸条墙，支持双方上传文字、语音、照片和视频
- 情侣相册，支持照片、实况照片、视频和自动视频封面
- 经期记录，支持周期预测和 .ics 日历提醒
- `/admin` 支持发布、置顶、停用、软删除小纸条
- PWA，可添加到手机桌面
- localStorage fallback：不配置 Supabase 也能正常使用

## 本地安装

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。如果 3000 端口被占用，Next.js 会自动选择其他端口。

## 检查

```bash
npm run lint
npm test
npm run build
```

## 环境变量

复制 `.env.local.example` 为 `.env.local`：

```bash
cp .env.local.example .env.local
```

内容如下：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
NEXT_PUBLIC_DEFAULT_SPACE_CODE=xiaoguai520
```

`.env.local`、`.env*.local` 已加入 `.gitignore`，不要提交真实 key。

## 创建 Supabase 项目

1. 登录 Supabase，新建 Project。
2. 进入 Project Settings -> API。
3. 复制 Project URL 到 `NEXT_PUBLIC_SUPABASE_URL`。
4. 复制 publishable/anon key 到 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
5. 复制 service role/secret key 到 `SUPABASE_SERVICE_ROLE_KEY`。
6. 自己设置一个后台密码到 `ADMIN_PASSWORD`。

`SUPABASE_SERVICE_ROLE_KEY` 只在 Next.js Route Handler 服务端使用，不能暴露到浏览器端。

## 初始化数据库

在 Supabase SQL Editor 运行：

```text
supabase/schema.sql
```

这个 SQL 会创建：

- `couple_spaces`
- `settings`
- `courses`
- `deadlines`
- `love_notes`
- `quick_links`
- `album_items`
- `period_records`

并插入默认 space：

```text
code = xiaoguai520
name = Bristol Care
girlfriend_name = 小乖
```

## 创建 love-notes bucket

进入 Supabase Storage，手动创建 bucket：

```text
love-notes
```

首页和小纸条墙会通过生成的媒体 URL 加载图片、语音和视频。路径格式类似：

```text
xiaoguai520/images/1700000000000-a1b2c3d4.webp
xiaoguai520/audio/1700000000000-a1b2c3d4.webm
xiaoguai520/videos/1700000000000-a1b2c3d4.mp4
```

不要使用原始文件名。应用限制：

- 用户端图片最大 30MB，视频最大 100MB，语音最大 20MB
- 用户端 `/notes` 媒体文件由浏览器直传 Storage，再由 `/api/notes` 写数据库 metadata
- `/admin` 旧后台发布图片仍走服务端 `/api/admin/love-notes`

用户端直传需要 Storage policy 允许 anon insert/select：

```sql
create policy "Allow public uploads to love notes"
on storage.objects
for insert
to anon
with check (bucket_id = 'love-notes');

create policy "Allow public reads from love notes"
on storage.objects
for select
to anon
using (bucket_id = 'love-notes');
```

## 使用 /notes 小纸条墙

1. 打开 `/notes`。
2. 选择上传者：“我”或“小乖”。
3. 可以写文字，也可以录一段语音、上传照片或视频。
4. 选择展示样式：便签、明信片、聊天气泡、照片卡或时间线。
5. 点击“贴到小纸条墙”。

每张小纸条都可以在 `/notes` 直接编辑文字、作者、心情标签和展示样式，也可以置顶、隐藏、恢复展示或软删除。录音使用浏览器 MediaRecorder API。若当前浏览器不支持网页录音，可以上传已有音频文件。

## 使用 /settings 云同步

1. 打开 `/settings`。
2. 在“云同步”里输入访问码，默认 `xiaoguai520`。
3. 点击“连接云同步”。
4. 可执行：
   - 手动同步
   - 上传本地数据到云端
   - 从云端恢复到本地
   - 关闭云同步

上传本地数据到云端会用当前设备数据覆盖云端。  
从云端恢复到本地会用云端数据覆盖当前设备。  
执行前建议先导出 JSON 备份。

如果 Supabase 未配置、网络失败或云同步关闭，应用会保留 localStorage 数据并继续本地使用。

## 背景图片和整体风格

`/settings` 里可以上传云端背景图片，也可以切换整体风格。背景图片使用 Supabase Storage 的 `backgrounds` bucket，保存后会把 `background_settings` 写入 settings 表；整体风格会把 `theme_settings` 写入 settings 表。

需要在 Supabase Storage 手动创建 bucket：

```text
backgrounds
```

建议设置为 Public bucket。背景图片路径类似：

```text
xiaoguai520/backgrounds/1700000000000-a1b2c3d4.webp
```

前端直传需要 Storage policy 允许 anon insert/select：

```sql
create policy "Allow public uploads to backgrounds"
on storage.objects
for insert
to anon
with check (bucket_id = 'backgrounds');

create policy "Allow public reads from backgrounds"
on storage.objects
for select
to anon
using (bucket_id = 'backgrounds');
```

可选整体风格：温柔奶油、浪漫粉紫、极简清爽、学习清爽、夜间柔和、照片背景优先。

## 自动同步

`/settings` 的数据管理中心可以开启或关闭“自动同步到云端”。开启后，课程、DDL、背景和基础设置会在本地修改后自动排队同步；当前自动同步采用本地修改覆盖云端。小纸条和相册媒体通过各自 API/Storage 直接保存，不会通过自动同步重复上传。

## 使用 /admin 发布小纸条

1. 配好 Supabase 环境变量和 `ADMIN_PASSWORD`。
2. 打开 `/admin`。
3. 输入后台密码。
4. 确认 space code，默认 `xiaoguai520`。
5. 写小纸条内容。
6. 可选择：
   - active
   - pinned
   - visible_from
   - 图片
   - 图片 alt
7. 点击发布。

发布成功后，首页会优先显示云端最新 active 且已到 visible_from 的小纸条；pinned 小纸条优先。首页也提供“刷新小纸条”按钮。

最近 20 条小纸条会显示 `/admin` 和 `/notes` 上传的双方小纸条，并支持：

- 设为置顶 / 取消置顶
- 停用 / 重新启用
- 删除
- 查看图片、语音、视频来源和展示样式

删除采用软删除：数据库记录保留，写入 `deleted_at`，但首页和最近列表不会再显示。

## 发布带图片的小纸条

在 `/admin` 上传图片即可。前端会先检查文件类型和大小，服务端会再次校验。图片上传到 Supabase Storage 的 `love-notes` bucket，首页读取 `imageUrl` 显示。

如果图片不显示，优先检查：

- `love-notes` bucket 是否存在
- bucket 读取策略是否已配置
- 图片文件是否超过 5MB
- MIME 类型是否为 jpg/png/webp

## 部署到 Vercel

1. 推送项目到 GitHub。
2. Vercel 导入仓库。
3. Framework 选择 Next.js。
4. 添加环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
   - `NEXT_PUBLIC_DEFAULT_SPACE_CODE`
5. Build Command 使用默认 `next build`。
6. 部署后打开 `/settings` 连接云同步，打开 `/admin` 发布远程小纸条。

## 情侣相册

相册页面在 `/albums`，用于上传普通照片、实况照片和短视频。相册数据保存在 Supabase `album_items` 表，图片和视频由浏览器直传到 Supabase Storage，避免手机 Safari 通过 Vercel API Route 上传大视频时超时。

需要在 Supabase Storage 手动创建 bucket：

- bucket name: `couple-albums`
- 图片最大 30MB
- 视频最大 100MB
- 允许 MIME：`image/jpeg`、`image/png`、`image/webp`、`image/heic`、`image/heif`、`video/mp4`、`video/quicktime`、`video/webm`
- iPhone 有时会把 `.mov` / `.mp4` / `.webm` 标记为 `application/octet-stream`，项目会按文件扩展名兼容这些视频

上传普通照片：

1. 打开 `/albums`。
2. 选择一张封面图片。
3. 可填写标题、备注、拍摄日期、地点、是否精选。
4. 点击“上传到相册”。

上传实况照片：

1. 在 `/albums` 同时选择一张封面图片和一个对应短视频。
2. 系统会自动保存为 `live_photo`。
3. 卡片会显示 `LIVE` 标记。
4. 打开详情弹窗后点击“播放实况/视频”播放短视频。

上传视频：

1. 只选择视频文件。
2. 如果没有选择封面图片，系统会尝试截取视频第一帧作为封面。
3. 系统会保存为 `video` 项目。
4. MOV / `video/quicktime` 允许上传；如果浏览器无法直接播放，可在浏览器中打开或下载查看。

删除相册项目会采用软删除：写入 `deleted_at`，首页和相册不会再显示。

Storage policy 说明：

- 相册文件上传使用浏览器端 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 直传 `couple-albums` bucket。
- `album_items` 数据库写入仍然必须走 `/api/albums`，由服务端 `SUPABASE_SERVICE_ROLE_KEY` 写入，前端不会直接写数据库。
- 如果前端直传报 `permission denied` 或 `new row violates row-level security policy`，请在 Supabase Storage policies 中允许 `anon` 对 `couple-albums` 执行 `insert`。

可选 SQL 示例：

```sql
create policy "anon upload couple album files"
on storage.objects for insert to anon
with check (bucket_id = 'couple-albums');

create policy "public read couple album files"
on storage.objects for select to anon
using (bucket_id = 'couple-albums');
```

Vercel 部署相册功能不需要额外环境变量，只要已有 Supabase 变量正确即可。

## 经期记录

经期记录页面在 `/period`，用于记录开始日、结束日、流量、症状、心情和备注。

使用方式：

1. 打开 `/period`。
2. 输入访问码后进入记录页。
3. 添加开始日期和可选结束日期。
4. 按需选择症状、心情和备注。
5. 在“周期设置”里调整平均周期、平均经期长度和提前提醒天数。
6. 点击“导出日历提醒”生成 `.ics` 文件，由手机系统日历负责提醒。

`period_records` 保存每条记录，`settings` 表中的 `period_settings` 保存周期设置。重新运行 `supabase/schema.sql` 会创建表和默认设置。

## 常见问题

**图片不显示**  
检查 `love-notes` bucket 是否创建，以及读取策略是否已配置。

**首页没有显示最新小纸条**  
点击首页“小纸条”卡片上的“刷新小纸条”。如果修改了表结构，请在 Supabase SQL Editor 重新运行 `supabase/schema.sql`，确保 `love_notes.deleted_at` 字段存在。

**/admin 不能发布**  
检查 `ADMIN_PASSWORD`、`SUPABASE_SERVICE_ROLE_KEY` 和 Storage bucket。

**云同步失败**  
检查访问码是否为 `xiaoguai520`，以及是否已运行 `supabase/schema.sql`。

**Vercel 部署后失败**  
检查 Vercel Project Settings -> Environment Variables 是否完整配置。

**没有 Supabase 能不能用**  
可以。项目会显示“云同步未配置，当前为本地模式”，本地功能照常使用。

## 修改 Bristol 为其他城市

天气请求封装在 `lib/weather.ts`。把 `latitude`、`longitude` 改成目标城市坐标即可。

## 后续建议

- 增加更细的 space 权限模型
- 增加图片删除和 Storage 清理
- 增加 Supabase Edge Function 或定时任务做数据备份
- 如果未来需要多用户，再引入 Supabase Auth

## 数据存储边界

### 云端数据（Supabase，可同步）

- 小纸条（love_notes）
- 课程（courses）
- Deadline（deadlines）
- 相册（album_items）
- 经期记录（period_records）
- 应用设置（settings 表）
- Push 订阅（push_subscriptions）
- Miss-you 事件（miss_you_events）

### 本地设备状态（localStorage，不同步）

以下状态仅保存在当前设备上，切换设备后不会自动同步，备份导出也不包含：

- `readState` — 小纸条已读/未读状态
- `reactions` — 小纸条互动反馈（❤️ 🫶 🌙）
- `reminderConfig` — 每日关怀提醒偏好（时间、开关）
- `updateChecker` — 对方更新检测时间戳
- `autoSync` 状态（lastSyncAt、lastError 等）
- `PWA install dismissed` — 安装提示关闭记录
- `themeSettings` 部分本地缓存

这些本地状态的设计原则是：不依赖云端、不增加 Supabase 字段、设备独立、可随时清空重建。

## Admin 数据维护中心

在 `/admin` 页面底部可访问数据维护中心，包含四个工具：

1. **导出备份** — 从 Supabase 导出完整 JSON 备份（小纸条、DDL、课程、相册、经期）
2. **导入恢复** — 预览后 merge 模式导入（已存在的 ID 跳过，不会覆盖数据）
3. **已删除** — 查看已软删除的小纸条，支持恢复和永久删除
4. **孤儿文件** — 检查 Supabase Storage 中未被引用或缺失的文件引用

## 备份注意事项

- JSON 备份不包含任何 secret、password、VAPID key 或 Supabase key
- 本地设备状态（readState、reactions 等）不包含在备份中
- 推荐在切换设备或做危险操作前先导出一份备份

## 上线前检查清单

部署到 Vercel 前请逐项确认：

### 环境变量

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase 项目 URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase 匿名密钥
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Supabase 服务端密钥（仅服务端，不暴露）
- [ ] `ADMIN_PASSWORD` — 后台管理密码（自己设定）
- [ ] `NEXT_PUBLIC_DEFAULT_SPACE_CODE` — 默认空间码，如 `xiaoguai520`

### 可选环境变量

- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — Web Push 公钥
- [ ] `VAPID_PRIVATE_KEY` — Web Push 私钥
- [ ] `VAPID_SUBJECT` — Push 通知 subject（通常为 `mailto:you@example.com`）

### Supabase 初始化

- [ ] 执行 `supabase/schema.sql` 建表
- [ ] 创建 Storage buckets：`love-notes`、`couple-albums`、`backgrounds`（均设为 public）
- [ ] 确认 `couple_spaces` 有默认空间 `xiaoguai520`

### VAPID (Push 通知)

- [ ] 运行 `npm run generate:vapid` 生成 VAPID 密钥对
- [ ] 将公钥/私钥填入 `.env.local` 和 Vercel 环境变量

### 验证命令

```bash
npm run lint      # 代码检查
npm test          # 运行测试
npm run build     # 生产构建
npm run dev       # 本地开发
```

### 本地 fallback 行为

- [ ] 不配置任何 Supabase 环境变量时，App 可以正常打开
- [ ] 首页显示默认数据（localStorage 模式）
- [ ] 在 settings 页输入 `xiaoguai520` 连接 Supabase 后可同步

### admin 检查

- [ ] 访问 `/admin`，输入 `ADMIN_PASSWORD` 可登录
- [ ] 数据维护中心：导出备份、导入恢复、已删除纸条、孤儿文件检查 均可用
- [ ] 访问 `/debug`，诊断页面可加载
