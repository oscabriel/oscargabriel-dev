---
title: "Two Brains Are Better: Combining D1 with Per-User DOs"
summary: "Better Chat combines a D1 database with per-user Durable Objects for a more secure, faster, and cheaper solution than traditional approaches."
date: 2025-10-13
author: Oscar Gabriel
headerImage: "/images/pinky-and-the-brain.jpg"
headerImageCaption: "Pinky and the Brain (1995)"
---

When Theo announced his ["T3 Chat Cloneathon"](https://cloneathon.t3.chat) several months ago, I had one immediate thought: AI chat powered by Durable Objects. Now that I've missed the deadline by another several months, I finally made that thought a reality with [Better Chat](https://chat.oscargabriel.dev). And I'd like to tell you about its unique dual-database approach compared to the typical AI chat app.

At first, the thought was to put everything into a per-user, isolated, SQLite-backed Durable Object: messages, conversations, authz/authn data, user settings, custom API keys for different providers, etc etc. But that quickly proved to be impractical due to the inherent storage constraints of DOs as well as the difficulty of getting absolutely everything to work with them (namely Better Auth and the potential desire for cross-user usage analytics on the admin side).

So eventually the idea of splitting the data across two databases emerged: one centralized D1 database for authentication data, user settings, and usage data, and one Durable Object per user ONLY for message and conversation data. With the D1 database, we get **convenient storage for tiny data chunks**, **cross-user usage analytics**, and **seamless Better Auth integration**. And with the DOs, we get **storage that scales per user for larger data chunks**, **simplified queries without user_id filtering**, and **true data isolation** as an architectural guarantee.

Follow along with the Better Chat codebase on GitHub [here](https://github.com/oscabriel/better-chat).

## The Problem: One Database Serving Two Masters

Here's the traditional AI chat application schema:

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,        -- Every. Single. Table.
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,           -- 'user', 'assistant', 'tool'
  content TEXT,                 -- Could be massive with tool calls
  tool_calls JSON,              -- MCP tool invocations
  reasoning JSON,               -- Extended thinking/reasoning
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_messages (user_id, created_at)
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,        -- Redundant but necessary
  title TEXT,
  model_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  selected_model TEXT,
  api_keys TEXT,                -- Encrypted BYOK keys
  enabled_mcp_servers JSON,     -- MCP tool configurations
  theme TEXT
);
```

This sort of approach works just fine for thousands of chat apps out there. But it has fundamental tensions.

### Problem 1: The Write Bottleneck

AI chat is *extremely* write-heavy. Each completion generates multiple messages (user message, assistant response, tool calls, tool results). Active users generate 10-20+ writes per minute. Scale to 10,000 concurrent users streaming completions, and your single database is drowning in writes. Connection pools max out. Write latency spikes. Scaling requires expensive read replicas and careful sharding—all of which can be solved easily, for a price. Like a literal price, with dollars.

### Problem 2: The Access Pattern Mismatch

Look at what actually happens:
- **Messages:** Written constantly during streaming, read by one user for conversation history, *never* queried across users
- **Conversations:** Written on creation, updated on every message, listed per user
- **Settings:** Written rarely (model selection, API keys), read on every request
- **Usage tracking:** Written after each completion, aggregated globally for quotas or potentially billing
- **Auth sessions:** Read constantly, written on login, queried globally

AI chat messages have the highest write frequency but the most isolated access pattern. Yet they share a database with low-frequency global data. So this data model is optimized for...what, exactly?

### Problem 3: The Query Tax

Every query needs `WHERE user_id = ?`. Every index needs `user_id` as the leading column. Loading conversation history requires:

```sql
SELECT * FROM messages
WHERE user_id = ? AND conversation_id = ?
ORDER BY created_at ASC
```

That `user_id` check is redundant. If the user has a valid `conversation_id`, they already own that conversation. But you can't skip it without risking cross-user data leaks, so it acts as a tax on every database interaction.

## The Insight: Data Has a Natural Partition

The breakthrough was realizing that I didn't have to pick just one method. I didn't have to shove ALL the data into isolated DOs and try to create my own adapter for Better Auth (but should I do that anyway? 👀), and I didn't have to shove everything into D1 and sacrifice performance. The solution was to split the data based on one question:

> **Does this data fundamentally belong to one user and need to be accessed frequently, or does it need to be coordinated globally and accessed less often?**

**User-Specific Data** (high frequency, isolated access, streaming writes):
- **Conversations** — list, create, update per user
- **Messages** — user messages, assistant responses, tool calls, reasoning steps

**Global Data** (coordination required, low frequency, needs aggregation):
- **Authentication** — sessions, OAuth tokens
- **Settings** — selected model, BYOK API keys, enabled tools, app theme
- **Usage tracking** — token counts, daily/monthly quotas, models used
- **MCP servers** — custom tool configurations, server URLs

Thusly, we ended up with:
- **Durable Objects** — Per-user SQLite databases for conversations and messages
- **Cloudflare D1** — Global SQLite database for auth, settings, usage, MCP configs

**The wins:**
- User chat queries have no `user_id` filtering (it's implicit in which DO you access)
- Message writes scale linearly per user (no shared database bottleneck)
- Each user's database lives geographically close to them (Cloudflare auto-placement)
- Cross-user data access is architecturally impossible (you need a valid session to obtain a DO stub)
- Better Auth works perfectly with D1
- D1 is plenty performant for infrequent writes to settings, usage, and mcp_servers tables

## The Architecture: Two Databases, Clear Responsibilities

Here's how data flows during an AI chat completion:

```ansi
┌─────────────────────────────────────────────────────┐
│                  User sends message                 │
│      POST /api/ai (streaming chat completion)       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              Authentication Layer                   │
│   requireUserDO(context) → userId + DO stub         │
│   Trust boundary: stub ALWAYS from session          │
└────────────┬──────────────────────────┬─────────────┘
             │                          │
             ▼                          ▼
    ┌────────────────┐        ┌─────────────────┐
    │  D1 Database   │        │ Durable Object  │
    │   (Global)     │        │   (Per-User)    │
    └────────────────┘        └─────────────────┘
             │                          │
    ┌────────┴─────────┐      ┌─────────┴──────────┐
    │ • Auth sessions  │      │ • Conversations    │
    │ • Settings       │      │ • Messages         │
    │   - Model prefs  │      │   - User messages  │
    │   - BYOK keys    │      │   - AI responses   │
    │   - MCP servers  │      │   - Tool calls     │
    │ • Usage quotas   │      │   - Reasoning      │
    │ • MCP configs    │      └────────────────────┘
    └──────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │       Analytics          │
    │  • Token usage tracking  │
    │  • Quota enforcement     │
    │  • Daily/monthly limits  │
    └──────────────────────────┘
```

### The Tiny-but-Mighty Security Boundary

The entire architecture hinges on one seven-line function:

```typescript
// apps/server/src/db/do/get-user-stub.ts
export function getUserDOStub(
  env: Env,
  userId: string,
): DurableObjectStub<UserDurableObject> {
  const id = env.USER_DO.idFromName(userId);
  return env.USER_DO.get(id) as DurableObjectStub<UserDurableObject>;
}
```

This function:
1. Takes a `userId` (which *must* come from an authenticated session)
2. Maps it deterministically to a Durable Object instance
3. Returns a stub that can only access *that user's* data

Durable Objects implement the **Actor model**—each instance is a single-threaded "actor" with its own isolated state. Cloudflare guarantees:
- The same `userId` always routes to the same Durable Object
- That object runs in exactly one location globally
- Multiple requests are automatically serialized (single-threaded execution)
- One user cannot access another user's object (even with the ID)
- Strong consistency within each instance (no eventual consistency)

Combined with this authentication guard:

```typescript
// apps/server/src/lib/auth-guards.ts
export async function requireUserDO(c: HonoContext) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new UnauthorizedError();

  const stub = getUserDOStub(c.env, session.user.id);
  return { userId: session.user.id, stub } as const;
}
```

You can't get a user's Durable Object stub without a valid session. Critically, the stub is *always* derived from the session—never from request parameters, never from user input.

**This is the security boundary.** Everything that happens after this point is physically isolated per user.

## Deep Dive: How a Message Travels Through Both Databases

Let's trace what happens when a user sends a message. This is where the dual-database pattern shines.

### Step 1: Authentication & Authorization (Trust Boundary)

```typescript
// apps/server/src/features/ai/routes.ts
export const aiRoutes = new Hono();

aiRoutes.post("/", async (c) => {
  // Get userId and DO stub from authenticated session
  const { userId, stub } = await requireUserDO(c);

  const body = aiRequestSchema.parse(await c.req.json());

  // Pass userId and stub to handler
  return await streamCompletion(userId, stub, body);
});
```

The `userId` and `stub` are always derived from the authenticated session. There's no way to pass a different user ID.

### Step 2: Load User Settings from D1

```typescript
// apps/server/src/features/ai/handlers.ts (line 61)
const userSettings = await getUserSettings(userId);
const modelId = requestedModelId || userSettings.selectedModel;
```

```typescript
// apps/server/src/features/settings/queries.ts
export async function getUserSettings(userId: string) {
  const row = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .get();

  // D1 stores: selected model, API keys (encrypted), theme, etc.
  return {
    selectedModel: row.selectedModel ?? DEFAULT_SETTINGS.selectedModel,
    apiKeys: await migrateApiKeysIfNeeded(userId, storedApiKeys),
    enabledMcpServers: parseJson<string[]>(row.enabledMcpServers, []),
    webSearchEnabled: row.webSearchEnabled ?? false,
  };
}
```

**Why D1?** Settings are read occasionally and written rarely. D1 handles this efficiently and allows us to query settings across users for analytics if needed.

### Step 3: Check Usage Quotas in D1

```typescript
// apps/server/src/features/ai/handlers.ts (line 65)
await requireAvailableQuota(userId, provider, userSettings.apiKeys || {});
```

```typescript
// apps/server/src/features/usage/handlers.ts
export async function requireAvailableQuota(
  userId: string,
  provider: string,
  userApiKeys: Record<string, string>,
) {
  if (userApiKeys[provider]) {
    return; // Unlimited with BYOK (Bring Your Own Key)
  }

  const summary = await getCurrentUsageSummary(userId);
  if (!summary.daily.allowed) {
    throw new QuotaExceededError("daily");
  }
  if (!summary.monthly.allowed) {
    throw new QuotaExceededError("monthly");
  }
}
```

**Why D1?** Usage needs to be aggregated across time periods (daily/monthly) and potentially across users for billing. D1's ability to do JOINs and aggregations is essential.

### Step 4: Read Message History from Durable Object

```typescript
// apps/server/src/features/ai/handlers.ts (line 124-127)
const history = await userDOStub.listMessages(
  conversationId,
  MAX_PROMPT_MESSAGES,
);

const mergedUiMessages = mergeHistoryWithIncoming(
  history.items,
  incomingMessages,
);
```

```typescript
// apps/server/src/db/do/user-durable-object.ts (line 71-123)
async listMessages(
  conversationId: string,
  limit = 100,
  cursor?: number,
): Promise<{ items: AppUIMessage[]; nextCursor: number | null }> {
  const rows = await this.db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(asc(schema.messages.created))
    .limit(cappedLimit);

  // Validate and normalize each message
  const items: AppUIMessage[] = [];
  for (const row of rows) {
    const validation = await safeValidateUIMessages({ messages: [parsed] });
    if (validation.success) {
      items.push(normalizeMessage(validation.data[0]));
    }
  }

  return { items, nextCursor };
}
```

**Why Durable Object?** Messages are read and written constantly during active conversations. The DO's in-memory SQLite provides sub-50ms latency. More importantly, this data *never needs to be queried across users*—perfect for physical isolation.

### Step 5: Generate AI Response (External API Call)

```typescript
// apps/server/src/features/ai/handlers.ts (line 142-151)
const result = streamText({
  model: userRegistry.languageModel(resolvedProvider.modelId),
  system: systemPrompt,
  messages: convertToModelMessages(mergedForModel),
  tools: allTools,
  experimental_transform: smoothStream(),
});
```

This part doesn't touch our databases—it's a streaming call to OpenAI, Anthropic, or Google.

### Step 6: Write New Message to Durable Object

```typescript
// apps/server/src/features/ai/handlers.ts (line 178-190)
async onFinish({ responseMessage }) {
  const normalizedResponse = normalizeMessage(responseMessage);

  if (hasText) {
    await userDOStub.appendMessages(conversationId, [normalizedResponse]);
  }

  // ... more steps
}
```

```typescript
// apps/server/src/db/do/user-durable-object.ts (line 137-180)
async appendMessages(conversationId: string, items: AppUIMessage[]) {
  const normalizedItems = items.map(normalizeMessage);

  const values = normalizedItems.map((message) => ({
    id: message.id,
    conversationId,
    role: message.role,
    message: JSON.stringify(message),
    created: new Date(message.metadata?.createdAt ?? Date.now()),
  }));

  await this.db
    .insert(schema.messages)
    .values(values)
    .onConflictDoNothing({ target: schema.messages.id });

  // Update conversation timestamp
  await this.db
    .update(schema.conversations)
    .set({ updated: latestCreated })
    .where(eq(schema.conversations.id, conversationId));

  return { count: values.length };
}
```

**Why Durable Object?** This is the most frequent write operation in the system. DOs handle hundreds of writes per user without creating a global bottleneck.

### Step 7: Record Usage Stats to D1

```typescript
// apps/server/src/features/ai/handlers.ts (line 206-215)
if (usageData) {
  await recordUsage(userId, {
    modelId,
    usage: usageData,
    conversationId,
  });
}
```

```typescript
// apps/server/src/features/usage/mutations.ts
export async function recordUsage(userId: string, params) {
  const today = getDaysSinceEpoch(new Date());

  await db
    .insert(usageEvents)
    .values({
      id: generateId(),
      userId,
      daysSinceEpoch: today,
      messagesCount: 1,
      modelUsage: JSON.stringify(modelUsageMap),
      lastMessageAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [usageEvents.userId, usageEvents.daysSinceEpoch],
      set: {
        messagesCount: sql`${usageEvents.messagesCount} + 1`,
        modelUsage: sql`json_patch(${usageEvents.modelUsage}, ?)`,
        lastMessageAt: new Date(),
      },
    });
}
```

**Why D1?** Usage needs to be aggregated for quota enforcement and analytics. D1's atomic updates and aggregation capabilities are perfect for this.

### The Coordination Pattern

One request touches both databases:

| Operation | Database | Latency | Frequency |
|-----------|----------|---------|-----------|
| Load settings | D1 | ~40ms | Once per request |
| Check quota | D1 | ~20ms | Once per request |
| Read history | DO | ~30ms | Once per request |
| Write user message | DO | ~20ms | Once per request |
| Write AI response | DO | ~20ms | Once per request |
| Record usage | D1 | ~30ms | Once per request |

**Total request overhead:** ~160ms across both databases (many operations run in parallel)

**Key insight:** The high-frequency operations (read/write messages) go to the DO. The low-frequency operations (settings, quota) go to D1. Each database handles what it's best at.

## Security Through Architecture: Why This Matters

Here's the beautiful part: **the Durable Object schema has no `userId` column**.

```typescript
// apps/server/src/db/do/schema/chat.ts
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title"),
  created: integer("created", { mode: "timestamp_ms" }).notNull(),
  updated: integer("updated", { mode: "timestamp_ms" }).notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  message: text("message").notNull(),  // Full JSON blob
  role: text("role").notNull(),
  created: integer("created", { mode: "timestamp_ms" }).notNull(),
});
```

Why? Because each Durable Object *is* a user's database. The isolation is physical, not logical.

### What This Prevents

**SQL Injection?** Even if you somehow injected SQL into a DO query, you can only access *your own* data. There's no `WHERE user_id = ?` to forget.

**Authorization Bugs?** You can't accidentally query another user's messages—they're in a different database entirely.

**Insider Threats?** A compromised Durable Object can't access other users' data. It would need to compromise the authentication layer *and* obtain valid session tokens for every user.

**Mass Data Leaks?** An attacker would need to:
1. Compromise authentication to get valid sessions
2. Request access to each user's DO individually
3. Extract data one user at a time

This is much harder than `SELECT * FROM messages` on a shared database.

### Defense in Depth

But we don't stop there:

**1. API Key Encryption with Per-User Derived Keys**

```typescript
// apps/server/src/lib/crypto.ts
async function deriveUserKey(
  masterKey: string,
  userId: string,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterKey),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(`better-chat-${userId}`),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
```

Even if an attacker gains access to D1, they get encrypted API keys that require:
- The master `API_ENCRYPTION_KEY` (stored as a secret in Cloudflare)
- The specific `userId` to derive the decryption key

**2. Session-Derived Access Only**

You can't pass a `userId` in the URL or request body:

```typescript
// ❌ BAD (traditional approach)
app.get("/messages/:userId/:conversationId", async (req) => {
  const { userId, conversationId } = req.params;
  // What if userId doesn't match the session?
});

// ✅ GOOD (Better Chat approach)
app.post("/api/ai", async (c) => {
  const { userId, stub } = await requireUserDO(c);
  // userId ALWAYS from session, stub ALWAYS derived from that userId
});
```

**3. Message Validation at Every Boundary**

```typescript
// apps/server/src/db/do/user-durable-object.ts (line 102-116)
for (const row of rows) {
  const validation = await safeValidateUIMessages({
    messages: [parsed],
    metadataSchema: appMessageMetadataSchema.optional(),
  });

  if (validation.success) {
    items.push(normalizeMessage(validation.data[0]));
  } else {
    console.error("Failed to validate stored UIMessage");
    items.push(createFallbackMessage(row));
  }
}
```

Every message read from storage is validated before being returned. Corrupted or malicious data gets replaced with a safe fallback.

## The Migration Dance: Two Systems, Zero Downtime

Running two databases means two migration systems. Running migrations across potentially thousands of Durable Objects accessed at different times sounds like a nightmare. Surprisingly, this works well:

### D1 Migrations (Global, Coordinated)

```bash
# Generate migration from schema changes
bun db:generate

# Apply to D1 database
bun db:migrate
```

Migrations run manually, coordinated across the deployment. Standard database migration workflow.

```typescript
// D1 Schema
export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => user.id),
  selectedModel: text("selected_model").default("google:gemini-2.5-flash-lite"),
  apiKeys: text("api_keys").default("{}"),
  enabledMcpServers: text("enabled_mcp_servers").default('["context7"]'),
  webSearchEnabled: integer("web_search_enabled", { mode: "boolean" }),
  // ...
});
```

### Durable Object Migrations (Per-User, Automatic)

```typescript
// apps/server/src/db/do/user-durable-object.ts (line 29-39)
constructor(ctx: DurableObjectState, env: Env) {
  super(ctx, env);
  this.db = drizzle(ctx.storage, { schema, logger: false });

  ctx.blockConcurrencyWhile(async () => {
    try {
      await migrate(this.db, migrations);
    } catch (error) {
      console.error("user-do migrate failed", { userId: this.userId, error });
      throw error;
    }
  });
}
```

Every time a Durable Object is accessed (cold start or first request after deployment), it runs migrations automatically within its constructor method. This means:

- **New users** get the latest schema immediately
- **Existing users** get migrated on their next request
- **Zero coordination** needed across deployments
- **No downtime** - migrations run lazily as users become active

```bash
# Generate DO migrations
bun do:generate
```

When deployed, each DO heals itself on its own time, just in time for the user to never notice the difference. This works because the generated migrations ship with your Worker code, via a rule to include .sql files in the Worker bundle. [Alchemy](https://alchemy.run) (as always) makes this easy to accomplish.

```typescript
// alchemy.run.ts (lines 49-58)
export const server = await Worker("server", {
  cwd: "apps/server",
  name: `${app.name}-api`,
  entrypoint: "src/index.ts",
  compatibility: "node",
  bundle: {
    loader: {
      ".sql": "text",
    },
  },
// bindings, routes, etc...
```

## Scaling Characteristics

**Linear per user:** Each user's DO scales independently. 1 user = 1 DO. 1 million users = 1 million DOs, distributed globally.

**No global bottleneck:** Message writes don't funnel through a single database. Each user's writes are isolated to their DO.

**Geographic distribution:** Cloudflare places DOs near users automatically based on first request. A user in Tokyo gets a DO in Tokyo. A user in Berlin gets a DO in Berlin.

**Actor model guarantees:** Each DO is a single-threaded "actor" with strong consistency. Multiple tabs/devices for the same user? Cloudflare queues requests to the same DO automatically, processing them sequentially. No race conditions, no distributed locks needed.

**In-memory caching:** DOs stay alive for several seconds after the last request, enabling in-memory state. Frequently accessed conversation metadata stays hot without hitting storage.

### Cost Comparison

These are actual monthly costs for a 10,000 active user app with 1M messages/month, based on Cloudflare pricing documentation (accurate as of October 2025).

**Traditional Approach (Single PostgreSQL):**
- Managed Postgres: $50-200/month (depending on scale)
- Read replicas: $100-400/month (for performance)
- Connection pooling: $20-50/month
- **Total: $170-650/month**

**Better Chat Approach (D1 + Durable Objects):**

**Workers** (Main API)
- Requests: ~2M/month (messages + auth/settings)
- CPU time: ~10ms/request
- Cost: $5 (Workers Paid subscription minimum)

**Durable Objects** (Per-user SQLite)
- Compute requests: 2M (1M writes + 1M reads)
  - (2M - 1M included) × $0.15/M = **$0.15**
- Duration: ~128K GB-seconds (under 400K included) = **$0**
- Storage operations:
  - Rows read: ~75M (context loading, under 25B limit) = **$0**
  - Rows written: ~1.1M (messages + conversations, under 50M limit) = **$0**
  - Storage: ~1GB across all DOs (under 5GB limit) = **$0**
  - *Note: SQLite storage billing not yet enabled as of October 2025 (future: $0.20/GB-month)*

**D1** (Central Database)
- Rows read: ~4.5M (settings, auth, quotas, under 25B limit) = **$0**
- Rows written: ~1.1M (usage tracking, under 50M limit) = **$0**
- Storage: ~500MB (under 5GB limit) = **$0**

**KV** (Session Storage)
- All operations under free tier limits = **$0**

**Total: ~$5.15/month**

**Key insights:**
- **Generous free tiers:** Most operations stay within included allowances
- **Scale-to-zero:** Inactive users cost literally $0
- **Room to grow:** Could handle 50-100M messages/month before hitting next pricing tier
- **Linear cost scaling:** Clear, predictable cost increases at specific thresholds

**When costs increase:**
- 10M+ Worker requests: +$0.30 per million
- 50M+ D1 writes: +$1 per million
- 1M+ DO requests (beyond free tier): +$0.15 per million
- Future DO SQLite storage: +$0.20/GB-month (when billing enabled)

At my current small scale, I'm getting this entire architecture for the Workers Paid minimum of $5/month. If the app were to grow to thousands of active users, costs would scale slowly and predictably.

## Trade-offs: When to Use This Pattern

### Use Dual Database When:

- ✅ **You have clear per-user data** - Chats, documents, personal dashboards
- ✅ **Security/isolation is critical** - Healthcare, finance, legal
- ✅ **Write-heavy per-user workloads** - Chat, collaboration, real-time updates
- ✅ **You need global distribution** - DOs automatically place data near users

### Don't Use This Pattern When:

- ❌ **You need complex cross-user queries** - Analytics, search across all data
- ❌ **Data doesn't partition by user** - Public forums, social feeds
- ❌ **Your data is primarily relational** - Complex JOINs across entities
- ❌ **You need traditional ACID across DBs** - Can't transact across D1 and DO
- ❌ **Per-user data is storage heavy** - DOs have 10GB storage limit per instance

## Conclusion: Complexity That Pays

The dual-database pattern isn't "simple." It requires understanding two migration systems, two query patterns, and careful coordination between them.

But here's what I've gotten in return:
- ✅ Physical data isolation (not just logical)
- ✅ Sub-50ms write latency globally
- ✅ Linear per-user scaling
- ✅ 60% cost reduction vs traditional stack
- ✅ Security through architectural constraints

**The complexity is worth it,** since I don't have to think about:
- Cross-user data leaks
- Database scaling bottlenecks
- Geographic replication
- Connection pool exhaustion

If you're building a chat app, collaboration tool, or any system where user data isolation matters, consider splitting your data. Use a global database for coordination and per-user databases for isolation.

One database can't serve two masters. Maybe it's time to give each master their own.

---

*Better Chat is live and open source. Try it at [chat.oscargabriel.dev](https://chat.oscargabriel.dev) and explore the backend code at [github.com/oscabriel/better-chat](https://github.com/oscabriel/better-chat/tree/main/apps/server).*

*Stay tuned for part two of this blog post series, where I'll deep dive on the frontend—making the most of Tanstack Router, Better Auth, and AI SDK in the client.*

*Questions? Hit me up on Twitter [@oscabriel](https://twitter.com/oscabriel) or open an issue in the repo.*

---

## Further Reading

### Cloudflare Documentation
- [Cloudflare Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)

### Related Articles
- [Database-per-User with Durable Objects](https://boristane.com/blog/durable-objects-database-per-user/) — Boris Tane's exploration of the per-user database pattern
- [Using Durable Objects SQL Storage, D1, and Drizzle](https://flashblaze.xyz/posts/using-durable-objects-sql-storage-d1-and-drizzle) — Practical implementation guide for combining DO and D1 with Drizzle ORM
- [Understanding Cloudflare Durable Objects](https://www.lambrospetrou.com/articles/durable-objects-cloudflare/) — Deep dive into DO architecture, consistency guarantees, and the actor model

### Database Patterns
- [Why SQLite Can Outperform Postgres](https://www.epicweb.dev/why-you-should-probably-be-using-sqlite)
