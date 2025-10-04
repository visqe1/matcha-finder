import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Nav from '../../components/Nav';
import PlaceCard from '../../components/PlaceCard';
import { getListByShareId } from '../../lib/api';

export default function SharedListPage() {
  const router = useRouter();
  const { shareId } = router.query;
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shareId) {
      loadList();
    }
  }, [shareId]);

  const loadList = async () => {
    setLoading(true);
    const data = await getListByShareId(shareId);
    setList(data.list || null);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="page">
        <Nav />
        <main className="main-content centered">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading list...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="page">
        <Nav />
        <main className="main-content centered">
          <div className="empty-state">
            <p className="empty-icon">🔗</p>
            <p>List not found</p>
            <p className="empty-hint">This link may be invalid or expired</p>
            <Link href="/" className="cta-btn">
              Find cafés
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <Nav />
      <main className="main-content">
        <Link href="/" className="back-link">← Discover more</Link>
        
        <div className="shared-list-header">
          <h1 className="page-title">{list.title}</h1>
          <p className="shared-list-meta">
            {list.places?.length || 0} {list.places?.length === 1 ? 'café' : 'cafés'}
          </p>
        </div>

        {list.places && list.places.length > 0 ? (
          <div className="places-grid">
            {list.places.map((place) => (
              <PlaceCard key={place.placeId} place={place} />
            ))}
          </div>
        ) : (
          <div className="empty-state small">
            <p>This list is empty</p>
          </div>
        )}
      </main>
    </div>
  );
}
