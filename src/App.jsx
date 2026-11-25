import { useEffect, useMemo, useState } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import ProductCard from './components/ProductCard'
import {
  ALL_CATEGORY,
  NAVBAR_CATEGORIES,
  normalizeText,
  resolveProductCategory,
} from './utils/products'

const PAGE_SIZE = 48
const DATA_URL = `${import.meta.env.BASE_URL || '/'}productos.json`

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name-asc')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchProducts() {
      try {
        const response = await fetch(DATA_URL, {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`No se pudo cargar productos.json (HTTP ${response.status})`)
        }

        const data = await response.json()
        if (!Array.isArray(data)) {
          throw new Error('El archivo productos.json debe contener una lista de productos.')
        }

        if (!controller.signal.aborted) {
          setProducts(data)
          setError('')
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        setError(err.message || 'Ocurrió un error al cargar la lista de precios.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchProducts()
    return () => controller.abort()
  }, [reloadKey])

  const handleRetry = () => {
    setLoading(true)
    setError('')
    setReloadKey((prev) => prev + 1)
  }

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(NAVBAR_CATEGORIES.map((cat) => [cat, 0]))
    counts[ALL_CATEGORY] = products.length

    for (const product of products) {
      const resolved = resolveProductCategory(product.GNameC)
      if (resolved !== ALL_CATEGORY) {
        counts[resolved] = (counts[resolved] || 0) + 1
      }
    }

    return counts
  }, [products])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeText(searchQuery)

    const matching = products.filter((product) => {
      if (selectedCategory !== ALL_CATEGORY) {
        const resolved = resolveProductCategory(product.GNameC)
        if (resolved !== selectedCategory) return false
      }

      if (normalizedSearch) {
        const nameMatch = normalizeText(product.GNameX).includes(normalizedSearch)
        const categoryMatch = normalizeText(product.GNameC).includes(normalizedSearch)
        if (!nameMatch && !categoryMatch) return false
      }

      return true
    })

    const sorted = [...matching]
    sorted.sort((a, b) => {
      const nameA = (a.GNameX || '').trim()
      const nameB = (b.GNameX || '').trim()
      const priceA = Number(a.GSalePrice) || 0
      const priceB = Number(b.GSalePrice) || 0

      switch (sortBy) {
        case 'name-desc':
          return nameB.localeCompare(nameA, 'es', { sensitivity: 'base' })
        case 'price-asc':
          return priceA - priceB || nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
        case 'price-desc':
          return priceB - priceA || nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
        case 'name-asc':
        default:
          return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
      }
    })

    return sorted
  }, [products, selectedCategory, searchQuery, sortBy])

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount],
  )

  const remainingCount = Math.max(0, filteredProducts.length - visibleProducts.length)

  const handleSelectCategory = (category) => {
    setSelectedCategory(category)
    setVisibleCount(PAGE_SIZE)
  }

  const handleSearchChange = (value) => {
    setSearchQuery(value)
    setVisibleCount(PAGE_SIZE)
  }

  const handleSortChange = (value) => {
    setSortBy(value)
    setVisibleCount(PAGE_SIZE)
  }

  const handleResetFilters = () => {
    setSelectedCategory(ALL_CATEGORY)
    setSearchQuery('')
    setVisibleCount(PAGE_SIZE)
  }

  return (
    <div className="app-shell">
      <Navbar
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        categoryCounts={categoryCounts}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        totalProducts={products.length}
      />

      <main className="main-content">
        <div className="results-bar">
          <div className="results-heading">
            <h2 className="section-title">{selectedCategory}</h2>
            {!loading && !error && (
              <span className="results-count">
                Mostrando {visibleProducts.length} de {filteredProducts.length}{' '}
                {filteredProducts.length === 1 ? 'producto' : 'productos'}
              </span>
            )}
          </div>

          {(selectedCategory !== ALL_CATEGORY || searchQuery) && (
            <button type="button" className="reset-link" onClick={handleResetFilters}>
              Ver todos los productos
            </button>
          )}
        </div>

        {loading && (
          <section className="products-grid" aria-label="Cargando productos">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="skeleton-card" aria-hidden="true">
                <div className="skeleton-media" />
                <div className="skeleton-body">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line long" />
                  <div className="skeleton-line medium" />
                  <div className="skeleton-price" />
                </div>
              </div>
            ))}
          </section>
        )}

        {!loading && error && (
          <section className="state-card state-error" role="alert">
            <h3>No pudimos cargar los precios</h3>
            <p>{error}</p>
            <button
              type="button"
              className="primary-btn"
              onClick={handleRetry}
            >
              Reintentar
            </button>
          </section>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <section className="state-card">
            <h3>No encontramos productos</h3>
            <p>
              {searchQuery
                ? `No hay coincidencias para "${searchQuery}" en ${selectedCategory}.`
                : `Todavía no hay productos cargados en la categoría ${selectedCategory}.`}
            </p>
            <button type="button" className="primary-btn" onClick={handleResetFilters}>
              Volver a Todos
            </button>
          </section>
        )}

        {!loading && !error && visibleProducts.length > 0 && (
          <>
            <section className="products-grid" aria-label="Listado de productos">
              {visibleProducts.map((product, index) => (
                <ProductCard
                  key={product.GBarcode ? String(product.GBarcode) : `item-${index}`}
                  product={product}
                />
              ))}
            </section>

            {remainingCount > 0 && (
              <div className="load-more-wrap">
                <button
                  type="button"
                  className="load-more-btn"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                >
                  Mostrar más productos ({remainingCount} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
