// ============================================================
// IMPORTS
// ============================================================
import SearchBar from './SearchBar'
import Sort from './Sort'
import './Header.css'

// ============================================================
// COMPONENT
// ============================================================
const Header = ({ onSearch, onNowPlaying, sortOption, onSortChange }) => {
  return (
    <header className="header">
      <div className="header__brand">
        <h1 className="header__title">🎬 Flixster</h1>
        <p className="header__tagline">Cozy nights in, one movie at a time.</p>
      </div>
      <div className="header__controls">
        <SearchBar onSearch={onSearch} onNowPlaying={onNowPlaying} />
        <Sort sortOption={sortOption} onSortChange={onSortChange} />
      </div>
    </header>
  )
}

export default Header
