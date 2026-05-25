# Bristol Care Dashboard

一个手机端优先的 Bristol 留学生活首页。默认昵称为“小乖”，支持本地 localStorage 使用，也可以开启 Supabase 云同步和远程小纸条。

## 功能

- Bristol 天气，使用 Open-Meteo，不需要 API key
- 推荐穿衣
- 课程表
- Deadline
- 下次见面倒计时
- 小纸条，支持远程发布文字和图片
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

并插入默认 space：

```text
code = BRISTOL2026
name = Bristol Care
girlfriend_name = 小乖
```

## 创建图片 bucket

进入 Supabase Storage，手动创建 bucket：

```text
love-notes
```

建议设为 Public bucket。首页需要直接显示小纸条图片，Public bucket 可以通过 public URL 加载图片。图片上传路径格式类似：

```text
BRISTOL2026/1700000000000-a1b2c3d4.webp
```

不要使用原始文件名。应用限制：

- 只允许 `image/jpeg`、`image/png`、`image/webp`
- 最大 5MB
- 图片上传必须走服务端 `/api/admin/love-notes`

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

最近 20 条小纸条支持：

- 设为置顶 / 取消置顶
- 停用 / 重新启用
- 删除

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

## 隐私说明

未开启云同步时：

- 课程表、deadline、小纸条、倒数日和常用链接只保存在当前浏览器 localStorage。
- 不上传到服务器。

开启云同步后：

- 课程表、deadline、设置、小纸条、常用链接会保存到 Supabase。
- 小纸条图片会上传到 Supabase Storage。
- `SUPABASE_SERVICE_ROLE_KEY` 和 `ADMIN_PASSWORD` 不会进入浏览器 bundle。
- 前端写入云端数据通过本项目的 Next.js API Route Handler 完成。

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
