---
title: "Skeletons in My Codebase: Tanstack in Production"
summary: "Clearing out the skeletons in auth flows and loading patterns to create clean front-end user experiences."
date: 2025-10-31
author: Oscar Gabriel
headerImage: "/images/skeleton-dance.jpg"
headerImageCaption: "The Skeleton Dance (1929)"
---

## Introduction

If you've spent any time with [TanStack Router](https://tanstack.com/router), you know it's incredibly powerful. It provides both file-based and code-based routing, type-safe parameters, data loading, authentication guards, error boundaries. It's a solid foundation on which to build any kind of modern React app. The docs are excellent at explaining features: what `beforeLoad` does, what the file naming conventions are, when `pendingComponent` renders. But they don't prescribe how to combine these features into a cohesive, performant front-end architecture for *your* app. Obviously, that's up to you to figure out!

There are multiple ways to handle authentication. Multiple approaches to data loading. Different patterns for redirects. Even within file-based routing, you can choose between flat, directory-based, or mixed route organization. The docs give you primitives and trust you to use them correctly. This leaves you with unanswered questions: Where should auth checks happen? How do you prevent race conditions? When should you prefetch? Which parent route pattern should I use for layouts? For experienced developers who've solved these problems before, the flexibility is welcome. For anyone still trying to learn the *right* patterns for *different* use cases, it's a gap.

Then, when you combine TanStack Router with [Better Auth](https://better-auth.com) (another powerful, flexible library), you're faced with even more decisions. Where should auth state live? When should guards execute? How do you prevent that annoying page flash where you briefly see protected content before being redirected? How do you make loading states smooth? Should redirects happen in `beforeLoad`, `useEffect`, or somewhere else?

I'm writing this because I had to figure all of this out myself while building [Better Chat](https://chat.oscargabriel.dev). I spent several days combing through docs, piecing together patterns through trial and error until I arrived at something that looked and behaved exactly like I was envisioning.

Along the way, I kept running into the same kinds of problems: hidden gotchas that would haunt my app until I addressed them properly. Route conflicts that only surfaced well after scaffolding. Authentication race conditions that caused jarring page flashes. Loading states that felt broken. These are our "skeletons", the skulkers rattling around causing small but critical issues in production. This blog post is about identifying those skeletons and clearing them out of your ~~closet~~ codebase.

---
## Skeleton #1: Router Layouts

When building a real application with TanStack Router, you quickly run into organizational questions: Where do files go? How do you share layouts between routes? How do auth guards apply to child routes? When do you use pathless layouts vs grouped routes?

The docs show you *how* parent routes work for sharing UI and logic, but don't prescribe when to use which pattern or how to structure features around them.

### File-Based Routing: Quick Reference

| Pattern | Example | URL | Purpose |
|---------|---------|-----|---------|
| `index.tsx` | `routes/index.tsx` | `/` | Exact path match |
| `$param` | `routes/users/$userId.tsx` | `/users/123` | Dynamic segments |
| `route.tsx` | `routes/chat/route.tsx` | `/chat` | Layout (wraps children) |
| `_pathless/` | `routes/_auth/route.tsx` | No URL change | Shared guards without URL nesting |
| `-folder/` | `routes/chat/-components/` | Not a route | Private components/hooks |
| `$.tsx` | `routes/docs/$.tsx` | `/docs/a/b/c` | Catch-all |

For complete details on file-based routing conventions, see the docs on [file-naming conventions](https://tanstack.com/router/latest/docs/framework/react/routing/file-naming-conventions).

### Finding the Right Layout Pattern

I tried three different layout approaches before landing on one that worked:

**First attempt: Pathless layouts (`_authenticated/`)**. Great for applying auth guards without affecting URLs, but I kept hitting route conflicts. A pathless layout like `_authenticated/dashboard.tsx` creates `/dashboard`, but if you also have `dashboard.tsx` at root, you get duplicate routes and a cryptic error. Managing which routes go inside vs outside the pathless layout became a maintenance nightmare.

**Second attempt: Route groups (`(auth)/`)**. These are purely for organization—they don't affect URLs and don't create route segments. Perfect for grouping related files, but you can't add a `route.tsx` for shared layouts or guards. Dead end.

**Final approach: Feature-based `route.tsx` as layouts**. Each feature gets its own directory with a `route.tsx` file that we use as a layout. `/chat/route.tsx` wraps all chat routes, `/settings/route.tsx` wraps all settings. Clean, predictable, and you can colocate relevant components using the private `-components/` convention.

Here's what the final structure looks like:

```ansi
apps/web/src/routes/
├── __root.tsx                    # Global layout, context, error boundary
├── index.tsx                     # Landing page
├── docs.tsx                      # Static page
├── privacy.tsx                   # Static page
├── auth/
│   ├── sign-in.tsx               # Auth page (public)
│   └── -components/              # Auth-specific components
│       └── sign-in-form.tsx
├── chat/
│   ├── route.tsx                 # Layout route (shared chat shell)
│   ├── $chatId.tsx               # Individual chat page
│   ├── -components/              # Chat-specific components
│   │   ├── chat-shell.tsx
│   │   ├── message-input.tsx
│   │   ├── message-renderer.tsx
│   │   └── chat-error.tsx
│   └── -hooks/                   # Chat-specific hooks
│       ├── use-chat-model-selector.ts
│       └── use-pending-message.ts
└── settings/
    ├── route.tsx                 # Layout route (settings shell)
    ├── profile.tsx               # Settings sub-pages
    ├── models.tsx
    ├── providers.tsx
    ├── tools.tsx
    └── -components/              # Settings-specific components
        ├── settings-error.tsx
        └── profile/
            ├── session-card.tsx
            └── delete-account-dialog.tsx
```

This structure works well because it enables feature colocation (everything related to `chat` lives under `/routes/chat/`), layouts via `route.tsx` (parent routes define shared UI and guards for their children), private components scoped to each route feature (`-components/`), clear boundaries (each major feature has its own directory), and a flat hierarchy where possible (static pages stay at the top level).

### Parents as Layouts: The Key Pattern

Parent routes created with `route.tsx` let you share auth guards, loading states, error boundaries, and UI across multiple child routes. This is what we're choosing to rely on for our "layout" routes.

```tsx
// Parent Layout - routes/chat/route.tsx
export const Route = createFileRoute('/chat')({
  beforeLoad: async (opts) => {
    await requireAuthenticated({
      authClient: opts.context.authClient,
      location: opts.location,
    })
  },
  component: () => <ChatShell><Outlet /></ChatShell>,
  pendingComponent: AppShellSkeleton,
  errorComponent: ChatError,
})
```


Now ALL child routes (`/chat/$chatId`, `/chat/settings`, etc.) inherit:
- Auth protection (no need to repeat the guard)
- Loading state (`AppShellSkeleton`)
- Error handling (`ChatError`)
- Shared layout (`ChatShell`)

By checking auth once in the parent's `beforeLoad`, child routes inherit protection without repeating guard logic. Better Auth's `useSession` hook is called exactly once in `AuthProvider`, then accessed everywhere via router context—zero redundant session fetches.

Child routes just focus on their specific data and rendering:

```tsx
// Child inherits parent's guards - /routes/chat/$chatId.tsx
export const Route = createFileRoute('/chat/$chatId')({
  loader: async ({ params, context }) => {
    // Prefetch data in parallel
    await Promise.all([
      context.queryClient.ensureQueryData(/* messages */),
      context.queryClient.ensureQueryData(/* conversation */),
    ])
  },
  component: ChatPage,
  pendingComponent: ChatPageSkeleton,
})
```

The `loader` function prefetches data before the component renders, eliminating loading waterfalls.

### Layout with No Index

A `route.tsx` component is a parent that wraps its children with `<Outlet />`, while `index.tsx` renders content at the exact parent path. We skip `index.tsx` entirely (except the guest landing at `/`).

For `/chat`, we use conditional rendering: show new chat UI when no child is active, or `<Outlet />` when viewing `/chat/:chatId`. For `/settings`, we redirect to `/settings/profile`. Both avoid needing a separate `index.tsx` file.

Without specifically adding a redirect, visiting `/settings` would render an empty shell. We prevent this by redirecting to a default child in `beforeLoad`:

```tsx
// /routes/settings/route.tsx
export const Route = createFileRoute('/settings')({
  beforeLoad: async (opts) => {
    await requireAuthenticated({
      authClient: opts.context.authClient,
      location: opts.location,
    })

    // Redirect /settings → /settings/profile
    const pathname = opts.location.pathname ?? ''
    if (pathname === '/settings' || pathname === '/settings/') {
      throw redirect({ to: '/settings/profile', replace: true })
    }
  },
  component: SettingsLayout,
  pendingComponent: AppShellSkeleton,
  errorComponent: SettingsError,
})
```

Redirecting in `beforeLoad` instead of `useEffect` offers several advantages. It happens before the component renders (no flash of layout before redirect), works with server-side rendering if you add it, keeps code cleaner (no hooks, no component-level redirect logic), and ensures consistency by keeping all navigation decisions in the same place.

Compare to the `useEffect` approach:

```tsx
// ❌ Don't do this
function SettingsLayout() {
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location })

  useEffect(() => {
    const pathname = location.pathname ?? ''
    if (pathname === '/settings' || pathname === '/settings/') {
      navigate({ to: '/settings/profile', replace: true })
    }
  }, [location.pathname, navigate])

  return <SettingsShell><Outlet /></SettingsShell>
}
```

This works, but:
- Component mounts and renders before redirecting
- User might see a flash of the empty settings layout
- Logic is in the component instead of route configuration
- Not SSR-compatible

The `beforeLoad` approach is cleaner and more aligned with TanStack Router's design.

---
## Skeleton #2: Auth Flash

Now that we have a solid route structure, let's tackle the dreaded flash, the most insidious bug in authentication flows.

### The Problem: Race Conditions & Redirect Loops

Here's what our initial authentication guard looked like, based on the pattern shown in the TanStack Router [authenticated routes guide](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes):

```tsx
// ❌ Naive implementation (based on the docs)
export function requireAuthenticated({ auth, location }) {
  if (!auth.isAuthenticated) {
    throw redirect({
      to: '/auth/sign-in',
      search: { redirect: location.href }
    })
  }
}
```

Looks reasonable, right? The docs show a synchronous guard checking `context.auth.isAuthenticated`, so we implemented it exactly that way the first time. But in production, the following race condition occurs:

1. User navigates to `/chat` (protected route)
2. Auth session is still fetching from the server
3. `isAuthenticated` is `false` (session hasn't loaded yet)
4. Guard executes **immediately** with incomplete auth state
5. Guard redirects to `/auth/sign-in`
6. User briefly sees sign-in page
7. Auth session finishes loading; user is actually authenticated
8. Another redirect back to `/chat`

The result is a jarring flash between pages. Feels broken, even though it eventually works.

The breakthrough was realizing that **guards shouldn't check auth state while it's still loading**. Auth has three states—loading, authenticated, or unauthenticated—but guards should only ever make decisions when auth is in one of the latter two states. The naive guard runs immediately, making a redirect decision based on incomplete information.

We need guards to **wait for auth to resolve** before checking whether the user is authenticated. This eliminates the race condition entirely.

### The Solution: Async Guards with Router-Managed Loading

Better Chat uses async route guards that wait for auth to resolve before making redirect decisions. TanStack Router handles this beautifully, since `beforeLoad` can be async, and the router will await the Promise before proceeding.

```tsx
// apps/web/src/lib/route-guards.ts
export async function requireAuthenticated({ authClient, location }) {
  // wait for auth to load
  const { data: session } = await authClient.getSession()

  if (!session) {
    const redirectTarget = location.href ?? location.pathname ?? '/'
    throw redirect({
      to: '/auth/sign-in',
      replace: true,
      search: { redirect: redirectTarget },
    })
  }
}

export async function redirectIfAuthenticated({ authClient, to }) {
  const { data: session } = await authClient.getSession()

  if (session) {
    throw redirect({ to, replace: true })
  }
}
```

The router waits for the Promise to resolve before loading the route. During this time, it shows the route's `pendingComponent`, creating a smooth loading experience with zero race conditions.

### How It Works: Router Context + Async beforeLoad

**1. Wire authClient to Router Context**

```tsx
// apps/web/src/routes/__root.tsx
export interface RouterAppContext {
  orpc: typeof orpc
  queryClient: QueryClient
  authClient: typeof authClient  // ← Auth client available to all routes
  auth: AuthContextValue
}

// apps/web/src/main.tsx
function AppRouter() {
  const auth = useAuth()
  const routerContext = useMemo(
    () => ({ orpc, queryClient, authClient, auth }),
    [auth]
  )

  return <RouterProvider router={router} context={routerContext} />
}
```

**2. AuthProvider: Reactive Auth State for Components**

```tsx
// apps/web/src/components/auth-provider.tsx
export function AuthProvider({ children }: PropsWithChildren) {
  const { data: session, isPending, error } = authClient.useSession()

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!session?.user,
      session: session ?? null,
      isPending,
    }),
    [session, isPending]
  )

  if (error) {
    console.error('Failed to fetch auth session', error)
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

Router mounts immediately, even while `isPending === true`. Guards will handle waiting for auth.

**3. Protected Routes with Async Guards**

```tsx
// apps/web/src/routes/chat/route.tsx
export const Route = createFileRoute('/chat')({
  beforeLoad: async (opts) => {
    await requireAuthenticated({
      authClient: opts.context.authClient,
      location: opts.location,
    })
  },
  component: ChatLayout,
  pendingComponent: AppShellSkeleton,  // Shows during auth + data loading
})
```

**4. Public Routes with Async Guards**

```tsx
// apps/web/src/routes/auth/sign-in.tsx
export const Route = createFileRoute('/auth/sign-in')({
  beforeLoad: async (opts) => {
    await redirectIfAuthenticated({
      authClient: opts.context.authClient,
      to: opts.search.redirect || '/chat',
    })
  },
  component: SignInRoute,
  pendingComponent: SignInShellSkeleton,
})
```

### Why Async Guards Work Perfectly

**Progressive Rendering:**
Router mounts immediately. Users see the app shell, header, navigation, and branding instantly. The `pendingComponent` provides feedback during the auth check.

**Zero Race Conditions:**
Guards explicitly wait for auth to complete before making redirect decisions. The async/await pattern guarantees auth is resolved before checking if a session exists.

**Router-Managed Loading:**
TanStack Router's built-in `pendingComponent` system handles all loading states. The router shows skeletons during both auth resolution AND data loading.

**Fast in Production:**
Better Auth's server-side `cookieCache` keeps subsequent auth checks under 10ms. The async guard pattern works because both `useSession()` (for components) and `getSession()` (for guards) hit the same cache.

#### Powerful Pending Components

With async guards, `pendingComponent` handles **auth resolution, data loading, and navigation**.

```tsx
// /chat/$chatId.tsx
export const Route = createFileRoute('/chat/$chatId')({
  beforeLoad: async (opts) => {
    // Async guard waits for auth
    await requireAuthenticated({
      authClient: opts.context.authClient,
      location: opts.location,
    })
  },
  loader: async ({ params, context }) => {
    // Then prefetch data
    await Promise.all([
      context.queryClient.ensureQueryData(...),
      context.queryClient.ensureQueryData(...),
    ])
  },
  pendingComponent: ChatPageSkeleton,  // Shows during beforeLoad + loader
})
```

The router shows `pendingComponent` during the entire async `beforeLoad` (including auth await) and `loader` execution.

#### Component UI State

Components get their auth state from `AuthProvider` (which calls `useSession()`). For components like the user menu that render immediately in the app shell, you can handle the loading state implicitly by treating "not authenticated" (which includes loading) as a single UI state:

```tsx
// apps/web/src/components/navigation/user-menu.tsx
export function UserMenu() {
  const auth = useAuth() // From AuthProvider's useSession()
  const navigate = useNavigate()

  // While loading OR unauthenticated: show Sign In button
  if (!auth.isAuthenticated) {
    return (
      <Button variant="outline" onClick={() => navigate({ to: '/auth/sign-in' })}>
        Sign In
      </Button>
    )
  }

  // Once authenticated: show user menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{auth.session?.user?.name}</Button>
      </DropdownMenuTrigger>
      {/* Menu items */}
    </DropdownMenu>
  )
}
```

This works because showing "Sign In" during the brief loading period is a reasonable default state for navigation UI.

Thus, with the combination of async guards and the `AuthProvider`, we don't need to scatter `if(isPending) return <Loader />` checks throughout our app!

### Alternative: Blocking Pattern for Maximum Simplicity

If you prefer absolute control over auth loading and don't need progressive rendering, you can block the entire app until auth resolves.

```tsx
// Block in AuthProvider
export function AuthProvider({ children }) {
  const { data: session, isPending } = authClient.useSession()

  const value = useMemo(() => ({
    isAuthenticated: !!session?.user,
    session: session ?? null,
    isPending,
  }), [session, isPending])

  // Block rendering until auth resolves
  if (isPending) {
    return (
      <div className="relative min-h-screen bg-background">
        <AppBackground />
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Guards become synchronous and simpler
export function requireAuthenticated({ auth, location }) {
  // No await needed - always resolved by this point
  if (!auth.isAuthenticated) {
    throw redirect({
      to: '/auth/sign-in',
      replace: true,
      search: { redirect: location.href }
    })
  }
}

// Routes use sync beforeLoad
export const Route = createFileRoute('/chat')({
  beforeLoad: (opts) => {
    requireAuthenticated({
      auth: opts.context.auth,
      location: opts.location,
    })
  },
  component: ChatLayout,
  pendingComponent: AppShellSkeleton,  // Shows during data loading only
})
```

**Benefits of Blocking:**
- Simpler guard functions (no async/await)
- Guaranteed resolved auth (zero edge cases)
- Fewer moving parts (one loading state to manage)

**Tradeoff:**
Brief blank screen on initial load (~100-300ms first time, ~10-50ms cached). No progressive rendering of app shell during auth.

**When to Choose Blocking:**
- You want the simplest possible implementation
- You're okay with a brief blank screen on initial load
- You don't need to show static UI elements during auth loading

Better Chat chose async guards for the best of both worlds: immediate app shell rendering with zero race conditions.

---

## Skeleton #3: Frontend Polish

With route structure and auth sorted, let's tackle the production details that make everything polished and performant.

### Loading States: Always Show Something

**The problem:** Blank screens during navigation feel broken.

**The solution:** Every route should have a `pendingComponent`:

```tsx
export const Route = createFileRoute('/chat/$chatId')({
  loader: async ({ params, context }) => {
    // Prefetch critical data
    await context.queryClient.ensureQueryData(...)
  },
  pendingComponent: ChatPageSkeleton,  // Shown during loader
  component: ChatPage,  // Rendered after loader
})
```

When building skeletons, match the final layout structure, use simple rectangles for dynamic content, and match static content exactly to minimize visual flicker.

### Error Boundaries: Graceful Failures

**The problem:** One bug crashes the entire app.

**The solution:** Root error boundary + route-specific errors:

```tsx
// Root catch-all
export const Route = createRootRouteWithContext<RouterAppContext>()({
  errorComponent: ErrorBoundary,
})

// Route-specific errors
export const Route = createFileRoute('/chat/$chatId')({
  loader: async ({ params, context }) => {
    const conversation = await fetchConversation(params.chatId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }
  },
  errorComponent: ChatError,  // Custom error UI for this route
})
```

**Error component pattern:**
```tsx
function ChatError({ error }: ErrorComponentProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4">
        <h2>Conversation not found</h2>
        <p>This conversation may have been deleted.</p>
        {import.meta.env.DEV && <pre>{error.message}</pre>}
        <Button onClick={() => router.navigate({ to: '/chat' })}>
          Start a New Chat
        </Button>
      </div>
    </div>
  )
}
```

Validate in loaders to fail before component renders, use route-specific errors for better UX than root catch-all, and show error details in dev while hiding them in production.

### Search Params: Validate When You Need Them

**The problem:** Users can manipulate URLs. If you accept search params (especially redirects on auth pages), unvalidated inputs are a security risk.

**When you need this:** Auth routes with redirect params, filtered lists, paginated views—any route accepting user-controlled URL parameters.

**The solution:** Use `validateSearch` to sanitize inputs. Here's how Better Chat handles the sign-in page:

```tsx
// /routes/auth/sign-in.tsx
import { createFileRoute } from '@tanstack/react-router'
import { SignInShellSkeleton } from '@/components/skeletons/sign-in-skeleton'
import { redirectIfAuthenticated } from '@/lib/route-guards'
import { SignInForm } from './-components/sign-in-form'

interface SignInSearch {
  redirect?: string
}

const FALLBACK_REDIRECT = '/chat'

function sanitizeRedirect(rawRedirect: string | undefined): string {
  if (!rawRedirect || typeof rawRedirect !== 'string') {
    return FALLBACK_REDIRECT
  }

  // Must be internal path
  if (!rawRedirect.startsWith('/')) {
    return FALLBACK_REDIRECT
  }

  // Prevent redirect loops
  if (rawRedirect === '/auth/sign-in') {
    return FALLBACK_REDIRECT
  }

  return rawRedirect
}

export const Route = createFileRoute('/auth/sign-in')({
  validateSearch: (search: Record<string, unknown>): SignInSearch => {
    const redirectValue = sanitizeRedirect(search.redirect as string | undefined)

    // Only include redirect in search if it's not the default
    if (redirectValue === FALLBACK_REDIRECT) {
      return {}
    }

    return { redirect: redirectValue }
  },

  beforeLoad: async (opts) => {
    await redirectIfAuthenticated({
      authClient: opts.context.authClient,
      to: opts.search.redirect || FALLBACK_REDIRECT,  // Type-safe!
    })
  },

  component: SignInRoute,
  pendingComponent: SignInShellSkeleton,
})

function SignInRoute() {
  const search = Route.useSearch()  // Type-safe: SignInSearch

  return (
    <div className="container mx-auto max-w-md">
      <SignInForm redirectPath={search.redirect || FALLBACK_REDIRECT} />
    </div>
  )
}
```

When using search params, validate any user-controlled inputs, sanitize redirects by only allowing internal paths and preventing loops, use type-safe schemas (Zod + `zodValidator` for complex validation), and validate at the route level rather than in components.

### Better Auth: Production Optimizations

With async guards handling the race condition problem, here are the Better Auth optimizations that keep the pattern performant in production.

#### useSession + getSession

You'll notice we use two different auth methods:

```tsx
// In AuthProvider - reactive state for components
const { data: session, isPending } = authClient.useSession()

// In route guards - one-time async check
const session = await authClient.getSession()
```

This isn't redundant; each serves a different purpose. `useSession()` is a React hook that provides reactive state to components throughout the app (like the user menu in the header that needs to update when someone signs in). `getSession()` is a Promise-based method we can await in route guards, which aren't React components and can't use hooks.

Both hit the same cache, so the performance cost is negligible. In production logs, auth checks average 2-7ms compared to actual operations like data fetching (300ms+) or AI generation (seconds+).

#### Cookie Cache

The key to making this dual pattern viable is Better Auth's `cookieCache`:

```tsx
// apps/server/src/lib/auth.ts
export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: process.env.NODE_ENV === 'production',
      maxAge: 5 * 60, // 5 minutes
    }
  }
})
```

The first auth check hits the database and sets a signed cookie. Subsequent checks within 5 minutes just read the cookie. This means whether you're calling `useSession()` or `getSession()`, both benefit from the same optimization.

**Dev environment caveat:** Disable `cookieCache` in development if your frontend and backend run on different ports (like `localhost:3001` and `localhost:3000`). Different ports are different origins, and cross-origin cookies require `sameSite=None` and `secure=true`, but `secure` cookies require HTTPS, which localhost doesn't support.

If you leave cookieCache enabled in this case, this happens to break sign-out entirely in local dev. The browser won't accept cookie deletion headers during sign-out due to the SameSite/cross-origin mismatch. Thus, the cookies persist, and you'll appear to remain authenticated even after clicking "Sign Out." The Better Auth docs don't explicitly mention this limitation for the relatively common dev setup of separate frontend/backend ports.

---

## Conclusion

The hardest part of building Better Chat was figuring out exactly which patterns to use and exactly how to use them.

TanStack Router and Better Auth are genuinely impressive libraries with well-documented APIs and powerful features. But combining them into a production app that goes beyond the basic tutorial examples you typically find online requires piecing together patterns that aren't always obvious or explicitly called out in the docs.

### What We Covered

**Route Organization & File-Based Routing**
- File-based routing conventions (`$param`, `route.tsx`, `_pathless/`, `-folder/`)
- Using `route.tsx` parent routes as layouts for shared UI and auth guards
- Feature-based colocation with `-components/` and `-hooks/`
- Redirects in `beforeLoad`, not `useEffect`
- Data prefetching with loaders to eliminate waterfalls

**Zero-Flash Auth (Async Guard Pattern)**
- Async guards wait for auth to resolve (eliminates race conditions)
- Router-managed loading states with `pendingComponent`
- Progressive rendering (app shell visible immediately)

**Frontend Polish**
- `pendingComponent` and `errorComponent` on every route
- Validate and sanitize search params
- Parallel data prefetching with `Promise.all`

**Better Auth Optimizations**
- Dual-pattern: `useSession()` for components, `getSession()` for guards
- cookieCache keeps auth checks under 10ms (production only with different ports)

### Everything in its Right Place

TanStack Router and Better Auth are both flexible libraries. They give you primitives and trust you to use them correctly. **The docs show you multiple ways to handle auth (sync guards, async guards, component-level checks) but don't prescribe which to use or when.** The patterns in this article aren't the *only* way to build your frontend routing and authentication loading, but they're specific recommendations based on what I found works well in production, and what avoids some edge cases and potential bugs that aren't explicityl documented.

The straight dope I have for you is: **use ALL the features, in the right places, for the right reasons**. Each feature in a library you're using has a specific job; figure out what those are and use them! Use `beforeLoad` for guards and redirects (before render), `validateSearch` for search param validation (type safety), `loader` for data prefetching (eliminate waterfalls), `pendingComponent` for loading states (smooth UX), `errorComponent` for error handling (graceful recovery), and `component` for rendering (clean, with data ready).

Skip one, and you introduce bugs. Overlap responsibilities, and you create confusion. Use them all correctly, and you get a production-ready architecture that's maintainable and performant.

### Next Steps

1. **Audit your routes** - Does every route have `pendingComponent` and `errorComponent`?
2. **Choose your auth pattern** - Async guards (progressive rendering) or blocking (simpler)?
3. **Enable cookieCache** - Keeps auth checks under 10ms
4. **Move redirects to `beforeLoad`** - Don't rely on `useEffect`
5. **Validate search params** - Sanitize user-controlled inputs
6. **Prefetch with loaders** - Eliminate data waterfalls with `Promise.all`

Start with async guards for the best UX. Add patterns incrementally. Before you know it, you'll have a rock-solid authentication flow that scales.

---

## Further Reading

### TanStack Router Documentation

**Route Organization & File-Based Routing:**
- [File Naming Conventions](https://tanstack.com/router/latest/docs/framework/react/routing/file-naming-conventions) - Pathless routes, route groups, dynamic params, private folders
- [Route Trees](https://tanstack.com/router/latest/docs/framework/react/routing/route-trees) - Understanding route hierarchy and layouts

**Authentication & Data Loading:**
- [Authenticated Routes Guide](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes) - Official patterns for protecting routes
- [Data Loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading) - Using loaders and handling loading states
- [Search Params](https://tanstack.com/router/latest/docs/framework/react/guide/search-params) - Validating and type-safe search parameters

**API Reference:**
- [Route Options](https://tanstack.com/router/latest/docs/framework/react/api/router/RouteOptionsType) - `beforeLoad`, `loader`, `pendingComponent`, `errorComponent`, `validateSearch`

### Better Auth Documentation

- [Session Management](https://www.better-auth.com/docs/concepts/session-management) - Understanding sessions and authentication state
- [Performance Optimization](https://www.better-auth.com/docs/guides/optimizing-for-performance) - Using the `useSession` hook and React components

### Implementation Reference

Want to see these patterns in action? The complete Better Chat implementation is open source:

- **Parent layout route**: [apps/web/src/routes/chat/route.tsx](https://github.com/oscabriel/better-chat/blob/main/apps/web/src/routes/chat/route.tsx)
- **Child data-loading route**: [apps/web/src/routes/chat/$chatId.tsx](https://github.com/oscabriel/better-chat/blob/main/apps/web/src/routes/chat/%24chatId.tsx)
- **Route guards**: [apps/web/src/lib/route-guards.ts](https://github.com/oscabriel/better-chat/blob/main/apps/web/src/lib/route-guards.ts)
- **Auth context**: [apps/web/src/lib/auth-context.tsx](https://github.com/oscabriel/better-chat/blob/main/apps/web/src/lib/auth-context.tsx)
- **Component-Level Loading**: [apps/web/src/components/navigation/user-menu.tsx](https://github.com/oscabriel/better-chat/blob/main/apps/web/src/components/navigation/user-menu.tsx)
- **Chat shell component**: [apps/web/src/routes/chat/-components/chat-shell.tsx](https://github.com/oscabriel/better-chat/blob/main/apps/web/src/routes/chat/-components/chat-shell.tsx)

---

*Thanks for reading! This was part two (of two) on how I built Better Chat. Check out the previous [blog post](https://oscargabriel.dev/blog/two-brains-are-better) if you missed it, all about the two-brained backend architecture of the app.*

*Next up, my sights are set on the ongoing [Tanstack Start Hackathon](https://www.convex.dev/hackathons/tanstack) hosted by Convex! Keep an eye out for my submission. 👀*
