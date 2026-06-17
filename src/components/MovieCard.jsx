// ============================================================
// IMPORTS
// ============================================================
import './MovieCard.css'

// ============================================================
// CONFIG & CONSTANTS
// ============================================================
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'
// Shown when a movie has no poster_path so the grid never breaks.
const FALLBACK_POSTER =
  'https://placehold.co/500x750/2a1a4a/d6c7ff?text=No+Poster'

// ============================================================
// COMPONENT
// ============================================================
const MovieCard = ({ movie, onClick }) => {
  const { title, poster_path, vote_average } = movie

  const posterUrl = poster_path ? `${POSTER_BASE}${poster_path}` : FALLBACK_POSTER

  return (
    <button className="movie-card" onClick={() => onClick?.(movie.id)}>
      <img className="movie-card__poster" src={posterUrl} alt={`${title} poster`} />
      <div className="movie-card__info">
        <h3 className="movie-card__title">{title}</h3>
        <span className="movie-card__rating">
          ⭐ {vote_average?.toFixed(1) ?? 'N/A'}
        </span>
      </div>
    </button>
  )
}

export default MovieCard
