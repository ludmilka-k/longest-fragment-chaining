export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function isValidFragment(fragment: unknown): fragment is string {
  if (typeof fragment !== "string") {
    return false;
  }
  if (fragment.length < 2) {
    return false;
  }
  return /^\d+$/.test(fragment);
}

export function validateFragment(fragment: unknown, index?: number): void {
  const prefix = index !== undefined ? `Fragment at index ${index}` : "Fragment";

  if (typeof fragment !== "string") {
    throw new ValidationError(`${prefix} must be a string, got ${typeof fragment}`);
  }

  if (fragment.length === 0) {
    throw new ValidationError(`${prefix} cannot be empty`);
  }

  if (fragment.length < 2) {
    throw new ValidationError(
      `${prefix} "${fragment}" is too short: must be at least 2 digits long`
    );
  }

  if (!/^\d+$/.test(fragment)) {
    throw new ValidationError(
      `${prefix} "${fragment}" contains invalid characters: must contain only digits`
    );
  }
}

export function validateFragments(fragments: unknown[]): void {
  if (!Array.isArray(fragments)) {
    throw new ValidationError("Fragments must be an array");
  }

  for (let i = 0; i < fragments.length; i++) {
    validateFragment(fragments[i], i);
  }
}
