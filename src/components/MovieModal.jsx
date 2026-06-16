import { useEffect, useState } from 'react'
import './MovieModal.css'

const API_KEY = import.meta.env.VITE_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original'

// --- AI Watch Recommendation (OpenRouter) ---
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
// Free Models Router — picks a free model at random per request.
const OPENROUTER_MODEL = 'openrouter/free'
const AI_FALLBACK =
  "We couldn't generate a recommendation for this one — check out the overview above!"

// Calls OpenRouter with the movie's context and returns a short watch
// recommendation, or a friendly fallback string on any failure.
const getMovieInsight = async (title, genres, overview) => {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an enthusiastic but honest film critic. Write a short paragraph recommendation telling the reader whether the film is something they would be interested in watching. Use plain language only. No plot spoilers. No first-person "I" statements. No marketing language or generic filler like "a must-see". Avoid comparisons to other films unless genuinely helpful.',
          },
          {
            role: 'user',
            content:
              `Title: ${title}\n` +
              `Genres: ${genres || 'Unknown'}\n` +
              `Overview: ${overview || 'No overview available.'}`,
          },
        ],
      }),
    })
    if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`)
    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || AI_FALLBACK
  } catch (err) {
    console.error('AI insight failed:', err)
    return AI_FALLBACK
  }
}

// Pick the best YouTube trailer from TMDb's videos list:
// prefer an official "Trailer", then any "Trailer", then any YouTube video.
const pickTrailer = (videos = []) => {
  const youtube = videos.filter((v) => v.site === 'YouTube')
  return (
    youtube.find((v) => v.type === 'Trailer' && v.official) ||
    youtube.find((v) => v.type === 'Trailer') ||
    youtube[0] ||
    null
  )
}

// Format runtime (minutes) as "2h 14m".
const formatRuntime = (minutes) => {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const MovieModal = ({ movieId, onClose }) => {
  const [details, setDetails] = useState(null)
  const [trailer, setTrailer] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [aiInsight, setAiInsight] = useState(null)
  const [loadingInsight, setLoadingInsight] = useState(false)

  // Fetch details (with videos) whenever the selected movie changes.
  useEffect(() => {
    if (!movieId) return
    const controller = new AbortController()

    const fetchDetails = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const url = `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=en-US&append_to_response=videos`
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`TMDb error: ${response.status}`)
        }
        const data = await response.json()
        setDetails(data)
        setTrailer(pickTrailer(data.videos?.results))
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch movie details:', err)
        setError("We couldn't load this movie's details. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDetails()
    return () => controller.abort()
  }, [movieId])

  // Once details have loaded, request the AI watch recommendation using the
  // movie's title, genres, and overview as context.
  useEffect(() => {
    if (!details) return
    let cancelled = false

    const fetchInsight = async () => {
      setLoadingInsight(true)
      setAiInsight(null)
      const genres = (details.genres ?? []).map((g) => g.name).join(', ')
      const insight = await getMovieInsight(
        details.title,
        genres,
        details.overview
      )
      if (!cancelled) {
        setAiInsight(insight)
        setLoadingInsight(false)
      }
    }

    fetchInsight()
    return () => {
      cancelled = true
    }
  }, [details])

  // Close on Escape key.
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const backdropUrl = details?.backdrop_path
    ? `${BACKDROP_BASE}${details.backdrop_path}`
    : null

  return (
    // Clicking the dimmed overlay (outside the modal) closes it.
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {isLoading && <p className="modal__status">Loading details…</p>}

        {error && (
          <p className="modal__status modal__status--error">{error}</p>
        )}

        {!isLoading && !error && details && (
          <>
            {backdropUrl && (
              <div className="modal__backdrop-wrap">
                <img
                  className="modal__backdrop"
                  src={backdropUrl}
                  alt={`${details.title} backdrop`}
                />
                <div className="modal__backdrop-fade" />
              </div>
            )}

            <div className="modal__body">
              <h2 className="modal__title">{details.title}</h2>

              <div className="modal__meta">
                {details.release_date && <span>{details.release_date}</span>}
                {formatRuntime(details.runtime) && (
                  <span>{formatRuntime(details.runtime)}</span>
                )}
              </div>

              {details.genres?.length > 0 && (
                <div className="modal__genres">
                  {details.genres.map((g) => (
                    <span className="modal__genre" key={g.id}>
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {details.overview && (
                <p className="modal__overview">{details.overview}</p>
              )}

              {/* AI-generated watch recommendation. */}
              <div className="modal__insight">
                <h3 className="modal__section-title">✨ Watch Recommendation</h3>
                {loadingInsight ? (
                  <p className="modal__insight-loading">
                    ✨ Getting a recommendation…
                  </p>
                ) : (
                  <p className="modal__insight-text">{aiInsight}</p>
                )}
              </div>

              {/* Trailer area — embedded YouTube player, or a fallback note. */}
              <div className="modal__trailer">
                <h3 className="modal__section-title">Trailer</h3>
                {trailer ? (
                  <div className="modal__trailer-frame">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailer.key}`}
                      title={`${details.title} trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <p className="modal__no-trailer">
                    No trailer available for this movie.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MovieModal
