// Quantità di un formato in grammi (o pezzi): "5g" → 5, "1kg" → 1000, "0,5kg" → 500, "10" → 10
export function parseGrams(label: string): number {
  const t = (label ?? '').toLowerCase().replace(',', '.')
  const n = parseFloat(t.replace(/[^0-9.]/g, '')) || 0
  return /kg/.test(t) ? n * 1000 : n
}
