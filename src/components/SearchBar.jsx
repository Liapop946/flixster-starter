import { useState } from 'react'
import './SearchBar.css'

const SearchBar = ({ onSearch, onNowPlaying }) => {
  // Controlled input — React owns the value via this local state.
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const query = inputValue.trim()
    if (!query) return // don't fire a search on empty input
    onSearch(query)
  }

  const handleNowPlaying = () => {
    setInputValue('')
    onNowPlaying()
  }

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
        onClick={handleNowPlaying}
      >
        Now Playing
      </button>
    </form>
  )
}

export default SearchBar
