import Link from 'next/link';
import { useAuth } from '../lib/useAuth';

export default function Nav() {
  const { user, clearUser } = useAuth();

  return (
    <nav className="nav">
      <div className="nav-left">
        <Link href="/" className="nav-logo" aria-label="Matcha Finder home">
          <img className="nav-logo-img" src="/matcha-icon.png" alt="" />
        </Link>
      </div>
      <div className="nav-right">
        <Link href="/favorites" className="nav-link">
           ♡ Favorites
        </Link>
        <Link href="/lists" className="nav-link">
          ✽ Lists
        </Link> 
        {user ? (
          <div className="nav-user">
            <span className="nav-username">{user.username}</span>
            <button className="nav-logout" onClick={clearUser}>
              Logout
            </button>
          </div>
        ) : (
          <Link href="/login" className="nav-link nav-login">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
