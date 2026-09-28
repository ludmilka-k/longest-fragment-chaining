import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { validateFragments } from "./validator.js";

/**
 * Parses raw text input into a validated array of fragment strings.
 * Splits on arbitrary whitespace (spaces, tabs, newlines) and strips empty entries.
 *
 * @param content - The raw string containing numeric fragments.
 * @returns Array of validated numeric fragment strings.
 */
export function parseFragments(content: string): string[] {
  if (typeof content !== "string") {
    throw new TypeError(`Input content must be a string, got ${typeof content}`);
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const tokens = trimmed.split(/\s+/).filter((token) => token.length > 0);
  validateFragments(tokens);
  return tokens;
}

/**
 * Asynchronously reads a file from disk and parses its contents into fragments.
 *
 * @param filePath - The path to the text file.
 * @returns Promise resolving to an array of validated fragment strings.
 */
export async function readAndParseFile(filePath: string): Promise<string[]> {
  try {
    const fileContent = await readFile(filePath, "utf-8");
    return parseFragments(fileContent);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "ENOENT"
    ) {
      throw new Error(`File not found: "${filePath}"`);
    }
    throw error;
  }
}

/**
 * Synchronously reads a file and parses its contents into fragments.
 *
 * @param filePath - The path to the text file.
 * @returns Array of validated fragment strings.
 */
export function readAndParseFileSync(filePath: string): string[] {
  try {
    const fileContent = readFileSync(filePath, "utf-8");
    return parseFragments(fileContent);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "ENOENT"
    ) {
      throw new Error(`File not found: "${filePath}"`);
    }
    throw error;
  }
}
