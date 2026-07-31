/** Lightweight slug helpers — keep out of the engines barrel so custom tools stay lean. */

export function needsDualInput(slug: string): boolean {
  return ["text-diff", "json-diff", "semver-compare"].includes(slug);
}

export function needsNoInput(slug: string): boolean {
  return [
    "uuid-generator",
    "lorem-ipsum",
    "password-generator",
    "timezone-converter",
    "world-clock",
  ].includes(slug);
}
