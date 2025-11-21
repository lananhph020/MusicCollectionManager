import { LitElement, html, css } from 'lit';
import { authApi, usersApi, getToken, setToken, getCurrentUserInfo, setCurrentUserInfo, clearTokens } from './services/api.js';
import './pages/page-users.js';
import './pages/page-music-list.js';
import './pages/page-music-detail.js';
import './pages/page-collection.js';
import './pages/page-admin.js';

class AppRoot extends LitElement {
  static styles = css`
    :host { display:block; font:14px/1.45 system-ui, sans-serif; color:#1b1b1f; }
    header { padding:1rem; border-bottom:1px solid #eee; display:flex; gap:1rem; align-items:center; }
    header a { text-decoration:none }
    nav a { margin-right:.75rem; }
    main { padding:0 }
    button, a.btn { padding:.45rem .6rem; border:1px solid #ccc; border-radius:10px; background:#fff; cursor:pointer; text-decoration:none; display:inline-block; }
    button:hover, a.btn:hover { background:#f5f5f5; }
    .spacer { flex: 1 1 auto; }
  `;
  static properties = {
    route: {state:true},
    params: {state:true},
    currentUser: {state:true},
    isAuthenticated: {state:true},
    loading: {state:true},
  };

  constructor(){
    super();
    this.route = this._parseRoute();
    this.params = {};
    this.currentUser = getCurrentUserInfo();
    this.isAuthenticated = !!getToken();
    this.loading = false;
  }

  connectedCallback(){
    super.connectedCallback();
    window.addEventListener('hashchange', ()=>{ this.route = this._parseRoute(); this.requestUpdate(); });
    
    // Check if returning from Keycloak callback
    this._handleCallback();
    
    // Load current user if authenticated
    if (this.isAuthenticated && !this.currentUser) {
      this._loadCurrentUser();
    }
  }

  _parseRoute(){
    const hash = location.hash.replace(/^#/, '') || '/music';
    const m = hash.match(/^\/music\/(\d+)$/);
    if (m) { this.params = { id: Number(m[1]) }; return '/music/:id'; }
    this.params = {};
    return hash;
  }

  async _handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      this.loading = true;
      try {
        const redirectUri = `${window.location.origin}${window.location.pathname}`;
        const tokenData = await authApi.exchangeToken(code, redirectUri);
        setToken(tokenData.access_token, tokenData.refresh_token);
        
        // Get user info
        const user = await authApi.getCurrentUser();
        setCurrentUserInfo(user);
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname + '#/music');
      } catch (e) {
        console.error('Authentication failed:', e);
        alert('Login failed: ' + e.message);
      } finally {
        this.loading = false;
      }
    }
  }

  async _loadCurrentUser() {
    try {
      const user = await authApi.getCurrentUser();
      setCurrentUserInfo(user);
      this.currentUser = user;
    } catch (e) {
      console.error('Failed to load user:', e);
      clearTokens();
      this.isAuthenticated = false;
      this.currentUser = null;
    }
  }

  async onLogin() {
    try {
      const { login_url } = await authApi.getLoginUrl();
      window.location.href = login_url;
    } catch (e) {
      alert('Failed to get login URL: ' + e.message);
    }
  }

  async onLogout() {
    try {
      await authApi.logout();
      clearTokens();
      this.isAuthenticated = false;
      this.currentUser = null;
      // Redirect to home page after logout
      window.location.href = 'http://localhost:5173/';
    } catch (e) {
      console.error('Logout failed:', e);
      clearTokens();
      this.isAuthenticated = false;
      this.currentUser = null;
      window.location.href = 'http://localhost:5173/';
    }
  }

  _renderPage(){
    if (!this.isAuthenticated) {
      return html`
        <section style="padding:2rem; text-align:center">
          <h2>Welcome to Music Collection Manager</h2>
          <p>Please login to continue</p>
          <button @click=${this.onLogin}>Login with Keycloak</button>
        </section>
      `;
    }
    
    switch(this.route){
      case '/users': return html`<page-users></page-users>`;
      case '/music': return html`<page-music-list></page-music-list>`;
      case '/music/:id': return html`<page-music-detail .musicId=${this.params.id}></page-music-detail>`;
      case '/collection': return html`<page-collection></page-collection>`;
      case '/admin': return html`<page-admin></page-admin>`;
      default: return html`<section style="padding:1rem"><p>Not found</p></section>`;
    }
  }

  render(){
    if (this.loading) {
      return html`<div style="padding:2rem; text-align:center">Loading...</div>`;
    }
    
    return html`
      <header>
        <a href="#/music"><b>🎵 Music App</b></a>
        ${this.isAuthenticated ? html`
          <nav>
            <a href="#/music">Music</a>
            <a href="#/collection">My Collection</a>
            ${this.currentUser?.role === 'admin' ? html`
              <a href="#/users">Users</a>
              <a href="#/admin">Admin</a>
            ` : null}
          </nav>
        ` : null}
        <div class="spacer"></div>

        ${this.isAuthenticated ? html`
          <span>Signed in as: <b>${this.currentUser?.username}</b> (${this.currentUser?.role})</span>
          <button @click=${this.onLogout}>Logout</button>
        ` : html`
          <button @click=${this.onLogin}>Login</button>
        `}
      </header>
      <main>
        ${this._renderPage()}
      </main>
    `;
  }
}
customElements.define('app-root', AppRoot);
