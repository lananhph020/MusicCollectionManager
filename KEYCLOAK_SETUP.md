# Keycloak Authentication Setup Guide

## Overview
This Music Collection Manager uses **Keycloak** as the identity management platform with **OAuth2/OpenID Connect** for authentication and authorization.


## Step-by-Step Setup Instructions

### **1. Start Keycloak with Docker**

```bash
# From project root
docker-compose up -d

# Check if services are running
docker ps
```

**Access Keycloak Admin Console**:
- URL: http://localhost:8080
- Username: `admin`
- Password: `admin`

---

### **2. Configure Keycloak Realm**

#### **A. Create Realm**
1. Login to Keycloak Admin Console
2. Hover over "Keycloak" (top-left) → Click "Create Realm"
3. **Realm name**: `music-manager`
4. Click "Create"

#### **B. Create Client**
1. Navigate to **Clients** → Click "Create client"
2. **Client ID**: `music-manager-client`
3. **Client Protocol**: `openid-connect`
4. Click "Next"
5. **Client authentication**: ON (Enable)
6. **Authorization**: OFF
7. **Authentication flow**: Check these:
   - Standard flow (Authorization Code Flow)
   - Direct access grants
8. Click "Next"
9. **Valid redirect URIs**: 
   ```
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   ```
10. **Web origins**: 
    ```
    http://localhost:5173
    http://127.0.0.1:5173
    ```
11. Click "Save"

#### **C. Get Client Secret**
1. Go to **Clients** → `music-manager-client` → **Credentials** tab
2. Copy the **Client Secret**
3. Update `backend/keycloak_config.py`:
   ```python
   KEYCLOAK_CLIENT_SECRET = "YOUR_CLIENT_SECRET_HERE"
   ```

#### **D. Create Roles**
1. Go to **Realm roles** → Click "Create role"
2. Create two roles:
   - **Role name**: `admin`
   - **Role name**: `user`

#### **E. Create Users**

**Admin User**:
1. Go to **Users** → Click "Create new user"
2. **Username**: `admin`
3. **Email**: `admin@example.com`
4. **Email verified**: ON
5. Click "Create"
6. Go to **Credentials** tab → Click "Set password"
   - **Password**: `admin123`
   - **Temporary**: OFF
7. Go to **Role mapping** tab → Click "Assign role"
   - Select `admin` and `user` roles

**Regular User**:
1. Create another user: `john_user`
2. **Email**: `user@example.com`
3. Set password: `john123`
4. Assign only `user` role

---

### **3. Install Python Dependencies**

```bash
# Activate virtual environment (if using)
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

---

### **4. Update Database Schema**

```bash
# Delete old database (if exists)
Remove-Item backend\music_collection.db -ErrorAction SilentlyContinue

# Database will be recreated automatically on first run
```

---

### **5. Start Backend**

```bash
cd backend
python main.py

# Or use uvicorn directly
uvicorn main:app --reload --port 8000
```

**Backend runs on**: http://localhost:8000

**API Documentation**: http://localhost:8000/docs



