from fastapi import FastAPI, HTTPException, status, Depends, Header
from sqlalchemy.orm import Session
from typing import List, Optional

import models
import schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Music Collection Manager API",
    description="API for managing music collections",
    version="1.0.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-User-ID"],
)


# Dependency to get current user from header (simple auth for demonstration)
def get_current_user(
    x_user_id: int = Header(..., alias="X-User-ID"),
    db: Session = Depends(get_db)
) -> models.User:
    user = db.query(models.User).filter(models.User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Dependency to check if user is admin
def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin():
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# --------------------------------------------------------------------
# Music Endpoints
# --------------------------------------------------------------------
@app.post(
    "/music",
    response_model=schemas.MusicResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add new music (Admin only)",
    description="Creates a new music entry in the database. Only admins are authorized to perform this action.",
    tags=["Music"]
)
#    """Admin only: Add new music to the system"""
def create_music(
        music: schemas.MusicCreate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(require_admin)
):
    db_music = models.Music(**music.model_dump())
    db.add(db_music)
    db.commit()
    db.refresh(db_music)
    return db_music

@app.get(
    "/list_music",
    response_model=List[schemas.MusicResponse],
    summary="List all music",
    description="Retrieve a list of all available music items.",
    tags=["Music"]
)
def list_music(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Music).offset(skip).limit(limit).all()

@app.get(
    "/music/{music_id}",
    response_model=schemas.MusicResponse,
    summary="Get music by ID",
    description="Retrieve details for a specific music item by its ID.",
    tags=["Music"]
)
def get_music(music_id: int, db: Session = Depends(get_db)):
    music = db.query(models.Music).filter(models.Music.id == music_id).first()
    if not music:
        raise HTTPException(status_code=404, detail="Music not found")
    return music

@app.put(
    "/update_music/{music_id}",
    response_model=schemas.MusicResponse,
    summary="Update music (Admin only)",
    description="Modify existing music details. Only admins can update music records.",
    tags=["Music"]
)
def update_music(
    music_id: int,
    music_update: schemas.MusicUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    music = db.query(models.Music).filter(models.Music.id == music_id).first()
    if not music:
        raise HTTPException(status_code=404, detail="Music not found")
    update_data = music_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(music, key, value)
    db.commit()
    db.refresh(music)
    return music

@app.delete(
    "/delete_music/{music_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete music (Admin only)",
    description="Remove a music record from the database. Only admins can delete music.",
    tags=["Music"]
)
def delete_music(
    music_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    music = db.query(models.Music).filter(models.Music.id == music_id).first()
    if not music:
        raise HTTPException(status_code=404, detail="Music not found")
    db.delete(music)
    db.commit()
    return None

# --------------------------------------------------------------------
# User Collection Endpoints
# --------------------------------------------------------------------
@app.post(
    "/collection",
    response_model=schemas.UserMusicResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add music to collection",
    description="Add a music item to the authenticated user's collection.",
    tags=["Collections"]
)
def add_to_collection(
    user_music: schemas.UserMusicCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    music = db.query(models.Music).filter(models.Music.id == user_music.music_id).first()
    if not music:
        raise HTTPException(status_code=404, detail="Music not found")
    existing = db.query(models.UserMusic).filter(
        models.UserMusic.user_id == current_user.id,
        models.UserMusic.music_id == user_music.music_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Music already in collection")
    db_user_music = models.UserMusic(
        user_id=current_user.id,
        music_id=user_music.music_id,
        status=user_music.status
    )
    db.add(db_user_music)
    db.commit()
    db.refresh(db_user_music)
    return db_user_music

@app.get(
    "/get_collection",
    response_model=List[schemas.UserMusicResponse],
    summary="Get current user's collection",
    description="Retrieve the authenticated user's personal music collection.",
    tags=["Collections"]
)
def get_my_collection(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.UserMusic).filter(models.UserMusic.user_id == current_user.id).all()

@app.get("/collection/{user_id}", response_model=List[schemas.UserMusicResponse])
def get_user_collection(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a user's collection (users can only see their own, admins can see any)"""
    # Users can only see their own collection, admins can see any
    if not current_user.is_admin() and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only view your own collection")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    collection = db.query(models.UserMusic).filter(
        models.UserMusic.user_id == user_id
    ).all()
    return collection
@app.put(
    "/collection/{user_music_id}",
    response_model=schemas.UserMusicResponse,
    summary="Update collection item",
    description="Update the status (e.g., liked/favorite) of an item in the user's collection.",
    tags=["Collections"]
)
def update_collection_item(
    user_music_id: int,
    update_data: schemas.UserMusicUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user_music = db.query(models.UserMusic).filter(models.UserMusic.id == user_music_id).first()
    if not user_music:
        raise HTTPException(status_code=404, detail="Music not found in collection")
    if not current_user.is_admin() and user_music.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own collection")
    setattr(user_music, "status", update_data.status)
    db.commit()
    db.refresh(user_music)
    return user_music

@app.delete(
    "/remove_collection/{user_music_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove from collection",
    description="Remove a music item from the authenticated user's collection.",
    tags=["Collections"]
)
def remove_from_collection(
    user_music_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user_music = db.query(models.UserMusic).filter(models.UserMusic.id == user_music_id).first()
    if not user_music:
        raise HTTPException(status_code=404, detail="Music not found in collection")
    if not current_user.is_admin() and user_music.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only remove your own collection")
    db.delete(user_music)
    db.commit()
    return None

# --------------------------------------------------------------------
# User Management Endpoints
# --------------------------------------------------------------------
@app.get("/collections", response_model=List[schemas.UserCollectionResponse])
def get_all_collections(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Admin only: View all users' collections"""
    users = db.query(models.User).all()
    result = []
    for user in users:
        user_music_items = db.query(models.UserMusic).filter(
            models.UserMusic.user_id == user.id
        ).all()
        result.append({
            "user_id": user.id,
            "username": user.username,
            "music_items": user_music_items
        })
    return result

@app.post(
    "/users",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new user",
    description="Register a new user in the system.",
    tags=["Users"]
)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    db_user = models.User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get(
    "/list_users",
    response_model=List[schemas.UserResponse],
    summary="List all users",
    description="Retrieve a list of all registered users.",
    tags=["Users"]
)
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


# --------------------------------------------------------------------
# Comments Endpoints
# --------------------------------------------------------------------

@app.post(
    "/comments",
    response_model=schemas.CommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a comment/review to a music item",
    tags=["Comments"]
)
def add_comment(
    comment_in: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    music = db.query(models.Music).filter(models.Music.id == comment_in.music_id).first()
    if not music:
        raise HTTPException(status_code=404, detail="Music not found")
    comment = models.Comment(
        user_id=current_user.id,
        music_id=comment_in.music_id,
        content=comment_in.content,
        rating=comment_in.rating
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

@app.get(
    "/music/{music_id}/comments",
    response_model=List[schemas.CommentResponse],
    summary="List comments for a music item",
    tags=["Comments"]
)
def list_comments_for_music(
    music_id: int,
    db: Session = Depends(get_db)
):
    music = db.query(models.Music).filter(models.Music.id == music_id).first()
    if not music:
        raise HTTPException(status_code=404, detail="Music not found")
    return (
        db.query(models.Comment)
        .filter(models.Comment.music_id == music_id)
        .order_by(models.Comment.created_at.desc())
        .all()
    )

# --------------------------------------------------------------------
# Root Endpoint
# --------------------------------------------------------------------
@app.get("/", tags=["General"])
def root():
    """API root information."""
    return {
        "message": "Welcome to the Music Collection Manager API",
        "docs": "/docs",
        "redoc": "/redoc",
        "version": "1.0.0"
    }

# --------------------------------------------------------------------
# Run the app
# --------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
