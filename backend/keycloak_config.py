"""
Keycloak Configuration for Music Collection Manager
"""
import os
from dotenv import load_dotenv


load_dotenv()
# Keycloak Server Configuration
KEYCLOAK_SERVER_URL = os.getenv("KEYCLOAK_SERVER_URL", "http://localhost:8080")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "music-manager")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "music-manager-client")
KEYCLOAK_CLIENT_SECRET = os.getenv("KEYCLOAK_CLIENT_SECRET")  # Set after creating client

# Keycloak Admin Configuration (for setup/management)
KEYCLOAK_ADMIN_USERNAME = os.getenv("KEYCLOAK_ADMIN_USERNAME", "admin")
KEYCLOAK_ADMIN_PASSWORD = os.getenv("KEYCLOAK_ADMIN_PASSWORD", "admin")

# Role names in Keycloak
ROLE_ADMIN = "admin"
ROLE_USER = "user"
