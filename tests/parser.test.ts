import { parseFragments, readAndParseFile, readAndParseFileSync } from "../src/parser.js";
import { ValidationError } from "../src/index.js";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

describe("Parser Module", () => {
  describe("parseFragments", () => {
    describe.each([
      {
        name: "space separated tokens",
        input: "248460 177092 608017 921532",
        expected: ["248460", "177092", "608017", "921532"],
      },
      {
        name: "newline separated tokens",
        input: "248460\n177092\n608017\n921532",
        expected: ["248460", "177092", "608017", "921532"],
      },
      {
        name: "windows CRLF newline separated tokens",
        input: "248460\r\n177092\r\n608017\r\n921532",
        expected: ["248460", "177092", "608017", "921532"],
      },
      {
        name: "mixed spaces, tabs, and newlines with multiple consecutive separators",
        input: "\n  248460 \t\n  177092\n\n608017   \t 921532\n",
        expected: ["248460", "177092", "608017", "921532"],
      },
      {
        name: "fragments preserving leading zeros",
        input: "0123 0099 0001",
        expected: ["0123", "0099", "0001"],
      },
    ])("whitespace splitting: $name", ({ input, expected }) => {
      it("should parse into expected tokens", () => {
        const tokens = parseFragments(input);
        expect(tokens).toEqual(expected);
      });
    });

    describe.each([
      ["empty string", ""],
      ["spaces only", "   "],
      ["tabs and newlines only", "\t\n\r\n  \n"],
    ])("empty input: %s", (_, emptyInput) => {
      it("should return an empty array", () => {
        expect(parseFragments(emptyInput)).toEqual([]);
      });
    });

    describe.each([
      ["invalid character in token", "248460 12A456 608017"],
      ["token shorter than 2 digits", "248460 1 608017"],
      ["negative token", "248460 -1770 608017"],
    ])("validation errors: %s", (_, invalidInput) => {
      it("should throw ValidationError", () => {
        expect(() => parseFragments(invalidInput)).toThrow(ValidationError);
      });
    });

    it("should throw TypeError for non-string inputs", () => {
      expect(() => parseFragments(null as unknown as string)).toThrow(TypeError);
      expect(() => parseFragments(12345 as unknown as string)).toThrow(TypeError);
    });
  });

  describe("File reading helpers (readAndParseFile & readAndParseFileSync)", () => {
    const tempFilePath = join(tmpdir(), `test-fragments-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    const sampleFragments = ["248460", "177092", "608017", "921532"];

    beforeAll(() => {
      writeFileSync(tempFilePath, sampleFragments.join("\n"), "utf-8");
    });

    afterAll(() => {
      try {
        unlinkSync(tempFilePath);
      } catch {
        // ignore
      }
    });

    it("should read and parse file asynchronously", async () => {
      const fragments = await readAndParseFile(tempFilePath);
      expect(fragments).toEqual(sampleFragments);
    });

    it("should read and parse file synchronously", () => {
      const fragments = readAndParseFileSync(tempFilePath);
      expect(fragments).toEqual(sampleFragments);
    });

    it("should throw a clear error when file does not exist", async () => {
      const nonExistentPath = join(tmpdir(), `non-existent-${Date.now()}.txt`);
      await expect(readAndParseFile(nonExistentPath)).rejects.toThrow(`File not found: "${nonExistentPath}"`);
      expect(() => readAndParseFileSync(nonExistentPath)).toThrow(`File not found: "${nonExistentPath}"`);
    });
  });
});
