"""
Authentication utilities for Keycloak integration
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from keycloak import KeycloakOpenID
from sqlalchemy.orm import Session
from typing import Optional
import requests

import models
from database import get_db
import keycloak_config

# Security scheme for Bearer token
security = HTTPBearer()

# Initialize Keycloak OpenID client
keycloak_openid = KeycloakOpenID(
    server_url=keycloak_config.KEYCLOAK_SERVER_URL,
    client_id=keycloak_config.KEYCLOAK_CLIENT_ID,
    realm_name=keycloak_config.KEYCLOAK_REALM,
    client_secret_key=keycloak_config.KEYCLOAK_CLIENT_SECRET
)

def get_keycloak_public_key():
    """Retrieve the public key from Keycloak for token verification"""
    try:
        return (
            "-----BEGIN PUBLIC KEY-----\n"
            + keycloak_openid.public_key()
            + "\n-----END PUBLIC KEY-----"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not connect to Keycloak: {str(e)}"
        )

def verify_token(token: str) -> dict:
    """
    Verify and decode the Keycloak JWT token
    Returns the decoded token payload
    """
    try:
        # Get public key for verification
        public_key = get_keycloak_public_key()
        
        # Decode and verify the token
        options = {
            "verify_signature": True,
            "verify_aud": False,  # Keycloak tokens don't always have aud
            "verify_exp": True
        }
        
        decoded_token = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options=options
        )
        
        return decoded_token
    
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def extract_roles(token_payload: dict) -> list[str]:
    """Extract roles from the Keycloak token payload"""
    # Keycloak stores roles in different locations depending on configuration
    roles = []
    
    # Check realm roles
    if "realm_access" in token_payload:
        roles.extend(token_payload["realm_access"].get("roles", []))
    
    # Check client roles
    if "resource_access" in token_payload:
        client_roles = token_payload["resource_access"].get(
            keycloak_config.KEYCLOAK_CLIENT_ID, {}
        )
        roles.extend(client_roles.get("roles", []))
    
    return roles

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Dependency to get the current authenticated user from Keycloak token
    """
    token = credentials.credentials
    
    # Verify and decode token
    token_payload = verify_token(token)
    
    # Extract user information from token
    keycloak_user_id = token_payload.get("sub")  # Keycloak user ID
    username = token_payload.get("preferred_username")
    email = token_payload.get("email")
    
    if not keycloak_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID"
        )
    
    # Extract roles
    roles = extract_roles(token_payload)
    
    # Determine user role (admin or user)
    user_role = models.UserRole.ADMIN if keycloak_config.ROLE_ADMIN in roles else models.UserRole.USER
    
    # Find or create user in local database
    user = db.query(models.User).filter(
        models.User.keycloak_id == keycloak_user_id
    ).first()
    
    if not user:
        # Create new user in local database
        user = models.User(
            username=username or keycloak_user_id,
            email=email or f"{keycloak_user_id}@temp.com",
            keycloak_id=keycloak_user_id,
            role=user_role
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update role if changed in Keycloak
        if user.role != user_role:
            user.role = user_role
            db.commit()
            db.refresh(user)
    
    return user

def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """
    Dependency to ensure the current user has admin role
    """
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def get_keycloak_login_url() -> str:
    """Get the Keycloak login URL for redirecting users"""
    return keycloak_openid.auth_url(
        redirect_uri="http://localhost:5173/callback",
        scope="openid email profile"
    )

def exchange_code_for_token(code: str, redirect_uri: str) -> dict:
    """
    Exchange authorization code for access token
    Used in OAuth2 authorization code flow
    """
    try:
        token_response = keycloak_openid.token(
            grant_type="authorization_code",
            code=code,
            redirect_uri=redirect_uri
        )
        return token_response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to exchange code for token: {str(e)}"
        )

def refresh_access_token(refresh_token: str) -> dict:
    """
    Refresh the access token using a refresh token
    """
    try:
        token_response = keycloak_openid.refresh_token(refresh_token)
        return token_response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to refresh token: {str(e)}"
        )

def logout_user(refresh_token: str) -> None:
    """
    Logout user by invalidating the refresh token
    """
    try:
        keycloak_openid.logout(refresh_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to logout: {str(e)}"
        )
