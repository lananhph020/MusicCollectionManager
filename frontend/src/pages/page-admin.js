import { LitElement, html, css } from 'lit';
import { musicApi, usersApi } from '../services/api.js';

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

export class PageAdmin extends LitElement {
  static styles = css`
    section{max-width:900px;margin:0 auto;padding:1rem}
    form{display:grid;gap:.5rem;max-width:480px}
    input,button{padding:.55rem .7rem;border:1px solid #ccc;border-radius:10px;background:#fff}
    ul{list-style:none;padding:0}
    li{padding:.5rem 0;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center}
    [role="alert"]{color:#b00020}
  `;
  static properties = { items:{state:true}, loading:{state:true}, error:{state:true} };

  constructor(){ 
    super(); 
    this.items=[]; 
    this.loading=true; 
    this.error=null; 
  }

  async connectedCallback(){
    super.connectedCallback();
    try{
      this.items = await musicApi.list();
      this.error = null;
    }catch(e){ 
      this.error = e.message; 
    }
    finally{ 
      this.loading=false; 
    }
  }

  async create(e){
    e.preventDefault();
    const form = getEventForm(e);
    if (!form) return;

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    ['year','duration'].forEach(k => payload[k] = payload[k] ? Number(payload[k]) : null);

    try{
      const m = await musicApi.create(payload);
      this.items = [m, ...this.items];
      form.reset(); // ✅ safe reset
    }catch(err){
      alert(err.message);
    }
  }

  async del(id){
    if(!confirm('Delete this music?')) return;
    try{
      await musicApi.delete(id);
      this.items = this.items.filter(i=>i.id!==id);
    }catch(err){
      alert(err.message);
    }
  }

  render(){
    if(this.loading) return html`<section><p>Loading…</p></section>`;
    if(this.error && this.error.includes('403')) return html`<section><p role="alert">Admin access required. Only admins can manage music.</p></section>`;
    return html`
      <section>
        <h2>Admin · Manage Music</h2>
        ${this.error ? html`<p role="alert">${this.error}</p>` : null}

        <form @submit=${this.create}>
          <input name="title" placeholder="Title" required minlength="1" maxlength="200"/>
          <input name="artist" placeholder="Artist" required minlength="1" maxlength="100"/>
          <input name="album" placeholder="Album"/>
          <input name="genre" placeholder="Genre"/>
          <input type="number" name="year" placeholder="Year" min="1900" max="2100"/>
          <input type="number" name="duration" placeholder="Duration (s)" min="1"/>
          <button type="submit">Add</button>
        </form>

        <h3 style="margin-top:1rem">Existing</h3>
        <ul>
          ${this.items.map(m=>html`
            <li>
              <a href="#/music/${m.id}">${m.title}</a>
              <button type="button" @click=${()=>this.del(m.id)}>Delete</button>
            </li>`)}
        </ul>
      </section>
    `;
  }
}
customElements.define('page-admin', PageAdmin);
