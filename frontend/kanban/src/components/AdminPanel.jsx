import React, { useState } from 'react';

export default function AdminPanel({ roomState, creds, apiUrl, refresh }) {
  const [newTitle, setNewTitle] = useState('');
  const [newCol, setNewCol] = useState('');
  const [newCat, setNewCat] = useState('');

  const approveUser = async (targetId) => {
    await fetch(`${apiUrl}/approve_user/${targetId}`, {
      method: 'POST',
      headers: { 'x-user-id': creds.userId, 'x-room-code': creds.roomCode }
    });
    refresh();
  };

  const updateTitle = async () => {
    if(!newTitle) return;
    await fetch(`${apiUrl}/update_room_title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': creds.userId, 'x-room-code': creds.roomCode },
      body: JSON.stringify({ title: newTitle })
    });
    setNewTitle('');
    refresh();
  };

  const addColumn = async () => {
    if(!newCol) return;
    await fetch(`${apiUrl}/add_column`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': creds.userId, 'x-room-code': creds.roomCode },
      body: JSON.stringify({ column_name: newCol })
    });
    setNewCol('');
    refresh();
  };

  const addCategory = async () => {
    if(!newCat) return;
    await fetch(`${apiUrl}/add_category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': creds.userId, 'x-room-code': creds.roomCode },
      body: JSON.stringify({ category_name: newCat })
    });
    setNewCat('');
    refresh();
  };

  const deleteCategory = async (catName) => {
    if(!window.confirm(`Delete category "${catName}"?`)) return;
    await fetch(`${apiUrl}/delete_category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': creds.userId, 'x-room-code': creds.roomCode },
      body: JSON.stringify({ category_name: catName })
    });
    refresh();
  };

  const unapprovedUsers = roomState.users.filter(u => !u.approved);

  return (
    <div className="admin-bar">
      {/* Title & Column Group */}
      <div className="admin-group">
        <input 
          placeholder="New Room Title" 
          value={newTitle} 
          onChange={e => setNewTitle(e.target.value)} 
          style={{flexGrow: 1}}
        />
        <button onClick={updateTitle} className="secondary">Update</button>
      </div>

      <div className="admin-group">
        <input 
          placeholder="New Column" 
          value={newCol} 
          onChange={e => setNewCol(e.target.value)} 
          style={{flexGrow: 1}}
        />
        <button onClick={addColumn} className="secondary">Add Col</button>
      </div>

      {/* Category Management */}
      <div className="admin-group" style={{borderLeft: '1px solid var(--border-color)', paddingLeft: '10px'}}>
        <input 
            placeholder="New Category" 
            value={newCat} 
            onChange={e => setNewCat(e.target.value)} 
            style={{flexGrow: 1}}
        />
        <button onClick={addCategory} className="secondary">Add Cat</button>
      </div>

      {/* Category List Deletion */}
      <div style={{width: '100%', display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px'}}>
        <span style={{color: 'var(--text-secondary)', fontSize: '0.8rem'}}>Categories:</span>
        {roomState.categories && roomState.categories.map(cat => (
            <div key={cat} style={{ background: 'var(--surface-color)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid var(--border-color)'}}>
                {cat} 
                {cat !== 'General' && (
                    <span 
                        onClick={() => deleteCategory(cat)}
                        style={{marginLeft: '5px', color: '#ef5350', cursor: 'pointer', fontWeight: 'bold'}}
                    >
                    ×
                    </span>
                )}
            </div>
        ))}
      </div>

      {/* Pending Approvals */}
      {unapprovedUsers.length > 0 && (
        <div style={{ width: '100%', marginTop: '10px', background: 'rgba(216, 67, 21, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid var(--accent-primary)' }}>
          <span style={{fontSize: '0.9rem', color: 'var(--accent-primary)', display:'block', marginBottom:'5px'}}>Pending Approvals: </span>
          <div style={{display:'flex', flexWrap:'wrap', gap:'5px'}}>
            {unapprovedUsers.map(u => (
                <button 
                key={u.id} 
                onClick={() => approveUser(u.id)}
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                >
                {u.name} ✓
                </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}