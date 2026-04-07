# MimicAI -- 3-Minute Demo Video Script

**Total time: ~3:00**
**Recording tool:** OBS Studio or Loom (1280x720 recommended)
**Pre-requisites:** Dev server running (`npm run dev`), DB seeded (`npm run db:seed`), Gemini API key in `.env`

---

## Pre-Recording Checklist

- [ ] Dev server running on localhost:3000
- [ ] Database seeded with demo data
- [ ] Browser at 1280x720, clean (no bookmarks bar, no extra tabs)
- [ ] Have a "source app" ready to record (a spreadsheet with sample data, or any app with visible numbers)
- [ ] OBS/Loom ready to capture
- [ ] Script rehearsed at least once

---

## [0:00 - 0:15] HOOK -- The Problem (15s)

> *Screen: Landing page hero at localhost:3000*

**SAY:**
"Every day, millions of people manually copy data from one app to another. The source app usually has no API -- it's a lab program, a PDF, a legacy tool. You can't automate what you can't connect to. MimicAI fixes this."

**SHOW:** Landing page with hero text "Teach AI by doing. Sell what it learns." and the "Built with Auth0 Token Vault" badge.

---

## [0:15 - 0:25] What Is MimicAI? (10s)

> *Screen: Scroll down to "How It Works" section*

**SAY:**
"MimicAI is a platform where you record your screen, AI watches what you do and learns WHY you do it, then you sell that automation on a marketplace. Buyers run it on their own accounts using Auth0 Token Vault."

**SHOW:** The 4-step cards: Record, Teach, Automate, Sell.

---

## [0:25 - 1:10] DEMO -- Recording a Workflow (45s)

> *Screen: Click "Start Recording" -> Record page*

**SAY:**
"Let me show you. I'm a lab technician who copies spectrophotometer readings into Google Sheets every day."

> *Screen: Click "Start Screen Capture" -> browser permission dialog -> select tab/window with data*

**SAY:**
"I share my screen and work normally. MimicAI captures a screenshot every 2 seconds. No data leaves my machine during recording -- everything stays local."

> *Screen: Work for ~15 seconds (switch between the data source and a spreadsheet, type some values). Show the screenshot counter incrementing.*

**SAY:**
"I've captured 8 screenshots. Now I stop recording and MimicAI analyzes everything at once."

> *Screen: Click "Stop Recording" -> progress bar appears as AI processes screenshots*

**SAY:**
"Using Gemini 2.5 Flash Vision, it reads every pixel -- numbers, tables, app names -- and identifies what I did in each screenshot."

> *Screen: Progress bar completes -> Review page shows detected actions*

**SAY:**
"Here's what it found: I read data from a source app, switched to Google Sheets, and typed values. Each action has the extracted data and a confidence score."

---

## [1:10 - 1:40] DEMO -- AI Inference (30s)

> *Screen: Click "Generate Workflow" or show the inference step*

**SAY:**
"Now the magic. Instead of asking me 30 questions, MimicAI analyzes ALL the actions in one pass and infers the complete workflow -- steps, rules, variables, edge cases."

> *Screen: Show the generated workflow with rules and variables*

**SAY:**
"It found:
- A rule: IF concentration is above 1.5, mark as failed.
- A variable: dilution factor, which changes per experiment.
- An edge case: skip blank control rows.

I can edit any of these. This isn't a macro -- it's a reasoning model."

> *Screen: Show the rules/variables in the review panel. Maybe edit one rule to show it's editable.*

---

## [1:40 - 2:00] DEMO -- Save & View Workflow (20s)

> *Screen: Click "Save Workflow" -> redirects to workflow detail page*

**SAY:**
"One click and it's saved. Here's the full workflow with steps, rules, edge cases, and the variables a user needs to input before each run."

> *Screen: Scroll through the workflow detail page showing steps, rules, variables, and the Run panel*

**SAY:**
"The Run panel asks for the dilution factor before executing. The workflow makes real decisions based on the rules it learned."

---

## [2:00 - 2:25] DEMO -- Marketplace + Token Vault (25s)

> *Screen: Navigate to /marketplace*

**SAY:**
"Now I publish this to the marketplace. Other users can browse automations, see exactly what rules they use -- full transparency."

> *Screen: Click into a marketplace listing -> show detail page with steps and rules tabs*

**SAY:**
"Here's where Auth0 Token Vault comes in. When a buyer installs this automation, they connect THEIR OWN Google Sheets and Gmail through Auth0's OAuth flow."

> *Screen: Show the Install panel with service connection buttons*

**SAY:**
"Their tokens go to Auth0 Token Vault -- never our database. I, as the creator, never see their credentials. Token refresh is automatic. Per-user credential isolation."

> *Screen: Show the "Connect Gmail" and "Connect Google Sheets" buttons, then "Install"*

---

## [2:25 - 2:45] Architecture & Token Vault Deep Dive (20s)

> *Screen: Show code -- `src/lib/auth0.ts` or the Token Vault integration*

**SAY:**
"Under the hood, we use Auth0 SDK v4 with `getAccessTokenForConnection`. Every API call to Gmail or Sheets goes through Token Vault. Zero tokens in our database. The middleware handles all auth routes."

> *Screen: Briefly show `middleware.ts` or the service adapter code that calls Token Vault*

**SAY:**
"Service adapters in our codebase call Token Vault to get fresh tokens per-user, per-service. This is the identity layer that makes a multi-tenant marketplace possible."

---

## [2:45 - 3:00] CLOSE -- Why It Matters (15s)

> *Screen: Back to landing page or the "Not just another Zapier" section*

**SAY:**
"Most automation tools replay sequences. MimicAI replays understanding. The screen IS the API -- any app that shows data on screen can be automated.

Built with Auth0 Token Vault. MimicAI -- teach AI by doing, sell what it learns.

Thank you."

---

## Recording Tips

1. **Rehearse 2-3 times** before the real recording. The 3-minute limit is strict.
2. **Pre-seed the database** so the marketplace has listings and workflows exist.
3. **Use a real data source** for the recording demo (even a simple spreadsheet with numbers works).
4. **Talk slightly slower** than feels natural -- video compression makes fast speech harder to understand.
5. **Don't worry about perfect AI results** -- the demo shows the flow. If AI output isn't perfect, you can cut/edit the video.
6. **Mention "Auth0 Token Vault" at least 3 times** -- it's the hackathon requirement.
7. **Show code briefly** (15-20s max) -- judges want to see it's real, but the product demo matters more.
8. **Clean browser** -- no personal bookmarks, notifications, or distracting tabs.

## Timing Summary

| Section | Duration | Cumulative |
|---------|----------|------------|
| Hook | 15s | 0:15 |
| What is MimicAI | 10s | 0:25 |
| Recording demo | 45s | 1:10 |
| AI Inference | 30s | 1:40 |
| Save & View | 20s | 2:00 |
| Marketplace + Token Vault | 25s | 2:25 |
| Architecture | 20s | 2:45 |
| Close | 15s | 3:00 |
