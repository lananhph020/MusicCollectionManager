import { LitElement, html, css } from 'lit';
import { collectionApi } from '../services/api.js';

export class PageCollection extends LitElement {
  static styles = css`
    section{max-width:900px;margin:0 auto;padding:1rem}
    ul{list-style:none;padding:0}
    li{padding:.5rem 0;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;gap:.5rem;align-items:center}
    select,button{padding:.45rem .6rem;border:1px solid #ccc;border-radius:10px;background:#fff}
    [role="alert"]{color:#b00020}
  `;
  static properties = { items:{state:true}, loading:{state:true}, error:{state:true} };
  constructor(){ super(); this.items=[]; this.loading=true; this.error=null; }
  connectedCallback(){ super.connectedCallback(); this._load(); }

  async _load(){
    try{ this.items = await collectionApi.mine(); this.error=null; }
    catch(e){ this.error = e.message; }
    finally{ this.loading=false; }
  }

  async changeStatus(id, status){
    try{ const updated = await collectionApi.updateItem(id, status); this.items = this.items.map(i=>i.id===id?updated:i); }
    catch(e){ alert(e.message); }
  }

  async removeItem(id){
    if(!confirm('Remove from collection?')) return;
    try{ await collectionApi.removeItem(id); this.items = this.items.filter(i=>i.id!==id); }
    catch(e){ alert(e.message); }
  }

  render(){
    if(this.loading) return html`<section><p>Loading…</p></section>`;
    return html`
      <section>
        <h2>My Collection</h2>
        ${this.error ? html`<p role="alert">${this.error}</p>` : null}
        <ul>
          ${this.items.map(i=>html`<li>
            <div><a href="#/music/${i.music.id}"><b>${i.music.title}</b></a> — ${i.music.artist}</div>
            <div>
              <select @change=${e=>this.changeStatus(i.id, e.target.value)}>
                ${['none','like','dislike','favourite'].map(s=>html`
                  <option value=${s} ?selected=${i.status===s}>${s}</option>`)}
              </select>
              <button @click=${()=>this.removeItem(i.id)}>Remove</button>
            </div>
          </li>`)}
        </ul>
      </section>
    `;
  }
}
customElements.define('page-collection', PageCollection);
