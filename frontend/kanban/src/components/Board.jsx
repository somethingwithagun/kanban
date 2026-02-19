import React, { useState } from 'react';

export default function Board({ roomState, creds, apiUrl, refresh }) {
  const [modalMode, setModalMode] = useState(null); 
  const [editingTask, setEditingTask] = useState(null);
  
  // Filtering State
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Drag State
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedColName, setDraggedColName] = useState(null);
  const [dragTargetCol, setDragTargetCol] = useState(null); 

  const potentialAssignees = ["Unassigned", ...roomState.users.filter(u => u.approved).map(u => u.name)];
  // Include categories from roomState, default to General if missing
  const categories = roomState.categories || ["General"];

  const initialTaskState = { 
    title: '', 
    description: '', 
    status: roomState.columns[0], 
    assignee: 'Unassigned',
    category: categories[0]
  };
  const [taskFormData, setTaskFormData] = useState(initialTaskState);

  // --- Modal Helpers ---
  const openCreateModal = () => { setTaskFormData(initialTaskState); setModalMode('create'); };
  const openEditModal = (task) => { 
    // Ensure existing category is valid, otherwise fallback
    const safeTask = {
        ...task,
        category: categories.includes(task.category) ? task.category : categories[0]
    };
    setTaskFormData(safeTask); 
    setEditingTask(safeTask); 
    setModalMode('edit'); 
  };
  const closeModal = () => { setModalMode(null); setEditingTask(null); };

  // --- API Handlers ---
  const handleSaveTask = async (e) => {
    e.preventDefault();
    const endpoint = modalMode === 'create' ? '/create_task' : '/edit_task';
    const body = modalMode === 'create' ? taskFormData : { ...taskFormData, task_id: editingTask.id };

    await fetch(`${apiUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': creds.userId, 'x-room-code': creds.roomCode },
      body: JSON.stringify(body)
    });
    closeModal();
    refresh();
  };

  const handleDeleteTask = async (taskId) => {
    if(!window.confirm("Are you sure?")) return;
    await fetch(`${apiUrl}/delete_task/${taskId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': creds.userId, 'x-room-code': creds.roomCode }
    });
    refresh();
  };

  const handleDeleteColumn = async (colName) => {
    if(!window.confirm(`Delete column "${colName}" and all its tasks?`)) return;
    await fetch(`${apiUrl}/delete_column`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': creds.userId, 'x-room-code': creds.roomCode },
      body: JSON.stringify({ column_name: colName })
    });
    refresh();
  };

  // --- Drag & Drop Logic ---
  const handleTaskDragStart = (e, taskId) => {
    e.stopPropagation();
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("type", "task");
    e.target.classList.add('dragging');
  };

  const handleTaskDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedTaskId(null);
    setDragTargetCol(null); 
  };

  const handleColDragStart = (e, colName) => {
    setDraggedColName(colName);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("type", "column");
  };

  const handleColDragEnd = (e) => {
    setDraggedColName(null);
    setDragTargetCol(null);
  };

  const handleDragEnter = (e, colName) => {
    e.preventDefault();
    if (draggedTaskId || draggedColName) {
      setDragTargetCol(colName);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); };

  const handleDrop = async (e, targetColName) => {
    e.preventDefault();
    setDragTargetCol(null);
    
    if (draggedTaskId) {
        await fetch(`${apiUrl}/move_task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': creds.userId, 'x-room-code': creds.roomCode },
            body: JSON.stringify({ task_id: draggedTaskId, new_status: targetColName })
        });
        refresh();
        return;
    }

    if (draggedColName && draggedColName !== targetColName) {
        const currentCols = [...roomState.columns];
        const oldIndex = currentCols.indexOf(draggedColName);
        const newIndex = currentCols.indexOf(targetColName);
        
        currentCols.splice(oldIndex, 1);
        currentCols.splice(newIndex, 0, draggedColName);

        await fetch(`${apiUrl}/reorder_columns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': creds.userId, 'x-room-code': creds.roomCode },
            body: JSON.stringify({ columns: currentCols })
        });
        refresh();
    }
  };

  // --- Filtering Logic ---
  // Filter tasks based on selected Category
  const getFilteredTasks = (colName) => {
    return roomState.tasks.filter(t => {
        const matchesCol = t.status === colName;
        const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
        return matchesCol && matchesCat;
    });
  };

  return (
    <div className="board-container">
      {/* Top Bar with Add Task & Filter */}
      <div style={{ marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={openCreateModal} style={{ fontSize: '1rem', padding: '10px 20px' }}>+ NEW TASK</button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-color)', padding: '5px 10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>FILTER BY:</span>
            <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ padding: '5px', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
                <option value="ALL">ALL CATEGORIES</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
      </div>

      <div className="kanban-board">
        {roomState.columns.map(col => {
          let colClass = "column";
          if (dragTargetCol === col) {
             if (draggedTaskId) colClass += " drag-target"; 
             if (draggedColName) colClass += " column-drag-target"; 
          }

          const tasksInCol = getFilteredTasks(col);

          return (
            <div 
              key={col} 
              className={colClass}
              onDragOver={handleDragOver} 
              onDragEnter={(e) => handleDragEnter(e, col)}
              onDrop={(e) => handleDrop(e, col)}
              style={{ opacity: draggedColName === col ? 0.3 : 1 }}
            >
              <div 
                  className="column-header"
                  draggable="true"
                  onDragStart={(e) => handleColDragStart(e, col)}
                  onDragEnd={handleColDragEnd}
              >
                  <div style={{display:'flex', alignItems:'center', gap: '8px'}}>
                    <span>{col}</span>
                    <span style={{fontSize: '0.8em', color: 'var(--text-secondary)'}}>
                        ({tasksInCol.length})
                    </span>
                  </div>
                  
                  {roomState.is_admin && (
                    <button 
                        className="icon-btn" 
                        onClick={(e) => { e.stopPropagation(); handleDeleteColumn(col); }}
                        title="Delete Column"
                        style={{fontSize: '0.9rem', color: '#ef5350'}}
                    >
                        🗑
                    </button>
                  )}
              </div>
              
              <div className="task-list">
                  {tasksInCol.map(task => (
                  <div 
                      key={task.id} 
                      className="task-card"
                      draggable="true"
                      onDragStart={(e) => handleTaskDragStart(e, task.id)}
                      onDragEnd={handleTaskDragEnd}
                  >
                      <div className="task-title">
                          <span>{task.title}</span>
                          <div style={{display:'flex', gap: '5px'}}>
                              <button className="icon-btn" onClick={() => openEditModal(task)}>✎</button>
                              <button className="icon-btn" onClick={() => handleDeleteTask(task.id)} style={{color:'#ef5350'}}>✕</button>
                          </div>
                      </div>
                      
                      {/* Category Badge */}
                      <div style={{ marginBottom: '8px' }}>
                          <span style={{ 
                              fontSize: '0.7rem', 
                              background: 'var(--accent-primary)', 
                              color: 'white', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              fontWeight: 'bold'
                          }}>
                              {task.category || 'General'}
                          </span>
                      </div>
                      
                      {task.description && <div className="task-desc">{task.description}</div>}
                      
                      <div className="task-meta">
                          <span style={{opacity:0.8}}>{task.author}</span>
                          <span className="assignee-badge">@{task.assignee || 'Unassigned'}</span>
                      </div>
                  </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {modalMode && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 style={{marginTop:0, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--accent-gold)'}}>
                {modalMode === 'create' ? 'Create Task' : 'Edit Task'}
            </h2>
            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                  <label style={{display:'block', marginBottom:'5px', color:'var(--text-secondary)'}}>Title</label>
                  <input 
                    value={taskFormData.title} 
                    onChange={e => setTaskFormData({...taskFormData, title: e.target.value})} 
                    required 
                  />
              </div>
              <div>
                  <label style={{display:'block', marginBottom:'5px', color:'var(--text-secondary)'}}>Description</label>
                  <textarea 
                    value={taskFormData.description}
                    onChange={e => setTaskFormData({...taskFormData, description: e.target.value})}
                    rows={4}
                  />
              </div>
              
              <div style={{display:'flex', gap: '15px', flexDirection: 'column'}}>
                <div style={{flex:1}}>
                    <label style={{fontSize:'0.85em', fontWeight:'bold', color: 'var(--text-secondary)'}}>Status</label>
                    <select 
                        value={taskFormData.status}
                        onChange={e => setTaskFormData({...taskFormData, status: e.target.value})}
                    >
                        {roomState.columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                
                <div style={{display: 'flex', gap: '10px'}}>
                    <div style={{flex:1}}>
                        <label style={{fontSize:'0.85em', fontWeight:'bold', color: 'var(--text-secondary)'}}>Assignee</label>
                        <select 
                            value={taskFormData.assignee}
                            onChange={e => setTaskFormData({...taskFormData, assignee: e.target.value})}
                        >
                            {potentialAssignees.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div style={{flex:1}}>
                        <label style={{fontSize:'0.85em', fontWeight:'bold', color: 'var(--text-secondary)'}}>Category</label>
                        <select 
                            value={taskFormData.category}
                            onChange={e => setTaskFormData({...taskFormData, category: e.target.value})}
                        >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1 }}>SAVE</button>
                <button type="button" className="secondary" onClick={closeModal} style={{ flex: 1 }}>CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}