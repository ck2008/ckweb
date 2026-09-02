import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const { url, publishableKey } = window.CKWEB_SUPABASE;
const db = createClient(url, publishableKey);
const $ = (s) => document.querySelector(s);
let user, projects = [];
const say = (form, text, ok = false) => { const p = form.querySelector('.form-message'); p.textContent = text; p.style.color = ok ? 'var(--green)' : 'var(--red)'; };
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function load() {
  const [ps, ts, prs, ws, os] = await Promise.all([
    db.from('projects').select('*').order('created_at',{ascending:false}),
    db.from('tasks').select('*').order('created_at',{ascending:false}).limit(8),
    db.from('prompts').select('*').order('created_at',{ascending:false}).limit(5),
    db.from('workers').select('*').order('last_seen_at',{ascending:false}).limit(1),
    db.from('task_outputs').select('content,created_at,tasks(title)').order('created_at',{ascending:false}).limit(3)
  ]);
  if (ps.error) return console.error(ps.error);
  projects = ps.data || []; renderProjects(projects); renderTasks(ts.data || []); renderPrompts(prs.data || []); renderOutputs(os.data || []);
  $('#project-count').textContent = projects.length; $('#active-count').textContent = (ts.data || []).filter(t => ['queued','running'].includes(t.status)).length; $('#prompt-count').textContent = prs.data?.length || 0;
  const worker = ws.data?.[0], online = worker && Date.now()-new Date(worker.last_seen_at) < 90000;
  $('#worker-dot').classList.toggle('online', online); $('#worker-label').textContent = online ? `${worker.name} 已連線` : '等待本機工作器';
  $('#task-project').innerHTML = '<option value="">未分類</option>' + projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
}
function empty(el, text){el.innerHTML=`<p class="empty">${text}</p>`}
function renderTasks(items){const el=$('#task-list');if(!items.length)return empty(el,'尚未建立任務。');el.innerHTML=items.map(t=>`<article class="task"><div><span class="status ${t.status}"></span><h3>${esc(t.title)}</h3><p>${esc(t.status)} · ${new Date(t.created_at).toLocaleDateString('zh-TW')}</p></div><time>${t.status==='running'?'執行中':t.status==='queued'?'佇列中':''}</time></article>`).join('')}
function renderProjects(items){const el=$('#project-list');if(!items.length)return empty(el,'先建立一個專案，讓工作有歸屬。');el.innerHTML=items.map(p=>`<article class="project"><div><h3>${esc(p.name)}</h3><p>${esc(p.description || '沒有說明')}</p></div></article>`).join('')}
function renderPrompts(items){const el=$('#prompt-list');if(!items.length)return empty(el,'把好用的提示詞放在這裡。');el.innerHTML=items.map(p=>`<article class="prompt"><div><h3>${esc(p.title)}</h3><p>${esc(p.content).slice(0,90)}</p></div></article>`).join('')}
function renderOutputs(items){const el=$('#output-list');if(!items.length)return empty(el,'完成的任務會在這裡留下成果。');el.innerHTML=items.map(o=>`<article class="output"><h3>${esc(o.tasks?.title || '工作產出')}</h3><pre>${esc(o.content).slice(0,1200)}</pre></article>`).join('')}
async function upload(files, projectId){for(const f of files){const path=`${user.id}/${projectId||'inbox'}/${crypto.randomUUID()}-${f.name}`;const r=await db.storage.from('task-files').upload(path,f);if(r.error)throw r.error;const m=await db.from('files').insert({owner_id:user.id,project_id:projectId||null,storage_path:path,name:f.name,mime_type:f.type,size:f.size});if(m.error)throw m.error;}}
function open(id){$(id).showModal()}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#open-task').onclick=()=>open('#task-dialog'); $('#open-project').onclick=()=>open('#project-dialog'); $('#open-prompt').onclick=()=>open('#prompt-dialog');
$('#show-all-tasks').onclick=()=>load();
$('#email-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,{error}=await db.auth.signInWithPassword({email:$('#email').value,password:$('#password').value});say(f,error?.message||'登入成功。',!error)};
$('#sign-up').onclick=async()=>{const f=$('#email-form'),{error}=await db.auth.signUp({email:$('#email').value,password:$('#password').value,options:{emailRedirectTo:location.href}});say(f,error?.message||'已寄出確認信，請完成驗證。',!error)};
$('#google-login').onclick=()=>db.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.href}});
$('#sign-out').onclick=()=>db.auth.signOut();
$('#project-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f));const {error}=await db.from('projects').insert({owner_id:user.id,...d});say(f,error?.message||'已建立。',!error);if(!error){f.reset();setTimeout(()=>{f.closest('dialog').close();load()},350)}};
$('#prompt-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f));const {error}=await db.from('prompts').insert({owner_id:user.id,...d});say(f,error?.message||'已儲存。',!error);if(!error){f.reset();setTimeout(()=>{f.closest('dialog').close();load()},350)}};
$('#task-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f));try{await upload($('#task-files').files,d.project_id);const {error}=await db.from('tasks').insert({owner_id:user.id,title:d.title,instructions:d.instructions,project_id:d.project_id||null,status:'queued'});if(error)throw error;say(f,'已加入執行佇列。',true);f.reset();setTimeout(()=>{f.closest('dialog').close();load()},350)}catch(err){say(f,err.message)}};
async function setUser(session){user=session?.user;if(!user){$('#auth-view').classList.remove('hidden');$('#workspace').classList.add('hidden');$('#sign-out').classList.add('hidden');return}$('#auth-view').classList.add('hidden');$('#workspace').classList.remove('hidden');$('#sign-out').classList.remove('hidden');$('#user-name').textContent=user.user_metadata.full_name||user.email.split('@')[0];await load()}
const {data:{session}}=await db.auth.getSession();setUser(session);db.auth.onAuthStateChange((_e,s)=>setUser(s));
