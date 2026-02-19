import React, { useState } from 'react';

export default function Login({ onJoin, apiUrl }) {
  const [mode, setMode] = useState('join'); // 'join' or 'create'
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = mode === 'create' ? '/create_room' : '/join_room';
    const body = mode === 'create' 
      ? { admin_name: username } 
      : { username, room_code: code };

    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (res.ok) {
        onJoin(data.user_id, data.room_code || code);
      } else {
        alert(data.detail || "Error");
      }
    } catch (err) {
      alert("Connection failed");
    }
  };

  return (
    <div className="login-screen">
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>KANBAN</h1>
      <div className="login-card">
        <div className="login-tabs">
          <button 
            className={`tab-btn ${mode === 'join' ? 'active' : ''}`} 
            onClick={() => setMode('join')}
          >
            JOIN ROOM
          </button>
          <button 
            className={`tab-btn ${mode === 'create' ? 'active' : ''}`} 
            onClick={() => setMode('create')}
          >
            CREATE NEW
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{fontSize: '0.8rem', color: 'var(--text-secondary)', display:'block', marginBottom:'5px'}}>USERNAME</label>
            <input 
              placeholder="e.g. kakashki" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
          </div>
          
          {mode === 'join' && (
             <div>
                <label style={{fontSize: '0.8rem', color: 'var(--text-secondary)', display:'block', marginBottom:'5px'}}>ROOM CODE</label>
                <input 
                  placeholder="e.g. A1B2C3" 
                  value={code} 
                  onChange={e => setCode(e.target.value)} 
                  required 
                />
            </div>
          )}
          
          <button type="submit" style={{marginTop: '10px', padding: '12px'}}>
            {mode === 'join' ? 'ENTER' : 'CREATE'}
          </button>
        </form>
      </div>
    </div>
  );
}