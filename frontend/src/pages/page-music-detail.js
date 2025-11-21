import { LitElement, html, css } from 'lit';
import { musicApi, commentsApi, collectionApi } from '../services/api.js';

export class PageMusicDetail extends LitElement {
  static styles = css`
    section{max-width:800px;margin:0 auto;padding:1rem}
    .muted{color:#666}
    form{display:grid;gap:.5rem;max-width:420px;margin:.75rem 0}
    input,button{padding:.55rem .7rem;border:1px solid #ccc;border-radius:10px;background:#fff}
    ul{list-style:none;padding:0}
    li{padding:.5rem 0;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;gap:.5rem}
    [role="alert"]{color:#b00020}
  `;
  static properties = { musicId:{type:Number}, music:{state:true}, comments:{state:true}, loading:{state:true}, error:{state:true} };

  constructor(){
    super();
    this.musicId=null;
    this.music=null;
    this.comments=[];
    this.loading=true;
    this.error=null;
  }

  connectedCallback(){
    super.connectedCallback();
    this._load();
  }

  async _load(){
    // derive id from hash if not passed as property
    if(this.musicId==null){
      const m=(location.hash.replace(/^#/, '')).match(/^\/music\/(\d+)$/);
      if(m) this.musicId=Number(m[1]);
    }
    if(this.musicId==null){ this.error='Invalid music id'; this.loading=false; return; }

    this.loading = true;
    try{
      this.music = await musicApi.get(this.musicId);
      this.comments = await commentsApi.listForMusic(this.musicId);
      this.error = null;
    }catch(e){ this.error = e.message; }
    finally{ this.loading = false; }
  }

  async addToCollection(){
    try{ await collectionApi.add(this.musicId, 'none'); alert('Added to your collection'); }
    catch(e){ alert(e.message); }
  }

  async addComment(e){
    e.preventDefault();

    // deterministic: grab the form by id inside shadow DOM
    const form = this.renderRoot?.getElementById('commentForm');
    if (!form) return;

    const fd = new FormData(form);
    const content = String(fd.get('content') || '').trim();
    const ratingRaw = fd.get('rating');
    const rating = ratingRaw ? Number(ratingRaw) : null;
    if(!content) return;

    try{
      const c = await commentsApi.add(this.musicId, content, rating);
      this.comments = [c, ...this.comments];
      form.reset();
    }catch(err){ alert(err.message); }
  }

  render(){
    if(this.loading) return html`<section><p>Loading…</p></section>`;
    if(this.error) return html`<section><p role="alert">${this.error}</p></section>`;
    if(!this.music) return null;

    return html`
      <section>
        <h2>${this.music.title} — ${this.music.artist}</h2>
        <div class="muted">${this.music.genre ?? '—'} · ${this.music.year ?? '—'} · ${this.music.album ?? '—'}</div>
        <button type="button" @click=${this.addToCollection}>Add to my collection</button>
      </section>

      <section>
        <h3>Comments</h3>
        <form id="commentForm" @submit=${this.addComment}>
          <input name="content" placeholder="Write a comment…" required />
          <input type="number" name="rating" min="1" max="5" placeholder="rating (1–5, optional)"/>
          <button type="submit">Add</button>
        </form>

        <ul>
          ${this.comments.map(c=>html`<li>
            <div>
              <b>${c.rating ?? '—'}/5</b>
              ${c.content}
              <div class="muted">
                by #${c.user_id} · ${new Date(c.created_at).toLocaleString()}
              </div>
            </div>
            <small class="muted">#${c.id}</small>
          </li>`)}
        </ul>
      </section>
    `;
  }
}
customElements.define('page-music-detail', PageMusicDetail);
