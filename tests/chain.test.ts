import {
  findLongestSequence,
  findLongestSequenceFromFile,
  findLongestSequenceFromFileSync,
  buildSequenceFromPath,
} from "../src/chain.js";
import type { ChainResult } from "../src/types.js";
import { ValidationError } from "../src/index.js";
import { join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

/**
 * Validates invariant properties of any valid ChainResult for a given input fragments array.
 * Ensures tests verify correct behavior dynamically rather than relying on hardcoded strings.
 */
function verifyValidChain(fragments: readonly string[], result: ChainResult): void {
  // 1. Fragment count must equal the number of indices in fragmentIndexes
  expect(result.fragments).toBe(result.fragmentIndexes.length);

  // 2. Empty input edge case
  if (fragments.length === 0 || result.fragments === 0) {
    expect(result.sequence).toBe("");
    expect(result.fragments).toBe(0);
    expect(result.fragmentIndexes).toEqual([]);
    return;
  }

  // 3. Fragment cannot be reused: all indices must be strictly unique
  const uniqueIndexes = new Set(result.fragmentIndexes);
  expect(uniqueIndexes.size).toBe(result.fragmentIndexes.length);
  expect(result.fragments).toBeLessThanOrEqual(fragments.length);

  // 4. All indices must be within the valid range [0, fragments.length - 1]
  for (const idx of result.fragmentIndexes) {
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(fragments.length);
  }

  // 5. Connecting condition: last 2 digits of the current fragment === first 2 digits of the next fragment
  for (let i = 0; i < result.fragmentIndexes.length - 1; i++) {
    const currentFrag = fragments[result.fragmentIndexes[i]!]!;
    const nextFrag = fragments[result.fragmentIndexes[i + 1]!]!;
    const suffix = currentFrag.slice(-2);
    const prefix = nextFrag.slice(0, 2);
    expect(suffix).toBe(prefix);
  }

  // 6. Sequence construction: start with the full first fragment, then append each subsequent fragment minus its first 2 digits
  let expectedSequence = fragments[result.fragmentIndexes[0]!]!;
  for (let i = 1; i < result.fragmentIndexes.length; i++) {
    const nextFrag = fragments[result.fragmentIndexes[i]!]!;
    expectedSequence += nextFrag.slice(2);
  }
  expect(result.sequence).toBe(expectedSequence);
}

describe("Chain Module", () => {
  describe("buildSequenceFromPath", () => {
    it("should return empty string for empty path", () => {
      expect(buildSequenceFromPath(["1234"], [])).toBe("");
    });

    it("should return single fragment if path has 1 item", () => {
      const fragments = ["1234", "3456"];
      expect(buildSequenceFromPath(fragments, [0])).toBe(fragments[0]);
    });

    it("should correctly concatenate overlapping fragments by overlapping 2 digits", () => {
      const fragments = ["248460", "177092", "608017", "921532"];
      const path = [0, 2, 1, 3];
      const sequence = buildSequenceFromPath(fragments, path);

      // Verify prefix of sequence starts with first fragment
      expect(sequence.startsWith(fragments[0]!)).toBe(true);
      // Verify total length = first fragment length + (sum of other fragments length - 2)
      const expectedLength =
        fragments[0]!.length +
        path.slice(1).reduce((acc, idx) => acc + (fragments[idx]!.length - 2), 0);
      expect(sequence.length).toBe(expectedLength);
      expect(sequence).toBe("248460801770921532");
    });
  });

  describe("findLongestSequence", () => {
    it("should handle empty input array", () => {
      const result = findLongestSequence([]);
      verifyValidChain([], result);
      expect(result.sequence).toBe("");
      expect(result.fragments).toBe(0);
      expect(result.fragmentIndexes).toEqual([]);
    });

    it("should handle single fragment input", () => {
      const input = ["123456"];
      const result = findLongestSequence(input);

      verifyValidChain(input, result);
      expect(result.fragments).toBe(1);
      expect(result.fragmentIndexes).toEqual([0]);
      expect(result.sequence).toBe(input[0]);
    });

    it("should handle disconnected fragments with no matching 2-digit overlaps", () => {
      const input = ["1122", "3344", "5566"];
      const result = findLongestSequence(input);

      verifyValidChain(input, result);
      expect(result.fragments).toBe(1);
      expect(input).toContain(result.sequence);
    });

    it("should correctly solve standard sequence chaining", () => {
      const input = ["248460", "177092", "608017", "921532"];
      const result = findLongestSequence(input);

      verifyValidChain(input, result);
      expect(result.fragments).toBe(input.length);
      expect(new Set(result.fragmentIndexes).size).toBe(input.length);
    });

    it("should choose the longest path when multiple paths of different lengths exist", () => {
      // Path 1 (length 2): 1020 -> 2030
      // Path 2 (length 4): 1099 -> 9988 -> 8877 -> 7766
      const input = ["1020", "2030", "1099", "9988", "8877", "7766"];
      const result = findLongestSequence(input);

      verifyValidChain(input, result);
      expect(result.fragments).toBe(4);
      expect(result.fragmentIndexes).toEqual([2, 3, 4, 5]);
    });

    describe("Fragment cannot be reused (Cycles & graph traversal)", () => {
      describe.each([
        {
          name: "2-fragment cycle (A -> B -> A)",
          input: ["1020", "2010"],
          expectedMaxFragments: 2,
        },
        {
          name: "3-fragment cycle (A -> B -> C -> A)",
          input: ["1020", "2030", "3010"],
          expectedMaxFragments: 3,
        },
        {
          name: "4-fragment cycle with cross branch",
          input: ["1020", "2030", "3040", "4010", "4099"],
          expectedMaxFragments: 5,
        },
      ])("$name", ({ input, expectedMaxFragments }) => {
        it("should never reuse any fragment and terminate without infinite loop", () => {
          const result = findLongestSequence(input);

          verifyValidChain(input, result);
          expect(result.fragments).toBe(expectedMaxFragments);
          // Crucial check: every fragment index must be unique
          const uniqueIndexes = new Set(result.fragmentIndexes);
          expect(uniqueIndexes.size).toBe(result.fragmentIndexes.length);
        });
      });
    });

    it("should handle duplicate fragment values as distinct indices", () => {
      const input = ["1020", "2010", "1020"];
      const result = findLongestSequence(input);

      verifyValidChain(input, result);
      expect(result.fragments).toBe(3);
      // Ensure all 3 distinct index positions were used
      expect(new Set(result.fragmentIndexes).size).toBe(3);
    });

    it("should preserve leading zeros throughout chaining", () => {
      const input = ["0120", "2005", "0501", "0199"];
      const result = findLongestSequence(input);

      verifyValidChain(input, result);
      expect(result.fragments).toBe(4);
      expect(result.sequence.startsWith("0120")).toBe(true);
    });

    describe("Validation on input fragments", () => {
      describe.each([
        [["1234", "12A456", "5678"], "invalid characters"],
        [["1234", "1", "5678"], "fragment shorter than 2 digits"],
        [["1234", "", "5678"], "empty fragment"],
        [["1234", "12-34", "3456"], "hyphenated fragment"],
      ])("invalid inputs: %p (%s)", (invalidInput) => {
        it("should throw ValidationError", () => {
          expect(() => findLongestSequence(invalidInput)).toThrow(ValidationError);
        });
      });
    });
  });

  describe("File reading chaining helpers", () => {
    const tempFilePath = join(tmpdir(), `test-chain-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    const fileFragments = ["248460", "177092", "608017", "921532"];

    beforeAll(() => {
      writeFileSync(tempFilePath, fileFragments.join("\n"), "utf-8");
    });

    afterAll(() => {
      try {
        unlinkSync(tempFilePath);
      } catch {
        // ignore
      }
    });

    it("should read file and compute chain asynchronously", async () => {
      const result = await findLongestSequenceFromFile(tempFilePath);
      verifyValidChain(fileFragments, result);
      expect(result.fragments).toBe(fileFragments.length);
    });

    it("should read file and compute chain synchronously", () => {
      const result = findLongestSequenceFromFileSync(tempFilePath);
      verifyValidChain(fileFragments, result);
      expect(result.fragments).toBe(fileFragments.length);
    });
  });
});
