(()=>{
  // ---------------- Storage Provider ----------------
  const LIB_KEY = 'xer_book_library_v1';
  const BOOK_PREFIX = 'xer_book_';

  const Storage = {
    list(){ try{ return JSON.parse(localStorage.getItem(LIB_KEY))||[] }catch{ return [] } },
    saveList(list){ localStorage.setItem(LIB_KEY, JSON.stringify(list)) },
    getBook(id){ try{ return JSON.parse(localStorage.getItem(BOOK_PREFIX+id))||null }catch{ return null } },
    saveBook(book){
      localStorage.setItem(BOOK_PREFIX+book.id, JSON.stringify(book));
      const list=this.list();
      const i=list.findIndex(x=>x.id===book.id);
      const meta={id:book.id,title:book.title,updatedAt:Date.now(),direction:book.direction,viewMode:book.viewMode};
      if(i===-1) list.unshift(meta); else list[i]=Object.assign(list[i],meta);
      this.saveList(list);
    },
    deleteBook(id){
      localStorage.removeItem(BOOK_PREFIX+id);
      this.saveList(this.list().filter(x=>x.id!==id));
    },
    duplicateBook(id){
      const src=this.getBook(id); if(!src) return null;
      const copy=structuredClone(src); copy.id=uid(); copy.title=(src.title||'未命名')+'（副本）';
      this.saveBook(copy);
      return copy.id;
    }
  };

  // ---------------- Helpers ----------------
  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>[...root.querySelectorAll(s)];
  const uid=()=>Math.random().toString(36).slice(2,10);
  const fmtTime=ts=>new Date(ts).toLocaleString();
  const escapeHtml=s=>(s||'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ---------------- Library View ----------------
  const libGrid = $('#libGrid');
  const dlgNew  = $('#dlgNew');

  function renderLibrary(){
    const list = Storage.list();
    if(list.length===0){
      libGrid.innerHTML = `
        <div class="card">
          <h3>還沒有書籍</h3>
          <div class="muted">點右上角「＋ 新增書籍」開始吧。</div>
        </div>`;
      return;
    }
    libGrid.innerHTML = list.map(m=>`
      <div class="card">
        <h3>${escapeHtml(m.title||'未命名')}</h3>
        <div class="muted">最後更新：${m.updatedAt?fmtTime(m.updatedAt):'—'}</div>
        <div class="actions">
          <button class="btn primary" data-act="open" data-id="${m.id}">開啟</button>
          <button class="btn" data-act="dup" data-id="${m.id}">製作副本</button>
          <button class="btn danger" data-act="del" data-id="${m.id}">刪除</button>
        </div>
      </div>
    `).join('');

    $$('#libGrid [data-act]').forEach(btn=>{
      const id=btn.dataset.id;
      btn.addEventListener('click',()=>{
        const act=btn.dataset.act;
        if(act==='open'){
          // 呼叫第二個 JS 的進入點（若尚未載入會 fallback 提示）
          if(window.Editor && typeof window.Editor.open === 'function'){
            window.Editor.open(id);
          }else{
            const b = Storage.getBook(id);
            alert(`（編輯器連接中）\n將開啟：${b?.title||'未命名'}（ID: ${id}）`);
          }
        }
        if(act==='dup'){
          const nid=Storage.duplicateBook(id);
          if(nid){ renderLibrary(); }
        }
        if(act==='del'){
          if(confirm('確定刪除此書？')){ Storage.deleteBook(id); renderLibrary(); }
        }
      });
    });
  }

  // ---------------- Create Book ----------------
  $('#btnNew').addEventListener('click',()=>{ $('#formNew').reset(); dlgNew.showModal(); });
  $('#btnCreate').addEventListener('click',()=>{
    const book = {
      id: uid(),
      title: $('#f_title').value.trim() || '未命名書籍',
      binding: $('#f_binding').value,
      direction: $('#f_direction').value,
      viewMode: $('#f_view').value,
      pages: []  // 第二個 JS（editor.js）會接手
    };
    Storage.saveBook(book);
    dlgNew.close();
    renderLibrary();
  });

 
  // ---------------- 暴露 Storage 給第二支 JS 使用 ----------------
  window.BookStorage = Storage;

  // ---------------- Boot ----------------
  renderLibrary();
})();
