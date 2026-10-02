import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createList, getLists, renameList, deleteList } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import Nav from '../components/Nav';
import Toast from '../components/Toast';
import Icon from '../components/Icon';

export default function ListsPage() {
  const { user } = useAuth();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const startEditing = (list) => {
    setEditingId(list.id);
    setEditTitle(list.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleRename = async (e) => {
    e.preventDefault();
    const title = editTitle.trim();
    const list = lists.find((l) => l.id === editingId);
    if (!title || !list) return;
    if (title === list.title) {
      cancelEditing();
      return;
    }

    setSaving(true);
    const data = await renameList(list.id, user.id, title);
    setSaving(false);

    if (data.error) {
      setToast(data.error);
      return;
    }
    setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, title: data.list.title } : l)));
    cancelEditing();
    setToast('List renamed');
  };

  const handleDelete = async (list) => {
    setDeleting(true);
    const data = await deleteList(list.id, user.id);
    setDeleting(false);
    setConfirmDeleteId(null);
    if (data.error) {
      setToast(data.error);
      return;
    }
    setLists((prev) => prev.filter((l) => l.id !== list.id));
    setToast(`Deleted "${list.title}"`);
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
            <span className="empty-icon"><Icon name="list" size={28} /></span>
            <h2>Your lists</h2>
            <p>Log in to create and share lists of matcha spots.</p>
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
        <Link href="/" className="back-link"><Icon name="arrowLeft" size={16} /> Back to search</Link>
        <h1 className="page-title">Your lists</h1>

        <form onSubmit={handleCreate} className="create-list-form">
          <input
            type="text"
            placeholder="New list name, like date spots"
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
            <p>Start your first list above, like “date spots” or “study cafés”.</p>
          </div>
        )}

        {!loading && lists.length > 0 && (
          <div className="lists-container">
            {lists.map((list) =>
              editingId === list.id ? (
                <form key={list.id} className="list-card editing" onSubmit={handleRename}>
                  <input
                    type="text"
                    className="list-rename-input"
                    aria-label="List name"
                    value={editTitle}
                    maxLength={80}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && cancelEditing()}
                    disabled={saving}
                    autoFocus
                  />
                  <button type="submit" className="list-save-btn" disabled={saving || !editTitle.trim()}>
                    <Icon name="check" size={16} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className="text-btn" onClick={cancelEditing}>
                    Cancel
                  </button>
                </form>
              ) : confirmDeleteId === list.id ? (
                <div key={list.id} className="list-card editing">
                  <span className="list-delete-question">
                    Delete <strong>{list.title}</strong>? This can't be undone.
                  </span>
                  <button className="delete-confirm-btn" onClick={() => handleDelete(list)} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button className="text-btn" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div key={list.id} className="list-card">
                  {/* The link covers the whole row (see .list-card-link::after) */}
                  <Link href={`/lists/${list.shareId}`} className="list-card-link">
                    <span className="list-card-title">{list.title}</span>
                    <span className="list-card-count">
                      {list.itemCount || 0} {list.itemCount === 1 ? 'café' : 'cafés'}
                    </span>
                  </Link>
                  <button
                    className="icon-btn"
                    aria-label={`Rename ${list.title}`}
                    title="Rename"
                    onClick={() => startEditing(list)}
                  >
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Delete ${list.title}`}
                    title="Delete"
                    onClick={() => setConfirmDeleteId(list.id)}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                  <button
                    className="share-btn"
                    onClick={() => copyShareUrl(list.shareId, list.title)}
                  >
                    <Icon name="link" size={16} /> Copy link
                  </button>
                  <Icon name="chevronRight" size={20} className="list-card-arrow" />
                </div>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
