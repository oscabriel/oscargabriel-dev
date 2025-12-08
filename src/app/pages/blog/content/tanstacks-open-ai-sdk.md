---
title: TanStack's Open. AI. SDK.
summary: TanStack AI takes the headless, vendor-agnostic philosophy that made TanStack famous and applies it to AI development. Here's how it compares to Vercel's AI SDK.
date: 2025-12-06
author: Oscar Gabriel
headerImage: /images/lilo-and-stitch.jpg
headerImageCaption: Me building my first chat app with Tanstack AI — Lilo and Stitch (2002)
---

The Eye of TanStack just veered over into the AI SDK space.

If you've used any of their [libraries](https://tanstack.com/#libraries) before, then you know what to expect: headless primitives, relentless type-first design, framework flexibility, and APIs that feel like they were designed by people who actually build apps. Tanner and his growing team of maintainers and contributors have spent years earning developer trust by shipping tools that work everywhere and stand the test of time.

Now they're applying that philosophy to building AI-powered apps. [TanStack AI](https://tanstack.com/ai) launched this week in alpha, and it's already showing what happens when you build an AI SDK without platform assumptions baked in.

I used Vercel's [AI SDK](https://ai-sdk.dev) extensively when I built [Better Chat](https://chat.oscargabriel.dev). It's an excellent tool, but I have my reasons for being excited to see a real competitor emerge. So I read everything I could find about TanStack AI, and then dug into both codebases. I even made use of my newest codebase analysis tool that I built for the recent Tanstack Start hackathon hosted by Convex, called [offworld.sh](https://offworld.sh/tanstack/ai).

This is what I learned along the way.

## AI the Tan Way

The architecture splits into discrete, composable layers.

```ansi
@tanstack/ai          → Core: chat(), tools, adapters, streaming
@tanstack/ai-client   → Headless client: ChatClient, connection adapters
@tanstack/ai-react    → React bindings: useChat() hook
@tanstack/ai-solid    → Solid bindings
@tanstack/ai-vue      → Vue bindings
```

Each layer is independent. The core SDK works with any HTTP framework. The client works without React. The framework bindings are thin wrappers over a shared `ChatClient` rather than specific, locked-in dependencies.

Under the hood, several key components orchestrate the AI interactions:

- **AI Interaction Core** — The primary entry point (`chat()`, `AIChatCompletion`) that handles all AI functionalities
- **Tool Call Manager** — Interprets tool call instructions from the model and orchestrates execution via `executeToolCalls`
- **AI Event Client** — Enables decoupled, event-driven communication between modules without tight coupling
- **Streaming Response Handler** — Ensures real-time feedback from AI models with configurable chunking strategies
- **AI Provider Adapters** — Provider-agnostic integration layer for just OpenAI, Anthropic, Gemini, and Ollama (for now)

The data flow is clean.

```ansi
User Request → AI Interaction Core → Tool Call Manager → Provider Adapters → AI Service
                    ↓                      ↓
              Streaming Response    Execute Tool Calls
                  Handler                  ↓
                    ↓              Content Type Handling
              AI Event Client
```

This decoupled, reactive architecture means you can subscribe to events, swap providers, customize streaming behavior, and handle multimodal content, all without touching other parts of the system.

## What Makes It Different

### Type-First Design

The Vercel AI SDK uses flexible typing for provider options to enable rapid iteration on provider-specific features. The tradeoff is that you can pass options that don't apply to the model you're using, and TypeScript won't catch it. TanStack makes the opposite tradeoff, prioritizing *per-model* type safety. Zero runtime overhead since it's all erased at compile time.

The `BaseAdapter` class uses 7 type parameters.

```typescript
export abstract class BaseAdapter<
  TChatModels extends ReadonlyArray<string>,
  TEmbeddingModels extends ReadonlyArray<string>,
  TChatProviderOptions extends Record<string, any>,
  TEmbeddingProviderOptions extends Record<string, any>,
  TModelProviderOptionsByName extends Record<string, any>,
  TModelInputModalitiesByName extends Record<string, ReadonlyArray<Modality>>,
  TMessageMetadataByModality
>
```

When you select `gpt-4o`, TypeScript knows exactly what provider options are valid for that model, which modalities it supports (text, image, audio), and what metadata each content type accepts. Pass an option that `gpt-4-turbo` doesn't support, and you get a useful compile error.

### Isomorphic Tool Definitions

```typescript
const weatherTool = toolDefinition({
  name: 'getWeather',
  description: 'Get current weather',
  needsApproval: true,
  inputSchema: z.object({ location: z.string() }),
  outputSchema: z.object({ temp: z.number() }),
})

// Server-side execution
const serverWeather = weatherTool.server(async ({ location }) => {
  return await weatherAPI.get(location)
})

// Client-side execution
const clientWeather = weatherTool.client(async ({ location }) => {
  return await fetch(`/api/weather?loc=${location}`).then(r => r.json())
})
```

In Vercel's AI SDK, you typically define tools separately for each context where they're used. TanStack's `.server()` / `.client()` pattern lets you define a tool once and spawn different implementations from it: same name, same schemas, different execution contexts.

### Built-in Approval Workflows

Both SDKs support tool approval workflows. But TanStack's is baked into the state machine.

```typescript
const deleteUser = toolDefinition({
  name: 'deleteUser',
  needsApproval: true, // Pauses for human confirmation
  inputSchema: z.object({ userId: z.string() }),
})
```

The system emits `approval-requested` events, the `StreamProcessor` transitions to a paused state, and execution only continues after explicit approval. The entire flow is orchestrated by the engine, from tool call detection through approval handling to execution resumption, rather than implemented by you.

### Multi-Language Backends

This is undersold in TanStack's marketing. They ship Python and PHP packages that speak the same streaming protocol.

**Python (FastAPI):**
```python
from tanstack_ai import StreamChunkConverter, format_sse_chunk

converter = StreamChunkConverter(provider="anthropic")

@app.post("/api/chat")
async def chat(request: ChatRequest):
    async def generate():
        async with anthropic.messages.stream(...) as stream:
            async for event in stream:
                chunks = await converter.convert_event(event)
                for chunk in chunks:
                    yield format_sse_chunk(chunk)

    return StreamingResponse(generate(), media_type="text/event-stream")
```

**PHP (Laravel):**
```php
use TanStack\AI\StreamChunkConverter;

Route::post('/api/chat', function (Request $request) {
    return response()->stream(function () use ($request) {
        $converter = new StreamChunkConverter('openai');

        foreach ($openai->chat->stream(...) as $event) {
            foreach ($converter->convertEvent($event) as $chunk) {
                echo "data: " . json_encode($chunk) . "\n\n";
                ob_flush();
                flush();
            }
        }
    }, 200, ['Content-Type' => 'text/event-stream']);
});
```

Your frontend uses `@tanstack/ai-client`. Your backend can be Python, PHP, or TypeScript. Same chunk format, same tool execution flow, different languages.

The Vercel AI SDK is TypeScript-only on the server. Not huge for me specifically as a now-dedicated TypeScript guy, but if your team has a Python ML backend or a Laravel/WordPress stack, TanStack's got you covered.

### Streaming UX Control

Nobody's talking about this, but it matters for user experience.

The `StreamProcessor` supports configurable chunking strategies that control how text updates reach your UI.

```typescript
import {
  PunctuationStrategy,
  WordBoundaryStrategy,
  CompositeStrategy
} from '@tanstack/ai'

const processor = new StreamProcessor({
  chunkingStrategy: new CompositeStrategy([
    new PunctuationStrategy(),      // Buffer until sentence ends
    new WordBoundaryStrategy(),     // Never split mid-word
  ])
})
```

- `ImmediateStrategy` — every token, as fast as possible
- `PunctuationStrategy` — buffer until sentence boundaries
- `WordBoundaryStrategy` — never split mid-word
- `BatchStrategy` — every N tokens
- `CompositeStrategy` — combine multiple strategies

This solves the "streaming feels janky" problem at the SDK level. No more characters appearing mid-word or sentences breaking at awkward points. The Vercel SDK handles this at the transport level; TanStack gives you explicit control. I also got confused initially when trying to implement actually [smooth streaming](https://twitter.com/oscabriel/status/1976494486906896453) with the Vercel SDK, but TanStack's SDK makes it easy to control the streaming behavior.

### Deep Devtools Integration

The devtools story goes beyond basic inspection. TanStack AI emits 35+ distinct event types, and the devtools consume them all:

- **Chunk-level inspection** — See raw streaming chunks, with consecutive chunks of the same type consolidated for readability
- **Tool lifecycle tracking** — Follow a tool call from detection through approval through execution
- **Token usage per message** — Cumulative and delta token counts
- **Conversation replay** — Full session recording and playback
- **Embedding and summarization tracking** — Not just chat, but all AI operations

```typescript
import { aiEventClient } from '@tanstack/ai'

aiEventClient.on('tanstack-ai-devtools:tool:approval-requested', (event) => {
  console.log(`Tool ${event.payload.toolName} awaiting approval`)
})

aiEventClient.on('tanstack-ai-devtools:stream:chunk:thinking', (event) => {
  console.log(`Model reasoning: ${event.payload.content}`)
})
```

Observability is baked into the architecture. Every significant operation emits events. Subscribe to what you need; pipe it to your analytics, your error tracker, or the TanStack devtools panel. Vercel's SDK uses OpenTelemetry for observability, which integrates with standard tracing tools but requires external infrastructure. TanStack's approach is more granular and ships with dedicated devtools out of the box.

### Connection Adapter Extensibility

The `ConnectionAdapter` interface is intentionally minimal.

```typescript
interface ConnectionAdapter {
  connect(
    messages: Array<UIMessage> | Array<ModelMessage>,
    data?: Record<string, any>,
    abortSignal?: AbortSignal,
  ): AsyncIterable<StreamChunk>
}
```

TanStack ships four adapters out of the box:

1. **`fetchServerSentEvents`** — Standard SSE
2. **`fetchHttpStream`** — Newline-delimited JSON over HTTP
3. **`stream()`** — Direct async iterable (for TanStack Start server functions)
4. **`rpcStream()`** — WebSocket/RPC transport

You can also build your own adapters. The protocol is just async iterables of `StreamChunk`. This matters more than it might seem.

When I built [Better Chat](https://chat.oscargabriel.dev) with Vercel's AI SDK and Cloudflare Durable Objects, I had to route everything through HTTP.

```ansi
Client → HTTP POST → Worker → saves msg → Durable Object
                         ↓
                   streamText() → LLM
                         ↓
Client ← SSE stream ← Worker ← onFinish: save response → DO
```

The Worker acts as an intermediary for every message. The DO is just storage.

```typescript
// Client: HTTP streaming to a worker endpoint
const { messages, sendMessage } = useChat({
  api: '/api/ai',
  body: { conversationId },
})

// Worker: receives HTTP, coordinates with DO, streams from LLM
app.post('/api/ai', async (c) => {
  const { messages, conversationId } = await c.req.json()
  const db = getUserDOStub(c.env, userId)

  await db.appendMessages(conversationId, userMessage)

  const result = streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    onFinish: async ({ response }) => {
      await db.appendMessages(conversationId, response.messages)
    },
  })

  return result.toUIMessageStreamResponse()
})
```

With TanStack AI, the architecture collapses. The client can connect directly to the Durable Object via WebSocket.

```typescript
// Client: WebSocket directly to the DO
const { messages, sendMessage } = useChat({
  connection: durableObjectChat(conversationId),
})

function durableObjectChat(conversationId: string): ConnectionAdapter {
  return {
    async *connect(messages, data, abortSignal) {
      const ws = new WebSocket(`wss://app.com/chat/${conversationId}`)
      await waitForOpen(ws)
      ws.send(JSON.stringify({ messages, data }))

      for await (const chunk of wsChunks(ws, abortSignal)) {
        yield chunk
      }
    }
  }
}
```

The DO handles persistence, LLM streaming, and client communication in one place.

```typescript
// Durable Object: single source of truth
async fetch(request: Request) {
  const [client, server] = Object.values(new WebSocketPair())
  server.accept()

  server.onmessage = async (event) => {
    const { messages } = JSON.parse(event.data)
    await this.saveMessages(messages)

    for await (const chunk of this.streamFromLLM(messages)) {
      server.send(JSON.stringify(chunk))
    }

    await this.saveResponse(chunk)
  }

  return new Response(null, { status: 101, webSocket: client })
}
```

No Worker intermediary. No HTTP reconnection per message. The DO maintains chat history, handles hibernation, and can broadcast to multiple clients, invisible to the TanStack AI client layer. Same pattern could work for things like gRPC streaming, Electron IPC, or service worker-based offline chat. Vercel's SDK assumes HTTP. TanStack assumes nothing.

### Headless UI Components (Coming Soon)

The work Tanner and co. have done on [Table](https://tanstack.com/table) and [Form](https://tanstack.com/form) is going to pay off for AI, too. The announcement [blog post](https://tanstack.com/blog/tanstack-ai-alpha-your-ai-your-way#coming-soon) lists headless chat UI components as a coming soon feature ("think Radix, but for AI chat interfaces"). Fully functional, completely unstyled components that you can skin to match your app.

If they follow TanStack's usual patterns, it might look something like this (note: this is speculation, not actual API)...

```tsx
import { Chat } from '@tanstack/ai-react-ui'

<Chat connection={fetchServerSentEvents("/api/chat")}>
  <Chat.Messages>
    {(message) => (
      <Chat.Message message={message}>
        <Chat.TextPart />
        <Chat.ThinkingPart />
        <Chat.ToolCallPart>
          {(toolCall) => <MyToolUI toolCall={toolCall} />}
        </Chat.ToolCallPart>
      </Chat.Message>
    )}
  </Chat.Messages>
  <Chat.Input />
</Chat>
```

...which would be *amazing*. Compound components. Render props. Zero styling opinions. You'd get the state machine, the streaming, the tool handling, but with legible control over every pixel.

The Vercel AI SDK gives you hooks as part of its [AI SDK UI](https://ai-sdk.dev/docs/ai-sdk-ui/overview) package. TanStack is planning to give you hooks _and_ unstyled primitives. This could eliminate a ton of boilerplate without sacrificing flexibility.

## The Full Picture for Vercel AI SDK

TanStack's marketing leans into "no vendor lock-in." But what does Vercel's SDK actually lock you into?

### What's Genuinely Portable

The vast majority of the SDK has zero Vercel dependencies:

- **Core `ai` package** — `streamText()`, `generateText()`, `generateObject()` work anywhere
- **All 30+ provider adapters** — OpenAI, Anthropic, Google, Mistral, Cohere, etc.
- **React/Vue/Svelte/Angular hooks** — `useChat()`, `useCompletion()`, `useObject()`
- **The streaming protocol** — SSE with JSON chunks, nothing proprietary
- **The tool system** — completely provider-agnostic

### Where Vercel Optimization Exists

Two optional packages have Vercel-specific integrations:

**`@ai-sdk/gateway`** — Vercel's AI Gateway with OIDC auth.

```typescript
const baseURL =
  withoutTrailingSlash(options.baseURL) ?? "https://ai-gateway.vercel.sh/v1/ai";
```

**`@ai-sdk/rsc`** — React Server Components with `streamUI()`.

```typescript
const result = await streamUI({
  model: openai('gpt-4o'),
  messages,
  tools: {
    weather: {
      inputSchema: z.object({ city: z.string() }),
      generate: async ({ city }) => <WeatherCard city={city} />,
    },
  },
});
```

This requires Server Actions, which effectively means Next.js App Router.

### My Take

If you avoid `@ai-sdk/gateway` and `@ai-sdk/rsc`, the Vercel SDK is genuinely portable. Both SDKs are vendor-agnostic at their core. The real difference is architecture philosophy and ecosystem trajectory.

## Architectural Comparison

| Aspect | Vercel AI SDK | TanStack AI |
|--------|---------------|-------------|
| **Provider abstraction** | `LanguageModelV3` interface | `BaseAdapter` class (7 generics) |
| **Type safety** | Per-provider | Per-model |
| **Provider count** | 30+ packages | 4 "that you actually want to use" (OpenAI, Anthropic, Gemini, Ollama) |
| **Tool definition** | `tool()` with FlexibleSchema | `toolDefinition()` → `.server()`/`.client()` |
| **Schema support** | Zod, Valibot, ArkType, Effect | Zod only |
| **Streaming control** | Transport-level | Chunking strategies |
| **UI primitives** | Hooks only | Hooks + headless components (coming soon) |
| **Middleware** | `wrapLanguageModel()`, extractors | None |
| **Agent loops** | `agent()` with stop conditions | `AgentLoopStrategy` |
| **RSC support** | Full `@ai-sdk/rsc` package | None |
| **Backend languages** | TypeScript only | TypeScript, Python, PHP |
| **Framework bindings** | React, Vue, Svelte, Angular | React, Solid, Vue |
| **Observability** | OpenTelemetry | Event system (40+ types) |
| **Connection protocols** | HTTP/SSE | HTTP, SSE, WebSocket, RPC, custom |

## The Feature Gap

TanStack AI launched this week in alpha. Vercel's SDK offers:
- **25+ more providers** — Bedrock, Groq, Mistral, Cohere, Perplexity, etc.
- **`generateObject()`** — structured output with schema validation
- **Middleware system** — request/response interceptors for logging, caching, transforms
- **Provider-specific tools** — `openai.tools.webSearch()`, `anthropic.tools.computer_20250124()`, etc
- **MCP integration** — `@ai-sdk/mcp` for Model Context Protocol
- **Speech/transcription** — `generateSpeech()`, `transcribe()`
- **Image generation** — `generateImage()`
- **Streaming tool execution** — tools can return `AsyncIterable<T>`

The gap is real, but TanStack is betting they can nail the type-safe streaming DX better than anyone else, and the features will follow. Given their track record, I'd take that bet.

## The Ecosystem Play

TanStack AI gets more interesting when you look beyond the SDK itself.

### TanStack Start Integration

If you're using TanStack Start, there's a pattern worth knowing.

```typescript
import { createServerFnTool } from "@tanstack/ai-react";

const getProducts = createServerFnTool({
  name: "getProducts",
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => db.products.search(query),
});

// Use in AI chat
chat({ tools: [getProducts.server] });

// Call directly from components
const products = await getProducts.serverFn({ query: "laptop" });
```

One definition. The AI can call it as a tool, and your components can call it directly. Same validation, same types, same implementation. No duplicate logic.

But it goes deeper. The `stream()` connection adapter bypasses HTTP entirely for TanStack Start server functions, meaning direct async iterable streaming with no serialization overhead. That's the kind of integration you get when the same team builds both the framework and the AI SDK.

### The Broader TanStack Ecosystem

Think about what's possible:
- **TanStack Query** already handles caching, invalidation, and optimistic updates. Imagine AI responses cached and deduplicated the same way.
- **TanStack Router** provides type-safe routing with loaders. AI-powered route prefetching based on predicted user intent?
- **TanStack Form** handles validation with Zod. Tool input schemas already use Zod. The integration writes itself.

None of this is announced, but the architecture makes it possible because TanStack controls the whole stack. Vercel's AI SDK integrates with Next.js. TanStack AI can integrate with *every TanStack library*.

### The Platform Shift

There's a broader context here. Throughout 2024-2025, developers have been reconsidering their platform dependencies. Vercel's usage-based pricing has pushed teams toward alternatives. Meanwhile, Cloudflare offers unlimited bandwidth on its free tier, no credit card required, and they're closing the few existing gaps and gotchas all the time.

The contrast is stark: one platform optimizes for extracting value as you scale, the other treats static hosting as a rounding error on their network costs, up to unimaginable levels for most hobby builders and even smaller developer teams. [Many teams](https://apidog.com/blog/top-5-vercel-alternatives/) are migrating from centralized providers to more flexible alternatives.

Lock-in is a consistent concern, too. Vercel's Next.js optimizations increasingly tie the framework to their infrastructure. When your deployment platform owns your meta-framework, "portable" starts feeling theoretical. [Vendor lock-in avoidance](https://www.percona.com/blog/can-open-source-software-save-you-from-vendor-lock-in/) is a primary reason many developers choose open source tooling.

TanStack represents the opposite philosophy. Cloudflare and Netlify are [financially sponsoring](https://blog.cloudflare.com/cloudflare-astro-tanstack/) Tanstack because open, portable tooling benefits their platforms, too. TanStack Start deploys to Cloudflare, AWS, Netlify, Vercel, or your own servers. TanStack AI follows the same philosophy: your code, your infrastructure, your choice.

As the open source services market continues to grow into 2026, the momentum is clear. Developers are betting on tools that work everywhere over tools optimized for one vendor's edge cases. And these days, you can't discount the value in choosing platforms whose authors are more idealogically aligned with you, too.

## Who Should Use What

**Vercel AI SDK makes sense when:**
- You're on Next.js deployed to Vercel
- You want RSC streaming UI (`streamUI()`)
- You need mature features now (image gen, speech, MCP)
- You want the widest provider coverage
- Middleware and interceptors matter to your use case

**TanStack AI makes sense when:**
- Your backend is Python, PHP, or you want language flexibility
- You're using Solid, or want framework optionality
- Per-model type safety matters to you
- You want explicit control over streaming UX
- You're building on TanStack Start
- You want headless UI primitives when they ship, not just hooks
- You're investing in the TanStack ecosystem long-term

**Either works when:**
- Standard React chat interface
- OpenAI/Anthropic/Google providers
- Tool calling with approval workflows
- SSE streaming

## Closing Thought

If you need production-ready features today, use the Vercel AI SDK. It's mature, well-documented, and battle-tested.

But if you're thinking about the next two years? TanStack AI is the more interesting bet.

TanStack AI has cleaner architecture, deeper type safety, tighter ecosystem integration, and makes fewer assumptions about your platform. The team behind it has spent a decade building tools that developers love and that age well. Features get added over time; architectural decisions stick around forever.

---

_I intend to rebuild Better Chat with TanStack Start and TanStack AI. Follow along on [Twitter](https://twitter.com/oscabriel) to see how it goes._

## Further Reading

- [TanStack AI Alpha: Your AI, Your Way](https://tanstack.com/blog/tanstack-ai-alpha-your-ai-your-way) — Official announcement
- [TanStack AI Documentation](https://tanstack.com/ai/latest/docs) — Guides and API reference
- [Matt Pocock's analysis](https://twitter.com/mattpocockuk/status/1996967049004757363) — Comparison with Vercel AI SDK
- [Vercel AI SDK](https://ai-sdk.dev/) — Official docs
- [TanStack AI on GitHub](https://github.com/TanStack/ai) — Source code
