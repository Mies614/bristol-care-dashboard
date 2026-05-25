# Bristol Care Dashboard

一个手机端优先的 Bristol 留学生活首页。默认昵称为“小乖”，支持本地 localStorage 使用，也可以开启 Supabase 云同步和远程小纸条。

## 功能

- Bristol 天气，使用 Open-Meteo，不需要 API key
- 推荐穿衣
- 课程表
- Deadline
- 下次见面倒计时
- 小纸条墙，支持双方上传文字、语音、照片和视频
- `/admin` 支持发布、置顶、停用、软删除小纸条
- 常用链接
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
NEXT_PUBLIC_DEFAULT_SPACE_CODE=BRISTOL2026
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

并插入默认 space：

```text
code = BRISTOL2026
name = Bristol Care
girlfriend_name = 小乖
```

## 创建 love-notes bucket

进入 Supabase Storage，手动创建 bucket：

```text
love-notes
```

建议设为 Public bucket。首页和小纸条墙需要直接显示图片、语音和视频，Public bucket 可以通过 public URL 加载媒体。路径格式类似：

```text
BRISTOL2026/images/1700000000000-a1b2c3d4.webp
BRISTOL2026/audio/1700000000000-a1b2c3d4.webm
BRISTOL2026/videos/1700000000000-a1b2c3d4.mp4
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

录音使用浏览器 MediaRecorder API。若当前浏览器不支持网页录音，可以上传已有音频文件。`/notes` 是免登录共享页面，拥有链接的人可以查看和上传内容，请不要公开分享链接，也不要上传特别敏感的照片、视频或语音。

## 使用 /settings 云同步

1. 打开 `/settings`。
2. 在“云同步”里输入访问码，默认 `BRISTOL2026`。
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

## 使用 /admin 发布小纸条

1. 配好 Supabase 环境变量和 `ADMIN_PASSWORD`。
2. 打开 `/admin`。
3. 输入后台密码。
4. 确认 space code，默认 `BRISTOL2026`。
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
- bucket 是否为 Public
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
- 建议 Public bucket: On
- 图片最大 30MB
- 视频最大 50MB
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
2. 系统会保存为 `video` 项目。
3. MOV / `video/quicktime` 允许上传；如果浏览器无法直接播放，可在浏览器中打开或下载查看。

删除相册项目会采用软删除：写入 `deleted_at`，首页和相册不会再显示。

Storage policy 说明：

- 相册文件上传使用浏览器端 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 直传 `couple-albums` bucket。
- `album_items` 数据库写入仍然必须走 `/api/albums`，由服务端 `SUPABASE_SERVICE_ROLE_KEY` 写入，前端不会直接写数据库。
- `/albums` 当前为免登录模式，默认使用 `NEXT_PUBLIC_DEFAULT_SPACE_CODE` 或 `BRISTOL2026`，不需要输入后台密码。
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

隐私说明：相册当前为免登录模式，拥有链接的人可以查看和上传相册内容，请不要公开分享链接，也不要上传特别敏感的照片。如果 `couple-albums` bucket 设为 Public，相册图片和视频会通过公开 URL 展示。若未来需要更私密，可以改为 private bucket + signed URL。

Vercel 部署相册功能不需要额外环境变量，只要已有 Supabase 变量正确即可。

## 隐私说明

未开启云同步时：

- 课程表、deadline、小纸条、倒数日和常用链接只保存在当前浏览器 localStorage。
- 不上传到服务器。

开启云同步后：

- 课程表、deadline、设置、小纸条、常用链接会保存到 Supabase。
- 小纸条图片、语音和视频会上传到 `love-notes` Storage bucket。
- 相册图片和视频会上传到 `couple-albums` Storage bucket。
- `SUPABASE_SERVICE_ROLE_KEY` 和 `ADMIN_PASSWORD` 不会进入浏览器 bundle。
- 小纸条墙和相册为免登录共享页面，拥有链接的人可以上传内容；数据库 metadata 仍通过 Next.js API Route Handler 写入。

## 常见问题

**图片不显示**  
检查 `love-notes` bucket 是否创建并设为 Public。

**首页没有显示最新小纸条**  
点击首页“小纸条”卡片上的“刷新小纸条”。如果修改了表结构，请在 Supabase SQL Editor 重新运行 `supabase/schema.sql`，确保 `love_notes.deleted_at` 字段存在。

**/admin 不能发布**  
检查 `ADMIN_PASSWORD`、`SUPABASE_SERVICE_ROLE_KEY` 和 Storage bucket。

**云同步失败**  
检查访问码是否为 `BRISTOL2026`，以及是否已运行 `supabase/schema.sql`。

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
