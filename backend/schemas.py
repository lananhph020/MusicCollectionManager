from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from models import MusicStatus, UserRole

class MusicBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    artist: str = Field(..., min_length=1, max_length=100)
    album: Optional[str] = Field(None, max_length=200)
    genre: Optional[str] = Field(None, max_length=50)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    duration: Optional[int] = Field(None, ge=1)

class MusicCreate(MusicBase):
    pass

class MusicUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    artist: Optional[str] = Field(None, min_length=1, max_length=100)
    album: Optional[str] = Field(None, max_length=200)
    genre: Optional[str] = Field(None, max_length=50)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    duration: Optional[int] = Field(None, ge=1)

class MusicResponse(MusicBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserMusicBase(BaseModel):
    status: MusicStatus = MusicStatus.NONE

class UserMusicCreate(UserMusicBase):
    music_id: int

class UserMusicUpdate(BaseModel):
    status: MusicStatus

class UserMusicResponse(BaseModel):
    id: int
    user_id: int
    music_id: int
    status: MusicStatus
    added_at: datetime
    music: MusicResponse
    
    class Config:
        from_attributes = True

class UserCollectionResponse(BaseModel):
    user_id: int
    username: str
    music_items: list[UserMusicResponse]
    
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.USER

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: UserRole
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserMusicCreateWithUser(UserMusicBase):
    user_id: int
    music_id: int

class CommentCreate(BaseModel):
    music_id: int
    content: str = Field(..., min_length=1, max_length=5000)
    rating: Optional[int] = Field(None, ge=1, le=5)

class CommentResponse(BaseModel):
    id: int
    user_id: int
    music_id: int
    content: str
    rating: Optional[int]
    created_at: datetime

class Config:
        from_attributes = True

# Keycloak Authentication Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: Optional[int] = None

class TokenExchange(BaseModel):
    code: str
    redirect_uri: str = "http://localhost:5173/callback"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None
