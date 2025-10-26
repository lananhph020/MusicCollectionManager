from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SQLEnum, DateTime
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime

class MusicStatus(str, enum.Enum):
    LIKE = "like"
    DISLIKE = "dislike"
    FAVOURITE = "favourite"
    NONE = "none"

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    music_items = relationship("UserMusic", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")

    
    def is_admin(self):
        """Check if user has admin role"""
        return self.role == UserRole.ADMIN

class Music(Base):
    __tablename__ = "music"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    artist = Column(String, nullable=False)
    album = Column(String, nullable=True)
    genre = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    duration = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_items = relationship("UserMusic", back_populates="music", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="music", cascade="all, delete-orphan")


class UserMusic(Base):
    __tablename__ = "user_music"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    music_id = Column(Integer, ForeignKey("music.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(MusicStatus), default=MusicStatus.NONE, nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="music_items")
    music = relationship("Music", back_populates="user_items")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    music_id = Column(Integer, ForeignKey("music.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    rating = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="comments")
    music = relationship("Music", back_populates="comments")
