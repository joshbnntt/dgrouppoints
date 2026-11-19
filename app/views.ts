import { html } from 'remix/html-template'
import { createHtmlResponse } from 'remix/response/html'
import { CATEGORIES, type Person } from './config.ts'
import { routes } from './routes.ts'

let join = (parts: unknown[]) => html.raw`${parts.map(String).join('')}`
let sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
let COLORS = ['#4fb3a5', '#e8604c', '#e8b84a', '#5b7cff']

let css = html.raw`<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#0b1a3a;color:#fff}
main{max-width:900px;margin:0 auto;padding:16px}a{color:#e8b84a}
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
form{display:inline}form button{background:none;color:#e8b84a;padding:0;font-weight:400;text-decoration:underline}
</style>`

function page(title: string, body: unknown, script?: unknown) {
  return createHtmlResponse(html`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>${css}</head>
<body><main>${body}${script ?? ''}</main></body></html>`)
}

export function scoreboardPage(people: Person[], admin: boolean) {
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
        <thead><tr><th>Name</th>${join(CATEGORIES.map((c) => html`<th>${c.label.split(' ')[0]}</th>`))}<th>Total</th></tr></thead>
        <tbody>${join(t.members.map((m) => html`<tr><td>${m.name}</td>${join(m.pts.map((v) => html`<td>${v}</td>`))}<td><b>${sum(m.pts)}</b></td></tr>`))}</tbody>
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

export function adminPage(people: Person[]) {
  let teams = [...new Set(people.map((p) => p.team))]
  let chips = CATEGORIES.map((c, i) => html`<button class="chip${i === 0 ? ' on' : ''}" data-cat="${i}" data-pts="${c.pts}">${c.label}</button>`)
  let cards = teams.map((t) => html`
    <section class="card"><h2>${t}</h2>${join(people.filter((p) => p.team === t).map((p) => html`
      <div class="row" data-row="${p.row}" data-vals="${JSON.stringify(p.pts)}">
        <span class="n">${p.name}</span><span class="v"></span>
        <button class="sub">−</button><button class="add"></button>
      </div>`))}</section>`)

  let script = html.raw`<script>
let cat=0,pts=${JSON.stringify(CATEGORIES.map((c) => c.pts))};
let rows=[...document.querySelectorAll('.row')];
function paint(){rows.forEach(r=>{let v=JSON.parse(r.dataset.vals);r.querySelector('.v').textContent=v[cat];r.querySelector('.add').textContent='+'+pts[cat]})
document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',+c.dataset.cat===cat))}
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{cat=+c.dataset.cat;paint()});
rows.forEach(r=>r.onclick=async e=>{
  let b=e.target.closest('button');if(!b)return;
  let delta=b.classList.contains('add')?pts[cat]:-pts[cat];
  let v=JSON.parse(r.dataset.vals),old=v[cat];v[cat]=Math.max(0,old+delta);r.dataset.vals=JSON.stringify(v);paint();
  let f=new FormData();f.set('row',r.dataset.row);f.set('cat',cat);f.set('delta',delta);
  try{let res=await fetch('${routes.admin.score.href()}',{method:'POST',body:f});
    if(!res.ok)throw 0;v[cat]=(await res.json()).value;r.dataset.vals=JSON.stringify(v);paint()}
  catch{v[cat]=old;r.dataset.vals=JSON.stringify(v);paint();alert('Save failed - check connection / login')}
});paint();
</script>`

  return page('Enter Points', html`
    <h1>Enter Points</h1>
    <p><a href="${routes.home.href()}">← Scoreboard</a> ·
      <form method="POST" action="${routes.logout.href()}"><button>Log out</button></form></p>
    <div class="chips">${join(chips)}</div>${join(cards)}`, script)
}
