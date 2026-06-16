import './Sort.css'

const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'release', label: 'Release Date (Newest)' },
  { value: 'rating', label: 'Vote Average (Highest)' },
]

const Sort = ({ sortOption, onSortChange }) => {
  return (
    <div className="sort">
      <label className="sort__label" htmlFor="sort-select">
        Sort by:
      </label>
      <select
        id="sort-select"
        className="sort__select"
        value={sortOption}
        onChange={(e) => onSortChange(e.target.value)}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default Sort
