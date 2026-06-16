# Flixster — Project Spec (planning.md)

A movie-browsing app built with React + Vite that fetches now-playing movies from
the TMDb API, supports search / pagination / sorting, shows a details modal, and
adds an AI-generated "Watch Recommendation" via OpenRouter.

## 1. Component Architecture

Parent–child hierarchy:

App
├── Header
│   ├── SearchBar
│   └── Sort (sort dropdown)   ← moved into Header's top-right control cluster (M7)
├── MovieList
│   └── MovieCard  (one per movie)
├── MovieModal   (rendered when a movie is selected)
└── Footer


### App
- **Responsibility:** Root component; owns the shared application state (movie list, search query, page, selected movie, sort option, loading, error) and passes data + callbacks down to children.
- **Renders:** `Header`, `Sort`, `MovieList`, `MovieModal` (conditionally), `Footer`.
- **Props:** None (top-level).
- **State (owns):** `movies`, `searchQuery`, `mode`, `page`, `totalPages`, `selectedMovieId`, `sortOption`, `isLoading`, `error`. (See State Architecture.)

### Header
- **Responsibility:** Display the app name "Flixster" and house the search + sort controls at the top of the page.
- **Renders:** Brand (title + tagline) on the left; a top-right control cluster containing `SearchBar` and `Sort`.
- **Props:** `onSearch`, `onNowPlaying` (passed to `SearchBar`); `sortOption`, `onSortChange` (passed to `Sort`).
- **State:** None.
- **Layout note (M7):** Controls were moved from a centered stack into a right-aligned cluster so the header stays compact. On screens `<= 640px` the brand centers and the controls span full width below it.

### SearchBar
- **Responsibility:** Capture the user's search text via a controlled input and submit it.
- **Renders:** A controlled `<input>`, a "Search" button, and a "Now Playing" button to return to the default list.
- **Props:** `onSearch(query)`, `onNowPlaying()`.
- **State (owns):** `inputValue` (string) — the controlled input value (local to SearchBar).

### Sort
- **Responsibility:** Let the user choose how the currently loaded movie list is ordered.
- **Renders:** A `<select>` dropdown with options: Title (A–Z), Release Date (Newest), Vote Average (Highest).
- **Props:** `sortOption` (current value), `onSortChange(option)`.
- **State:** None (controlled by `App` via props).

### MovieList
- **Responsibility:** Render the grid of movies and the "Load More" button.
- **Renders:** A responsive grid of `MovieCard` components (one per movie) and a "Load More" button when more pages exist; loading and error messages as needed.
- **Props:** `movies` (array), `onCardClick(movieId)`, `onLoadMore()`, `showLoadMore` (boolean), `isLoading`, `error`.
- **State:** None (presentational; data comes from `App`).
- **Implementation note (M1→M2):** In Milestone 1 `MovieList` fetched Now Playing itself with a local `useState`/`useEffect`. In Milestone 2 all fetch logic was lifted to `App` (so search, pagination, and the toggle share one source of truth), and `MovieList` became purely presentational as specced above.

### MovieCard
- **Responsibility:** Display a single movie's summary information and act as the click target that opens the modal.
- **Renders:** Poster image (with fallback for null `poster_path`), title, and vote average.
- **Props:** `movie` (object: `id`, `title`, `poster_path`, `vote_average`), `onClick(movieId)`.
- **State:** None.

### MovieModal
- **Responsibility:** Fetch and display detailed info for the selected movie, plus the AI watch recommendation; close on user action.
- **Renders:** Backdrop image, title, runtime, release date, genres, overview, an embedded YouTube trailer (or a "no trailer" note), and the AI "Watch Recommendation" (added in M8); a close (X) button + click-outside / Escape to dismiss.
- **Props:** `movieId` (number), `onClose()`.
- **State (owns):** `details` (object | null), `trailer` (object | null — selected YouTube video), `isLoading` (bool), `error` (string | null), `aiInsight` (string | null, M8), `loadingInsight` (bool, M8).
- **Close behavior:** `App` only renders `MovieModal` when `selectedMovieId` is set; `onClose` sets it back to `null`, which unmounts the modal and discards its local state (details/trailer/error) automatically — no manual cleanup needed.

### Footer
- **Responsibility:** Display copyright and attribution at the bottom of the page.
- **Renders:** Copyright notice, required "Powered by TMDb" attribution link, optional GitHub link.
- **Props:** None.
- **State:** None.

---

## 2. API Contracts

Base URL: `https://api.themoviedb.org/3`
Image base: `https://image.tmdb.org/t/p/w500` (posters) · `.../original` (backdrops)
Auth: `api_key` query param from `import.meta.env.VITE_API_KEY`.

### 2.1 Now Playing
- **URL:** `GET /movie/now_playing`
- **Required params:** `api_key`, `page` (default `1`), optional `language=en-US`.
- **Response fields used:** `results[]` → `id`, `title`, `poster_path`, `vote_average`; top-level `page`, `total_pages`.
- **Error cases:** `401` invalid API key, network failure, empty `results` array.

### 2.2 Search Movies
- **URL:** `GET /search/movie`
- **Required params:** `api_key`, `query` (URL-encoded search text), `page`.
- **Response fields used:** same as Now Playing (`results[]`: `id`, `title`, `poster_path`, `vote_average`; `page`, `total_pages`).
- **Error cases:** `401`, empty query (don't fire), zero results (show "no results" message), network failure.

### 2.3 Movie Details (for modal)
- **URL:** `GET /movie/{movie_id}` (movie_id is a path parameter)
- **Required params:** `api_key`, optional `language=en-US`, `append_to_response=videos` (folds the trailer list into the same request, so no separate call is needed).
- **Response fields used:** `title`, `runtime`, `release_date`, `genres[]` (`.name`), `overview`, `backdrop_path`, and `videos.results[]` (`key`, `site`, `type`, `official`) for the trailer.
- **Error cases:** `404` movie not found, `401` bad key, network failure → show a helpful message in the modal, not a broken UI. No trailer found → show a "No trailer available" note instead of an empty player.

### 2.4 Trailer selection (from the appended `videos`)
- Filter `videos.results` to `site === "YouTube"`, then prefer an `official` `Trailer`, then any `Trailer`, then the first YouTube video. Embed via `https://www.youtube.com/embed/{key}`.

### 2.5 Discover (server-side sorted Now Playing)
- **URL:** `GET /discover/movie`
- **Why:** `now_playing` can't sort, so a chosen sort would only reorder loaded pages. `/discover` sorts across the **whole catalog** server-side so the top card is the true #1 for that sort and Load More appends in order.
- **Required params:** `api_key`, `page`, `sort_by`, plus a recent-release window to keep it "now playing": `with_release_type=2|3`, `release_date.gte` (~6 weeks ago), `release_date.lte` (today). Rating sort adds `vote_count.gte=100`.
- **`sort_by` mapping:** `title`→`original_title.asc`, `release`→`primary_release_date.desc`, `rating`→`vote_average.desc`.
- **Response fields used:** same as Now Playing (`results[]`: `id`, `title`, `poster_path`, `vote_average`; `page`, `total_pages`).
- **Error cases:** `401` bad key, network failure, empty `results`.

---

## 3. State Architecture

| Variable | Type | Initial | Owner | Update trigger |
|---|---|---|---|---|
| `movies` | array | `[]` | App | After Now Playing / Search fetch; appended on Load More |
| `searchQuery` | string | `""` | App | On SearchBar submit; cleared on "Now Playing" |
| `mode` | string (`"nowPlaying"` \| `"search"`) | `"nowPlaying"` | App | Set to `"search"` on submit, `"nowPlaying"` on reset |
| `page` | number | `1` | App | Incremented on Load More; reset to `1` on new search / mode switch |
| `totalPages` | number | `1` | App | Set from API `total_pages` after each fetch |
| `selectedMovieId` | number \| null | `null` | App | Set on MovieCard click; cleared on modal close |
| `sortOption` | string | `"default"` | App | On Sort dropdown change |
| `isLoading` | boolean | `false` | App | `true` before a fetch, `false` after it resolves/fails |
| `error` | string \| null | `null` | App | Set on a failed fetch; cleared on a successful one |
| `inputValue` | string | `""` | SearchBar | On every keystroke (controlled input) |
| `details` | object \| null | `null` | MovieModal | After Movie Details fetch resolves |
| `aiInsight` | string \| null | `null` | MovieModal | After OpenRouter response; reset to `null` on close |
| `loadingInsight` | boolean | `false` | MovieModal | `true` while AI call runs, `false` after |

**Sorting decision:** Sorting is done **server-side** for Now Playing via `/discover/movie`
(`sort_by`), so the list is ordered across the entire catalog — the top card is the true #1 movie
for the chosen sort, not just the best of what's loaded. Changing the sort calls `handleSortChange`,
which clears the list and resets to page 1; the fetch effect (now keyed on `sortOption` too) then
re-requests page 1 sorted. Because the API returns globally-sorted pages, **Load More just appends
the next page in order — existing cards never rearrange.** Search results still use the client-side
`sortMovies` helper (the search endpoint has no `sort_by`); `default` keeps API order.

**Title-sort caveat:** TMDb's only title `sort_by` is `original_title` (the original-language
title), which differs from the localized `title` we display (e.g. "君の名は。" vs "Your Name."), so a
pure server sort looks out of order on screen. Fix: for `title` we still fetch from `/discover`
(roughly alphabetical) but apply the authoritative A–Z sort **client-side on the displayed `title`**.
Tradeoff: like all client sorting, this orders only the pages loaded so far — Load More can insert a
new title among existing cards. `release`/`rating` sort by the same fields we display, so they stay
purely server-side with clean appends.

`sortOption` values and direction:
- `"default"` (initial) → no sort; preserves API/insertion order so **Load More appends new cards to the end** without reshuffling existing ones.
- `"title"` → title A–Z (`a.title.localeCompare(b.title)`)
- `"release"` → release date newest first (`b.release_date.localeCompare(a.release_date)`; missing dates sort last)
- `"rating"` → vote average highest first (`b.vote_average - a.vote_average`)

### Visual Design & Palette (Milestone 7)

**Intent:** "cozy city skyline at night" — a deep purple/indigo night sky with warm
city-light accents, like watching movies in bed with the skyline glowing outside.

Palette (CSS variables in `index.css`):
- **Night sky / surfaces:** `--night-900 #0a0618` → `--night-700 #1a1138`; cards `--plum-700 #221640`.
- **Purple (primary/interactive):** `--purple-500 #4a2f8a`, hover `--purple-400 #6c4bc0`, focus glow `--lilac-300 #c4a5ff`.
- **Complementary accents:** `--amber #ffd479` (warm streetlight — ratings & modal meta) and `--rose #ff9ec7` (soft neon — error text).

Per-component intent:
- **MovieCard:** subtle shadow at rest; lifts and gains a warm purple glow on hover, like a window lighting up.
- **MovieModal:** dark semi-transparent blurred overlay for depth; the backdrop image is masked + gradient-faded so it **blends into the modal body** (no hard seam), with the body pulled up to overlap the fade.
- **Header:** compact bar — brand left, search/sort clustered top-right.

Accessibility: visible `:focus-visible` outline on all interactive elements; poster/backdrop `alt` text; semantic `<header>`/`<main>`/`<footer>` and real `<button>`/`<input>` elements.

### Responsive Grid Breakpoints (Milestone 3)

The `.movie-list` grid uses fixed column counts (mobile-first) so the cards-per-row is
guaranteed at each device size. Card title/rating type and padding use `clamp()` so text
grows for readability on larger screens.

| Device  | Viewport width | Cards per row |
|---------|----------------|---------------|
| Mobile  | `< 600px`      | 2             |
| Tablet  | `600–1023px`   | 4             |
| Desktop | `>= 1024px`    | 6             |

---

## 4. Data Flow

1. **Fetch:** `App` owns a single `useEffect` keyed on `[mode, searchQuery, page]`. It builds
   the right URL (Now Playing vs. Search) for the current `mode`, fetches, and stores `results`
   in `movies` — **replacing** the list when `page === 1` (new search / mode switch) and
   **appending** (`[...prev, ...results]`) when `page > 1` (Load More). `total_pages` from the
   response drives whether "Load More" shows (`page < totalPages`). No heavy transformation is
   needed — TMDb returns the shape we use directly; the only transform is building the poster URL
   (`image base + poster_path`) and a fallback when `poster_path` is `null`.
2. **Down the tree:** `App` passes the sorted `movies` array to `MovieList`, which `.map()`s
   over it and renders one `MovieCard` per movie, passing each its `movie` object.
3. **Card click → modal:** `MovieCard` calls `onClick(movie.id)`; this bubbles up to `App`,
   which sets `selectedMovieId`. `App` conditionally renders `MovieModal` with `movieId={selectedMovieId}`.
4. **Details fetch:** `MovieModal` runs a `useEffect` keyed on `movieId` that calls the Movie
   Details endpoint (`/movie/{movieId}`), stores the response in `details`, and renders it.
5. **Close:** Closing the modal calls `onClose()`, which sets `selectedMovieId` back to `null`
   in `App`, unmounting the modal and clearing its local state.

```
TMDb API ──> App (movies state) ──> MovieList ──> MovieCard.map()
                  ▲                                     │ onClick(id)
                  └──────── selectedMovieId ◀───────────┘
                                  │
                                  ▼
              MovieModal ──> /movie/{id} ──> details + AI insight
```

---

## 5. AI Feature Spec (OpenRouter)

**Displayed in:** `MovieModal`, below the movie details, labeled "Watch Recommendation".

### Prompt Spec
- **Role:** An enthusiastic but honest film critic.
- **Task:** Write a short paragraph watch recommendation telling the user whether the film is something they would be interested in.
- **Inputs sent as context:** movie `title`, `genres` (comma-separated string), and `overview`.
- **Output format:** Plain text, 2–3 sentences, no spoilers, no first-person "I" statements, no marketing language.
- **Constraints:** No plot spoilers; no generic filler ("a must-see"); no comparisons to other films unless genuinely helpful.
- **Failure behavior:** Show a friendly fallback — "We couldn't generate a recommendation for this one — check out the overview above!"

### Endpoint & Model
- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Model:** `openrouter/free` (the Free Models Router — selects a free model at random per request; the request body needs this *slug*, not the `https://openrouter.ai/free` page URL).
- **Auth:** `Authorization: Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}` (add `VITE_OPENROUTER_API_KEY` to `.env`).

### State
- `aiInsight` (string | null, initial `null`) — holds the AI response. Owned by `MovieModal`.
- `loadingInsight` (boolean, initial `false`) — drives the "✨ Getting a recommendation..." loading indicator.

### Trigger
A `useEffect` in `MovieModal` runs once movie `details` have loaded (depends on `movieId` / `details`):
sets `loadingInsight = true`, calls `getMovieInsight(title, genres, overview)`, stores the result in
`aiInsight`, then sets `loadingInsight = false`. Both reset to initial values when the modal closes.

### AI Feature — Decisions Log
- **What the API returned initially:** Every call failed with a `401 "User not found."`. The API key was valid — the cause was the `model` field being set to the page URL `https://openrouter.ai/free` instead of a model slug. Switching to the `openrouter/free` slug returned real completions (e.g. routed to a free Gemma/Llama model).
- **What I changed in my prompt:** Built the system message from the prompt spec (enthusiastic-but-honest critic, 2–3 sentences, no spoilers, no first-person "I", no marketing filler) and passed the movie's title, genres (comma-separated), and overview as the user message.
- **What fallback behavior I implemented:** Any non-OK response or thrown error is caught and returns the friendly fallback ("We couldn't generate a recommendation for this one — check out the overview above!"), so the modal never breaks. Confirmed working during the 401 period.
- **What I learned:** OpenRouter needs a model *slug* (`openrouter/free`) in the request body, not a URL — and a misconfigured model can surface as a misleading `401`, not a `400`. Also: Vite only reads `.env` at startup, so a key/model change requires restarting the dev server.
