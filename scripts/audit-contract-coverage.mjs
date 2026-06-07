import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const startedAt = new Date();
function localDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const date = process.env.EVIDENCE_DATE || localDate(startedAt);
const root = process.cwd();
const contractsDir = path.join(root, "docs", "contracts", "api");
const matrixPath = path.join(root, "docs", "release", "backend-coverage-matrix.md");
const evidenceDir = path.join(root, "docs", "release", "evidence", date, "G-005-contract-adoption");

function parseCoverageRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .slice(1)
    .map((line) => line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 6)
    .map(([module, mountedRoute, contract, automatedEvidence, frontendConsumer, status]) => ({
      automatedEvidence,
      contract,
      frontendConsumer,
      module,
      mountedRoute,
      status,
    }));
}

function extractContractNames(contractCell) {
  return [...contractCell.matchAll(/`([^`]+\.md)`/g)].map((match) => match[1]);
}

await mkdir(evidenceDir, { recursive: true });

const [matrixMarkdown, contractFiles] = await Promise.all([
  readFile(matrixPath, "utf8"),
  readdir(contractsDir),
]);

const rows = parseCoverageRows(matrixMarkdown);
const contractSet = new Set(contractFiles.filter((file) => file.endsWith(".md")));
const issues = [];
const modules = rows.map((row) => {
  const expectedContracts = extractContractNames(row.contract);
  const missingContracts = expectedContracts.filter((contract) => !contractSet.has(contract));
  const covered = row.status.includes("COVERED");

  if (!expectedContracts.length) {
    issues.push({ module: row.module, reason: "NO_CONTRACT_REFERENCE" });
  }
  if (missingContracts.length) {
    issues.push({ missingContracts, module: row.module, reason: "MISSING_CONTRACT_FILE" });
  }
  if (!covered) {
    issues.push({ module: row.module, reason: "STATUS_NOT_COVERED", status: row.status });
  }

  return {
    contracts: expectedContracts,
    frontendConsumer: row.frontendConsumer,
    module: row.module,
    mountedRoute: row.mountedRoute,
    status: row.status,
  };
});

const orphanedContractFiles = [...contractSet].filter((file) => !matrixMarkdown.includes(`\`${file}\``));
const result = issues.length === 0 ? "PASS" : "FAIL";

const manifest = {
  command: "node scripts/audit-contract-coverage.mjs",
  contractFileCount: contractSet.size,
  externalEvidenceStatus: result === "PASS" ? "AUTOMATED_CONTRACT_ADOPTION_AUDIT_PASSED" : "CONTRACT_ADOPTION_AUDIT_FAILED",
  finishedAt: new Date().toISOString(),
  gate: "G-005",
  issues,
  modules,
  orphanedContractFiles,
  result,
  startedAt: startedAt.toISOString(),
};

await writeFile(path.join(evidenceDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  path.join(evidenceDir, "summary.md"),
  [
    "# Contract Adoption Audit",
    "",
    `- Result: ${result}`,
    `- Modules checked: ${modules.length}`,
    `- Canonical contract files: ${contractSet.size}`,
    `- Issues: ${issues.length}`,
    `- Orphaned contract docs: ${orphanedContractFiles.length ? orphanedContractFiles.join(", ") : "None"}`,
    "",
    "This artifact proves the backend coverage matrix references existing canonical API contract files and marks active MVP modules as covered. It does not replace manual release signoff.",
    "",
  ].join("\n"),
);

if (issues.length) {
  console.error(JSON.stringify({ issues, result }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ artifact: path.relative(root, evidenceDir), modules: modules.length, result }, null, 2));
