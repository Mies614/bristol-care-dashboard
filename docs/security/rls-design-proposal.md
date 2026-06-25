# RLS Design Proposal

## Current State (待生产验证)

代码仓库中未发现可追踪的 RLS policy 定义。`supabase/schema.sql` 不包含 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 或 `CREATE POLICY` 语句。生产状态需通过 `docs/security/production-rls-verification.sql` 验证。

仓库未发现可追踪的 RLS 定义，生产状态待只读 SQL 验证。

## Access Boundary Review

| 路径 | 环境 | Key 类型 | 访问方式 |
|---|---|---|---|
| `lib/supabase/server.ts` | Server-only | Service Role | 全权限 |
| `lib/supabase/client.ts` | Browser | Anon Key | 受限于 RLS + Bucket Policy |
| `lib/albumUpload.ts` | Browser (client) | Anon Key → Storage | 直接上传 Storage |
| `lib/noteUpload.ts` | Browser (client) | Anon Key → Storage | 直接上传 Storage |
| `lib/backgroundUpload.ts` | Browser (client) | Anon Key → Storage | 直接上传 Storage |
| `app/api/**` | Server | Service Role → DB | 全权限 DB 操作 |
| Components (useEffect fetch) | Browser | None (fetch → API) | 经 API 代理 |

**关键发现：**
- ✅ Service role 被 `import "server-only"` 保护，不进入 client bundle
- ✅ 浏览器不直连 Supabase DB（经 API 代理）
- ⚠️ 浏览器直连 Supabase Storage（anon key 上传至 public bucket）
- ⚠️ Public bucket 中的文件对任何人公开（有 URL 即可访问）

---

## 方案 A：维持现状 + 最小 RLS（推荐先实施）

### 描述
当前架构基本不变。添加最小 RLS 作为纵深防御。

### RLS 策略
```sql
-- 允许 anon key SELECT public 表（匹配当前 UX）
ALTER TABLE love_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON love_notes
  FOR SELECT USING (true);

-- 禁止 anon key INSERT/UPDATE/DELETE（强制经 API）
-- service role 绕过 RLS
```

### 评估
| 维度 | 评级 |
|---|---|
| 安全性 | ⭐⭐⭐ 添加纵深防御，不破坏现有功能 |
| 实施复杂度 | ⭐⭐⭐⭐⭐ 极低，仅 ALTER TABLE + CREATE POLICY |
| 是否需要新表 | 否 |
| 是否影响现有数据 | 否 |
| 小乖端体验 | 无变化 |
| 回滚 | `DROP POLICY` 即可 |

---

## 方案 B：真实认证 + JWT Claims + Full RLS

### 描述
引入 Supabase Auth，两方拥有独立账号。JWT claims 携带 `space_code` 和 `identity_role`。RLS 依据 `auth.uid()` + membership 表授权。

### 架构变化
```
Browser → Supabase Auth (magic link / OTP)
       → JWT with { space_code, role }
       → Direct Supabase DB (RLS-enforced)
       → Direct Supabase Storage (RLS-enforced)
```

### 评估
| 维度 | 评级 |
|---|---|
| 安全性 | ⭐⭐⭐⭐⭐ 真正的认证和授权 |
| 实施复杂度 | ⭐ 极高，需重写身份系统、新增 Auth UI |
| 是否需要新表 | 是（membership, profiles） |
| 是否影响现有数据 | 是，需迁移 identity 到 auth.uid() |
| 小乖端体验 | 变化大（需要登录） |
| 回滚 | 困难，涉及数据迁移 |

### 不推荐当前阶段实施
单对情侣场景下 overhead 过高。若未来多对情侣共享实例，方案 B 为必经路径。

---

## 方案 C：Admin Session Token + 渐进增强

### 描述
保持双端路径身份不变，仅为 `/me/admin` 增加 session-based auth。

### 具体措施
1. Admin login 返回 HttpOnly signed cookie（替代 plaintext password header）
2. Admin cookie 签发后 24h 有效
3. Admin API 验证 cookie 替代 `x-admin-password`
4. 添加 login 限流（内存计数或 Vercel KV）
5. 为 `/me/admin` 添加 CSRF token

### 评估
| 维度 | 评级 |
|---|---|
| 安全性 | ⭐⭐⭐⭐ 解决最大的 auth 弱点 |
| 实施复杂度 | ⭐⭐⭐ 中等，需 session/cookie 逻辑 |
| 是否需要新表 | 可选（sessions 表） |
| 是否影响现有数据 | 否 |
| 小乖端体验 | 无变化 |
| 回滚 | 较容易 |

### 推荐 Phase 2B 实施
这是安全收益/成本比最高的方案。

---

## 推荐执行顺序

```
Phase 2A (本轮): 验证生产 RLS 状态 + 安全文档
Phase 2B (下轮): 方案 A（最小 RLS）+ 方案 C（Admin session）
Phase 3+:      方案 B（真认证）—— 仅当多对情侣需求出现
```

---

## RLS 策略设计原则

无论选择哪个方案，RLS 都必须遵循：

1. `space_code` 是数据分区字段，**不是认证凭据**
2. Service role 始终绕过 RLS（用于 API routes）
3. Anon key 的权限应限制为 SELECT only for public data
4. 写入操作必须经过 API 验证
5. Storage bucket policy 应限制 object path pattern
