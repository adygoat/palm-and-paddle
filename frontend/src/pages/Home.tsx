import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Home() {
  return (
    <main>
      <Navbar />

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            ChocsDwacks Palm & Paddle Sports Center
          </span>

          <h1>
            Your next game
            <span> starts here.</span>
          </h1>

          <p>
            Reserve one or both of our
            pickleball courts from 6:00 AM
            until midnight.
          </p>

          <div className="hero-actions">
            <Link
              to="/book"
              className="primary-button"
            >
              Book a Court
            </Link>

            <a
              href="#rates"
              className="text-link"
            >
              View Rates
            </a>
          </div>
        </div>

        <div className="hero-art">
          <div className="logo-card">
            <img
              src="/palm-paddle-logo.png"
              alt="Palm & Paddle"
              className="hero-logo"
            />
          </div>
        </div>
      </section>

      <section className="court-summary">
        <div>
          <strong>2</strong>
          <span>Courts</span>
        </div>

        <div>
          <strong>₱250</strong>
          <span>6 AM – 6 PM</span>
        </div>

        <div>
          <strong>₱300</strong>
          <span>6 PM – 12 AM</span>
        </div>

        <div>
          <strong>Per Hour</strong>
          <span>Per Court</span>
        </div>
      </section>

      <section
        id="rates"
        className="section"
      >
        <div className="section-heading">
          <span className="eyebrow">
            COURT RATES
          </span>

          <h2>Simple hourly pricing</h2>

          <p>
            Rates are calculated per
            court and per hour.
          </p>
        </div>

        <div className="rate-grid">
          <article className="rate-card">
            <span>DAY RATE</span>

            <h3>
              ₱250
              <small>/ hour / court</small>
            </h3>

            <p>
              6:00 AM – 6:00 PM
            </p>
          </article>

          <article className="rate-card featured-rate">
            <span>EVENING RATE</span>

            <h3>
              ₱300
              <small>/ hour / court</small>
            </h3>

            <p>
              6:00 PM – 12:00 AM
            </p>
          </article>
        </div>
      </section>

      <section className="location-contact-section">
        <div className="location-contact-grid">

          <div className="landing-location">
            <span className="eyebrow">
              FIND US
            </span>

            <h2>
              Palm & Paddle Location
            </h2>

            <p>
              Visit ChocsDwacks Palm & Paddle Sports Center
              or open the location in Google Maps
              for directions.
            </p>

            <div className="landing-map">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3941.4405486202195!2d125.61327497569069!3d8.931487790506312!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3301eb004b5cbffd%3A0x40f28e5cdb3aa3c2!2sPalm%20%26%20Paddle%20Pickleball%20Court!5e0!3m2!1sen!2sph!4v1790086667858!5m2!1sen!2sph"
                title="Palm & Paddle Pickleball Court"
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            <a
              href="https://maps.app.goo.gl/Bp53pJ3Cmee9pnWn8"
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-button landing-map-button"
            >
              Open in Google Maps
            </a>
          </div>

          <div className="landing-contact">
            <span className="eyebrow">
              CONTACT US
            </span>

            <h2>
              Have a question?
            </h2>

            <p>
              For questions about bookings,
              schedules, court availability,
              or other concerns, message
              Palm & Paddle directly on Facebook.
            </p>

            <div className="facebook-contact-card">
              <div className="facebook-icon">
                f
              </div>

              <div>
                <strong>
                  ChocsDwacks Palm & Paddle Sports Center
                </strong>

                <span>
                  Message us on Facebook
                </span>
              </div>
            </div>

            <a
              href="https://www.facebook.com/profile.php?id=61592575107192"
              target="_blank"
              rel="noopener noreferrer"
              className="facebook-button"
            >
              Message Us on Facebook
            </a>
          </div>

        </div>
      </section>

      <section className="section how-section">
        <div className="section-heading">
          <span className="eyebrow">
            HOW IT WORKS
          </span>

          <h2>Book in minutes.</h2>
        </div>

        <div className="steps-grid">
          <article className="step-card">
            <span className="step-number">
              01
            </span>

            <h3>Select courts</h3>

            <p>
              Choose Court 1, Court 2,
              or reserve both courts.
            </p>
          </article>

          <article className="step-card">
            <span className="step-number">
              02
            </span>

            <h3>Choose your time</h3>

            <p>
              See available hourly
              schedules instantly.
            </p>
          </article>

          <article className="step-card">
            <span className="step-number">
              03
            </span>

            <h3>See your total</h3>

            <p>
              Your price breakdown is
              calculated automatically.
            </p>
          </article>

          <article className="step-card">
            <span className="step-number">
              04
            </span>

            <h3>Wait for confirmation</h3>

            <p>
              ChocsDwacks Palm & Paddle Sports Center will review
              your request and email you.
            </p>
          </article>
        </div>
      </section>

      <section className="cta-section">
        <div>
          <span className="eyebrow">
            READY TO PLAY?
          </span>

          <h2>
            Reserve your court today.
          </h2>
        </div>

        <Link
          to="/book"
          className="primary-button"
        >
          Book Now
        </Link>
      </section>

      <footer className="footer">
        <img
          src="/palm-paddle-logo.png"
          alt="Palm & Paddle"
        />

        <p>
          © {new Date().getFullYear()}
          {' '}ChocsDwacks Palm & Paddle Sports Center
        </p>
      </footer>
    </main>
  );
}