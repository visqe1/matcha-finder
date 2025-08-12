import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getPlace, toggleFavorite, getTags, getTagsForPlace, createTag, attachTag, detachTag } from '../../lib/api';
import Nav from '../../components/Nav';

export default function PlaceDetails() {
  const router = useRouter();
  const { placeId } = router.query;
  const [place, setPlace] = useState(null);
  const [user, setUser] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [placeTags, setPlaceTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (placeId) {
      loadPlace();
    }
  }, [placeId]);

  useEffect(() => {
    if (user && placeId) {
      loadTags();
    }
  }, [user, placeId]);

  const loadPlace = async () => {
    const data = await getPlace(placeId);
    setPlace(data.place);
  };

  const loadTags = async () => {
    const [tagsData, placeTagsData] = await Promise.all([
      getTags(user.id),
      getTagsForPlace(placeId, user.id),
    ]);
    setAllTags(tagsData.tags || []);
    setPlaceTags(placeTagsData.tags || []);
  };

  const handleFavorite = async () => {
    if (!user) {
      alert('Please login to favorite places');
      return;
    }
    const data = await toggleFavorite(user.id, placeId);
    setIsFavorited(data.isFavorited);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !user) return;
    const data = await createTag(user.id, newTagName.trim());
    setAllTags((prev) => [...prev, data.tag]);
    setNewTagName('');
  };

  const handleAttachTag = async (tagId) => {
    await attachTag(tagId, placeId);
    const tag = allTags.find((t) => t.id === tagId);
    if (tag) {
      setPlaceTags((prev) => [...prev, tag]);
    }
  };

  const handleDetachTag = async (tagId) => {
    await detachTag(tagId, placeId);
    setPlaceTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  if (!place) {
    return (
      <div className="container">
        <Nav />
        <p>Loading...</p>
      </div>
    );
  }

  const openingHours = place.openingHoursJson?.weekday_text;
  const placeTagIds = new Set(placeTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !placeTagIds.has(t.id));

  return (
    <div className="container">
      <Nav />
      <div className="place-header">
        <h1 className="title">{place.name}</h1>
        <button
          className={`btn-heart-lg ${isFavorited ? 'active' : ''}`}
          onClick={handleFavorite}
        >
          {isFavorited ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="place-details">
        <p className="place-address">📍 {place.address}</p>

        {place.rating && (
          <p className="place-rating">
            ⭐ {place.rating.toFixed(1)} ({place.userRatingsTotal} reviews)
          </p>
        )}

        {place.phone && (
          <p className="place-contact">
            📞 <a href={`tel:${place.phone}`}>{place.phone}</a>
          </p>
        )}

        {place.website && (
          <p className="place-contact">
            🌐 <a href={place.website} target="_blank" rel="noopener noreferrer">
              {place.website.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          </p>
        )}

        {openingHours && (
          <div className="place-hours">
            <h3>Hours</h3>
            <ul>
              {openingHours.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {user && (
          <div className="tags-section">
            <h3>Tags</h3>
            <div className="tag-pills">
              {placeTags.map((tag) => (
                <span key={tag.id} className="tag-pill active">
                  {tag.name}
                  <button onClick={() => handleDetachTag(tag.id)}>×</button>
                </span>
              ))}
            </div>

            {availableTags.length > 0 && (
              <div className="add-tag">
                <span>Add: </span>
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    className="tag-pill"
                    onClick={() => handleAttachTag(tag.id)}
                  >
                    + {tag.name}
                  </button>
                ))}
              </div>
            )}

            <div className="create-tag">
              <input
                type="text"
                className="input input-small"
                placeholder="New tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              />
              <button className="btn btn-secondary" onClick={handleCreateTag}>
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
