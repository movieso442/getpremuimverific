export function topupCommand(text: string): { amount: number | null } | null {
  const normalized = text.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ')
  const match = normalized.match(/^\/?(?:top up|topup|pay|deposit|add funds|recharge)(?:\s+(\d+))?$/)
  return match ? { amount: match[1] ? Number(match[1]) : null } : null
}
