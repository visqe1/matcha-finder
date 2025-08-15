import { useState, useEffect } from 'react';
import Link from 'next/link';
import Nav from '../components/Nav';
import { useAuth } from '../lib/useAuth';
import { createList, getLists } from '../lib/api';

export default function ListsPage() {
  const { user } = useAuth();
  const [lists, setLists] = useState([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    if (user) {
      loadLists();
    } else {
      setLists([]);
    }
  }, [user]);

  const loadLists = async () => {
    const data = await getLists(user.id);
    setLists(data.lists || []);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createList(user.id, newTitle.trim());
    setNewTitle('');
    loadLists();
  };

  const getShareUrl = (shareId) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/lists/${shareId}`;
    }
    return '';
  };

  return (
    <div className="container">
      <Nav />
      <h1 className="title">Your Lists</h1>

      {!user && <p>Please log in to manage your lists.</p>}

      {user && (
        <>
          <div className="create-list-section">
            <input
              type="text"
              className="input"
              placeholder="New list name..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button className="btn btn-primary" onClick={handleCreate}>
              Create List
            </button>
          </div>

          {lists.length === 0 && <p>No lists yet. Create one above!</p>}

          {lists.length > 0 && (
            <ul className="lists-list">
              {lists.map((list) => (
                <li key={list.id} className="list-item">
                  <div className="list-header">
                    <Link href={`/lists/${list.shareId}`} className="list-title">
                      {list.title}
                    </Link>
                    <span className="list-count">
                      {list.itemCount || 0} {list.itemCount === 1 ? 'café' : 'cafés'}
                    </span>
                  </div>
                  <div className="share-url">
                    <span className="share-label">Share:</span>
                    <input
                      type="text"
                      className="input input-share"
                      readOnly
                      value={getShareUrl(list.shareId)}
                      onClick={(e) => e.target.select()}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}


