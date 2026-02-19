from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Dict, Optional
from uuid import uuid4
import random
import string
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rooms: Dict[str, dict] = {}

# --- Models ---
class CreateRoomRequest(BaseModel):
    admin_name: str

class JoinRoomRequest(BaseModel):
    room_code: str
    username: str

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: str
    assignee: str = "Unassigned"
    category: str = "General"  # New field

class TaskEdit(BaseModel):
    task_id: str
    title: str
    description: str
    assignee: str
    category: str  # New field

class MoveTask(BaseModel):
    task_id: str
    new_status: str

class AssignTask(BaseModel):
    task_id: str
    assignee: str

class UpdateRoom(BaseModel):
    title: str

class AddColumn(BaseModel):
    column_name: str

class DeleteColumn(BaseModel):
    column_name: str

class ReorderColumns(BaseModel):
    columns: List[str]

# New Models for Categories
class AddCategory(BaseModel):
    category_name: str

class DeleteCategory(BaseModel):
    category_name: str

# --- Helpers ---
def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def get_user_from_header(x_user_id: str = Header(None), x_room_code: str = Header(None)):
    if not x_user_id or not x_room_code or x_room_code not in rooms:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    room = rooms[x_room_code]
    if x_user_id not in room['users']:
        raise HTTPException(status_code=401, detail="User not found")
    
    return {"id": x_user_id, "room_code": x_room_code, **room['users'][x_user_id]}

# --- Endpoints ---

@app.post("/create_room")
def create_room(req: CreateRoomRequest):
    room_code = generate_room_code()
    admin_id = str(uuid4())
    
    rooms[room_code] = {
        "title": "New Kanban Room",
        "admin_id": admin_id,
        "users": {
            admin_id: {"name": req.admin_name, "role": "admin", "approved": True}
        },
        "columns": ["Upcoming", "In Progress", "Done"],
        "categories": ["General"], # Default categories
        "tasks": {} 
    }
    return {"room_code": room_code, "user_id": admin_id, "role": "admin"}

@app.post("/join_room")
def join_room(req: JoinRoomRequest):
    if req.room_code not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    user_id = str(uuid4())
    rooms[req.room_code]["users"][user_id] = {
        "name": req.username, 
        "role": "user", 
        "approved": False
    }
    return {"user_id": user_id, "room_code": req.room_code, "approved": False}

@app.get("/room_state")
def get_room_state(user=Depends(get_user_from_header)):
    room = rooms[user['room_code']]
    if not user['approved'] and user['id'] != room['admin_id']:
        raise HTTPException(status_code=403, detail="Not approved yet")

    return {
        "title": room['title'],
        "columns": room['columns'],
        "categories": room.get('categories', ["General"]), # Send categories
        "tasks": list(room['tasks'].values()),
        "users": [
            {"id": uid, "name": u["name"], "approved": u["approved"], "role": u["role"]}
            for uid, u in room['users'].items()
        ],
        "is_admin": user['id'] == room['admin_id']
    }

@app.post("/approve_user/{target_user_id}")
def approve_user(target_user_id: str, user=Depends(get_user_from_header)):
    room = rooms[user['room_code']]
    if user['id'] != room['admin_id']:
        raise HTTPException(status_code=403, detail="Only admin can approve")
    if target_user_id in room['users']:
        room['users'][target_user_id]['approved'] = True
    return {"status": "ok"}

@app.post("/update_room_title")
def update_room_title(req: UpdateRoom, user=Depends(get_user_from_header)):
    room = rooms[user['room_code']]
    if user['id'] != room['admin_id']:
        raise HTTPException(status_code=403, detail="Only admin can change title")
    room['title'] = req.title
    return {"status": "updated"}

# --- Column Management ---
@app.post("/add_column")
def add_column(req: AddColumn, user=Depends(get_user_from_header)):
    room = rooms[user['room_code']]
    if req.column_name not in room['columns']:
        room['columns'].append(req.column_name)
    return room['columns']

@app.post("/delete_column")
def delete_column(req: DeleteColumn, user=Depends(get_user_from_header)):
    room = rooms[user['room_code']]
    if user['id'] != room['admin_id']:
        raise HTTPException(status_code=403, detail="Only admin can delete columns")
    
    if req.column_name in room['columns']:
        room['columns'].remove(req.column_name)
        keys_to_delete = [k for k, v in room['tasks'].items() if v['status'] == req.column_name]
        for k in keys_to_delete:
            del room['tasks'][k]
            
    return room['columns']

@app.post("/reorder_columns")
def reorder_columns(req: ReorderColumns, user=Depends(get_user_from_header)):
    room = rooms[user['room_code']]
    if set(req.columns) == set(room['columns']):
        room['columns'] = req.columns
    return room['columns']

# --- Category Management ---
@app.post("/add_category")
def add_category(req: AddCategory, user=Depends(get_user_from_header)):
    room = rooms[user['room_code']]
    current_cats = room.get('categories', [])
    if req.category_name not in current_cats:
        current_cats.append(req.category_name)
        room['categories'] = current_cats
    return room['categories']

@app.post("/delete_category")
def delete_category(req: DeleteCategory, user=Depends(get_user_from_header)):
    room = rooms[user['room_code']]
    if user['id'] != room['admin_id']:
        raise HTTPException(status_code=403, detail="Only admin can delete categories")
    
    current_cats = room.get('categories', [])
    if req.category_name in current_cats:
        current_cats.remove(req.category_name)
        # Update tasks with this category to "General" or empty
        for task in room['tasks'].values():
            if task.get('category') == req.category_name:
                task['category'] = "General"
                
        room['categories'] = current_cats
            
    return room['categories']

# --- Task Management ---
@app.post("/create_task")
def create_task(req: TaskCreate, user=Depends(get_user_from_header)):
    if not user['approved']:
        raise HTTPException(status_code=403, detail="Wait for approval")
    
    room = rooms[user['room_code']]
    task_id = str(uuid4())
    new_task = {
        "id": task_id,
        "title": req.title,
        "description": req.description,
        "status": req.status,
        "author": user['name'],
        "assignee": req.assignee,
        "category": req.category 
    }
    room['tasks'][task_id] = new_task
    return new_task

@app.post("/edit_task")
def edit_task(req: TaskEdit, user=Depends(get_user_from_header)):
    if not user['approved']:
         raise HTTPException(status_code=403, detail="Wait for approval")
    room = rooms[user['room_code']]
    if req.task_id in room['tasks']:
        task = room['tasks'][req.task_id]
        task['title'] = req.title
        task['description'] = req.description
        task['assignee'] = req.assignee
        task['category'] = req.category
    return {"status": "updated"}

@app.delete("/delete_task/{task_id}")
def delete_task(task_id: str, user=Depends(get_user_from_header)):
    if not user['approved']:
         raise HTTPException(status_code=403, detail="Wait for approval")
    room = rooms[user['room_code']]
    if task_id in room['tasks']:
        del room['tasks'][task_id]
    return {"status": "deleted"}

@app.post("/move_task")
def move_task(req: MoveTask, user=Depends(get_user_from_header)):
    if not user['approved']:
         raise HTTPException(status_code=403, detail="Wait for approval")
    room = rooms[user['room_code']]
    if req.task_id in room['tasks']:
        room['tasks'][req.task_id]['status'] = req.new_status
    return {"status": "moved"}

@app.post("/assign_task")
def assign_task(req: AssignTask, user=Depends(get_user_from_header)):
    if not user['approved']:
         raise HTTPException(status_code=403, detail="Wait for approval")
    room = rooms[user['room_code']]
    if req.task_id in room['tasks']:
        room['tasks'][req.task_id]['assignee'] = req.assignee
    return {"status": "assigned"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)