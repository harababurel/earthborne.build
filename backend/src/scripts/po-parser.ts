export interface PoEntry {
  id: string;
  field: string;
  source: string;
  value: string;
}

export function parsePo(
  content: string,
  warn: (message: string) => void,
): PoEntry[] {
  const entries: PoEntry[] = [];
  const seen = new Set<string>();
  let current: Partial<Record<"msgctxt" | "msgid" | "msgstr", string>> = {};
  let active: "msgctxt" | "msgid" | "msgstr" | undefined;

  function flush() {
    const context = current.msgctxt;
    if (context) {
      if (seen.has(context)) {
        warn(`Duplicate PO context '${context}'; keeping the first entry`);
      } else {
        seen.add(context);
        const separator = context.lastIndexOf(".");
        if (separator > 0 && separator < context.length - 1 && current.msgstr) {
          entries.push({
            id: context.slice(0, separator),
            field: context.slice(separator + 1),
            source: current.msgid ?? "",
            value: current.msgstr,
          });
        }
      }
    }
    current = {};
    active = undefined;
  }

  for (const [index, rawLine] of content.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("#")) continue;
    const match = /^(msgctxt|msgid|msgstr)\s+(".*")$/.exec(line);
    if (match) {
      const key = match[1] as "msgctxt" | "msgid" | "msgstr";
      if (
        key === "msgctxt" ||
        (key === "msgid" && current.msgid !== undefined)
      ) {
        flush();
      }
      active = key;
      current[key] = decodePoString(match[2] ?? "", index + 1);
    } else if (line.startsWith('"') && active) {
      current[active] =
        (current[active] ?? "") + decodePoString(line, index + 1);
    } else {
      throw new Error(`Unsupported PO syntax on line ${index + 1}: ${line}`);
    }
  }
  flush();
  return entries;
}

export function normalizeTranslationText(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/\n|<hr\s*\/?\s*>/gi, "<hr>");
}

function decodePoString(value: string, line: number): string {
  try {
    return JSON.parse(value) as string;
  } catch {
    throw new Error(`Invalid PO string on line ${line}: ${value}`);
  }
}
