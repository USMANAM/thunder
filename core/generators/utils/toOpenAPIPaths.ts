/**
 * Convert a path-to-regexp v8-style *pattern* into one or more OpenAPI-compatible
 * path templates by **expanding optional groups**.
 *
 * Goal: take patterns like:
 *   "/api{/:id}"             -> ["/api", "/api/{id}"]
 *   "/a{/:b}{/:c}"           -> ["/a", "/a/{b}", "/a/{c}", "/a/{b}/{c}"]
 *   "/users{/:id}/posts"     -> ["/users/posts", "/users/{id}/posts"]
 *   "/files{/*path}"         -> ["/files/{path}"]   (OpenAPI can't express wildcards; we degrade)
 *
 * Notes / constraints:
 * - OpenAPI does not support optional path segments; we expand them to multiple paths.
 * - OpenAPI does not support regex constraints in the *path template* itself; we ignore them.
 * - OpenAPI does not support splat/wildcard semantics; we map to a normal `{param}` placeholder.
 *
 * This is intentionally "best-effort" and safe for spec generation + Postman import.
 */
export function toOpenApiPaths(pattern: string): string[] {
  const input = normalizePattern(pattern);

  // Expand "{ ... }" optional groups (supports nesting).
  const expanded = expandOptionalGroups(input);

  // Convert param tokens to OpenAPI templates: ":id" -> "{id}"
  const openApi = expanded
    .map(toOpenApiTemplate)
    .map(normalizeSlashes)
    .filter(Boolean);

  // Dedupe + stable sort (shorter/lexicographic)
  return unique(openApi).sort((a, b) =>
    a.length - b.length || a.localeCompare(b)
  );
}

/** ------------------------------ Internals ------------------------------ **/

function normalizePattern(p: string): string {
  // You can decide how strict you want to be. We keep it minimal.
  p = p.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

/**
 * Expand optional group braces: "/api{/:id}" -> ["/api", "/api/:id"]
 * Handles nested braces and multiple groups by Cartesian expansion.
 */
function expandOptionalGroups(pattern: string): string[] {
  const { prefix, group, suffix } = findFirstOptionalGroup(pattern);
  if (!group) return [pattern];

  // Expand recursively:
  // - exclude group
  // - include group
  const without = expandOptionalGroups(prefix + suffix);
  const withIt = expandOptionalGroups(prefix + group + suffix);

  return [...without, ...withIt];
}

/**
 * Finds the first "{...}" group in the string, respecting nesting.
 * Returns:
 *  - prefix: before "{"
 *  - group: inside braces (without braces) OR null
 *  - suffix: after "}"
 */
function findFirstOptionalGroup(
  s: string,
): { prefix: string; group: string | null; suffix: string } {
  const start = s.indexOf("{");
  if (start === -1) return { prefix: s, group: null, suffix: "" };

  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const prefix = s.slice(0, start);
        const group = s.slice(start + 1, i); // inside braces
        const suffix = s.slice(i + 1);
        return { prefix, group, suffix };
      }
    }
  }

  // Unbalanced braces: treat as no group (fail-safe)
  return { prefix: s, group: null, suffix: "" };
}

/**
 * Convert a path-to-regexp-ish template into OpenAPI:
 * - ":id" -> "{id}"
 * - "*path" / "/*path" / "{*path}" / "{/*path}" degrade to "{path}"
 *
 * We do NOT try to preserve modifiers like "?" "+" "*" regex constraints,
 * because OpenAPI path templates can't express those.
 */
function toOpenApiTemplate(path: string): string {
  // 1) Replace path params ":name" => "{name}"
  //    - allow typical JS identifiers and hyphens (some routers allow hyphens).
  //    - stop at "/", ".", "(", ")" or end.
  path = path.replace(/:([A-Za-z_][A-Za-z0-9_-]*)/g, (_m, name) => `{${name}}`);

  // 2) Degrade splats/wildcards to normal params.
  // Common spellings people use:
  // - "/*path" (Express-like)
  // - "*path"
  // - "{*path}" / "{/*path}" (some people wrap in braces)
  path = path.replace(
    /\{\/\*([A-Za-z_][A-Za-z0-9_-]*)\}/g,
    (_m, name) => `/{${name}}`,
  );
  path = path.replace(
    /\{\*([A-Za-z_][A-Za-z0-9_-]*)\}/g,
    (_m, name) => `{${name}}`,
  );
  path = path.replace(
    /\/\*([A-Za-z_][A-Za-z0-9_-]*)/g,
    (_m, name) => `/{${name}}`,
  );
  path = path.replace(
    /\*([A-Za-z_][A-Za-z0-9_-]*)/g,
    (_m, name) => `{${name}}`,
  );

  // 3) Remove any leftover path-to-regexp tokens that OpenAPI can't represent.
  // Examples: "(\\d+)" or other custom regex groups after params.
  // We'll strip parentheses groups conservatively if they appear immediately after a template.
  // "{id}(\\d+)" -> "{id}"
  path = path.replace(/(\{[A-Za-z_][A-Za-z0-9_-]*\})\([^)]*\)/g, "$1");

  return path;
}

/** Clean up duplicate slashes, trailing slash normalization, etc. */
function normalizeSlashes(p: string): string {
  // collapse multiple slashes
  p = p.replace(/\/{2,}/g, "/");

  // remove trailing slash (except root "/")
  if (p.length > 1) p = p.replace(/\/+$/g, "");

  return p;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

/** ------------------------------ Example ------------------------------ **/

// console.log(pathToOpenApiPaths("/api{/:id}"));
// -> ["/api", "/api/{id}"]

// console.log(pathToOpenApiPaths("/a{/:b}{/:c}"));
// -> ["/a", "/a/{b}", "/a/{c}", "/a/{b}/{c}"]

// console.log(pathToOpenApiPaths("/users{/:id}/posts"));
// -> ["/users/posts", "/users/{id}/posts"]
