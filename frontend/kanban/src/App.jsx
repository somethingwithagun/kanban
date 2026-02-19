import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Board from './components/Board';
import AdminPanel from './components/AdminPanel';

const API_URL = 'http://localhost:8000';

function App() {
  const [credentials, setCredentials] = useState({
    userId: localStorage.getItem('userId'),
    roomCode: localStorage.getItem('roomCode'),
  });
  
  const [roomState, setRoomState] = useState(null);
  const [error, setError] = useState('');

  const saveCredentials = (uid, code) => {
    localStorage.setItem('userId', uid);
    localStorage.setItem('roomCode', code);
    setCredentials({ userId: uid, roomCode: code });
  };

  const fetchRoomState = async () => {
    if (!credentials.userId || !credentials.roomCode) return;

    try {
      const res = await fetch(`${API_URL}/room_state`, {
        headers: {
          'x-user-id': credentials.userId,
          'x-room-code': credentials.roomCode
        }
      });
      
      if (res.status === 401 || res.status === 403) {
        if (res.status === 403) setError("Waiting for approval...");
        return;
      }
      
      const data = await res.json();
      setRoomState(data);
      setError('');
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (credentials.userId) {
      fetchRoomState();
      const interval = setInterval(fetchRoomState, 2000);
      return () => clearInterval(interval);
    }
  }, [credentials]);

  const handleLogout = () => {
    localStorage.clear();
    setCredentials({ userId: null, roomCode: null });
    setRoomState(null);
  };

  if (!credentials.userId) {
    return <Login onJoin={saveCredentials} apiUrl={API_URL} />;
  }

  return (
    <div className="app-container">
      <header>
        <h1>{roomState?.title || "KANBAN"}</h1>
        <div className="header-controls">
           <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
             ROOM: <strong style={{color: 'var(--accent-gold)'}}>{credentials.roomCode}</strong>
           </span>
           <button onClick={handleLogout} className="secondary" style={{padding: '8px 12px', fontSize: '0.8rem'}}>
             EXIT
           </button>
        </div>
      </header>
      
      {error && (
        <div style={{
          background: 'rgba(216, 67, 21, 0.1)', 
          border: '1px solid var(--accent-primary)', 
          color: 'var(--accent-primary)', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '1rem',
          flexShrink: 0
        }}>
          {error}
        </div>
      )}

      {roomState && (
        <>
          {roomState.is_admin && (
            <AdminPanel 
              roomState={roomState} 
              creds={credentials} 
              apiUrl={API_URL} 
              refresh={fetchRoomState} 
            />
          )}
          
          <Board 
            roomState={roomState} 
            creds={credentials} 
            apiUrl={API_URL} 
            refresh={fetchRoomState}
          />
        </>
      )}
    </div>
  );
}

export default App;