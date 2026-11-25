import { useState } from 'react'
import {
  DEFAULT_PHOTO_URL,
  formatPrice,
  getCategoryTone,
  getDisplayCategory,
  resolvePhotoSrc,
} from '../utils/products'

export default function ProductCard({ product }) {
  const initialSrc = resolvePhotoSrc(product.Foto)
  const [failedSrc, setFailedSrc] = useState(null)

  const imgSrc = failedSrc === initialSrc ? DEFAULT_PHOTO_URL : initialSrc
  const isPlaceholder = imgSrc === DEFAULT_PHOTO_URL
  const displayName = product.GNameX?.trim() || 'Producto sin nombre'
  const displayCategory = getDisplayCategory(product.GNameC)
  const tone = getCategoryTone(product.GNameC)

  const handleImageError = () => {
    if (imgSrc !== DEFAULT_PHOTO_URL) {
      setFailedSrc(initialSrc)
    }
  }

  return (
    <article className="product-card">
      <div className={`product-media ${isPlaceholder ? 'is-placeholder' : ''}`}>
        <img
          src={imgSrc}
          alt={isPlaceholder ? `Foto no disponible de ${displayName}` : displayName}
          loading="lazy"
          decoding="async"
          onError={handleImageError}
        />
      </div>

      <div className="product-body">
        <span className={`category-badge tone-${tone}`}>{displayCategory}</span>

        <h2 className="product-name" title={displayName}>
          {displayName}
        </h2>

        <div className="product-footer">
          <span className="price-label">Precio</span>
          <p className="product-price">{formatPrice(product.GSalePrice)}</p>
        </div>
      </div>
    </article>
  )
}
