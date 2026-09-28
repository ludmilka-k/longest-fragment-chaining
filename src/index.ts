#!/usr/bin/env node
import { findLongestSequenceFromFile } from "./chain.js";
import { resolve } from "node:path";

export * from "./types.js";
export * from "./validator.js";
export * from "./parser.js";
export * from "./chain.js";

async function main(): Promise<void> {
  const filePathArg = process.argv[2] ?? "input.txt";
  const absolutePath = resolve(process.cwd(), filePathArg);

  try {
    console.log(`Processing file: ${filePathArg}`);
    const startTime = performance.now();
    const result = await findLongestSequenceFromFile(absolutePath);
    const durationMs = (performance.now() - startTime).toFixed(2);

    console.log("\n--- Longest Fragment Chain Result ---");
    console.log(`Sequence:        ${result.sequence}`);
    console.log(`Sequence Length: ${result.sequenceLength}`);
    console.log(`Fragments Used:  ${result.fragments}`);
    console.log(`Fragment Indexes: [${result.fragmentIndexes.join(", ")}]`);
    console.log(`Execution Time:  ${durationMs}ms\n`);
  } catch (error) {
    console.error("Error processing fragments:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

// Run CLI when executed directly
if (
  process.argv[1] &&
  (process.argv[1].endsWith("index.ts") || process.argv[1].endsWith("index.js"))
) {
  main();
}
