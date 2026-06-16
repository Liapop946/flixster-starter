import MovieCard from './MovieCard'
import './MovieList.css'

const MovieList = ({
  movies,
  onCardClick,
  onLoadMore,
  showLoadMore,
  isLoading,
  error,
}) => {
  if (error) {
    return <p className="movie-list__status movie-list__status--error">{error}</p>
  }

  if (isLoading && movies.length === 0) {
    return <p className="movie-list__status">Loading movies…</p>
  }

  if (!isLoading && movies.length === 0) {
    return <p className="movie-list__status">No movies to show.</p>
  }

  return (
    <>
      <div className="movie-list">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} onClick={onCardClick} />
        ))}
      </div>

      {showLoadMore && (
        <div className="movie-list__load-more">
          <button onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </>
  )
}

export default MovieList
