/**
 * Lightweight VS Code Dark+ style tokenizer for dashboard code blocks.
 * No third-party highlighter dependency.
 */

export type HighlightToken = {
  type:
    | "text"
    | "comment"
    | "string"
    | "keyword"
    | "tag"
    | "attr"
    | "punctuation"
    | "number"
    | "property";
  value: string;
};

const JS_KEYWORDS = new Set([
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "of",
  "return",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "type",
  "interface",
  "enum",
  "implements",
  "private",
  "protected",
  "public",
  "readonly",
  "as",
  "satisfies",
]);

function pushText(tokens: HighlightToken[], value: string) {
  if (!value) return;
  const last = tokens[tokens.length - 1];
  if (last?.type === "text") {
    last.value += value;
    return;
  }
  tokens.push({ type: "text", value });
}

function tokenizeAttrs(tokens: HighlightToken[], rest: string) {
  const re =
    /(\s+)|([^\s=/>]+)(?:(\s*=\s*)("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s/>]+))?|(\/)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(rest))) {
    if (match[1]) {
      pushText(tokens, match[1]);
      continue;
    }
    if (match[5]) {
      tokens.push({ type: "punctuation", value: "/" });
      continue;
    }
    if (match[2]) tokens.push({ type: "attr", value: match[2] });
    if (match[3]) tokens.push({ type: "punctuation", value: match[3] });
    if (match[4]) tokens.push({ type: "string", value: match[4] });
  }
}

function tokenizeCodey(code: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let i = 0;
  while (i < code.length) {
    if (code.startsWith("//", i)) {
      const end = code.indexOf("\n", i);
      const close = end === -1 ? code.length : end;
      tokens.push({ type: "comment", value: code.slice(i, close) });
      i = close;
      continue;
    }
    if (code.startsWith("/*", i)) {
      const end = code.indexOf("*/", i + 2);
      const close = end === -1 ? code.length : end + 2;
      tokens.push({ type: "comment", value: code.slice(i, close) });
      i = close;
      continue;
    }
    if (code.startsWith("#", i) && (i === 0 || code[i - 1] === "\n")) {
      const end = code.indexOf("\n", i);
      const close = end === -1 ? code.length : end;
      tokens.push({ type: "comment", value: code.slice(i, close) });
      i = close;
      continue;
    }
    const ch = code[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === "\\") {
          j += 2;
          continue;
        }
        if (code[j] === ch) {
          j += 1;
          break;
        }
        j += 1;
      }
      tokens.push({ type: "string", value: code.slice(i, j) });
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch) && (i === 0 || /[^\w$]/.test(code[i - 1] ?? ""))) {
      let j = i + 1;
      while (j < code.length && /[0-9_.xXa-fA-F]/.test(code[j]!)) j += 1;
      tokens.push({ type: "number", value: code.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < code.length && /[\w$]/.test(code[j]!)) j += 1;
      const word = code.slice(i, j);
      if (JS_KEYWORDS.has(word)) tokens.push({ type: "keyword", value: word });
      else if (word === word.toUpperCase() && /[A-Z]/.test(word) && word.length > 1) {
        tokens.push({ type: "property", value: word });
      } else {
        tokens.push({ type: "text", value: word });
      }
      i = j;
      continue;
    }
    if (/[{}()[\];.,:=<>!&|?+\-*/%~^]/.test(ch)) {
      tokens.push({ type: "punctuation", value: ch });
      i += 1;
      continue;
    }
    pushText(tokens, ch);
    i += 1;
  }
  return tokens;
}

function tokenizeHtml(code: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let i = 0;
  while (i < code.length) {
    if (code.startsWith("<!--", i)) {
      const end = code.indexOf("-->", i + 4);
      const close = end === -1 ? code.length : end + 3;
      tokens.push({ type: "comment", value: code.slice(i, close) });
      i = close;
      continue;
    }
    if (code[i] === "<") {
      const end = code.indexOf(">", i + 1);
      if (end === -1) {
        pushText(tokens, code.slice(i));
        break;
      }
      const tagChunk = code.slice(i, end + 1);
      const inner = tagChunk.slice(1, -1);
      const isClose = inner.startsWith("/");
      const rawName = isClose
        ? (inner.slice(1).split(/\s/)[0] ?? "")
        : (inner.split(/\s/)[0]?.replace(/\/$/, "") ?? "");
      const tagName = rawName.toLowerCase();

      tokens.push({ type: "punctuation", value: "<" });
      if (isClose) {
        tokens.push({ type: "punctuation", value: "/" });
        tokens.push({ type: "tag", value: rawName });
        tokenizeAttrs(tokens, inner.slice(1 + rawName.length));
      } else if (inner.startsWith("!")) {
        tokens.push({ type: "tag", value: inner });
      } else {
        tokens.push({ type: "tag", value: rawName });
        tokenizeAttrs(tokens, inner.slice(rawName.length));
      }
      tokens.push({ type: "punctuation", value: ">" });
      i = end + 1;

      if (!isClose && (tagName === "script" || tagName === "style")) {
        const closeTag = `</${tagName}>`;
        const closeAt = code.toLowerCase().indexOf(closeTag, i);
        if (closeAt === -1) {
          tokens.push(...tokenizeCodey(code.slice(i)));
          break;
        }
        const body = code.slice(i, closeAt);
        tokens.push(...(tagName === "script" ? tokenizeCodey(body) : [{ type: "string" as const, value: body }]));
        i = closeAt;
      }
      continue;
    }
    const next = code.indexOf("<", i);
    if (next === -1) {
      pushText(tokens, code.slice(i));
      break;
    }
    pushText(tokens, code.slice(i, next));
    i = next;
  }
  return tokens;
}

export function highlightCode(code: string, language: string): HighlightToken[] {
  const lang = language.toLowerCase();
  if (lang === "html" || lang === "xml" || lang === "svg") return tokenizeHtml(code);
  if (lang === "text" && (code.includes("<script") || code.includes("<!--") || code.includes("<"))) {
    return tokenizeHtml(code);
  }
  if (
    lang === "js" ||
    lang === "javascript" ||
    lang === "ts" ||
    lang === "tsx" ||
    lang === "jsx" ||
    lang === "bash" ||
    lang === "shell" ||
    lang === "json" ||
    lang === "text"
  ) {
    return tokenizeCodey(code);
  }
  if (code.includes("<") && code.includes(">")) return tokenizeHtml(code);
  return tokenizeCodey(code);
}

/** VS Code Dark+ inspired token colors. */
export const CODE_TOKEN_CLASS: Record<HighlightToken["type"], string> = {
  text: "text-[#d4d4d4]",
  comment: "text-[#6a9955]",
  string: "text-[#ce9178]",
  keyword: "text-[#569cd6]",
  tag: "text-[#4ec9b0]",
  attr: "text-[#9cdcfe]",
  punctuation: "text-[#d4d4d4]",
  number: "text-[#b5cea8]",
  property: "text-[#4fc1ff]",
};
