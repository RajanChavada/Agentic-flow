# Neurovn — Launch & Traffic Tracking Guide

> Analytics setup, launch sequencing, and community posting strategy  
> Version: 1.0 — March 2026

---

## 1. Analytics Stack (All Free)

Set up both before launch. They serve different purposes.

### 1.1 Vercel Analytics — Page-Level Traffic

Already available on your Vercel account. One line to activate:

```tsx
// frontend/src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />   {/* ← add this */}
      </body>
    </html>
  )
}
```

**What it gives you:**
- Page views by route (`/`, `/canvases`, `/editor/guest`, `/marketplace`, `/docs`)
- Referrer breakdown — crucially shows `linkedin.com` and `t.co` (Twitter/X) traffic separately
- Geographic breakdown
- Device type

**Why it matters for launch:** You'll see exactly how many people clicked your LinkedIn post vs your X post in real time.

### 1.2 PostHog — Product Analytics

Free up to 1M events/month. No credit card required.

```bash
npm install posthog-js
```

```typescript
// frontend/src/lib/posthog.ts
import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window === 'undefined') return
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
  })
}

export { posthog }
```

```tsx
// frontend/src/app/layout.tsx
'use client'
import { useEffect } from 'react'
import { initPostHog } from '@/lib/posthog'

export default function RootLayout({ children }) {
  useEffect(() => { initPostHog() }, [])
  return (...)
}
```

Add to `.env`:
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
```

### 1.3 Key Events to Track

Add these `posthog.capture()` calls throughout the app. These are the events that tell you if the product is working:

**Acquisition funnel:**
```typescript
// Landing page — hero CTA
posthog.capture('cta_clicked', { location: 'hero', destination: 'canvases' })

// Landing page — template CTA  
posthog.capture('cta_clicked', { location: 'hero', destination: 'marketplace' })

// Guest editor loaded
posthog.capture('editor_loaded', { mode: 'guest' })

// Signed-in editor loaded
posthog.capture('editor_loaded', { mode: 'authenticated' })
```

**Activation events (the "aha moment" funnel):**
```typescript
// First node dropped
posthog.capture('first_node_dropped', { node_type: nodeType })

// First edge connected
posthog.capture('first_edge_connected')

// Estimate run
posthog.capture('estimate_run', {
  node_count: nodes.length,
  agent_count: agentNodes.length,
  has_loops: isLoyclic,
  has_parallel: hasParallelFork,
  providers_used: [...new Set(nodes.map(n => n.data.modelProvider))],
})

// Estimate panel opened
posthog.capture('estimate_panel_viewed')
```

**Retention events:**
```typescript
// Canvas saved
posthog.capture('canvas_saved', { canvas_count: savedCanvases.length })

// Template loaded
posthog.capture('template_loaded', { template_name: templateName })

// Share link created
posthog.capture('share_link_created')

// Export triggered
posthog.capture('export_triggered', { format: 'json' | 'png' | 'svg' })
```

**Conversion events:**
```typescript
// Upgrade modal shown
posthog.capture('upgrade_prompt_shown', { trigger: 'canvas_limit' | 'share_links' | 'full_dashboard' })

// Checkout started
posthog.capture('checkout_started', { tier: 'starter' | 'pro' })

// Checkout completed (fire this on the success redirect page)
posthog.capture('checkout_completed', { tier: 'starter' | 'pro' })
```

### 1.4 The Funnel You're Measuring

```
Lands on homepage
    ↓ (what % click Get Started?)
Opens editor
    ↓ (what % drop a node?)
Runs first estimate
    ↓ (what % this is your activation event)
Saves a canvas / Signs up
    ↓ (what % convert to account)
Returns within 7 days
    ↓ (retention)
Hits a paywall trigger
    ↓
Upgrades
```

PostHog has a Funnels view built in — you can build this exact funnel visually once events are flowing.

---

## 2. UTM Parameters for Launch Posts

Use different UTM links for each platform so you can attribute conversions correctly.

```
LinkedIn post:
https://neurovn-alpha.vercel.app?utm_source=linkedin&utm_medium=social&utm_campaign=launch_march_2026

X (Twitter) post:
https://neurovn-alpha.vercel.app?utm_source=twitter&utm_medium=social&utm_campaign=launch_march_2026

LinkedIn DMs / comments:
https://neurovn-alpha.vercel.app?utm_source=linkedin_dm&utm_medium=social&utm_campaign=launch_march_2026
```

Both Vercel Analytics and PostHog capture UTM params automatically — no extra code needed.

---

## 3. Launch Post Strategy

### 3.1 LinkedIn Post (Primary Channel)

**Structure that works for developer tools:**

```
Hook (1-2 lines, stops the scroll):
"I built a tool that tells you exactly what your AI agent pipeline will cost — before you run a single API call."

Problem (2-3 lines):
"Everyone's shipping multi-agent workflows with GPT-4o, Claude, Gemini.
Nobody knows what they'll cost at scale until the AWS bill arrives."

Solution (3-4 lines, show the product):
"Neurovn is a visual canvas — think Figma for agentic AI.
You drag nodes. Connect them. Hit Run Estimate.
In under 10ms you get a full cost, token, and latency breakdown.
No API calls. No guesswork."

Proof (specific numbers — real ones from your own workflows):
"A 5-agent RAG pipeline:
→ $0.09/run with GPT-4o
→ $0.02/run with Claude 3.5 Haiku
→ Same latency

That's a 4.5x cost difference. Neurovn shows it in seconds."

CTA:
"It's free. Try it → [LINK]

Drop a workflow you're building in the comments — I'll estimate it live."

Hashtags (3-5 max):
#agentic #llm #aiengineering #buildinpublic
```

**Attach a video or GIF** — a 30-second screen recording of dragging nodes, hitting estimate, and seeing the panel light up. This single asset will 3-5x your engagement vs text-only. Record it before you post.

**Post timing:** Tuesday or Wednesday, 9-10am EST. LinkedIn organic reach is highest mid-week morning.

### 3.2 X Post (Secondary Channel)

X rewards brevity and controversy. Different angle:

```
"Your AI agent pipeline will bankrupt you.

Most teams don't know what their LLM workflow costs until they get the bill.

I built something to fix that — a visual canvas that estimates cost, tokens, and latency before you deploy.

[GIF of the product]

Free → [LINK]"
```

Follow up in a thread with the actual numbers (specific workflow, specific cost breakdown). Threads outperform single tweets.

### 3.3 What to Do in the First 2 Hours After Posting

This is when LinkedIn's algorithm decides whether to amplify your post:

1. **Reply to every comment** within the first 2 hours — even just "Thanks! Let me know what workflow you're building"
2. **Ask 3-5 people you know** to comment (not just like) before you post — seed engagement
3. **Post a follow-up comment** yourself at the 1-hour mark with a specific example: "For context, here's a real workflow I modelled — [screenshot]"
4. **Watch Vercel Analytics in real time** — you'll see the traffic spike live

### 3.4 ProductHunt (Phase 2)

Don't launch on ProductHunt on day one. Post on LinkedIn/X first, get users, get testimonials, fix bugs from real feedback. Then do ProductHunt 2-4 weeks later with proper hunter setup, real quotes, and a polished video. ProductHunt with 0 existing users is a missed opportunity.

---

## 4. Pre-Launch Checklist (Traffic-Specific)

- [ ] Vercel Analytics installed and showing data (test with a page visit)
- [ ] PostHog installed, key events firing (check PostHog Live Events view)
- [ ] UTM links created for LinkedIn and X
- [ ] 30-second screen recording recorded and ready
- [ ] LinkedIn post drafted and reviewed
- [ ] X post drafted and reviewed
- [ ] 3-5 people briefed to comment early
- [ ] Render kept warm (cron-job.org ping set up)
- [ ] `/pricing` page live (even if paywall is off)
- [ ] All P0 checklist items from `LAUNCH_CHECKLIST.md` are green

---

## 5. What to Watch After Launch

**First hour:**
- Vercel Analytics: unique visitors (goal: 100+ on launch day for a LinkedIn post to ~1k followers)
- PostHog: `estimate_run` events (goal: >20% of visitors actually run an estimate)
- Render logs: any 500 errors

**First day:**
- Supabase: new user signups
- PostHog funnel: where are people dropping off between landing → editor → estimate?
- LinkedIn: comment quality (are these people in your ICP — AI engineers, PMs?)

**First week:**
- Retention: do users come back?
- `canvas_saved` event count (users who save are 5x more likely to return)
- Any upgrade modal shown events (signals where the paywall pressure points are)

---

*Document version: 1.0 — Neurovn launch guide, March 2026*