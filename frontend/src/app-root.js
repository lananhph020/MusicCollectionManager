import { LitElement, html, css } from 'lit';
import { usersApi, getCurrentUser, setCurrentUser } from './services/api.js';
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
    select, button { padding:.45rem .6rem; border:1px solid #ccc; border-radius:10px; background:#fff; }
    .spacer { flex: 1 1 auto; }
  `;
  static properties = {
    route: {state:true},
    params: {state:true},
    users: {state:true},
    currentId: {state:true},
    loadingUsers: {state:true},
    userError: {state:true},
  };

  constructor(){
    super();
    this.route = this._parseRoute();
    this.params = {};
    this.users = [];
    this.currentId = getCurrentUser();
    this.loadingUsers = true;
    this.userError = null;
  }

  connectedCallback(){
    super.connectedCallback();
    window.addEventListener('hashchange', ()=>{ this.route = this._parseRoute(); this.requestUpdate(); });
    this._loadUsers();
  }

  _parseRoute(){
    const hash = location.hash.replace(/^#/, '') || '/music';
    const m = hash.match(/^\/music\/(\d+)$/);
    if (m) { this.params = { id: Number(m[1]) }; return '/music/:id'; }
    this.params = {};
    return hash;
  }

  async _loadUsers(){
    this.loadingUsers = true;
    try { this.users = await usersApi.list(); this.userError = null; }
    catch(e){ this.userError = e.message; }
    finally { this.loadingUsers = false; }
  }

  onPickUser(e){
    const id = e.target.value ? Number(e.target.value) : null;
    setCurrentUser(id);
    this.currentId = id;
  }

  _renderPage(){
    switch(this.route){
      case '/users': return html`<page-users .allUsers=${this.users} @refresh-users=${()=>this._loadUsers()}></page-users>`;
      case '/music': return html`<page-music-list></page-music-list>`;
      case '/music/:id': return html`<page-music-detail .musicId=${this.params.id}></page-music-detail>`;
      case '/collection': return html`<page-collection></page-collection>`;
      case '/admin': return html`<page-admin .allUsers=${this.users}></page-admin>`;
      default: return html`<section style="padding:1rem"><p>Not found</p></section>`;
    }
  }

  render(){
    return html`
      <header>
        <a href="#/music"><b>🎵 Music App</b></a>
        <nav>
          <a href="#/music">Music</a>
          <a href="#/collection">My Collection</a>
          <a href="#/users">Users</a>
          <a href="#/admin">Admin</a>
        </nav>
        <div class="spacer"></div>

        <label>Signed in:
          <select @change=${this.onPickUser}>
            <option value="">— none —</option>
            ${this.users.map(u=>html`<option value=${u.id} ?selected=${this.currentId===u.id}>${u.username} (${u.role})</option>`)}
          </select>
        </label>
        ${this.loadingUsers ? html`<small style="margin-left:.5rem;color:#666">loading…</small>` : null}
        ${this.userError ? html`<small role="alert" style="margin-left:.5rem;color:#b00020">${this.userError}</small>` : null}
      </header>
      <main>
        ${this._renderPage()}
      </main>
    `;
  }
}
customElements.define('app-root', AppRoot);
