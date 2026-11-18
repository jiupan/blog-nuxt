export function coverColorText(color: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(color.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const [red = 0, green = 0, blue = 0] = channels
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
  return luminance > 0.179 ? '#000' : '#fff'
}
