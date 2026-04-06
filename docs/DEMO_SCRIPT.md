# MimicAI — 3-Minute Demo Script

**Total time: 3:00**

---

## [0:00–0:20] Hook — The Problem (20s)

> *Show: Landing page hero*

"Every day, millions of people do the same repetitive task: open one app, read data, switch to another app, type it in. Copy-paste workflows that take 20 minutes but feel like an eternity.

The problem? Most of these source apps have no API. You can't automate what you can't connect to.

**MimicAI changes that.** It reads your screen like a human apprentice — and learns not just WHAT you do, but WHY."

---

## [0:20–1:00] Record & Teach (40s)

> *Show: Click "Start Recording" → Record page*

"Let's say I'm a lab technician copying spectrophotometer readings into Google Sheets every day."

> *Show: Start screen capture → browser shows a spreadsheet and a data source*

"I share my screen and start working normally. MimicAI captures screenshots every 2 seconds and uses AI Vision to read everything on screen — numbers, tables, text — directly from pixels."

> *Show: Action timeline populating with detected actions*

"Watch the action timeline build in real time. MimicAI sees I'm reading data from SpectroPro, switching to Google Sheets, and pasting values."

> *Show: Stop recording → Learning flow appears*

"Now here's where the magic happens. MimicAI doesn't just record a macro — it starts asking questions."

> *Show: Q&A conversation*

"'Why did you skip row 9?' — Because it's a blank control. 'Is 10 always the multiplier?' — No, that's a dilution factor that changes per experiment. 'Why did you color those cells red?' — Because concentrations above 1.5 fail quality control."

---

## [1:00–1:30] The Reasoning Model (30s)

> *Show: Understanding panel with rules, edge cases, variables*

"From my answers, MimicAI synthesized a reasoning model. Not a dumb sequence — actual intelligence:

- **Rules**: IF concentration > 1.5 THEN mark as failed
- **Variables**: dilution_factor — user inputs this each run
- **Edge cases**: IF all samples pass, no email needed

I can edit any of these rules right here. This is a workflow that THINKS."

> *Show: Click 'Complete' → Workflow detail page*

"One click and it's saved as a workflow. I can test it, tweak it, and when I'm ready..."

---

## [1:30–2:00] Publish & Marketplace (30s)

> *Show: Click 'Publish' on workflow detail page*

"I publish it to the marketplace."

> *Show: Navigate to Marketplace → browse listings*

"Other scientists can now find my automation. They see exactly what it does — the steps, the rules, the edge cases. Full transparency."

> *Show: Click into a marketplace listing → detail page*

"They can see: 5 steps, 3 rules, 1 variable. It requires Google Sheets and Gmail. And they can see the actual IF/THEN logic — no black box."

---

## [2:00–2:30] Install with Token Vault (30s)

> *Show: Install flow panel on the right*

"Here's the key part — and this is where **Auth0 Token Vault** comes in."

> *Show: Click 'Connect' for Gmail → 'Connect' for Sheets*

"The buyer connects their OWN Gmail and Google Sheets accounts through Auth0's consent flow. Their tokens are stored in Token Vault — never in our database. I, as the creator, never see their credentials."

> *Show: Click 'Install — Free'*

"One click to install. Now they can run MY automation on THEIR accounts."

> *Show: Token Vault security notice*

"Zero tokens stored in our database. Per-user credential isolation. Automatic token refresh. This is Auth0 Token Vault doing what it was built for."

---

## [2:30–2:50] The Big Picture (20s)

> *Show: Landing page "Not just another Zapier" section*

"Most automation tools replay sequences — they break when anything changes. MimicAI replays UNDERSTANDING.

The screen is the API. Any app that shows data on screen can be automated — legacy software, lab equipment, PDFs, anything.

And the multi-provider AI engine means users choose their own provider: Gemini for $0.23 per session, or GPT-4o and Claude for premium quality."

---

## [2:50–3:00] Close (10s)

> *Show: Landing page hero*

"MimicAI. Teach AI by doing. Sell what it learns. Built with Auth0 Token Vault.

Thank you."

---

## Demo Tips

- **Pre-seed the database** with 2-3 published workflows so the marketplace isn't empty
- **Have a mock recording ready** — don't rely on live AI calls during the demo
- **Resize browser to 1280x720** for clean screen recording
- **Use the spectrophotometer example** — judges remember concrete stories, not abstract features
- **Highlight Auth0 Token Vault** at least twice — it's the hackathon requirement
