/**
 * CSS → tree model for the Tools' navigable stylesheet view.
 *
 * A hand-rolled scanner (no eval, no regex backtracking) that turns a CSS
 * string into nodes the UI can expand: rules with their declarations, at-rules
 * with nested rules (`@media`, `@keyframes`), and comments. It only needs to be
 * good enough to *navigate and copy* generated override CSS, but it keeps
 * strings, comments and parentheses straight so values like
 * `url('a;b')` or `cubic-bezier(.4, 0, .2, 1)` stay intact.
 */

export interface CssDeclaration {
  property: string;
  value: string;
}

export type CssNodeKind = 'rule' | 'at-rule' | 'comment' | 'statement';

export interface CssTreeNode {
  id: string;
  kind: CssNodeKind;
  /** Selector, at-rule prelude or comment body — what the tree row shows. */
  label: string;
  declarations: CssDeclaration[];
  children: CssTreeNode[];
  /** Verbatim source of this node, for per-node copy. */
  raw: string;
}

const isSpace = (char: string) => char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f';

/** Index of the `}` matching the `{` at `openIdx`, or -1 when unbalanced. */
function findBlockEnd(text: string, openIdx: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openIdx; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Split a declaration block on top-level `;` (parens + strings protected). */
function splitStatements(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth -= 1;
    else if (char === '/' && body[i + 1] === '*') {
      const end = body.indexOf('*/', i + 2);
      i = end === -1 ? body.length : end + 1;
    } else if (char === ';' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseDeclarations(body: string): CssDeclaration[] {
  const declarations: CssDeclaration[] = [];
  splitStatements(body).forEach((statement) => {
    const colon = statement.indexOf(':');
    if (colon === -1) return;
    declarations.push({
      property: statement.slice(0, colon).trim(),
      value: statement.slice(colon + 1).trim(),
    });
  });
  return declarations;
}

/** True when the block holds nested rules rather than plain declarations. */
function hasNestedBlock(body: string): boolean {
  let quote: string | null = null;
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '/' && body[i + 1] === '*') {
      const end = body.indexOf('*/', i + 2);
      i = end === -1 ? body.length : end + 1;
      continue;
    }
    // A brace inside the body means it holds nested blocks (rules, keyframes).
    if (char === '{') return true;
  }
  return false;
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

export function parseCssTree(css: string): CssTreeNode[] {
  let uid = 0;
  const nextId = () => `css-node-${(uid += 1)}`;

  const parseRange = (text: string, from: number, to: number): CssTreeNode[] => {
    const nodes: CssTreeNode[] = [];
    let i = from;

    while (i < to) {
      while (i < to && isSpace(text[i])) i += 1;
      if (i >= to) break;

      // Comment node.
      if (text[i] === '/' && text[i + 1] === '*') {
        const end = text.indexOf('*/', i + 2);
        const stop = end === -1 || end > to ? to : end;
        nodes.push({
          id: nextId(),
          kind: 'comment',
          label: text.slice(i + 2, stop).trim(),
          declarations: [],
          children: [],
          raw: text.slice(i, Math.min(stop + 2, to)),
        });
        i = stop + 2;
        continue;
      }

      // Find where this node ends: `{` (block), `;` (statement) or `}` (bail).
      let j = i;
      let brace = -1;
      let semi = -1;
      while (j < to) {
        const char = text[j];
        if (char === '"' || char === "'") {
          const quote = char;
          j += 1;
          while (j < to && text[j] !== quote) {
            if (text[j] === '\\') j += 1;
            j += 1;
          }
          j += 1;
          continue;
        }
        if (char === '/' && text[j + 1] === '*') {
          const end = text.indexOf('*/', j + 2);
          j = end === -1 ? to : end + 2;
          continue;
        }
        if (char === '{') {
          brace = j;
          break;
        }
        if (char === ';') {
          semi = j;
          break;
        }
        if (char === '}') break;
        j += 1;
      }

      if (brace >= 0) {
        const end = findBlockEnd(text, brace);
        const bodyEnd = end === -1 ? to : end;
        const body = text.slice(brace + 1, bodyEnd);
        const prelude = normalize(text.slice(i, brace));
        const nested = hasNestedBlock(body);
        nodes.push({
          id: nextId(),
          kind: prelude.startsWith('@') ? 'at-rule' : 'rule',
          label: prelude,
          declarations: nested ? [] : parseDeclarations(body),
          children: nested ? parseRange(text, brace + 1, bodyEnd) : [],
          raw: text.slice(i, Math.min(bodyEnd + 1, to)),
        });
        i = bodyEnd + 1;
        continue;
      }

      if (semi >= 0) {
        const statement = normalize(text.slice(i, semi));
        if (statement) {
          nodes.push({
            id: nextId(),
            kind: 'statement',
            label: statement.endsWith(';') ? statement : `${statement};`,
            declarations: [],
            children: [],
            raw: `${text.slice(i, semi)};`,
          });
        }
        i = semi + 1;
        continue;
      }

      break;
    }

    return nodes;
  };

  return parseRange(css, 0, css.length);
}

/** Total rules (not comments/statements) anywhere in the tree. */
export function countCssRules(nodes: CssTreeNode[]): number {
  return nodes.reduce(
    (total, node) =>
      total +
      (node.kind === 'rule' || node.kind === 'at-rule' ? 1 : 0) +
      countCssRules(node.children),
    0
  );
}

/** Every node in the tree, flattened — handy for filtering. */
export function flattenCssTree(nodes: CssTreeNode[]): CssTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenCssTree(node.children)]);
}

/** True when a node or any descendant matches the (case-insensitive) query. */
export function cssNodeMatches(node: CssTreeNode, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (node.label.toLowerCase().includes(needle)) return true;
  if (
    node.declarations.some((declaration) =>
      `${declaration.property}: ${declaration.value}`.toLowerCase().includes(needle)
    )
  ) {
    return true;
  }
  return node.children.some((child) => cssNodeMatches(child, needle));
}
