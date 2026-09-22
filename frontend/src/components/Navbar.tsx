import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <img
          src="/palm-paddle-logo.png"
          alt="Palm & Paddle "
          className="nav-logo"
        />

        <span>Palm & Paddle Pickleball Court by Chocs & Dwacks</span>
      </Link>

      <div className="nav-links">
        <Link to="/">Home</Link>

        <Link
          to="/book"
          className="nav-book-button"
        >
          Book a Court
        </Link>
      </div>
    </nav>
  );
}