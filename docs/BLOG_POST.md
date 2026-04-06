# The Screen Is the Only API You Need: Building MimicAI with Auth0 Token Vault

## The Problem Nobody Talks About

There's a dirty secret in the automation world: most of the tasks people want to automate don't have APIs.

A lab technician copies spectrophotometer readings into a spreadsheet. A medical coder reads patient charts from a legacy EHR system and enters billing codes. An accountant reads values from a PDF bank statement and types them into QuickBooks.

These people spend hours every day on repetitive data transfer — and tools like Zapier can't help them, because the source application has no API connector. The data exists only as pixels on a screen.

We built MimicAI to solve this. And it starts with a radical premise: **what if the screen itself is the API?**

## How MimicAI Works

MimicAI is a platform where users record their screen to teach AI agents repetitive workflows, then sell those learned automations on a marketplace.

But it's not a screen macro recorder. It's more like an apprentice that watches over your shoulder, asks questions, and builds a mental model of your work.

### Step 1: Record Your Screen

The user shares their screen via the browser's MediaStream API. Every 2 seconds, MimicAI captures a screenshot and sends it to an AI Vision model (Gemini 2.5 Flash by default — the cheapest option with excellent vision quality).

The AI does two things with each screenshot:

1. **Action Recognition**: What is the user doing? Clicking, typing, switching apps, scrolling.
2. **Data Extraction**: What data is visible on screen? Numbers, tables, text — read directly from pixels with high precision.

This dual capability is the core innovation. The AI reads the screen like a human does. No API required. No CSV export. No copy-paste.

### Step 2: The Curious Kid

After recording, MimicAI doesn't just save a sequence. It enters what we call "Curious Kid Mode" — asking questions about every step to understand the reasoning behind each action.

For a lab technician copying spectrophotometer data:

- **"I see you selected rows 1-8 but skipped row 9. Why?"**
  - "Row 9 is the blank control. I never include it."
  - *MimicAI learns: RULE: IF row_type == "control" THEN skip*

- **"You typed =B3\*10. Is 10 always the multiplier?"**
  - "That's the dilution factor. It changes per experiment."
  - *MimicAI learns: VARIABLE: dilution_factor (user_input, default=10)*

- **"You colored cells C5 and C7 red. Why?"**
  - "Concentration above 1.5 means the sample failed QC."
  - *MimicAI learns: RULE: IF concentration > 1.5 THEN mark_as_failed*

This isn't a simple clarification system. It's the core intelligence of the platform. The AI asks about identity ("what is this software?"), reasoning ("why did you do this?"), rules ("is this always the case?"), and edge cases ("what if all samples pass?").

### Step 3: The Reasoning Model

From the Q&A, MimicAI synthesizes a reasoning model — not a sequence, but a set of rules, variables, and conditions:

1. Read data from SpectroPro screen (skip controls)
2. Paste into Sheets at next empty row
3. Calculate concentration = absorbance x `$dilution_factor`
4. IF concentration > 1.5 → mark as failed (red)
5. IF any failures → email supervisor with details
6. IF all pass → no email needed

This is an intelligent workflow that makes decisions. When a buyer installs it, they get an automation that understands what to look for, knows why each step matters, handles edge cases, and asks for variables that change between runs.

### Step 4: The Marketplace

Creators publish their workflows. Buyers browse, see exactly what rules and logic drive the automation (full transparency), install with one click, and run on their own accounts.

## Auth0 Token Vault: The Trust Layer

The marketplace creates an interesting security challenge. Creator A builds an automation that writes to Google Sheets. Buyer B installs it and runs it on their own Sheets account. How do you keep their credentials isolated?

**Auth0 Token Vault.**

Here's how it works in MimicAI:

1. **Creator connects services during recording** — Auth0 consent flow → Token Vault stores creator's OAuth tokens
2. **Buyer clicks "Install"** — Auth0 consent flow for each required service → Token Vault stores buyer's tokens separately
3. **Automation runs** — MimicAI fetches the buyer's token from Token Vault → makes the API call → token never touches our database
4. **Token refresh** — Handled automatically by Auth0, not by us

The result: **zero tokens in our database.** Every user's credentials are isolated in Token Vault. The creator never sees the buyer's tokens. We never see anyone's tokens.

This isn't just a security feature — it's the architecture that makes a marketplace of automations possible. Without credential isolation, you can't have strangers running automations on each other's behalf.

## Multi-Provider AI Engine

Different users have different budgets and quality requirements. MimicAI supports three AI Vision providers:

| Provider | Cost per 5-min Session | Quality |
|----------|----------------------|---------|
| Gemini 2.5 Flash | $0.23 | Great for most use cases |
| GPT-4o | $1.34 | Premium vision quality |
| Claude Sonnet 4 | $1.76 | Best reasoning |

Users bring their own API key and choose their provider in Settings. The system uses a provider-agnostic interface — same prompts, same data flow, different backends.

Gemini is the default because it's the cheapest with excellent vision quality. For a lab technician who records 3-4 workflows, that's under a dollar in AI costs.

## The Bigger Vision

MimicAI isn't just about automating one person's workflow. It's about creating a marketplace where domain expertise becomes a tradeable asset.

The lab technician who's spent 10 years perfecting their spectrophotometer-to-spreadsheet process can package that expertise as an automation. A new hire at another lab installs it and instantly gets the benefit of that experience — including the edge cases, the QC thresholds, and the exception handling that would take months to learn.

The screen is the only universal interface. Every application, from a 1990s lab instrument to a modern SaaS tool, has one thing in common: it shows data on a screen. MimicAI turns that screen into an API, and AI Vision into the integration layer.

**Teach AI by doing. Sell what it learns.**

---

*MimicAI was built for the Auth0 hackathon using Next.js 14, Auth0 Token Vault, and multi-provider AI Vision (Gemini, OpenAI, Claude). The entire platform — from screen capture to marketplace — is open source.*
