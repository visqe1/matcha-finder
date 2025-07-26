import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="nav">
      <Link href="/">Home</Link>
      <Link href="/favorites">Favorites</Link>
      <Link href="/lists">Lists</Link>
    </nav>
  );
}

