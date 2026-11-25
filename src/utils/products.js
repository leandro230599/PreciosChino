export const ALL_CATEGORY = 'Todos'

export const PREDEFINED_CATEGORIES = [
  'Vinos',
  'Gaseosas',
  'Aguas',
  'Aguas saborizadas',
]

export const NAVBAR_CATEGORIES = [ALL_CATEGORY, ...PREDEFINED_CATEGORIES]

const BASE_URL = import.meta.env.BASE_URL || '/'

export const DEFAULT_PHOTO_URL = `${BASE_URL}no-image.svg`

export function normalizeText(value) {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const PREDEFINED_MAP = new Map(
  PREDEFINED_CATEGORIES.map((category) => [normalizeText(category), category]),
)

/**
 * Returns the matched predefined category name ('Vinos', 'Gaseosas', 'Aguas', 'Aguas saborizadas'),
 * or 'Todos' when GNameC is empty or does not match any predefined category.
 */
export function resolveProductCategory(gNameC) {
  const normalized = normalizeText(gNameC)
  if (!normalized) return ALL_CATEGORY
  return PREDEFINED_MAP.get(normalized) ?? ALL_CATEGORY
}

/**
 * Returns the category label to show on the product card.
 */
export function getDisplayCategory(gNameC) {
  const cleaned = typeof gNameC === 'string' ? gNameC.trim() : ''
  if (!cleaned) return 'Sin categoría'
  const matched = PREDEFINED_MAP.get(normalizeText(cleaned))
  return matched ?? cleaned
}

/**
 * Resolves the Foto field (URL or path inside /public) or falls back to the default placeholder.
 */
export function resolvePhotoSrc(foto) {
  if (typeof foto !== 'string') return DEFAULT_PHOTO_URL
  const trimmed = foto.trim()
  if (!trimmed) return DEFAULT_PHOTO_URL

  if (/^(https?:)?\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
    return trimmed
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, '')
  return `${BASE_URL}${withoutLeadingSlash}`
}

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPrice(value) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return priceFormatter.format(0)
  return priceFormatter.format(numeric)
}

export function getCategoryTone(gNameC) {
  const matched = resolveProductCategory(gNameC)
  switch (matched) {
    case 'Vinos':
      return 'wine'
    case 'Gaseosas':
      return 'soda'
    case 'Aguas':
      return 'water'
    case 'Aguas saborizadas':
      return 'flavored'
    default:
      return 'general'
  }
}
