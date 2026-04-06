import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs">
              Built with Auth0 Token Vault
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Teach AI by doing.{" "}
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                Sell what it learns.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
              Record your screen, answer a few questions, and MimicAI builds an
              intelligent automation that understands <em>why</em> you do each
              step — not just what you clicked. Then sell it on the marketplace.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/record">
                <Button size="lg" className="text-sm px-6 h-11">
                  Start Recording
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button variant="outline" size="lg" className="text-sm px-6 h-11">
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative gradient blob */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-r from-blue-500/10 to-violet-500/10 blur-3xl" />
      </section>

      {/* How It Works */}
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              How MimicAI Works
            </h2>
            <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
              Four steps from manual task to sellable automation.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Record",
                description:
                  "Share your screen and perform the task as you normally would. MimicAI captures screenshots and uses AI Vision to read everything on screen.",
                color: "bg-blue-600",
              },
              {
                step: "2",
                title: "Teach",
                description:
                  'MimicAI asks "why?" like a curious apprentice — not just what you clicked, but the reasoning behind every decision, threshold, and exception.',
                color: "bg-violet-600",
              },
              {
                step: "3",
                title: "Automate",
                description:
                  "From your answers, MimicAI synthesizes IF/THEN rules, edge cases, and variables into an intelligent automation that makes decisions.",
                color: "bg-amber-600",
              },
              {
                step: "4",
                title: "Sell",
                description:
                  "Publish to the marketplace. Buyers install it and run on their own accounts. Auth0 Token Vault keeps everyone's credentials separate and secure.",
                color: "bg-green-600",
              },
            ].map((item) => (
              <div key={item.step} className="text-center sm:text-left">
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.color} text-white text-sm font-bold mb-4`}
                >
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Not just another Zapier
            </h2>
            <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
              Most automation tools replay sequences. MimicAI replays
              understanding.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-blue-200/50">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 mb-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                </div>
                <CardTitle className="text-base">
                  The Screen Is the API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AI Vision reads data directly from pixels — numbers, tables,
                  text — from any application. No API required. Automate legacy
                  desktop apps, PDF viewers, lab software, or anything that shows
                  data on screen.
                </p>
              </CardContent>
            </Card>

            <Card className="border-violet-200/50">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 mb-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
                </div>
                <CardTitle className="text-base">
                  Learns Why, Not Just What
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  MimicAI asks questions like a curious apprentice: &quot;Why did
                  you skip that row?&quot; &quot;Is 1.5 always the
                  threshold?&quot; It builds a reasoning model with IF/THEN
                  rules, edge cases, and variables.
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200/50">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700 mb-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" /></svg>
                </div>
                <CardTitle className="text-base">
                  Marketplace Economy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Creators publish intelligent automations. Buyers install them
                  and run on their own accounts. Auth0 Token Vault ensures every
                  user&apos;s credentials are isolated and secure — zero tokens
                  in our database.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Example Scenario */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              See it in action
            </h2>
            <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
              A lab technician records themselves copying spectrophotometer data
              into a spreadsheet. Here&apos;s what MimicAI learns:
            </p>
          </div>
          <div className="mx-auto max-w-3xl space-y-4">
            {[
              {
                ai: 'I see a program with a table of numbers. What software is this?',
                user: "It's SpectroPro. The columns are wavelength and absorbance values.",
                learned: "App: SpectroPro | Schema: {wavelength: nm, absorbance: float}",
              },
              {
                ai: "You selected rows 1-8 but not row 9. Why did you skip row 9?",
                user: "Row 9 is the blank control. I never include the blank in results.",
                learned: "RULE: IF row_type == 'control' THEN skip",
              },
              {
                ai: "I see you typed =B3*10. Is 10 always the multiplier?",
                user: "That's the dilution factor. It's usually 10 but sometimes 5 or 20.",
                learned: "VARIABLE: dilution_factor (user_input, default=10)",
              },
              {
                ai: "You colored cells C5 and C7 red. Why these specific cells?",
                user: "Any concentration above 1.5 fails quality control.",
                learned: "RULE: IF concentration > 1.5 THEN mark_as_failed + color_red",
              },
              {
                ai: "You opened Gmail. Is this related to the analysis?",
                user: "Yes. When there are failed samples, I email my supervisor.",
                learned: "RULE: IF any_failed THEN email_supervisor(failed_list)",
              },
            ].map((qa, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-xs font-bold shrink-0 mt-0.5">
                    AI
                  </div>
                  <div className="rounded-lg bg-violet-50 border border-violet-200/50 px-4 py-2.5 text-sm flex-1">
                    {qa.ai}
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="rounded-lg bg-background border px-4 py-2.5 text-sm max-w-[80%]">
                    {qa.user}
                  </div>
                </div>
                <div className="ml-10 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <code className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded whitespace-nowrap">
                    {qa.learned}
                  </code>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </div>
            ))}
            <p className="text-center text-sm text-muted-foreground pt-4">
              Result: an intelligent automation that reads screens, applies
              rules, handles edge cases, and only emails when failures exist.
            </p>
          </div>
        </div>
      </section>

      {/* Auth0 Token Vault */}
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <Badge variant="outline" className="mb-4 text-xs">
                Powered by Auth0
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Token Vault keeps credentials safe
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Every user&apos;s OAuth tokens for Gmail, Google Sheets, and
                Slack are stored in Auth0 Token Vault — never in our database.
                When a buyer installs an automation, they connect their own
                accounts through Auth0&apos;s consent flow. The creator never
                sees the buyer&apos;s tokens.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Zero tokens stored in our database",
                  "Per-user credential isolation via Token Vault",
                  "Automatic token refresh handled by Auth0",
                  "Secure consent flow for each connected service",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Gmail", color: "bg-red-100 text-red-700 border-red-200" },
                { name: "Google Sheets", color: "bg-green-100 text-green-700 border-green-200" },
                { name: "Slack", color: "bg-purple-100 text-purple-700 border-purple-200" },
                { name: "More soon...", color: "bg-gray-100 text-gray-500 border-gray-200 border-dashed" },
              ].map((svc) => (
                <div
                  key={svc.name}
                  className={`rounded-xl border-2 p-6 text-center font-medium text-sm ${svc.color}`}
                >
                  {svc.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Providers */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Choose your AI engine
            </h2>
            <p className="mt-2 text-muted-foreground">
              Bring your own API key. Switch providers anytime.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 max-w-2xl mx-auto">
            {[
              {
                name: "Gemini 2.5 Flash",
                badge: "Default — Cheapest",
                cost: "$0.23/session",
                badgeColor: "bg-blue-100 text-blue-700",
              },
              {
                name: "GPT-4o",
                badge: "Premium",
                cost: "$1.34/session",
                badgeColor: "bg-green-100 text-green-700",
              },
              {
                name: "Claude Sonnet 4",
                badge: "Premium",
                cost: "$1.76/session",
                badgeColor: "bg-amber-100 text-amber-700",
              },
            ].map((provider) => (
              <Card key={provider.name} className="text-center">
                <CardContent className="pt-6">
                  <Badge
                    variant="secondary"
                    className={`mb-3 text-[10px] ${provider.badgeColor}`}
                  >
                    {provider.badge}
                  </Badge>
                  <p className="font-semibold">{provider.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{provider.cost}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to teach your first AI agent?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
            Record a 5-minute workflow, answer a few questions, and publish an
            automation that anyone can install.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/record">
              <Button size="lg" className="text-sm px-8 h-11">
                Start Recording
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" size="lg" className="text-sm px-8 h-11">
                Explore Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
