export function normalizeApn(value: string): string {
  const normalized = value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (normalized.length < 6 || normalized.length > 20) {
    throw new Error("Invalid APN");
  }

  return normalized;
}

export function normalizeAddress(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^0-9A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length < 5) {
    throw new Error("Invalid address");
  }

  return normalized;
}
