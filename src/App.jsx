// ============================================================
// IMPORTS
// ============================================================
import { useEffect, useState } from 'react'
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import MovieList from './components/MovieList'
import MovieModal from './components/MovieModal'

// ============================================================
// CONFIG & CONSTANTS
// ============================================================
const API_KEY = import.meta.env.VITE_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

// Maps our sort options to TMDb /discover `sort_by` values so the API sorts
// across the WHOLE catalog server-side (not just the pages already loaded).
// Note: `release` and `rating` sort by the same fields we display. TMDb only
// offers `original_title` (original-language title), which differs from the
// localized `title` we show — so for `title` we fetch a roughly-alphabetical
// stream here but do the authoritative A-Z sort client-side on `title`.
const DISCOVER_SORT = {
  title: 'original_title.asc',
  release: 'primary_release_date.desc', // newest first
  rating: 'vote_average.desc', // highest rated first
}

// ============================================================
// HELPERS — URL building & sorting
// ============================================================
const fmtDate = (d) => d.toISOString().slice(0, 10)

// Build the right endpoint for the current mode + sort option.
const buildUrl = (mode, query, page, sortOption) => {
  if (mode === 'search') {
    // The search endpoint can't sort server-side, so we client-sort its results.
    return `${BASE_URL}/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(
      query
    )}&page=${page}`
  }

  // Now Playing, no sort → the dedicated now_playing endpoint.
  if (sortOption === 'default') {
    return `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=${page}`
  }

  // Now Playing + sort → /discover with sort_by, restricted to a recent
  // theatrical-release window so it still reflects "now playing" movies but
  // sorted across every page the API can return.
  const today = new Date()
  const windowStart = new Date(today)
  windowStart.setDate(today.getDate() - 42) // ~6 weeks of recent releases

  let url =
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=${page}` +
    `&sort_by=${DISCOVER_SORT[sortOption]}&with_release_type=2|3` +
    `&release_date.gte=${fmtDate(windowStart)}&release_date.lte=${fmtDate(today)}`
  // Rating sort needs a vote-count floor, or obscure films with one 10/10 vote
  // dominate the top of the list.
  if (sortOption === 'rating') url += '&vote_count.gte=100'
  return url
}

// Normalize a title for A–Z sorting: drop leading articles isn't needed, but
// strip everything that isn't a letter/number so titles like "[REC]", "'71",
// or "¡Three Amigos!" sort by their first real character, not punctuation.
const titleSortKey = (title = '') =>
  title
    .normalize('NFD') // split accented chars (é → e + combining mark) ...
    .replace(/[̀-ͯ]/g, '') // ... and drop the accent marks
    .replace(/[^a-zA-Z0-9 ]/g, '') // drop remaining special characters
    .trim()
    .toLowerCase()

// Client-side sort used only for SEARCH results (search has no server sort).
// 'default' keeps API order. Returns a new array (never mutates the input).
const sortMovies = (list, option) => {
  if (option === 'default') return list
  return [...list].sort((a, b) => {
    switch (option) {
      case 'release':
        // Newest first; missing dates sort to the bottom.
        return (b.release_date || '').localeCompare(a.release_date || '')
      case 'rating':
        return b.vote_average - a.vote_average
      case 'title':
      default:
        return titleSortKey(a.title).localeCompare(titleSortKey(b.title))
    }
  })
}

// ============================================================
// COMPONENT
// ============================================================
const App = () => {
  // --- State ---
  const [movies, setMovies] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [mode, setMode] = useState('nowPlaying') // 'nowPlaying' | 'search'
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedMovieId, setSelectedMovieId] = useState(null)
  const [sortOption, setSortOption] = useState('default')

  // --- Data fetching ---
  // Single fetch effect: re-runs when the mode, query, page, or sort changes.
  // In Now Playing mode the API sorts server-side, so changing the sort is a
  // new request (from page 1) rather than a client-side reshuffle.
  useEffect(() => {
    const controller = new AbortController()

    const fetchMovies = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const url = buildUrl(mode, searchQuery, page, sortOption)
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`TMDb error: ${response.status}`)
        }
        const data = await response.json()
        const results = data.results ?? []
        setTotalPages(data.total_pages ?? 1)
        setMovies((prev) => {
          // Dedupe: TMDb can repeat a movie across consecutive pages.
          const seen = new Set(prev.map((m) => m.id))
          const fresh = results.filter((m) => !seen.has(m.id))
          const combined = page === 1 ? results : [...prev, ...fresh]

          // Search has no server-side sort → client-sort the full list.
          // Title sort: TMDb only sorts by original_title, which doesn't match
          // the displayed `title`, so we sort by `title` on the client here too.
          if (mode === 'search' || sortOption === 'title') {
            return sortMovies(combined, sortOption)
          }
          // Release / Rating in Now Playing sort by the fields we display, so
          // the API order is correct — just append; Load More never rearranges.
          return combined
        })
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch movies:', err)
        setError("We couldn't load movies right now. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchMovies()
    return () => controller.abort()
  }, [mode, searchQuery, page, sortOption])

  // --- Event handlers ---
  const handleSearch = (query) => {
    // Reset list + page, then switch to search mode for the new query.
    setMovies([])
    setPage(1)
    setSearchQuery(query)
    setMode('search')
  }

  const handleNowPlaying = () => {
    // Already on Now Playing and not searching — nothing to reset, so don't
    // clear the list (which would briefly show "No movies to show").
    if (mode === 'nowPlaying') return
    setMovies([])
    setPage(1)
    setSearchQuery('')
    setMode('nowPlaying')
  }

  const handleLoadMore = () => {
    setPage((prev) => prev + 1)
  }

  // Changing the sort resets to page 1; the fetch effect then re-requests the
  // list sorted across the whole catalog (server-side for Now Playing). This
  // guarantees the top card is the #1 movie for the chosen sort, not just the
  // best of what was already loaded.
  const handleSortChange = (option) => {
    setMovies([])
    setPage(1)
    setSortOption(option)
  }

  // --- Render ---
  return (
    <div className="App">
      <Header
        onSearch={handleSearch}
        onNowPlaying={handleNowPlaying}
        sortOption={sortOption}
        onSortChange={handleSortChange}
      />
      <main>
        <MovieList
          movies={movies}
          onCardClick={setSelectedMovieId}
          onLoadMore={handleLoadMore}
          showLoadMore={page < totalPages}
          isLoading={isLoading}
          error={error}
        />
      </main>
      <Footer />
      {selectedMovieId && (
        <MovieModal
          movieId={selectedMovieId}
          onClose={() => setSelectedMovieId(null)}
        />
      )}
    </div>
  )
}

export default App
