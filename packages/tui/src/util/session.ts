export function isDefaultTitle(title: string) {
  return /^(New session - |Child session - )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(title)
}

function extractFirstUserText(
  messages: Array<{ id: string; role: string }>,
  parts: Record<string, Array<{ type: string; text?: string; synthetic?: boolean }>>,
): string | undefined {
  const firstUser = messages.find((m) => m.role === "user")
  if (!firstUser) return undefined
  const text = (parts[firstUser.id] ?? [])
    .filter((p) => p.type === "text" && !p.synthetic)
    .map((p) => p.text)
    .join("")
    .trim()
  if (!text) return undefined
  return text.length > 40 ? text.slice(0, 37) + "..." : text
}

export function getDisplayTitle(
  session: { id: string; title: string; time: { updated: number } },
  messages: Array<{ id: string; role: string }> | undefined,
  parts: Record<string, Array<{ type: string; text?: string; synthetic?: boolean }>>,
  extractedTitles: Record<string, string>,
): string | undefined {
  if (!isDefaultTitle(session.title)) return undefined
  const cached = extractedTitles[session.id]
  if (cached) return cached
  if (messages) {
    const extracted = extractFirstUserText(messages, parts)
    if (extracted) return extracted
  }
  const d = new Date(session.time.updated)
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `New ${mm}-${dd} ${hh}:${min}`
}
