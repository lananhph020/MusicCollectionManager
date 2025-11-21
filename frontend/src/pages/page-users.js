import { LitElement, html, css } from 'lit';
import { usersApi } from '../services/api.js';

// Robustly find the <form> for submit handlers across shadow DOM/HMR
function getEventForm(e) {
  if (e?.currentTarget instanceof HTMLFormElement) return e.currentTarget; // handler bound to form
  if (e?.target?.form instanceof HTMLFormElement) return e.target.form;   // clicked button inside a form
  if (typeof e.composedPath === 'function') {
    const node = e.composedPath().find(n => n && n.tagName === 'FORM');
    if (node) return node;
  }
  return null;
}

export class PageUsers extends LitElement {
  static styles = css`
    section{max-width:800px;margin:0 auto;padding:1rem}
    form{display:grid;gap:.5rem;max-width:360px}
    button,select,input{padding:.55rem .7rem;border:1px solid #ccc;border-radius:10px;background:#fff}
    ul{list-style:none;padding:0;margin-top:1rem}
    li{padding:.4rem 0;border-bottom:1px solid #f0f0f0}
    [role="alert"]{color:#b00020}
    .row{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
  `;
  static properties = { users:{state:true}, error:{state:true}, loading:{state:true} };

  constructor(){ 
    super(); 
    this.users=[]; 
    this.error=null; 
    this.loading=true; 
  }

  connectedCallback(){ 
    super.connectedCallback(); 
    this._load(); 
  }

  async _load(){
    this.loading=true;
    try{ 
      this.users = await usersApi.list(); 
      this.error=null; 
    }
    catch(e){ 
      this.error=e.message; 
    }
    finally{ 
      this.loading=false; 
    }
  }

  onPick(e){
    const id = e.target.value ? Number(e.target.value) : null;
    setCurrentUser(id);
    this.currentId = id;
    this.dispatchEvent(new CustomEvent('refresh-users', {bubbles:true, composed:true}));
  }

  async onCreate(e){
    e.preventDefault();
    const form = getEventForm(e);
    if (!form) return;

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    try{
      const u = await usersApi.create(payload);
      this.users = [u, ...this.users];
      form.reset(); // ✅ safe reset
      if (!this.currentId) { 
        setCurrentUser(u.id); 
        this.currentId = u.id; 
      }
    }catch(err){ 
      alert(err.message); 
    }
  }

  render(){
    return html`
      <section>
        <h2>Users</h2>
        <div class="row" style="margin:.5rem 0">
          <label>Signed in as:
            <select @change=${this.onPick}>
              <option value="">— none —</option>
              ${this.users.map(u=>html`
                <option value=${u.id} ?selected=${this.currentId===u.id}>
                  ${u.username} (${u.role})
                </option>`)}
            </select>
          </label>
          <button @click=${()=>this._load()} ?disabled=${this.loading}>
            ${this.loading?'Loading…':'Refresh'}
          </button>
        </div>
        ${this.error ? html`<p role="alert">${this.error}</p>` : null}

        <h3>Create user</h3>
        <form @submit=${this.onCreate}>
          <input name="username" placeholder="username" required minlength="3" />
          <input name="email" type="email" placeholder="email@example.com" required />
          <input name="password" type="password" placeholder="password" required minlength="6" />
          <select name="role">
            <option value="user" selected>user</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit">Create</button>
        </form>

        <ul>
          ${this.users.map(u=>html`
            <li><b>${u.username}</b> — ${u.email} (${u.role})</li>
          `)}
        </ul>
      </section>
    `;
  }
}
customElements.define('page-users', PageUsers);
