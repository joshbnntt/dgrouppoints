import { html, type SafeHtml } from 'remix/html-template'
import { createHtmlResponse } from 'remix/response/html'
import type { Category, Data } from './config.ts'
import { routes } from './routes.ts'

let join = (parts: unknown[]) => html.raw`${parts.map(String).join('')}`
let sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
let COLORS = ['#4fb3a5', '#e8604c', '#e8b84a', '#5b7cff']

let css = html.raw`<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#0b1a3a;color:#fff}
main{max-width:900px;margin:0 auto;padding:16px;padding-top:max(16px,env(safe-area-inset-top))}a{color:#e8b84a}
.card{background:#172a52;border-radius:16px;padding:16px;margin:12px 0;border-left:6px solid var(--c,#4fb3a5)}
.top{display:flex;justify-content:space-between;align-items:center}.big{font-size:2.6rem;font-weight:800}
table{width:100%;border-collapse:collapse}th,td{padding:6px 8px;text-align:right}th:first-child,td:first-child{text-align:left}
th{color:#e8b84a;font-size:.75rem;text-transform:uppercase}tr+tr td{border-top:1px solid #ffffff18}
.row{display:flex;align-items:center;gap:8px;padding:10px 0;border-top:1px solid #ffffff18}
.n{flex:1;font-size:1.1rem}.v{min-width:3ch;text-align:right;opacity:.8}
button{font:inherit;border:0;border-radius:12px;padding:12px 18px;font-weight:700;cursor:pointer}
.add{background:#e8b84a;color:#0b1a3a}.sub{background:#2b4175;color:#fff;padding:12px 14px}
.chips{display:flex;gap:8px;flex-wrap:wrap;position:sticky;top:0;background:#0b1a3a;padding:8px 0}
.chip{background:#2b4175;color:#fff}.chip.on{background:#e8b84a;color:#0b1a3a}
form{display:inline}
.cats{display:block}.cat{display:grid;grid-template-columns:1fr 7rem 5rem auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #ffffff18}
.cat input[type=text],.cat input[type=number]{font:inherit;width:100%;padding:10px;border-radius:10px;border:1px solid #ffffff30;background:#0b1a3a;color:#fff}
.cat label{display:flex;gap:6px;align-items:center;font-size:.9rem;white-space:nowrap}.cat.head{font-size:.75rem;color:#e8b84a;text-transform:uppercase;border:0}
.person{display:grid;grid-template-columns:1fr 10rem auto auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #ffffff18}
.person input,.addform input{font:inherit;width:100%;padding:10px;border-radius:10px;border:1px solid #ffffff30;background:#0b1a3a;color:#fff}
.person form,.addform{display:contents}.small{padding:10px 14px}.del{background:#5a2620;color:#fff}.pts{opacity:.7;font-size:.85rem}
@media(max-width:560px){.person{grid-template-columns:1fr 1fr}.person .pts{grid-column:1/-1}}
.save{background:#e8b84a;color:#0b1a3a;margin-top:12px}.note{opacity:.75;font-size:.9rem}.ok{background:#1f5a4f;padding:10px 14px;border-radius:10px}
@media(max-width:560px){.cat{grid-template-columns:1fr 5rem 4rem}.cat label{grid-column:1/-1}.cat.head span:last-child{display:none}}form button{background:none;color:#e8b84a;padding:0;font-weight:400;text-decoration:underline}
</style>`

let swScript = html.raw`<script>if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))</script>`

function page(title: string, body: SafeHtml, script?: SafeHtml) {
  return createHtmlResponse(html`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0b1a3a">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="DG Points">
${css}${swScript}</head>
<body><main>${body}${script ?? ''}</main></body></html>`)
}

export function scoreboardPage({ categories, people }: Data, admin: boolean) {
  // Hidden categories drop off the table, but points already earned still count in totals.
  let visible = categories.map((c, i) => ({ c, i })).filter(({ c }) => c.show)
  let teams = [...new Set(people.map((p) => p.team))]
    .map((name) => {
      let members = people.filter((p) => p.team === name).sort((a, b) => sum(b.pts) - sum(a.pts))
      return { name, members, total: sum(members.map((m) => sum(m.pts))) }
    })
    .sort((a, b) => b.total - a.total)

  let cards = teams.map((t, i) => html`
    <section class="card" style="--c:${COLORS[i % 4]}">
      <div class="top"><h2>${i === 0 && t.total > 0 ? '🏆 ' : ''}${t.name}</h2><span class="big">${t.total}</span></div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Name</th>${join(visible.map(({ c }) => html`<th>${c.short}</th>`))}<th>Total</th></tr></thead>
        <tbody>${join(t.members.map((m) => html`<tr><td>${m.name}</td>${join(visible.map(({ i }) => html`<td>${m.pts[i]}</td>`))}<td><b>${sum(m.pts)}</b></td></tr>`))}</tbody>
      </table></div>
    </section>`)

  return page('D-Group Scoreboard', html`
    <h1>Scoreboard</h1>
    <p>${admin
      ? html`<a href="${routes.admin.index.href()}">Enter points →</a>`
      : html`<a href="${routes.login.href()}">Leader login</a>`}</p>
    ${join(cards)}`,
  html.raw`<script>setTimeout(()=>location.reload(),30000)</script>`)
}

export function adminPage({ categories, people }: Data) {
  let teams = [...new Set(people.map((p) => p.team))]
  let active = categories.map((c, i) => ({ c, i })).filter(({ c }) => c.show)
  let chips = active.map(({ c, i }, n) => html`<button class="chip${n === 0 ? ' on' : ''}" data-cat="${i}">${c.label} (${c.pts})</button>`)
  let cards = teams.map((t) => html`
    <section class="card"><h2>${t}</h2>${join(people.filter((p) => p.team === t).map((p) => html`
      <div class="row" data-row="${p.row}" data-name="${p.name}" data-vals="${JSON.stringify(p.pts)}">
        <span class="n">${p.name}</span><span class="v"></span>
        <button class="sub">−</button><button class="add"></button>
      </div>`))}</section>`)

  let script = html.raw`<script>
let cat=${active[0]?.i ?? 0},pts=${JSON.stringify(categories.map((c) => c.pts))};
let rows=[...document.querySelectorAll('.row')];
function paint(){rows.forEach(r=>{let v=JSON.parse(r.dataset.vals);r.querySelector('.v').textContent=v[cat];r.querySelector('.add').textContent='+'+pts[cat]})
document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',+c.dataset.cat===cat))}
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{cat=+c.dataset.cat;paint()});
rows.forEach(r=>r.onclick=async e=>{
  let b=e.target.closest('button');if(!b)return;
  let dir=b.classList.contains('add')?1:-1,delta=dir*pts[cat];
  let v=JSON.parse(r.dataset.vals),old=v[cat];v[cat]=Math.max(0,old+delta);r.dataset.vals=JSON.stringify(v);paint();
  let f=new FormData();f.set('row',r.dataset.row);f.set('name',r.dataset.name);f.set('cat',cat);f.set('dir',dir);
  try{let res=await fetch('${routes.admin.score.href()}',{method:'POST',body:f});
    if(res.status===409){alert('The roster changed since this page loaded. Reloading.');location.reload();return}
    if(!res.ok)throw 0;v[cat]=(await res.json()).value;r.dataset.vals=JSON.stringify(v);paint()}
  catch{v[cat]=old;r.dataset.vals=JSON.stringify(v);paint();alert('Save failed - check connection / login')}
});paint();
</script>`

  return page('Enter Points', html`
    <h1>Enter Points</h1>
    <p><a href="${routes.home.href()}">← Scoreboard</a> ·
      <a href="${routes.admin.roster.href()}">Roster</a> ·
      <a href="${routes.admin.categories.href()}">Categories</a> ·
      <form method="POST" action="${routes.logout.href()}"><button>Log out</button></form></p>
    ${!people.length ? html`<p>No one on the roster yet. <a href="${routes.admin.roster.href()}">Add teens</a>.</p>` : ''}
    ${active.length
      ? html`<div class="chips">${join(chips)}</div>${join(cards)}`
      : html`<p>No categories are shown. <a href="${routes.admin.categories.href()}">Add or show one</a>.</p>`}`, script)
}

export function categoriesPage(categories: Category[], saved = false, error = '') {
  let row = (c: Category | null, i: number) => html`
    <div class="cat">
      <input type="text" name="label" value="${c?.label ?? ''}" placeholder="${c ? '' : 'New category name'}" aria-label="Name" maxlength="40">
      <input type="text" name="short" value="${c?.short ?? ''}" placeholder="Short" aria-label="Short label" maxlength="12">
      <input type="number" name="pts" value="${c?.pts ?? ''}" placeholder="Pts" aria-label="Points" min="0" max="1000" step="1">
      <label><input type="checkbox" name="show" value="${i}" ${c ? (c.show ? html.raw`checked` : '') : html.raw`checked`}> Show</label>
    </div>`

  return page('Categories', html`
    <h1>Categories</h1>
    <p><a href="${routes.admin.index.href()}">← Enter points</a></p>
    ${saved ? html`<p class="ok">Saved.</p>` : ''}
    ${error ? html`<p class="ok" style="background:#7a2b22">${error}</p>` : ''}
    <form class="cats" method="POST" action="${routes.admin.saveCategories.href()}">
      <section class="card">
        <div class="cat head"><span>Name</span><span>Short</span><span>Points</span><span>Show</span></div>
        ${join(categories.map((c, i) => row(c, i)))}
        ${row(null, categories.length)}
        <button class="save" type="submit">Save categories</button>
      </section>
    </form>
    <p class="note">Fill in the blank last row to add a category. Points are what one tap of + adds; changing them only affects future taps.
    Unticking <b>Show</b> hides a category from entry and the scoreboard, but points already earned still count in totals.
    To delete or reorder categories, edit the <b>Categories</b> tab in the sheet and move the matching Roster column with it.</p>`)
}

export function rosterPage({ categories, people }: Data, msg = '', error = '') {
  let teams = [...new Set(people.map((p) => p.team))].filter(Boolean)
  let list = html.raw`<datalist id="teams">${join(teams.map((t) => html`<option value="${t}">`))}</datalist>`
  let total = (pts: number[]) => sum(pts)
  let cards = teams.map((t) => html`
    <section class="card"><h2>${t}</h2>
      ${join(people.filter((p) => p.team === t).map((p) => html`
        <form class="person" method="POST" action="${routes.admin.updatePerson.href({ row: String(p.row) })}">
          <input type="hidden" name="expected" value="${p.name}">
          <input type="text" name="name" value="${p.name}" aria-label="Name" required maxlength="40">
          <input type="text" name="team" value="${p.team}" aria-label="Team" list="teams" required maxlength="30">
          <button class="chip small" type="submit">Save</button>
          <button class="del small" type="submit" formaction="${routes.admin.removePerson.href({ row: String(p.row) })}"
            data-who="${p.name}" data-pts="${total(p.pts)}" onclick="return confirmRemove(this)">Remove</button>
          <span class="pts">${total(p.pts)} pts</span>
        </form>`))}
    </section>`)

  return page('Roster', html`
    <h1>Roster</h1>
    <p><a href="${routes.admin.index.href()}">← Enter points</a></p>
    ${msg ? html`<p class="ok">${msg}</p>` : ''}
    ${error ? html`<p class="ok" style="background:#7a2b22">${error}</p>` : ''}
    ${list}
    <section class="card">
      <h2>Add a teen</h2>
      <form class="person addform" method="POST" action="${routes.admin.addPerson.href()}">
        <input type="text" name="name" placeholder="Name" aria-label="Name" required maxlength="40" autocomplete="off">
        <input type="text" name="team" placeholder="Team" aria-label="Team" list="teams" required maxlength="30"
          value="${teams[0] ?? ''}">
        <button class="save small" type="submit" style="margin:0">Add</button>
      </form>
    </section>
    ${join(cards)}
    <p class="note">Type a new team name to start a new team. Moving someone to another team moves their points with them.
    Removing someone deletes their points from the team total. They start at 0 if added back.</p>`,
  html.raw`<script>function confirmRemove(b){return confirm('Remove '+b.dataset.who+' from the roster? Their '+b.dataset.pts+' points will be removed from the team total.')}</script>`)
}
