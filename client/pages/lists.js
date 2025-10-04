import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createList, getLists } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import Nav from '../components/Nav';
import Toast from '../components/Toast';

export default function ListsPage() {
  const { user } = useAuth();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user) {
      loadLists();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadLists = async () => {
    setLoading(true);
    const data = await getLists(user.id);
    setLists(data.lists || []);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    await createList(user.id, newTitle.trim());
    setNewTitle('');
    setCreating(false);
    loadLists();
    setToast('List created!');
  };

  const getShareUrl = (shareId) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/lists/${shareId}`;
    }
    return '';
  };

  const copyShareUrl = async (shareId, title) => {
    const url = getShareUrl(shareId);
    try {
      await navigator.clipboard.writeText(url);
      setToast(`Link copied for "${title}"!`);
    } catch {
      setToast('Could not copy link');
    }
  };

  if (!user) {
    return (
      <div className="page">
        <Nav />
        <main className="main-content centered">
          <div className="empty-state">
            <p className="empty-icon">📋</p>
            <h2>Your Lists</h2>
            <p>Log in to create and share lists of matcha spots</p>
            <Link href="/login" className="cta-btn">
              Log in
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <Nav />
      
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <main className="main-content">
        <Link href="/" className="back-link">← Back to search</Link>
        <h1 className="page-title">Your Lists</h1>

        <form onSubmit={handleCreate} className="create-list-form">
          <input
            type="text"
            placeholder="New list name..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={creating}
          />
          <button type="submit" disabled={creating || !newTitle.trim()}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}

        {!loading && lists.length === 0 && (
          <div className="empty-state small">
            <p>Create your first list above!</p>
          </div>
        )}

        {!loading && lists.length > 0 && (
          <div className="lists-container">
            {lists.map((list) => (
              <div key={list.id} className="list-card">
                <Link href={`/lists/${list.shareId}`} className="list-card-title">
                  {list.title}
                </Link>
                <span className="list-card-count">
                  {list.itemCount || 0} {list.itemCount === 1 ? 'café' : 'cafés'}
                </span>
                <button
                  className="share-btn"
                  onClick={() => copyShareUrl(list.shareId, list.title)}
                >
                  📤 Copy Link
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
