// ============================================================
// IMPORTS
// ============================================================
import { useState } from 'react'
import './SearchBar.css'

// ============================================================
// COMPONENT
// ============================================================
const SearchBar = ({ onSearch, onNowPlaying }) => {
  // --- State ---
  // Controlled input — React owns the value via this local state.
  const [inputValue, setInputValue] = useState('')

  // --- Event handlers ---
  const handleSubmit = (e) => {
    e.preventDefault()
    const query = inputValue.trim()
    if (!query) return // don't fire a search on empty input
    onSearch(query)
  }

  // Clear empties the input AND clears the search results from the grid,
  // restoring the full Now Playing list.
  const handleClear = () => {
    setInputValue('')
    onNowPlaying()
  }

  // --- Render ---
  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        className="search-bar__input"
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search movies…"
      />
      <button className="search-bar__button" type="submit">
        Search
      </button>
      <button
        className="search-bar__button search-bar__button--secondary"
        type="button"
        onClick={handleClear}
      >
        Clear
      </button>
    </form>
  )
}

export default SearchBar
