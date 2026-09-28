import {
  isValidFragment,
  validateFragment,
  validateFragments,
  ValidationError,
} from "../src/index.js";
import { describe, it, expect } from "@jest/globals";

describe("Validator Module", () => {
  describe("isValidFragment", () => {
    describe.each([
      ["12", 2],
      ["00", 2],
      ["248460", 6],
      ["012345", 6],
      ["9876543210", 10],
    ])("valid fragments", (validInput) => {
      it(`should return true for valid numeric fragment "${validInput}"`, () => {
        expect(isValidFragment(validInput)).toBe(true);
      });
    });

    describe.each([
      ["", "empty string"],
      ["1", "single digit"],
      ["9", "single digit 9"],
      ["0", "single digit 0"],
    ])("fragments shorter than 2 digits", (shortInput, description) => {
      it(`should return false for ${description} ("${shortInput}")`, () => {
        expect(isValidFragment(shortInput)).toBe(false);
      });
    });

    describe.each([
      ["12A456", "alphanumeric string"],
      ["12-34", "hyphenated numbers"],
      ["-1234", "negative number with sign"],
      ["12.34", "decimal number"],
      [" 1234 ", "string with surrounding whitespace"],
      ["abc", "letters only"],
      ["12 34", "string with inner space"],
    ])("invalid characters", (invalidInput, description) => {
      it(`should return false for ${description} ("${invalidInput}")`, () => {
        expect(isValidFragment(invalidInput)).toBe(false);
      });
    });

    describe.each([
      [1234, "number"],
      [null, "null"],
      [undefined, "undefined"],
      [{}, "object"],
      [[], "array"],
      [true, "boolean"],
    ])("non-string values", (nonStringInput, typeName) => {
      it(`should return false for ${typeName} input`, () => {
        expect(isValidFragment(nonStringInput)).toBe(false);
      });
    });
  });

  describe("validateFragment", () => {
    describe.each(["248460", "0123", "99", "100000"])("valid fragments", (validInput) => {
      it(`should not throw for valid fragment "${validInput}"`, () => {
        expect(() => validateFragment(validInput)).not.toThrow();
        expect(() => validateFragment(validInput, 0)).not.toThrow();
      });
    });

    describe.each([
      ["", "empty"],
      ["1", "too short"],
      ["7", "too short"],
    ])("fragments shorter than 2 digits", (shortInput) => {
      it(`should throw ValidationError for fragment "${shortInput}" shorter than 2 digits`, () => {
        expect(() => validateFragment(shortInput)).toThrow(ValidationError);
      });
    });

    describe.each([
      ["12A456", "non-digit character A"],
      ["12-34", "hyphen"],
      ["abc", "letters"],
      ["60801a", "trailing letter"],
    ])("fragments with invalid characters", (invalidInput) => {
      it(`should throw ValidationError for fragment "${invalidInput}" with invalid characters`, () => {
        expect(() => validateFragment(invalidInput)).toThrow(ValidationError);
      });
    });

    describe.each([
      [12345, "number"],
      [null, "null"],
      [undefined, "undefined"],
    ])("non-string fragment inputs", (nonString, typeName) => {
      it(`should throw ValidationError when fragment is ${typeName}`, () => {
        expect(() => validateFragment(nonString as unknown as string)).toThrow(ValidationError);
      });
    });
  });

  describe("validateFragments", () => {
    it("should accept valid arrays of fragments and empty arrays", () => {
      const validCases: string[][] = [
        [],
        ["248460"],
        ["248460", "177092", "608017", "921532"],
        ["00", "01", "10"],
      ];

      for (const validList of validCases) {
        expect(() => validateFragments(validList)).not.toThrow();
      }
    });

    describe.each([
      [["248460", "1", "608017"], "shorter than 2 digits"],
      [["248460", "", "608017"], "empty string"],
      [["248460", "177092", "12A456"], "invalid characters"],
      [["abc", "177092"], "non-numeric characters"],
    ])("invalid fragments array: %s (%s)", (invalidList) => {
      it("should throw ValidationError", () => {
        expect(() => validateFragments(invalidList)).toThrow(ValidationError);
      });
    });

    it("should throw ValidationError if input is not an array", () => {
      expect(() => validateFragments("not-an-array" as unknown as unknown[])).toThrow(ValidationError);
    });
  });
});
