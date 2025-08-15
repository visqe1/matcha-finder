import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Nav from '../../components/Nav';
import PlaceCard from '../../components/PlaceCard';
import { useAuth } from '../../lib/useAuth';
import { getListByShareId } from '../../lib/api';

export default function SharedListPage() {
  const router = useRouter();
  const { shareId } = router.query;
  const { user } = useAuth();
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
      <div className="container">
        <Nav />
        <p>Loading...</p>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="container">
        <Nav />
        <h1 className="title">List Not Found</h1>
        <p>This list doesn't exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <Nav />
      <h1 className="title">{list.title}</h1>
      <p className="list-meta">
        Shared list • {list.places?.length || 0} {list.places?.length === 1 ? 'café' : 'cafés'}
      </p>

      {list.places && list.places.length > 0 ? (
        <ul className="results-list">
          {list.places.map((place) => (
            <PlaceCard key={place.placeId} place={place} user={user} />
          ))}
        </ul>
      ) : (
        <p>This list is empty.</p>
      )}
    </div>
  );
}


