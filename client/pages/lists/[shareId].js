import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Nav from '../../components/Nav';
import PlaceCard from '../../components/PlaceCard';
import Toast from '../../components/Toast';
import Icon from '../../components/Icon';
import { getListByShareId, renameList, removeFromList, deleteList } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

export default function SharedListPage() {
  const router = useRouter();
  const { shareId } = router.query;
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const startEditing = () => {
    setEditTitle(list.title);
    setEditing(true);
  };

  const handleRename = async (e) => {
    e.preventDefault();
    const title = editTitle.trim();
    if (!title) return;
    if (title === list.title) {
      setEditing(false);
      return;
    }

    setSaving(true);
    const data = await renameList(list.id, user.id, title);
    setSaving(false);

    if (data.error) {
      setToast(data.error);
      return;
    }
    setList((prev) => ({ ...prev, title: data.list.title }));
    setEditing(false);
    setToast('List renamed');
  };

  const handleRemove = async (place) => {
    setRemoving(place.placeId);
    const data = await removeFromList(list.id, user.id, place.placeId);
    setRemoving(null);
    if (data.error) {
      setToast(data.error);
      return;
    }
    setList((prev) => ({ ...prev, places: prev.places.filter((p) => p.placeId !== place.placeId) }));
    setToast(`Removed ${place.name}`);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const data = await deleteList(list.id, user.id);
    if (data.error) {
      setDeleting(false);
      setConfirmingDelete(false);
      setToast(data.error);
      return;
    }
    router.push('/lists');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast('Link copied');
    } catch {
      setToast('Could not copy link');
    }
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
            <span className="empty-icon"><Icon name="link" size={28} /></span>
            <h2>List not found</h2>
            <p>This link may be invalid or expired.</p>
            <Link href="/" className="cta-btn">
              Find cafés
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const count = list.places?.length || 0;
  // Owners came from (and can go back to) their lists; people opening a shared link go to discover
  const isOwner = Boolean(user) && user.id === list.userId;

  return (
    <div className="page">
      <Nav>
        {isOwner ? (
          <Link href="/lists" className="back-link on-dark">
            <Icon name="arrowLeft" size={16} /> Back to your lists
          </Link>
        ) : (
          <Link href="/" className="back-link on-dark">
            <Icon name="arrowLeft" size={16} /> Discover more
          </Link>
        )}
        {editing ? (
          <form className="list-title-form" onSubmit={handleRename}>
            <input
              type="text"
              className="list-title-input"
              aria-label="List name"
              value={editTitle}
              maxLength={80}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
              disabled={saving}
              autoFocus
            />
            <button type="submit" className="share-btn on-dark" disabled={saving || !editTitle.trim()}>
              <Icon name="check" size={16} /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" className="text-btn on-dark" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="list-title-row">
            <h1 className="shared-list-title">{list.title}</h1>
            {isOwner && (
              <button
                className="icon-btn on-dark"
                aria-label="Rename list"
                title="Rename"
                onClick={startEditing}
              >
                <Icon name="edit" size={20} />
              </button>
            )}
          </div>
        )}
        <p className="hero-subtitle">
          {count} {count === 1 ? 'café' : 'cafés'}
        </p>
        <div className="list-header-actions">
          <button className="share-btn on-dark" onClick={copyLink}>
            <Icon name="link" size={16} /> Copy link
          </button>
          {isOwner && !confirmingDelete && (
            <button className="text-btn on-dark" onClick={() => setConfirmingDelete(true)}>
              <Icon name="trash" size={16} /> Delete list
            </button>
          )}
          {isOwner && confirmingDelete && (
            <span className="delete-confirm on-dark">
              Delete this list for good?
              <button className="delete-confirm-btn" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button className="text-btn on-dark" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                Cancel
              </button>
            </span>
          )}
        </div>
      </Nav>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <main className="main-content">
        {count > 0 ? (
          <div className="places-grid">
            {list.places.map((place) => (
              <PlaceCard
                key={place.placeId}
                place={place}
                from={`list:${shareId}`}
                action={
                  isOwner && (
                    <button
                      className="card-action-btn remove"
                      aria-label={`Remove ${place.name} from this list`}
                      title="Remove from list"
                      disabled={removing === place.placeId}
                      onClick={() => handleRemove(place)}
                    >
                      <Icon name="close" size={18} />
                    </button>
                  )
                }
              />
            ))}
          </div>
        ) : (
          <div className="empty-state small">
            <p>This list is empty.</p>
          </div>
        )}
      </main>
    </div>
  );
}
