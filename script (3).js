'use strict';
/* ===== Utilidades ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmtDate = v => { if (!v) return ''; const d = new Date(v.length === 10 ? v + 'T00:00' : v); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }); };
let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 3200); }

/* ===== Armazenamento: IndexedDB (com reserva em memória se o navegador bloquear) ===== */
const DB = {
  db: null, mem: new Map(),
  async init() {
    try {
      this.db = await new Promise((ok, no) => {
        const r = indexedDB.open('nosso-diario-de-amor', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('photos', { keyPath: 'id' }).createIndex('albumId', 'albumId'); };
        r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
      });
    } catch (e) { this.db = null; toast('Armazenamento indisponível: nada será salvo neste navegador.'); }
  },
  run(store, mode, fn) {
    return new Promise((ok, no) => { const t = this.db.transaction(store, mode), q = fn(t.objectStore(store)); t.oncomplete = () => ok(q.result); t.onerror = t.onabort = () => no(t.error); });
  },
  get(k) { return this.db ? this.run('kv', 'readonly', s => s.get(k)) : Promise.resolve(this.mem.get(k)); },
  set(k, v) { return this.db ? this.run('kv', 'readwrite', s => s.put(v, k)) : (this.mem.set(k, v), Promise.resolve()); }
};

/* ===== Dados ===== */
const DEF = {
  cfg: { n1: 'Seu nome', n2: 'Nome dela', date: '2024-02-14T00:00', pilar: ['A Pilar cuida de cada lembrança nossa com o rabinho abanando.', 'Anjinho de quatro patas, guardando o nosso amor.', 'Onde tem amor, a Pilar chega voando.'] },
  chapters: [
    { id: 'c1', title: 'Quando nos conhecemos', date: '', text: 'Escreva aqui como tudo começou: o lugar, o dia, o que você sentiu ao vê-la pela primeira vez.', msg: 'Ali, meu coração já sabia.' },
    { id: 'c2', title: 'Nosso primeiro passeio', date: '', text: 'Conte como foi o primeiro passeio juntos, os risos e os silêncios que diziam tudo.', msg: 'Cada passo ao seu lado virou lembrança.' },
    { id: 'c3', title: 'O dia em que tive certeza', date: '', text: 'Escreva o momento em que você percebeu que era ela.', msg: 'Todos os caminhos me levavam a você.' }
  ]
};
const S = {}, U = {};
const save = k => DB.set(k, S[k]).catch(() => toast('Não foi possível salvar.'));
let st; const saveSoon = k => { clearTimeout(st); st = setTimeout(() => save(k), 400); };
function setBlob(k, b) { if (U[k]) URL.revokeObjectURL(U[k]); U[k] = b ? URL.createObjectURL(b) : null; }
async function load() {
  for (const k in DEF) { const v = await DB.get(k); S[k] = v || structuredClone(DEF[k]); }
  for (const k of ['cover', ...S.chapters.map(c => 'ch:' + c.id)]) { const b = await DB.get(k); if (b) setBlob(k, b); }
}
async function shrink(file, max = 1400) {
  try {
    const b = await createImageBitmap(file), k = Math.min(1, max / Math.max(b.width, b.height)), c = document.createElement('canvas');
    c.width = Math.round(b.width * k); c.height = Math.round(b.height * k); c.getContext('2d').drawImage(b, 0, 0, c.width, c.height);
    return (await new Promise(r => c.toBlob(r, 'image/jpeg', .85))) || file;
  } catch (e) { return file; }
}
async function putImage(key, file) { const b = await shrink(file); await DB.set(key, b); setBlob(key, b); }

/* ===== Personagens (SVG kawaii inline) ===== */
const face = (x1, x2, y) => `<circle cx="${x1}" cy="${y}" r="3.3" fill="#3a2a2e"/><circle cx="${x2}" cy="${y}" r="3.3" fill="#3a2a2e"/><circle cx="${x1 + 1}" cy="${y - 1.3}" r="1.1" fill="#fff"/><circle cx="${x2 + 1}" cy="${y - 1.3}" r="1.1" fill="#fff"/>`;
const heartP = '<path d="M60 114c-12-8-17-14-12-19 3-3 8-2 12 2 4-4 9-5 12-2 5 5 0 11-12 19Z" fill="#e0516f"/>';
const CH = {
  cat: d => { const f = d.f || '#f4b98a'; return `<svg viewBox="0 0 120 120" role="img" aria-label="Gatinho"><path class="tail" d="M84 104c26-2 28-30 12-36" fill="none" stroke="${f}" stroke-width="10" stroke-linecap="round"/><ellipse cx="60" cy="92" rx="28" ry="22" fill="${f}"/><path d="M36 42 38 14 58 32ZM84 42 82 14 62 32Z" fill="${f}"/><path d="M41 36 42 22 52 31ZM79 36 78 22 68 31Z" fill="#ffb3c4"/><circle cx="60" cy="56" r="26" fill="${f}"/>${face(49, 71, 58)}<ellipse cx="41" cy="67" rx="6" ry="3.5" fill="#ff9fb5" opacity=".6"/><ellipse cx="79" cy="67" rx="6" ry="3.5" fill="#ff9fb5" opacity=".6"/><path d="M57 65h6l-3 3.5Z" fill="#e87a95"/><path d="M60 68.5q-4 4-8 1M60 68.5q4 4 8 1" fill="none" stroke="#3a2a2e" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="47" cy="110" rx="9" ry="6" fill="${f}"/><ellipse cx="73" cy="110" rx="9" ry="6" fill="${f}"/></svg>`; },
  pup: d => `<svg viewBox="0 0 120 120" role="img" aria-label="Filhote de golden retriever"><path class="tail" d="M84 102c22-4 24-26 18-38" fill="none" stroke="#e3a948" stroke-width="11" stroke-linecap="round"/><ellipse cx="60" cy="96" rx="26" ry="20" fill="#eab45a"/><ellipse cx="33" cy="54" rx="11" ry="21" fill="#c98b3a" transform="rotate(14 33 54)"/><ellipse cx="87" cy="54" rx="11" ry="21" fill="#c98b3a" transform="rotate(-14 87 54)"/><circle cx="60" cy="54" r="26" fill="#f0bd66"/><ellipse cx="60" cy="65" rx="15" ry="11" fill="#f9dda4"/>${face(49, 71, 52)}<ellipse cx="60" cy="60" rx="5.5" ry="3.8" fill="#3a2a2e"/><path d="M60 64v3M60 67q-5 4-9 0M60 67q5 4 9 0" fill="none" stroke="#3a2a2e" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="60" cy="73" rx="4" ry="5" fill="#ff8fa8"/>${d.heart ? heartP : '<ellipse cx="48" cy="112" rx="9" ry="6" fill="#f0bd66"/><ellipse cx="72" cy="112" rx="9" ry="6" fill="#f0bd66"/>'}</svg>`,
  pilar: () => {
    const c = [[100, 152, 38], [72, 162, 22], [128, 162, 22], [100, 174, 26], [82, 184, 11], [118, 184, 11], [100, 88, 40], [68, 76, 15], [132, 76, 15], [70, 108, 14], [130, 108, 14], [100, 50, 14], [84, 56, 13], [116, 56, 13], [150, 140, 12], [160, 124, 11], [162, 107, 10]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
    const wing = '<path class="wing" d="M78 130C40 130 12 110 18 74c12 6 20 2 26-8 6 12 16 14 26 18-8 12 0 28 8 46Z" fill="#fff" stroke="#f0d8a0" stroke-width="3"/>';
    return `<svg viewBox="0 0 200 200" role="img" aria-label="Pilar, cadelinha branca e peluda com auréola e asinhas"><g>${wing}</g><g transform="translate(200 0) scale(-1 1)">${wing}</g><g fill="#fff" stroke="#e8c9d3" stroke-width="5">${c}</g><g fill="#fff">${c}</g><ellipse cx="62" cy="86" rx="11" ry="21" fill="#f9e9ee" transform="rotate(18 62 86)"/><ellipse cx="138" cy="74" rx="10" ry="19" fill="#f9e9ee" transform="rotate(-12 138 74)"/><ellipse cx="100" cy="106" rx="18" ry="13" fill="#fff5ef"/><circle cx="82" cy="90" r="5.5" fill="#3b2428"/><circle cx="118" cy="90" r="5.5" fill="#3b2428"/><circle cx="84" cy="88" r="1.8" fill="#fff"/><circle cx="120" cy="88" r="1.8" fill="#fff"/><ellipse cx="68" cy="104" rx="7" ry="4" fill="#ff9fb5" opacity=".5"/><ellipse cx="132" cy="104" rx="7" ry="4" fill="#ff9fb5" opacity=".5"/><ellipse cx="100" cy="99" rx="6.5" ry="4.5" fill="#3b2428"/><path d="M100 103v5M100 108q-6 6-12 1M100 108q6 6 12 1" fill="none" stroke="#3b2428" stroke-width="2" stroke-linecap="round"/><ellipse cx="100" cy="117" rx="5" ry="6" fill="#ff8fa8"/><ellipse class="halo" cx="100" cy="32" rx="27" ry="7" fill="none" stroke="#d9b45a" stroke-width="5"/></svg>`;
  }
};
const hydrate = () => $$('[data-char]').forEach(e => { e.innerHTML = CH[e.dataset.char](e.dataset); });
const mini = () => `<button class="mini" data-act="minipilar" aria-label="Pilar quer dizer uma coisa">${CH.pilar()}<span class="tip"></span></button>`;

/* ===== Capa ===== */
function rCover() {
  $('#names').textContent = `${S.cfg.n1} & ${S.cfg.n2}`;
  const d = fmtDate(S.cfg.date); $('#since').textContent = d ? 'Juntos desde ' + d : '';
  $('#coverPhoto').innerHTML = U.cover ? `<img src="${U.cover}" alt="Foto do casal">` : 'Toque para adicionar a foto do casal';
}

/* ===== Páginas ===== */
let editing = false, pi = 0;
function rHistoria(el) {
  el.innerHTML = `<h2>Nossa história</h2>` + S.chapters.map(c => {
    const im = U['ch:' + c.id];
    return editing
      ? `<article class="chap" data-id="${c.id}"><input data-f="title" value="${esc(c.title)}" aria-label="Título do capítulo"><input type="date" data-f="date" value="${esc(c.date)}" aria-label="Data importante"><textarea data-f="text" rows="5" aria-label="Texto do capítulo">${esc(c.text)}</textarea><input data-f="msg" value="${esc(c.msg)}" aria-label="Mensagem romântica"><div class="row"><label class="btn">Foto<input type="file" accept="image/*" hidden data-photo></label>${im ? '<button class="btn" data-act="rmphoto">Tirar foto</button>' : ''}<button class="btn danger" data-act="delch">Excluir</button></div></article>`
      : `<article class="chap"><h3>${esc(c.title)}</h3>${c.date ? `<time>${fmtDate(c.date)}</time>` : ''}${im ? `<img src="${im}" alt="">` : ''}<p>${esc(c.text)}</p>${c.msg ? `<p class="love">${esc(c.msg)}</p>` : ''}</article>`;
  }).join('') + `<div class="row">${editing ? '<button class="btn" data-act="addch">+ Novo capítulo</button>' : ''}<button class="btn gold" data-act="edit">${editing ? 'Concluir' : 'Editar textos'}</button></div>` + mini();
}
const UNITS = ['anos', 'meses', 'dias', 'horas', 'minutos', 'segundos'];
function rContador(el) {
  el.innerHTML = `<h2>Contador do amor</h2><p class="sub">Desde ${esc(fmtDate(S.cfg.date))}</p><div class="count">${UNITS.map(u => `<div><b id="c-${u}">0</b><span>${u}</span></div>`).join('')}</div><p class="love">Cada segundo ao seu lado vale uma vida inteira.</p>` + mini();
  tick();
}
function addM(d, n) { const r = new Date(d), day = r.getDate(); r.setDate(1); r.setMonth(r.getMonth() + n); r.setDate(Math.min(day, new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate())); return r; }
function span(s, n) {
  if (isNaN(s) || s > n) return [0, 0, 0, 0, 0, 0];
  let m = (n.getFullYear() - s.getFullYear()) * 12 + n.getMonth() - s.getMonth();
  while (addM(s, m) > n) m--;
  const r = Math.floor((n - addM(s, m)) / 1000);
  return [Math.floor(m / 12), m % 12, Math.floor(r / 86400), Math.floor(r % 86400 / 3600), Math.floor(r % 3600 / 60), r % 60];
}
function tick() { if (!$('#c-anos')) return; const v = span(new Date(S.cfg.date), new Date()); UNITS.forEach((u, i) => { $('#c-' + u).textContent = v[i]; }); }
setInterval(tick, 1000);
function rPilar(el) {
  const m = S.cfg.pilar;
  el.innerHTML = `<h2>Pilar</h2><div class="stage"><div class="float">${CH.pilar()}</div>${'<i>❤</i>'.repeat(6)}</div><button class="bubble" data-act="pilar" aria-live="polite">${esc(m[pi % m.length] || '')}</button><p class="sub">Toque na mensagem para ganhar outro carinho da Pilar.</p>`;
}
const PAGES = [
  { id: 'historia', title: 'Nossa história', render: rHistoria },
  { id: 'contador', title: 'Contador do amor', render: rContador },
  { id: 'pilar', title: 'Pilar', render: rPilar }
];

/* ===== Navegação do livro ===== */
let cur = 0, busy = false;
function buildBook() {
  $('#pages').innerHTML = PAGES.map(p => `<section class="page" id="pg-${p.id}" aria-label="${p.title}"></section>`).join('');
  PAGES.forEach(p => p.render($('#pg-' + p.id)));
  $('#menuList').innerHTML = PAGES.map((p, i) => `<li><button data-go="${i}">${p.title}</button></li>`).join('');
  show(0);
}
function show(i) { $$('.page').forEach((p, k) => p.classList.toggle('active', k === i)); cur = i; $('#ind').textContent = `${i + 1} de ${PAGES.length}`; $('#prev').disabled = i === 0; $('#next').disabled = i === PAGES.length - 1; $('#title').textContent = PAGES[i].title; }
async function go(i) {
  if (busy || i === cur || i < 0 || i >= PAGES.length) return;
  toggleMenu(false);
  const ps = $$('.page'), o = ps[cur], n = ps[i], fwd = i > cur;
  n.scrollTop = 0;
  if (reduce || !o.animate) { show(i); return; }
  busy = true; n.classList.add('active');
  const t = fwd ? o : n; t.style.zIndex = 3; (fwd ? n : o).style.zIndex = 1;
  const a = t.animate(fwd ? [{ transform: 'rotateY(0)', opacity: 1 }, { transform: 'rotateY(-100deg)', opacity: .1 }] : [{ transform: 'rotateY(100deg)', opacity: .1 }, { transform: 'rotateY(0)', opacity: 1 }], { duration: 700, easing: 'ease-in-out', fill: 'both' });
  await a.finished.catch(() => {});
  o.style.zIndex = n.style.zIndex = ''; a.cancel(); show(i); busy = false;
}
function toggleMenu(on) { $('#menu').hidden = !on; $('#menuBtn').setAttribute('aria-expanded', on); }

/* ===== Música ===== */
const bgm = $('#bgm');
bgm.volume = .25;
function setMusic(on) { $('#musicBtn').classList.toggle('on', on); $('#musicBtn').setAttribute('aria-pressed', on); }
function playMusic() { bgm.play().then(() => setMusic(true)).catch(() => setMusic(false)); }
bgm.addEventListener('error', () => { setMusic(false); toast('Coloque o arquivo musicas/musica.mp3 para ouvir a música.'); });

/* ===== Corações ===== */
setInterval(() => {
  const c = $('#hearts'); if (reduce || document.hidden || c.children.length > 14) return;
  const h = document.createElement('span'); h.textContent = ['❤', '♥', '❥'][Math.random() * 3 | 0];
  h.style.cssText = `left:${Math.random() * 100}%;font-size:${12 + Math.random() * 18}px;animation-duration:${6 + Math.random() * 5}s`;
  c.appendChild(h); setTimeout(() => h.remove(), 11000);
}, 900);

/* ===== Eventos ===== */
function bind() {
  $('#openBtn').onclick = () => {
    playMusic(); document.body.classList.add('opening');
    setTimeout(() => { $('#cover').hidden = true; $('#book').hidden = false; document.body.classList.remove('opening'); $('#title').focus(); }, reduce ? 0 : 950);
  };
  $('#toCover').onclick = () => { toggleMenu(false); $('#book').hidden = true; $('#cover').hidden = false; };
  $('#coverPhoto').onclick = () => $('#fileCover').click();
  $('#fileCover').onchange = async e => { const f = e.target.files[0]; if (f) { await putImage('cover', f); rCover(); toast('Foto da capa salva.'); } e.target.value = ''; };
  $('#prev').onclick = () => go(cur - 1); $('#next').onclick = () => go(cur + 1);
  $('#menuBtn').onclick = () => toggleMenu(true); $('#menuClose').onclick = () => toggleMenu(false);
  $('#menuList').onclick = e => { const b = e.target.closest('[data-go]'); if (b) go(+b.dataset.go); };
  $('#musicBtn').onclick = () => { if (bgm.paused) playMusic(); else { bgm.pause(); setMusic(false); } };
  $('#vol').oninput = e => { bgm.volume = +e.target.value; };
  document.addEventListener('keydown', e => { if ($('#book').hidden || e.target.matches('input,textarea')) return; if (e.key === 'ArrowRight') go(cur + 1); if (e.key === 'ArrowLeft') go(cur - 1); if (e.key === 'Escape') { toggleMenu(false); $('#admin').hidden = true; } });
  let x0, y0;
  $('#pages').addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  $('#pages').addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; if (Math.abs(dx) > 70 && Math.abs(dy) < 50 && !e.target.closest('input,textarea')) go(cur + (dx < 0 ? 1 : -1)); }, { passive: true });

  const hist = () => rHistoria($('#pg-historia'));
  $('#pages').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, id = b.closest('[data-id]')?.dataset.id;
    if (a === 'edit') { editing = !editing; hist(); }
    else if (a === 'addch') { S.chapters.push({ id: uid(), title: 'Novo capítulo', date: '', text: '', msg: '' }); save('chapters'); hist(); }
    else if (a === 'delch' && confirm('Excluir este capítulo?')) { S.chapters = S.chapters.filter(c => c.id !== id); save('chapters'); await DB.set('ch:' + id, null); setBlob('ch:' + id, null); hist(); }
    else if (a === 'rmphoto') { await DB.set('ch:' + id, null); setBlob('ch:' + id, null); hist(); }
    else if (a === 'pilar') { pi++; rPilar($('#pg-pilar')); }
    else if (a === 'minipilar') { const m = S.cfg.pilar; b.querySelector('.tip').textContent = m[Math.random() * m.length | 0] || ''; b.classList.add('show'); setTimeout(() => b.classList.remove('show'), 3500); }
  });
  $('#pages').addEventListener('input', e => { const f = e.target.dataset.f, c = S.chapters.find(c => c.id === e.target.closest('[data-id]')?.dataset.id); if (f && c) { c[f] = e.target.value; saveSoon('chapters'); } });
  $('#pages').addEventListener('change', async e => { if (!e.target.matches('[data-photo]')) return; const id = e.target.closest('[data-id]').dataset.id, f = e.target.files[0]; if (f) { await putImage('ch:' + id, f); hist(); toast('Foto salva.'); } });

  $$('[data-admin]').forEach(b => b.onclick = () => {
    const c = S.cfg; $('#a-n1').value = c.n1; $('#a-n2').value = c.n2; $('#a-date').value = c.date; $('#a-pilar').value = c.pilar.join('\n'); $('#admin').hidden = false; $('#a-n1').focus();
  });
  $('#adClose').onclick = () => { $('#admin').hidden = true; };
  $('#admin').addEventListener('input', e => {
    const f = e.target.dataset.cfg; if (!f) return;
    S.cfg[f] = f === 'pilar' ? e.target.value.split('\n').filter(Boolean) : e.target.value; if (f === 'pilar' && !S.cfg.pilar.length) S.cfg.pilar = [''];
    saveSoon('cfg'); rCover(); rContador($('#pg-contador')); rPilar($('#pg-pilar'));
  });
}

(async () => { await DB.init(); await load(); hydrate(); rCover(); buildBook(); bind(); })();
