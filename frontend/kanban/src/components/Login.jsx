import React, { useState } from 'react';

export default function Login({ onJoin, apiUrl }) {
  const [mode, setMode] = useState('join'); // 'join', 'create', 'admin'
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState(''); // For Admin creation/login

  const handleSubmit = async (e) => {
    e.preventDefault();
    let endpoint = '';
    let body = {};

    if (mode === 'create') {
      endpoint = '/create_room';
      body = { admin_name: username, password: password };
    } else if (mode === 'join') {
      endpoint = '/join_room';
      body = { username: username, room_code: code };
    } else if (mode === 'admin') {
      endpoint = '/login_admin';
      body = { room_code: code, password: password };
    }

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
            JOIN
          </button>
          <button 
            className={`tab-btn ${mode === 'create' ? 'active' : ''}`} 
            onClick={() => setMode('create')}
          >
            NEW
          </button>
          <button 
            className={`tab-btn ${mode === 'admin' ? 'active' : ''}`} 
            onClick={() => setMode('admin')}
          >
            ADMIN
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* USERNAME (Only for Join/Create) */}
          {(mode === 'join' || mode === 'create') && (
            <div>
              <label style={{fontSize: '0.8rem', color: 'var(--text-secondary)', display:'block', marginBottom:'5px'}}>USERNAME</label>
              <input 
                placeholder="e.g. dev_one" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
              />
            </div>
          )}

          {/* ROOM CODE (Only for Join/Admin) */}
          {(mode === 'join' || mode === 'admin') && (
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
          
          {/* PASSWORD (Only for Create/Admin) */}
          {(mode === 'create' || mode === 'admin') && (
             <div>
                <label style={{fontSize: '0.8rem', color: 'var(--text-secondary)', display:'block', marginBottom:'5px'}}>
                    {mode === 'create' ? 'SET ADMIN PASSWORD' : 'ADMIN PASSWORD'}
                </label>
                <input 
                  placeholder="******" 
                  type="password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
            </div>
          )}
          
          <button type="submit" style={{marginTop: '10px', padding: '12px'}}>
            {mode === 'join' ? 'ENTER' : mode === 'create' ? 'CREATE ROOM' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  );
}