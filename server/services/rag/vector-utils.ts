export function toVectorLiteral(values: number[]) {
  return `[${values.map((value) => {
    if (!Number.isFinite(value)) return '0'
    return Number(value).toFixed(8)
  }).join(',')}]`
}
