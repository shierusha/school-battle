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
      // 同步 meta
      const list=this.list();
      const i=list.findIndex(x=>x.id===book.id);
      const meta={
        id:book.id,
        title:book.title,
        updatedAt:Date.now(),
        direction:book.direction,
        viewMode:book.viewMode,
        coverColor: book.coverColor || '#7c8cfb',
        coverImage: book.coverImage || 'https://shierusha.github.io/school-battle/images/book.png'
      };
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
    },
    moveBook(id, newIndex){
      const list=this.list();
      const i=list.findIndex(x=>x.id===id);
      if(i<0) return;
      const [item]=list.splice(i,1);
      const j=Math.max(0, Math.min(newIndex, list.length));
      list.splice(j,0,item);
      this.saveList(list);
    }
  };

  // ---------------- Helpers ----------------
  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>[...root.querySelectorAll(s)];
  const uid=()=>Math.random().toString(36).slice(2,10);
  const escapeHtml=s=>(s||'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate=ts=> new Date(ts).toLocaleDateString(); // 只顯示日期
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const isValidHex=s=>/^#?[0-9a-fA-F]{6}$/.test(s);
  const formatTitle=(t)=>{
    t = (t||'未命名').slice(0,20);         // 最多20字
    if(t.length>10) t = t.slice(0,10) + '\n' + t.slice(10); // 10字換行
    return t;
  };

  // 顏色 -> 濾鏡（透明區不會被染色）
  function hexToHsl(hex){
    let s=hex.replace('#',''); if(s.length===3) s=s.split('').map(c=>c+c).join('');
    const r=parseInt(s.slice(0,2),16)/255, g=parseInt(s.slice(2,4),16)/255, b=parseInt(s.slice(4,6),16)/255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b); let h=0, l=(max+min)/2, d=max-min, S=0;
    if(d!==0){ S=l>0.5? d/(2-max-min) : d/(max+min); switch(max){ case r:h=(g-b)/d+(g<b?6:0);break; case g:h=(b-r)/d+2;break; case b:h=(r-g)/d+4;break;} h*=60; }
    return {h, s:S, l};
  }
  function buildFilterFromHex(hex){
    const {h,l}=hexToHsl(hex);
    const hue = Math.round(h);
    const bright = Math.round(60 + (l*40)); // 60%~100%
    return `sepia(0.4) saturate(300%) hue-rotate(${hue}deg) brightness(${bright}%)`;
  }

  // ---------------- DOM refs ----------------
  // ---------------- DOM refs ----------------
const libGrid   = $('#libGrid');
const dlgNew    = $('#dlgNew');       // 已存在：新增書籍
const dlgRename = $('#dlgRename');    // 已存在：改書名
const renameInp = $('#rename_title');
const btnRenameSave   = $('#btnRenameSave');
const btnRenameCancel = $('#btnRenameCancel'); // 如果有取消鈕

let renameTargetId = null;

// 開啟改名視窗（放在 renderLibrary 生成書卡事件裡）
// editBtn.addEventListener('click', (ev)=>{
//   ev.stopPropagation();
//   const b = Storage.getBook(id);
//   if(!b) return;
//   renameTargetId = id;
//   renameInp.value = b.title || '';
//   dlgRename.showModal();
// });

// 儲存改名
btnRenameSave.addEventListener('click', ()=>{
  let t = (renameInp.value || '').replace(/\n/g,'').trim();
  if(!t) t = '未命名';
  if(t.length > 20) t = t.slice(0,20);

  if(renameTargetId){
    const b = Storage.getBook(renameTargetId);
    if(b){ b.title = t; Storage.saveBook(b); }
  }
  dlgRename.close();
  renameTargetId = null;
  renderLibrary();
});



  // ---------------- Library View ----------------
  function renderLibrary(){
    const list = Storage.list();
    if(list.length===0){
      libGrid.innerHTML = `
        <div class="card">
          <h3>${formatTitle('還沒有書籍')}</h3>
          <div class="muted">點右上角「＋ 新增書籍」開始吧。</div>
        </div>`;
      return;
    }

    libGrid.innerHTML = list.map((m,idx)=>`
      <div class="card" data-id="${m.id}">
        <!-- 排序箭頭（固定位置） -->
        <button class="sort-btn prev" title="往前排">←</button>
        <button class="sort-btn next" title="往後排">→</button>

        <!-- 右上角工具（垂直）：書圖；下方一行：色票 + #HEX -->
        <div class="corner-tools">
          <img alt="cover" src="${escapeHtml(m.coverImage || 'https://shierusha.github.io/school-battle/images/book.png')}"
               style="filter:${buildFilterFromHex(m.coverColor||'#7c8cfb')}">
          <div class="row">
            <input type="color" value="${escapeHtml(m.coverColor||'#7c8cfb')}" data-role="color">
            <input class="hex" value="${escapeHtml(m.coverColor||'#7c8cfb')}" maxlength="7" data-role="hex">
          </div>
        </div>

       <h3 class="title-wrap">${escapeHtml(formatTitle(m.title))}<button class="title-edit" type="button" title="編輯書名">✎</button></h3>

        <div class="muted">最後更新：${m.updatedAt?fmtDate(m.updatedAt):'—'}</div>

        <div class="actions">
          <button class="btn primary" data-act="open">開啟</button>
          <button class="btn" data-act="dup">製作副本</button>
          <button class="btn danger" data-act="del">刪除</button>
        </div>
      </div>
    `).join('');

    // 綁定卡片控制
    $$('#libGrid .card').forEach((card, cardIndex)=>{
      const id = card.dataset.id;
      const img = card.querySelector('.corner-tools img');
      const colorInput = card.querySelector('[data-role="color"]');
      const hexInput = card.querySelector('[data-role="hex"]');
      const titleWrap = card.querySelector('.title-wrap');
      const editBtn   = card.querySelector('.title-edit');

      // 顏色同步＋即時濾鏡
      const apply = (hex)=>{
        if(!hex.startsWith('#')) hex = '#'+hex;
        if(!isValidHex(hex)){ alert('請輸入正確的 HEX 顏色（例如 #7c8cfb）'); return; }
        const b = Storage.getBook(id); if(!b) return;
        b.coverColor = hex;
        Storage.saveBook(b);
        img.style.filter = buildFilterFromHex(hex);
        colorInput.value = hex; hexInput.value = hex;
      };
      colorInput.addEventListener('input', ()=> apply(colorInput.value));
      hexInput.addEventListener('change', ()=> apply(hexInput.value.trim()));

      // 開啟 / 副本 / 刪除
      card.querySelector('[data-act="open"]').onclick = ()=>openBook(id);
      card.querySelector('[data-act="dup"]').onclick  = ()=>{ Storage.duplicateBook(id); renderLibrary(); };
      card.querySelector('[data-act="del"]').onclick  = ()=>{
        if(confirm('確定刪除此書？')){ Storage.deleteBook(id); renderLibrary(); }
      };

      // 排序：按鈕固定位置
      card.querySelector('.sort-btn.prev').onclick = ()=>{
        Storage.moveBook(id, cardIndex-1); renderLibrary();
      };
      card.querySelector('.sort-btn.next').onclick = ()=>{
        Storage.moveBook(id, cardIndex+1); renderLibrary();
      };

      // ★ 邊界感應（滑鼠靠近左右邊界就顯示箭頭）
      card.addEventListener('mousemove', (e)=>{
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left;
        const edge = Math.max(24, r.width*0.12); // 感應區：≥24px 或 12% 寬
        const nearLeft  = x < edge;
        const nearRight = (r.width - x) < edge;
        card.classList.toggle('near-left', nearLeft);
        card.classList.toggle('near-right', nearRight);
      });
      card.addEventListener('mouseleave', ()=>{
        card.classList.remove('near-left','near-right');
      });

      // ★ 點卡片左/右半邊也讓箭頭顯示 2.5 秒（給找不到滑鼠觸發的人）
      card.addEventListener('click', (e)=>{
        // 避免點到按鈕（開啟/刪除等）誤觸
        const tag = (e.target.tagName||'').toLowerCase();
        if(['button','input','select'].includes(tag)) return;
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left;
        const leftHalf = x < r.width/2;
        card.classList.toggle('near-left', leftHalf);
        card.classList.toggle('near-right', !leftHalf);
        setTimeout(()=>{ card.classList.remove('near-left','near-right'); }, 2500);
      });

      // ---- 書名右上角編輯：滑到右上才顯示 ✎，點了開彈窗 ----
      titleWrap.addEventListener('mousemove', (e)=>{
        const r = titleWrap.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const edgeX = Math.max(20, r.width*0.25);   // 右側 25% 或至少 20px
        const edgeY = 18;                           // 上方 18px
        const nearTopRight = (x > r.width - edgeX) && (y < edgeY);
        titleWrap.classList.toggle('title-edit-visible', nearTopRight);
      });
      titleWrap.addEventListener('mouseleave', ()=>{
        titleWrap.classList.remove('title-edit-visible');
      });

      editBtn.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        const b = Storage.getBook(id);
        if(!b) return;
        renameTargetId = id;
        $('#rename_title').value = b.title || '';
        dlgRename.showModal();
      });
    });
  }

  // 開啟（交給 editor.js；尚未載入則提示）
  function openBook(id){
    if(window.Editor && typeof window.Editor.open === 'function'){
      window.Editor.open(id);
    }else{
      const b = Storage.getBook(id);
      alert(`（編輯器開發中）\n將開啟：${b?.title||'未命名'}\nID: ${id}`);
    }
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
      coverColor: '#7c8cfb',
      coverImage: 'https://shierusha.github.io/school-battle/images/book.png',
      pages: []
    };
    Storage.saveBook(book);
    dlgNew.close();
    renderLibrary();
  });

  // ---------------- Rename Dialog Save ----------------
  $('#btnRenameSave').addEventListener('click', ()=>{
    const input = $('#rename_title');
    let t = (input.value || '').replace(/\n/g,'').trim();
    if(!t) t = '未命名';
    if(t.length > 20) t = t.slice(0,20);

    if(renameTargetId){
      const b = Storage.getBook(renameTargetId);
      if(b){
        b.title = t;
        Storage.saveBook(b); // 當作「改資料庫」
      }
    }
    dlgRename.close();
    renameTargetId = null;
    renderLibrary(); // 讓 10字換行 + 更新日期 立即生效
  });

  // ---------------- 一進頁面的小通知 ----------------
  function toast(msg, ms=3800){
    const t=document.createElement('div');
    t.textContent=msg;
    Object.assign(t.style,{
      position:'fixed', left:'50%', top:'12px', transform:'translateX(-50%)',
      background:'rgba(15,27,51,.85)', color:'#e6ebff',
      border:'1px solid #31406b', borderRadius:'12px',
      padding:'10px 14px', zIndex:9999, backdropFilter:'saturate(1.1) blur(4px)',
      boxShadow:'0 10px 30px rgba(0,0,0,.25)', fontSize:'14px'
    });
    document.body.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .25s'; }, ms-250);
    setTimeout(()=> t.remove(), ms);
  }
if (!sessionStorage.getItem('xer_lib_hint')) {
  const t = toast('提示：滑到(點擊)卡片「左右邊界」會顯示排序箭頭；滑到(點擊)書名右上角 ✎ 可修改書名。');

  // 監聽第一次點擊
  const closeHint = () => {
    const toastEl = document.querySelector('.toast'); // 依你的 toast class 或 ID 調整
    if (toastEl) toastEl.remove(); // 或呼叫你原本的 toast 關閉函式
    document.removeEventListener('click', closeHint);
  };

  document.addEventListener('click', closeHint, { once: true });

  sessionStorage.setItem('xer_lib_hint', '1');
}


  // 暴露給 editor.js 使用
  window.BookStorage = Storage;

  // 啟動
  renderLibrary();
})();


// 新增書籍：取消
const btnNewCancel = dlgNew?.querySelector('[value="cancel"]');
if (btnNewCancel) {
  btnNewCancel.addEventListener('click', (e)=>{ e.preventDefault(); dlgNew.close(); });
}
