import { containsCoreSegment, isRelative } from "./utils.ts";

const plugin: Deno.lint.Plugin = {
  name: "no-relative-database-imports",
  rules: {
    "no-relative-database-imports": {
      create(context) {
        const TARGET = "database.ts";
        const ALIAS = "@/database.ts";

        function report(
          _node:
            | Deno.lint.ImportDeclaration
            | Deno.lint.ExportNamedDeclaration
            | Deno.lint.ExportAllDeclaration,
          source: Deno.lint.StringLiteral,
        ) {
          context.report({
            node: source,
            message:
              `Relative import to "${TARGET}" is forbidden. Use "${ALIAS}" instead.`,
            fix(fixer) {
              const quote = context.sourceCode
                  .getText(source)
                  .startsWith("'")
                ? "'"
                : '"';

              return fixer.replaceTextRange(
                source.range,
                `${quote}${ALIAS}${quote}`,
              );
            },
          });
        }

        return {
          ImportDeclaration(node) {
            const source = node.source;
            if (
              source &&
              typeof source.value === "string" &&
              isRelative(source.value) &&
              containsCoreSegment(source.value, TARGET)
            ) {
              report(node, source);
            }
          },
          ExportNamedDeclaration(node) {
            const source = node.source;
            if (
              source &&
              typeof source.value === "string" &&
              isRelative(source.value) &&
              containsCoreSegment(source.value, TARGET)
            ) {
              report(node, source);
            }
          },
          ExportAllDeclaration(node) {
            const source = node.source;
            if (
              source &&
              typeof source.value === "string" &&
              isRelative(source.value) &&
              containsCoreSegment(source.value, TARGET)
            ) {
              report(node, source);
            }
          },
        };
      },
    },
  },
};

export default plugin;
