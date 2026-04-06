import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding MimicAI demo data...\n");

  // --- Users ---
  const creator = await prisma.user.upsert({
    where: { id: "demo-creator" },
    update: {},
    create: {
      id: "demo-creator",
      email: "sarah@labcorp.io",
      auth0Id: "auth0|demo-creator",
      displayName: "Sarah Chen",
      avatarUrl: null,
    },
  });

  const creator2 = await prisma.user.upsert({
    where: { id: "demo-creator-2" },
    update: {},
    create: {
      id: "demo-creator-2",
      email: "mike@finance.co",
      auth0Id: "auth0|demo-creator-2",
      displayName: "Mike Rodriguez",
      avatarUrl: null,
    },
  });

  const creator3 = await prisma.user.upsert({
    where: { id: "demo-creator-3" },
    update: {},
    create: {
      id: "demo-creator-3",
      email: "priya@devops.io",
      auth0Id: "auth0|demo-creator-3",
      displayName: "Priya Sharma",
      avatarUrl: null,
    },
  });

  const buyer = await prisma.user.upsert({
    where: { id: "demo-buyer" },
    update: {},
    create: {
      id: "demo-buyer",
      email: "alex@biotech.com",
      auth0Id: "auth0|demo-buyer",
      displayName: "Alex Thompson",
      avatarUrl: null,
    },
  });

  console.log("  Users created:", [creator.displayName, creator2.displayName, creator3.displayName, buyer.displayName].join(", "));

  // --- Workflow 1: Spectrophotometer → Google Sheets ---
  const wf1 = await prisma.workflow.upsert({
    where: { id: "demo-wf-spectro" },
    update: {},
    create: {
      id: "demo-wf-spectro",
      name: "Spectrophotometer → Google Sheets QC Report",
      description:
        "Reads absorbance data from SpectroPro software, calculates concentrations with a dilution factor, flags failed QC samples (>1.5), and emails supervisor when failures are found. Learned from a lab technician's daily workflow.",
      creatorId: creator.id,
      services: ["sheets", "gmail"],
      steps: [
        {
          id: "step-1",
          order: 1,
          type: "read_screen",
          service: null,
          action: "extract_table_data",
          parameters: {
            sourceApp: "SpectroPro",
            expectedData: { wavelength: "number", absorbance: "number" },
            filter: "exclude rows where label contains 'blank' or 'control'",
          },
          purpose: "Read absorbance readings from spectrophotometer software",
          isConditional: false,
          condition: null,
          inputFrom: "screen",
          outputTo: "step-2",
        },
        {
          id: "step-2",
          order: 2,
          type: "write_api",
          service: "sheets",
          action: "append_rows",
          parameters: {
            spreadsheetId: "{{target_spreadsheet}}",
            range: "find_next_empty_row(B)",
            values: "{{extracted_data}}",
          },
          purpose: "Paste readings into Google Sheets at next empty row",
          isConditional: false,
          condition: null,
          inputFrom: "step-1",
          outputTo: "step-3",
        },
        {
          id: "step-3",
          order: 3,
          type: "transform",
          service: "sheets",
          action: "apply_formula",
          parameters: {
            formula: "absorbance * {{dilution_factor}}",
            targetColumn: "C",
          },
          purpose: "Calculate concentration = absorbance x dilution factor",
          isConditional: false,
          condition: null,
          inputFrom: "step-2",
          outputTo: "step-4",
        },
        {
          id: "step-4",
          order: 4,
          type: "decision",
          service: "sheets",
          action: "conditional_format",
          parameters: {
            condition: "concentration > 1.5",
            action: "color_red",
            label: "FAILED",
          },
          purpose: "Flag failed QC samples — concentration above 1.5 means failure",
          isConditional: false,
          condition: null,
          inputFrom: "step-3",
          outputTo: "step-5",
        },
        {
          id: "step-5",
          order: 5,
          type: "notify",
          service: "gmail",
          action: "send_email",
          parameters: {
            to: "{{supervisor_email}}",
            subject: "QC Failures Detected — {{date}}",
            body: "The following samples failed QC (concentration > 1.5): {{failed_samples}}",
          },
          purpose: "Email supervisor with failed sample details",
          isConditional: true,
          condition: "any samples have concentration > 1.5",
          inputFrom: "step-4",
          outputTo: null,
        },
      ],
      rules: [
        {
          id: "rule-1",
          condition: "row label contains 'blank' OR row type is 'control'",
          action: "Skip this row — do not include in results",
          source: "Q&A: User explained row 9 is always the blank control",
          confidence: 0.95,
        },
        {
          id: "rule-2",
          condition: "concentration > 1.5",
          action: "Mark cell red, label as FAILED, add to failure list",
          source: "Q&A: User colors cells red when concentration exceeds QC threshold",
          confidence: 0.98,
        },
        {
          id: "rule-3",
          condition: "ANY sample fails QC",
          action: "Send email to supervisor with failed sample IDs and values",
          source: "Q&A: User emails supervisor whenever there are failures",
          confidence: 0.92,
        },
        {
          id: "rule-4",
          condition: "ALL samples pass QC",
          action: "No email needed — workflow ends after formatting",
          source: "Q&A: Edge case — user confirmed no notification when everything passes",
          confidence: 0.90,
        },
      ],
      edgeCases: [
        {
          id: "edge-1",
          scenario: "Spectrophotometer shows an error reading instead of a number",
          response: "Skip that sample, add a note in the Comments column: 'Reading error — re-run needed'",
          source: "Q&A about what happens with bad readings",
        },
        {
          id: "edge-2",
          scenario: "More than 20 samples in a single batch",
          response: "Continue on the same sheet — no need for a new tab. The sheet grows as needed.",
          source: "Q&A about handling large batches",
        },
        {
          id: "edge-3",
          scenario: "Dilution factor not provided before starting",
          response: "Pause and prompt user for input — cannot proceed without dilution factor",
          source: "Q&A about variable inputs",
        },
      ],
      variables: [
        {
          name: "dilution_factor",
          type: "number",
          source: "user_input",
          description: "Multiplier for converting absorbance to concentration (usually 5, 10, or 20)",
          default: 10,
        },
        {
          name: "supervisor_email",
          type: "string",
          source: "user_input",
          description: "Email address to notify when QC failures are detected",
          default: "supervisor@lab.com",
        },
        {
          name: "target_spreadsheet",
          type: "string",
          source: "user_input",
          description: "Google Sheets URL or ID for the results spreadsheet",
          default: null,
        },
      ],
      triggerType: "manual",
      requiresScreenCapture: true,
      sourceApp: "SpectroPro",
      isPublished: true,
      price: 0,
    },
  });

  // Create recording for wf1
  await prisma.recording.upsert({
    where: { id: "demo-rec-spectro" },
    update: {},
    create: {
      id: "demo-rec-spectro",
      workflowId: wf1.id,
      learnedSteps: [
        {
          id: "ls-1",
          observation: {
            sourceApp: "SpectroPro",
            action: "read_data",
            extractedData: {
              type: "table",
              values: {
                rows: [
                  { wavelength: 450, absorbance: 0.832 },
                  { wavelength: 500, absorbance: 0.654 },
                  { wavelength: 550, absorbance: 1.721 },
                ],
              },
            },
          },
          reasoning: {
            questions: [
              { category: "identity", question: "What software is this?", answer: "SpectroPro — it shows spectrophotometer readings" },
              { category: "reason", question: "Why did you skip row 9?", answer: "That's the blank control, I never include it" },
            ],
            rules: [{ condition: "row is blank/control", action: "skip" }],
          },
          understanding: {
            purposeDescription: "Read absorbance data from spectrophotometer, excluding control samples",
            conditionLogic: "IF row_label != 'blank' AND row_type != 'control'",
            isConditional: false,
            condition: null,
            consequences: ["Data is extracted for processing"],
          },
        },
      ],
      questions: [
        { category: "identity", question: "What software is this and what do these numbers represent?", answer: "SpectroPro. Columns are wavelength (nm) and absorbance." },
        { category: "reason", question: "Why did you skip row 9?", answer: "It's the blank control. I never include it." },
        { category: "rule", question: "Is 10 always the multiplier?", answer: "No, it's the dilution factor. Usually 10 but can be 5 or 20." },
        { category: "reason", question: "Why did you color those cells red?", answer: "Concentration above 1.5 means the sample failed QC." },
        { category: "edge_case", question: "What if all samples pass?", answer: "Then no email. I only email when there are failures." },
      ],
      extractedRules: wf1.rules,
      status: "complete",
    },
  });

  console.log("  Workflow 1:", wf1.name);

  // --- Workflow 2: Expense Report Automation ---
  const wf2 = await prisma.workflow.upsert({
    where: { id: "demo-wf-expense" },
    update: {},
    create: {
      id: "demo-wf-expense",
      name: "Receipt Scanner → Expense Report",
      description:
        "Reads receipt images from email attachments, extracts vendor name, amount, date, and category using AI Vision, then fills a Google Sheets expense report and sends a Slack summary to #finance.",
      creatorId: creator2.id,
      services: ["gmail", "sheets", "slack"],
      steps: [
        {
          id: "exp-step-1",
          order: 1,
          type: "read_screen",
          service: "gmail",
          action: "read_attachment",
          parameters: {
            filter: "subject contains 'receipt' OR has image attachment",
            extract: "receipt image",
          },
          purpose: "Find new receipt emails and extract the receipt image",
          isConditional: false,
          condition: null,
          inputFrom: null,
          outputTo: "exp-step-2",
        },
        {
          id: "exp-step-2",
          order: 2,
          type: "read_screen",
          service: null,
          action: "extract_receipt_data",
          parameters: {
            fields: ["vendor", "amount", "date", "category", "payment_method"],
          },
          purpose: "Use AI Vision to read vendor, amount, date from the receipt",
          isConditional: false,
          condition: null,
          inputFrom: "exp-step-1",
          outputTo: "exp-step-3",
        },
        {
          id: "exp-step-3",
          order: 3,
          type: "write_api",
          service: "sheets",
          action: "append_row",
          parameters: {
            targetSheet: "Expense Report {{month}}",
            columns: ["Date", "Vendor", "Amount", "Category", "Payment Method"],
          },
          purpose: "Add expense entry to the monthly expense report spreadsheet",
          isConditional: false,
          condition: null,
          inputFrom: "exp-step-2",
          outputTo: "exp-step-4",
        },
        {
          id: "exp-step-4",
          order: 4,
          type: "decision",
          service: null,
          action: "check_budget",
          parameters: {
            condition: "category_total > budget_limit",
            budgets: { meals: 500, travel: 2000, supplies: 300 },
          },
          purpose: "Check if category spending exceeds budget limit",
          isConditional: false,
          condition: null,
          inputFrom: "exp-step-3",
          outputTo: "exp-step-5",
        },
        {
          id: "exp-step-5",
          order: 5,
          type: "notify",
          service: "slack",
          action: "post_message",
          parameters: {
            channel: "#finance",
            message: "New expense: {{vendor}} — ${{amount}} ({{category}})",
          },
          purpose: "Post expense summary to #finance Slack channel",
          isConditional: true,
          condition: "amount > $50 OR category budget exceeded",
          inputFrom: "exp-step-4",
          outputTo: null,
        },
      ],
      rules: [
        {
          id: "exp-rule-1",
          condition: "expense amount > $50",
          action: "Post to Slack #finance channel for visibility",
          source: "Q&A: Company policy requires notification for expenses over $50",
          confidence: 0.95,
        },
        {
          id: "exp-rule-2",
          condition: "category total exceeds monthly budget",
          action: "Highlight row in yellow and add 'OVER BUDGET' note",
          source: "Q&A: User flags when a category goes over budget",
          confidence: 0.93,
        },
        {
          id: "exp-rule-3",
          condition: "receipt is blurry or unreadable",
          action: "Flag for manual review — add to 'Needs Review' tab",
          source: "Q&A: Edge case for poor quality receipts",
          confidence: 0.88,
        },
      ],
      edgeCases: [
        {
          id: "exp-edge-1",
          scenario: "Receipt in a foreign currency",
          response: "Convert to USD using the exchange rate from the receipt date, note original currency",
          source: "Q&A about international receipts",
        },
        {
          id: "exp-edge-2",
          scenario: "Multiple items on one receipt",
          response: "Split into separate line items if they belong to different categories",
          source: "Q&A about multi-category receipts",
        },
      ],
      variables: [
        {
          name: "month",
          type: "string",
          source: "user_input",
          description: "Which month's expense report to update (e.g., 'April 2026')",
          default: null,
        },
        {
          name: "budget_limit_meals",
          type: "number",
          source: "user_input",
          description: "Monthly budget limit for meals category",
          default: 500,
        },
      ],
      triggerType: "schedule",
      triggerConfig: { cron: "0 9 * * 1" },
      requiresScreenCapture: false,
      sourceApp: null,
      isPublished: true,
      price: 4.99,
    },
  });

  console.log("  Workflow 2:", wf2.name);

  // --- Workflow 3: Monitoring Dashboard → Slack Alerts ---
  const wf3 = await prisma.workflow.upsert({
    where: { id: "demo-wf-monitor" },
    update: {},
    create: {
      id: "demo-wf-monitor",
      name: "Grafana Dashboard → Slack Alerts",
      description:
        "Reads server metrics from a Grafana monitoring dashboard (no API needed!), detects anomalies like CPU > 85% or memory > 90%, and sends formatted Slack alerts to #devops with severity levels.",
      creatorId: creator3.id,
      services: ["slack"],
      steps: [
        {
          id: "mon-step-1",
          order: 1,
          type: "read_screen",
          service: null,
          action: "extract_metrics",
          parameters: {
            sourceApp: "Grafana",
            metrics: ["cpu_percent", "memory_percent", "disk_usage", "request_latency_p99"],
          },
          purpose: "Read current server metrics from Grafana dashboard panels",
          isConditional: false,
          condition: null,
          inputFrom: "screen",
          outputTo: "mon-step-2",
        },
        {
          id: "mon-step-2",
          order: 2,
          type: "decision",
          service: null,
          action: "evaluate_thresholds",
          parameters: {
            thresholds: {
              cpu: { warning: 75, critical: 90 },
              memory: { warning: 80, critical: 95 },
              latency_p99: { warning: 500, critical: 2000 },
            },
          },
          purpose: "Check metrics against warning and critical thresholds",
          isConditional: false,
          condition: null,
          inputFrom: "mon-step-1",
          outputTo: "mon-step-3",
        },
        {
          id: "mon-step-3",
          order: 3,
          type: "notify",
          service: "slack",
          action: "post_alert",
          parameters: {
            channel: "#devops",
            format: "severity_colored_block",
          },
          purpose: "Send formatted alert to #devops with severity level",
          isConditional: true,
          condition: "any metric exceeds warning threshold",
          inputFrom: "mon-step-2",
          outputTo: null,
        },
      ],
      rules: [
        {
          id: "mon-rule-1",
          condition: "CPU > 90% for more than 2 consecutive readings",
          action: "Send CRITICAL alert with @channel mention",
          source: "Q&A: User escalates persistent high CPU to wake up the team",
          confidence: 0.96,
        },
        {
          id: "mon-rule-2",
          condition: "metric is between warning and critical threshold",
          action: "Send WARNING alert (yellow) — no @channel mention",
          source: "Q&A: Warnings are informational, not urgent",
          confidence: 0.94,
        },
        {
          id: "mon-rule-3",
          condition: "all metrics are normal",
          action: "Do nothing — no alert needed",
          source: "Q&A: User confirmed no notification for healthy state",
          confidence: 0.97,
        },
      ],
      edgeCases: [
        {
          id: "mon-edge-1",
          scenario: "Grafana dashboard is loading or shows 'No data'",
          response: "Wait 10 seconds and retry once. If still no data, alert #devops that monitoring may be down.",
          source: "Q&A about dashboard unavailability",
        },
      ],
      variables: [
        {
          name: "cpu_critical_threshold",
          type: "number",
          source: "user_input",
          description: "CPU percentage that triggers a critical alert",
          default: 90,
        },
        {
          name: "alert_channel",
          type: "string",
          source: "user_input",
          description: "Slack channel for alerts",
          default: "#devops",
        },
      ],
      triggerType: "schedule",
      triggerConfig: { cron: "*/5 * * * *" },
      requiresScreenCapture: true,
      sourceApp: "Grafana",
      isPublished: true,
      price: 0,
    },
  });

  console.log("  Workflow 3:", wf3.name);

  // --- Workflow 4: Unpublished draft (for "My Workflows" view) ---
  const wf4 = await prisma.workflow.upsert({
    where: { id: "demo-wf-draft" },
    update: {},
    create: {
      id: "demo-wf-draft",
      name: "PDF Invoice → QuickBooks Entry",
      description: "Reads invoice data from PDF viewer and creates entries in QuickBooks. Still in draft — needs more edge case testing.",
      creatorId: creator.id,
      services: ["sheets"],
      steps: [
        {
          id: "draft-step-1",
          order: 1,
          type: "read_screen",
          service: null,
          action: "extract_invoice_data",
          parameters: { fields: ["vendor", "amount", "invoice_number", "due_date"] },
          purpose: "Read invoice details from PDF viewer",
          isConditional: false,
          condition: null,
          inputFrom: "screen",
          outputTo: "draft-step-2",
        },
        {
          id: "draft-step-2",
          order: 2,
          type: "write_api",
          service: "sheets",
          action: "append_row",
          parameters: { targetSheet: "Invoices" },
          purpose: "Log invoice in tracking spreadsheet",
          isConditional: false,
          condition: null,
          inputFrom: "draft-step-1",
          outputTo: null,
        },
      ],
      rules: [
        {
          id: "draft-rule-1",
          condition: "invoice amount > $10,000",
          action: "Flag for manager approval before processing",
          source: "Q&A: Company policy for large invoices",
          confidence: 0.91,
        },
      ],
      edgeCases: [],
      variables: [],
      triggerType: "manual",
      requiresScreenCapture: true,
      sourceApp: "Adobe Acrobat",
      isPublished: false,
      price: 0,
    },
  });

  console.log("  Workflow 4:", wf4.name, "(draft)");

  // --- Installations (buyer installed wf1 and wf3) ---
  await prisma.installation.upsert({
    where: { userId_workflowId: { userId: buyer.id, workflowId: wf1.id } },
    update: {},
    create: {
      userId: buyer.id,
      workflowId: wf1.id,
      connectedServices: ["sheets", "gmail"],
      isActive: true,
      lastRunAt: new Date("2026-04-04T14:30:00Z"),
    },
  });

  await prisma.installation.upsert({
    where: { userId_workflowId: { userId: buyer.id, workflowId: wf3.id } },
    update: {},
    create: {
      userId: buyer.id,
      workflowId: wf3.id,
      connectedServices: ["slack"],
      isActive: true,
      lastRunAt: new Date("2026-04-05T09:00:00Z"),
    },
  });

  console.log("  Installations: Alex installed 2 workflows");

  console.log("\nSeed complete! Demo data ready.");
  console.log("\nPublished marketplace listings:");
  console.log("  1. Spectrophotometer → Google Sheets QC Report (free)");
  console.log("  2. Receipt Scanner → Expense Report ($4.99)");
  console.log("  3. Grafana Dashboard → Slack Alerts (free)");
  console.log("\nDraft workflows:");
  console.log("  4. PDF Invoice → QuickBooks Entry (unpublished)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
