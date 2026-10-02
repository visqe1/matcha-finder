import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/useAuth';
import Icon from './Icon';

export function Logo() {
  return (
    <span className="logo">
      <span className="logo-script">matcha</span>
      <span className="logo-caps">time</span>
      <span className="logo-kanji">· 抹茶</span>
    </span>
  );
}

// Faded seigaiha (wave) pattern that fades in from the right of the header.
function Seigaiha() {
  return (
    <svg className="seigaiha" aria-hidden="true">
      <defs>
        <pattern id="seigaiha" width="48" height="24" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="24" cy="24" r="22" />
            <circle cx="24" cy="24" r="16" />
            <circle cx="24" cy="24" r="10" />
            <circle cx="24" cy="24" r="4" />
            <circle cx="0" cy="12" r="22" />
            <circle cx="0" cy="12" r="16" />
            <circle cx="0" cy="12" r="10" />
            <circle cx="48" cy="12" r="22" />
            <circle cx="48" cy="12" r="16" />
            <circle cx="48" cy="12" r="10" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#seigaiha)" />
    </svg>
  );
}

// Site header. Anything passed as children renders as a hero below the nav,
// on the same green background with the wave pattern behind it.
export default function Nav({ children }) {
  const { user, clearUser } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = (href) => `nav-link${router.pathname === href ? ' active' : ''}`;

  return (
    <header className={`site-header${children ? ' has-hero' : ''}`}>
      {children && <Seigaiha />}
      <nav className="nav">
        <Link href="/" className="nav-logo" aria-label="matchatime home">
          <Logo />
        </Link>
        <button
          className="nav-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={24} />
        </button>
        <div className={`nav-links${menuOpen ? ' open' : ''}`}>
          <Link href="/" className={linkClass('/')}>Discover</Link>
          <Link href="/favorites" className={linkClass('/favorites')}>Favorites</Link>
          <Link href="/lists" className={linkClass('/lists')}>Lists</Link>
          {user ? (
            <div className="nav-user">
              <span className="nav-username">{user.username}</span>
              <button className="nav-pill" onClick={clearUser}>
                Log out
              </button>
            </div>
          ) : (
            <Link href="/login" className="nav-pill">
              Log in
            </Link>
          )}
        </div>
      </nav>
      {children && <div className="hero">{children}</div>}
    </header>
  );
}
