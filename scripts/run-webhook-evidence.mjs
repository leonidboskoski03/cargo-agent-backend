import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const startedAt = new Date();
const date = startedAt.toISOString().slice(0, 10);
const evidenceDir = path.resolve(process.cwd(), "docs", "release", "evidence", date, "G-003-webhook-replay");
const vitestPath = path.resolve(process.cwd(), "node_modules", "vitest", "vitest.mjs");
const args = [
  "run",
  "--maxWorkers=1",
  "--bail=1",
  "--hookTimeout=30000",
  "tests/integration/billingWebhookLifecycle.spec.ts",
  "tests/integration/subscriptionWebhookLifecycle.spec.ts",
  "tests/integration/jobSeekerWebhookIdempotency.spec.ts",
];

await mkdir(evidenceDir, { recursive: true });

const child = spawn(process.execPath, [vitestPath, ...args], {
  cwd: process.cwd(),
  env: process.env,
  shell: false,
});

let output = "";

child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  output += text;
  process.stdout.write(text);
});

child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  output += text;
  process.stderr.write(text);
});

const exitCode = await new Promise((resolve) => {
  child.on("close", resolve);
});

const finishedAt = new Date();
const stripeEventIds = (process.env.STRIPE_EVIDENCE_EVENT_IDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

await writeFile(path.join(evidenceDir, "vitest-output.txt"), output);
await writeFile(
  path.join(evidenceDir, "manifest.json"),
  `${JSON.stringify(
    {
      command: `node ${path.relative(process.cwd(), vitestPath)} ${args.join(" ")}`,
      duplicateMutationProof: exitCode === 0 ? "Automated replay/idempotency specs passed" : "Automated replay/idempotency specs failed",
      externalStripeEventIds: stripeEventIds,
      externalStripeEvidenceStatus: stripeEventIds.length ? "ATTACHED_BY_ENV" : "PENDING_REAL_STRIPE_OR_STAGING_EVENT_IDS",
      finishedAt: finishedAt.toISOString(),
      gate: "G-003",
      result: exitCode === 0 ? "PASS" : "FAIL",
      startedAt: startedAt.toISOString(),
    },
    null,
    2,
  )}\n`,
);

process.exit(typeof exitCode === "number" ? exitCode : 1);
