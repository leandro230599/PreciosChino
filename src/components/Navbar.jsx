import { NAVBAR_CATEGORIES } from '../utils/products'

export default function Navbar({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  totalProducts,
}) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-top">
          <div className="brand">
            <div className="brand-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7.5 4.8 3h14.4L21 7.5M3 7.5h18M3 7.5v1.25a2.75 2.75 0 0 0 5.5 0V7.5m0 1.25a2.75 2.75 0 0 0 5.5 0V7.5m0 1.25a2.75 2.75 0 0 0 5.5 0V7.5M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"
                />
              </svg>
            </div>
            <div className="brand-text">
              <h1 className="brand-title">Lista de Precios</h1>
              <p className="brand-subtitle">
                {totalProducts} {totalProducts === 1 ? 'producto disponible' : 'productos disponibles'}
              </p>
            </div>
          </div>

          <div className="header-controls">
            <label className="search-box" aria-label="Buscar producto">
              <svg
                className="search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar por nombre..."
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => onSearchChange('')}
                  aria-label="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </label>

            <label className="sort-box" aria-label="Ordenar productos">
              <select value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
                <option value="name-asc">Nombre: A - Z</option>
                <option value="name-desc">Nombre: Z - A</option>
                <option value="price-asc">Menor precio</option>
                <option value="price-desc">Mayor precio</option>
              </select>
            </label>
          </div>
        </div>

        <nav className="category-nav" aria-label="Categorías de productos">
          <div className="category-list" role="tablist">
            {NAVBAR_CATEGORIES.map((category) => {
              const isActive = selectedCategory === category
              const count = categoryCounts[category] ?? 0
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`category-pill ${isActive ? 'is-active' : ''}`}
                  onClick={() => onSelectCategory(category)}
                >
                  <span>{category}</span>
                  <span className="pill-count">{count}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </header>
  )
}
