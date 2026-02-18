const DEFAULT_MAX_OUTPUT_CHARS = 10_000;

export function truncateOutput(
  text: string | null | undefined,
  maxLen: number = DEFAULT_MAX_OUTPUT_CHARS
): string {
  const normalized = text ?? "";
  if (normalized.length <= maxLen) return normalized;

  const hiddenChars = normalized.length - maxLen;
  return `${normalized.slice(0, maxLen)}\n\n... [truncated, ${hiddenChars.toLocaleString()} chars hidden]`;
}
