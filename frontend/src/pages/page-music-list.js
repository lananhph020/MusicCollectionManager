import { LitElement, html, css } from 'lit';
import { musicApi, collectionApi } from '../services/api.js';

export class PageMusicList extends LitElement {
  static styles = css`
    section{max-width:900px;margin:0 auto;padding:1rem}
    ul{list-style:none;padding:0}
    li{padding:.6rem 0;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;gap:.5rem;align-items:center}
    .muted{color:#666}
    button{padding:.45rem .6rem;border:1px solid #ccc;border-radius:10px;background:#fff}
    [role="alert"]{color:#b00020}
  `;
  static properties = { items:{state:true}, loading:{state:true}, error:{state:true}, adding:{state:true} };
  constructor(){ super(); this.items=[]; this.loading=true; this.error=null; this.adding=new Set(); }
  connectedCallback(){ super.connectedCallback(); this._load(); }

  async _load(){
    this.loading = true;
    try{ this.items = await musicApi.list(); this.error = null; }
    catch(e){ this.error = e.message; }
    finally{ this.loading = false; }
  }

  async add(musicId){
    this.adding.add(musicId); this.requestUpdate();
    try{ await collectionApi.add(musicId, 'none'); alert('Added to your collection'); }
    catch(e){ alert(e.message); }
    finally{ this.adding.delete(musicId); this.requestUpdate(); }
  }

  render(){
    return html`
      <section>
        <h2>All Music</h2>
        ${this.loading?html`<p>Loading…</p>`:null}
        ${this.error?html`<p role="alert">${this.error}</p>`:null}
        <ul>
          ${this.items.map(m=>html`<li>
            <div>
              <a href="#/music/${m.id}"><b>${m.title}</b></a> — ${m.artist}
              <div class="muted">${m.genre ?? '—'} · ${m.year ?? '—'} · ${m.album ?? '—'}</div>
            </div>
            <button @click=${()=>this.add(m.id)} ?disabled=${this.adding.has(m.id)}>
              ${this.adding.has(m.id) ? 'Adding…' : 'Add'}
            </button>
          </li>`)}
        </ul>
      </section>
    `;
  }
}
customElements.define('page-music-list', PageMusicList);
