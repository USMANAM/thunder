import { normalize } from "@std/path/posix";

export function isRelative(spec: string) {
  return spec.startsWith("./") || spec.startsWith("../");
}

export function containsCoreSegment(spec: string, coreDir: string) {
  const normalized = normalize(spec);
  const segments = normalized
    .split("/")
    .filter((s) => s && s !== "." && s !== "..");
  return segments.includes(coreDir);
}
