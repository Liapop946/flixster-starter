import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <p className="footer__text">
        © {2026} Flixster · Made for cozy movie nights.
      </p>
      <p className="footer__text">
        Movie data provided by{' '}
        <a
          className="footer__link"
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          The Movie Database (TMDb)
        </a>
        .
      </p>
    </footer>
  )
}

export default Footer
