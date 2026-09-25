---
title: "OSS Has a Skill Issue"
summary: "MCP servers, skills marketplaces, and tool registries all try to solve context engineering by giving agents more tools. Offworld gives your agent just one skill for your whole stack and a map to guide the way."
date: 2026-1-31
author: Oscar Gabriel
headerImage: "/images/treasure-planet.jpg"
headerImageCaption: "Treasure Planet (2002) — One map is all you need."
---

We all know about context bloat by now.

Tool search, dynamic load outs, and deferred tool loading are the latest band-aids on the structural problem that is "how do you engage in [context engineering](https://www.atcyrus.com/stories/mcp-tool-search-claude-code-context-pollution-guide) _efficiently_?".

A central problem is rediscovery. Every time you start coding, you're talking to a new agent that has never heard of anything you're working on. Every time you ask it to search, read, use a tool, find something, make a decision, hey implement this in this way, etc etc. The meter is running the whole time, and it's going to set back to zero when you feel like you've gotten everything you could out of this session.

There are myriad solutions to agent memory at a high level. I'm partial to @supermemoryai's [OpenCode plugin](https://github.com/supermemoryai/opencode-supermemory) right now. Those solutions are generally focused on helping agents remember _who_ you are or _how_ you like to work and use your tools between session. Very valuable, but not the entire picture.

Anthropic's recent clamp-down on Max plan usage in other CLI agents tells you what's coming. LLM costs for SOTA models from the big labs are going to keep rising. I'm hopeful for the future of open weight models, but for now, rediscovering everything every session isn't sustainable, and the fix is to either remember (difficult problem still), or to give your agents a map they can read very efficiently.

My latest project release is called [Offworld.sh](https://offworld.sh) and it's my attempt to solve this problem. It's a CLI tool and context manager that maintains local git clones of open source repos, generates per-repo reference files, and routes your agent to the right source code through a single lightweight skill file instead of hundreds of bloated ones. I'll explain how it works later in this piece, but first I want to talk about why I think it's needed.

## Every Option is Flawed

### MCP is just like USB-C

MCP was supposed to be the universal standard. One protocol to connect everything. But it became another fragmentation point.

The protocol is less of the issue; it's more how most people use it. They expose too many tools, or tools you don't need, or are poorly optimized. They dump everything into your context upfront. Tool bloat [overloads the model](https://medium.com/@adityajani7270/rethinking-mcp-skills-rag-mcp-and-making-agents-that-scale-day-1-7c1e26e41ecd). More tools means more wasted tokens and worse recall.

David Cramer (@zeeg) recently [argued](https://cra.mr/mcp-skills-and-agents) that many MCP servers don't need to exist at all. They're either bad API wrappers or they're actually truly replaceable by a skill.

Tool search helps, and I think MCP will remain useful for connecting to third-party services, especially those that require auth. But they don't solve the problem of context engineering on their own.

### Skills are Startup Bloat and Scraped Garbage

Skills were supposed to fix the issues with MCP. They're lightweight, on-demand prompts that load when needed. Good in theory. But in practice, they've prove to be a bit of a mess, too.

Skill discoverability is garbage. Keeping skills up to date with the repos they're intended to help you with is an unsolved problem. The huge marketplaces have minimal curation, verification, or quality control. They're huge and full of [random scrapes from GitHub](https://ericmjl.github.io/blog/2025/10/20/exploring-skills-vs-mcp-servers/), including verified malware trying to pass as useful content. And god forbid you expect your agent to pick out the one in a hundred skills you have loaded and want it to invoke all on its own.

Vercel [found this out the hard way](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals). When they built Next.js evals to test whether skills could teach agents about new Next.js 16 APIs, the results were brutal. In 56% of cases, the skill was never invoked at all. Zero improvement over baseline. Even with explicit instructions telling the agent to use the skill, they only hit a 79% pass rate. The same docs embedded directly in `AGENTS.md` achieved 100%.

Any problem skills are intended to solve is moot if the agents just ignore them entirely, or worse, create noise that actually makes them perform worse.

_Even_ worse, agents load the name and description of everything in their skill directory (so they can theoretically know what to invoke when a user mentions the right thing). Thus, more skills in your skill directory means more startup tokens, more noise, and less reliable routing. What was supposed to be lightweight becomes a startup tax.

The original Offworld model fell into this trap. I originally envisioned the project as "create a skill for any open source repo." So you'd scan your project manifest, generate skills on-demand, and we could distribute everywhere. It _worked_, but ultimately fell right into the startup bloat problem. So I pivoted.

### Source is the Real Docs (But Managing It Sucks)

If you want your agent to use a library correctly, my ultimate argument is that neither a dedicated MCP server nor a large skill containing loads of best practices info is your best option. Nor are docs links or bundled and minified node_modules code. The only actual truth is in direct access to source code.

I say this because I believe that well-constructed libraries still matter in 2026. Vibe-coded projects only work because agents can find and use libraries engineers spent years building. Your agent can integrate a good library in seconds, especially with source code and proper direction. It's true that agents can almost just as well spin up their own implementations of some libraries whole-cloth, but the big and important ones—your libraries for frontend frameworks, animations, auth, data loading, infrastructure, observability, etc—aren't going _anywhere_ any time soon.

But keeping a list of local git clones organized and up to date is painful. Every time you want to point your agent at one, you have to give it a direct path to the directory (or add it to your workspace if you're using Claude Code), and you have to remember to `git pull` the latest changes, and you have to give your agent a little info about what to look for or it's going to spend time and token spinning its wheels reading everything it can in the codebase before giving you anything useful (_cough_ GPT 5.2 _cough_).

So, if local clones are good, and giving your agents a head start with the contents of the clones is good, how do you keep them in sync? How do you add a new clone and pair it with a reference? How do you make sure your agent checks the right directories every time?

## Offworld Is Not Another Skills Marketplace

The first few versions of Offworld I tried out solved generation and distribution, but failed to solve context bloat and invocation reliability.

The latest release that I've been showing off recently uses _one static skill_, a clone map, and per-repo reference files.

The singular skill just routes your agent. The map guides it efficiently. And the references inform it about just the right thing, and stay up to date as the codebase you're referencing changes.

Offworld is a **context manager**, not a marketplace. It helps your agents collect condensed, useful context and point them where they need to go, faster and more accurately than almost any other solution I've found so far.

Agents skip rediscovery. They use their context budget on the right repo immediately. The map persists across sessions and tools. No startup pollution from thousands of unused tool definitions.

## What Makes This Different

### One Skill for Your Whole Stack

The Offworld skill never changes. I mean, I'll probably update it, but it comes along when you install and update the CLI, and it's just a static routing guide to your git clone map. The `map.json` file lives as an asset to the skill, always accessible. It's the single source of truth for your available cloned repos and where they live.

### Right-Sized References

Each repository gets its own file under references/ in the skill directory. They're not generic or overloaded individual "best practices" skills. These are laser-focused references with a high-level introduction to a project and a concrete map of where to look for what when the agent needs to dig in. Specific beats general. More specific with an LLM means better output, always.

### Local Clones, Global Sync

Repos clone to `~/ow/` by default (but you can set it to your existing clone directory on your machine!). Offworld keeps them updated, generates references, and manages the map. You don't have to think about it. Just run `ow pull <owner/repo>` and watch the magic.

### Project Scoping

Or even better, run `ow projec init` to create a `.offworld/map.json` at the project root that scopes which references are available. Your React app doesn't need Rust library references. Your backend doesn't need frontend design systems. The project-level map file takes precedence over your global one, _further_ tightening the context you use up finding and searching within the right thing.

## The Missing Middle

Offworld bridges the gap between corporate-maintained repos and individual-maintained repos.

Big companies (Vercel, Cloudflare, Convex) are releasing first-party skill suites. Those contain a lot of invaluable guidance. But expecting every library to ship skills with their docs still seems unreasonable, especially given how fast everything is changing in this space.

Where a first-party skill doesn't exist, Offworld can create one. Where it exists, Offworld can manage it—keeping everything in one place, synced and ready.

## This Is About Fundamentals

I still believe in libraries. Using code someone built carefully will remain better than Claude-generated approaches for most medium- to large-sized libraries.

Even if new libraries matter less, studying existing ones, especially those created pre-LLMs, remains valuable for people who want to understand how things work at a deeper level, which I count myself as.

Current solutions like MCP servers, skills marketplaces, and tool registries are solving the wrong problem. We keep trying to give agents _more_ tools. But what we actually need are ways to give agents **only** the right tools.

Rediscovery is a tax. Offworld is the deduction.

**One skill for your whole stack.**

This is the architecture that actually scales.

---

_Install Offworld now with `bun add -g offworld` or let [your agent](https://offworld.sh/cli#install-agent) do it!_

_I'm going to be using Offworld religiously now while coding with agents. Follow along on [Twitter](https://twitter.com/oscabriel) to stay updated on how it's going._
