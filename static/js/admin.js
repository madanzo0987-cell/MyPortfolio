let adminData = {};
let currentTab = 'profile';

async function checkAuth() {
  try {
    const res = await fetch('/papi/data?type=settings', { credentials: 'include' });
    if (res.status === 401) { window.location.href = '/admin/login'; return false; }
    return true;
  } catch { return false; }
}

async function logout() {
  await apiFetch('/papi/login', { method: 'DELETE' });
  window.location.href = '/admin/login';
}

async function loadDashboard() {
  try {
    const data = await apiFetch('/papi/data');
    adminData = data;
    const emailEl = document.getElementById('adminEmail');
    if (emailEl) emailEl.textContent = data.admin_email || adminData.portfolio?.email || '';
    document.documentElement.setAttribute('data-theme', data.settings?.theme || 'dark');
    document.documentElement.setAttribute('data-accent', data.settings?.accent_color || 'pink');
    renderTab('profile');
    updateUnreadBadge();
  } catch (e) {
    showToast('Failed to load data', 'error');
  }
}

function updateUnreadBadge() {
  apiFetch('/papi/messages').then(res => {
    const unread = (res.messages || []).filter(m => !m.is_read).length;
    const badge = document.getElementById('unreadBadge');
    if (unread > 0) { badge.style.display = 'inline-flex'; badge.textContent = unread; }
    else badge.style.display = 'none';
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.sidebar-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  renderTab(tab);
}

function renderTab(tab) {
  const main = document.getElementById('tabContent');
  switch (tab) {
    case 'profile': main.innerHTML = loadProfileTab(); bindProfileEvents(); break;
    case 'services': main.innerHTML = loadServicesTab(); bindServicesEvents(); break;
    case 'techstack': main.innerHTML = loadTechStackTab(); bindTechStackEvents(); break;
    case 'projects': main.innerHTML = loadProjectsTab(); bindProjectsEvents(); break;
    case 'qualifications': main.innerHTML = loadQualificationsTab(); bindQualificationsEvents(); break;
    case 'credentials': main.innerHTML = loadCredentialsTab(); bindCredentialsEvents(); break;
    case 'messages': loadMessagesTab(); break;
    case 'settings': main.innerHTML = loadSettingsTab(); bindSettingsEvents(); break;
  }
}

// ── Profile ─────────────────────────────────
function loadProfileTab() {
  const p = adminData.portfolio || {};
  const stats = adminData.stats || [];
  return `
    <div class="admin-header"><div class="admin-title">Profile</div><div class="admin-subtitle">Manage your personal information</div></div>
    ${completenessBar(adminData)}
    <div class="admin-card">
      <div class="admin-card-header"><span class="admin-card-title">Avatar</span></div>
      <div class="avatar-upload">
        <div class="avatar-preview" id="avatarPreview">${p.avatar_url ? `<img src="${escapeHtml(p.avatar_url)}" id="avatarImg">` : '👤'}</div>
        <div>
          <label class="upload-btn" for="avatarFile">Upload Photo</label>
          <input type="file" id="avatarFile" accept="image/*">
          <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.4rem;">Max 5MB. JPG, PNG, GIF. Auto-cropped + resized.</div>
        </div>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-header"><span class="admin-card-title">Personal Info</span></div>
      <form class="admin-form" id="profileForm">
        <div class="form-group"><label>Full Name</label><input name="name" value="${escapeHtml(p.name||'')}"></div>
        <div class="form-group"><label>Title</label><input name="title" value="${escapeHtml(p.title||'')}"></div>
        <div class="form-group"><label>Email</label><input type="email" name="email" value="${escapeHtml(p.email||'')}"></div>
        <div class="form-group"><label>Phone</label><input name="phone" value="${escapeHtml(p.phone||'')}"></div>
        <div class="form-group"><label>Location</label><input name="location" value="${escapeHtml(p.location||'')}"></div>
        <div class="form-group"><label>GitHub URL</label><input name="github" value="${escapeHtml(p.github||'')}"></div>
        <div class="form-group"><label>LinkedIn URL</label><input name="linkedin" value="${escapeHtml(p.linkedin||'')}"></div>
        <div class="form-group"><label>Twitter URL</label><input name="twitter" value="${escapeHtml(p.twitter||'')}"></div>
        <div class="form-group"><label>Instagram URL</label><input name="instagram" value="${escapeHtml(p.instagram||'')}"></div>
        <div class="form-group"><label>Website URL</label><input name="website" value="${escapeHtml(p.website||'')}"></div>
        <div class="form-group"><label>Resume URL</label><input name="resume_url" value="${escapeHtml(p.resume_url||'')}"></div>
        <div class="form-group full"><label>Bio / About</label><textarea name="about" rows="4">${escapeHtml(p.about||'')}</textarea></div>
        <div class="form-group full"><label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;"><input type="checkbox" name="is_available" ${p.is_available ? 'checked' : ''} style="accent-color:var(--primary)"> Available for work</label></div>
        <div class="form-actions full"><button type="submit" class="btn-save">Save Profile</button></div>
      </form>
    </div>
    <div class="admin-card">
      <div class="admin-card-header"><span class="admin-card-title">Stats Strip</span><button class="btn-add" onclick="openAddStat()">+ Add</button></div>
      <div class="items-list" id="statsList">
        ${stats.map(s => `<div class="item-row" data-id="${escapeHtml(s.id)}">
          <div class="item-icon">${escapeHtml(s.icon||'📊')}</div>
          <div class="item-body"><div class="item-title">${escapeHtml(s.value)} — ${escapeHtml(s.label)}</div></div>
          <div class="item-actions">
            <button class="btn-icon" onclick="editStat('${escapeHtml(s.id)}')">✏️</button>
            <button class="btn-icon danger" onclick="deleteStat('${escapeHtml(s.id)}')">🗑️</button>
          </div>
        </div>`).join('')}
      </div>
    </div>
    <div id="statModal" style="display:none"></div>
  `;
}

function bindProfileEvents() {
  document.getElementById('avatarFile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image too large (max 5MB)', 'error'); return; }
    const b64 = await resizeImageToDataUrl(file, 512, 0.85);
    const preview = document.getElementById('avatarPreview');
    preview.innerHTML = `<img src="${b64}" id="avatarImg" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    const p = adminData.portfolio || {}; p.avatar_url = b64; adminData.portfolio = p;
  });

  document.getElementById('profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    data.is_available = form.get('is_available') === 'on' ? 1 : 0;
    if (adminData.portfolio?.avatar_url) data.avatar_url = adminData.portfolio.avatar_url;
    const res = await apiFetch('/papi/save', { method: 'POST', body: JSON.stringify({ action: 'portfolio', data }) });
    if (res.success) { adminData.portfolio = { ...adminData.portfolio, ...data }; showToast('Profile saved!', 'success'); }
    else showToast(res.error || 'Save failed', 'error');
  });
}

function completenessBar(data) {
  const p = data.portfolio || {};
  const fields = ['name','title','about','email','location','github','instagram'];
  const filled = fields.filter(f => p[f]).length;
  const pct = Math.round((filled / fields.length) * 100);
  return `<div class="completeness-bar-wrap">
    <div class="completeness-label"><span>Profile Completeness</span><span class="completeness-pct">${pct}%</span></div>
    <div class="completeness-bar-bg"><div class="completeness-bar" style="width:${pct}%"></div></div>
  </div>`;
}

async function openAddStat() { openStatModal(null); }
function editStat(id) { const s = adminData.stats?.find(x => x.id === id); openStatModal(s); }
function openStatModal(stat) {
  const m = document.getElementById('statModal');
  m.style.display = 'block';
  m.innerHTML = `<div class="admin-card" style="border:1px solid var(--primary);">
    <div class="admin-card-header"><span class="admin-card-title">${stat ? 'Edit' : 'Add'} Stat</span><button class="btn-icon" onclick="document.getElementById('statModal').style.display='none'">✕</button></div>
    <form class="admin-form" id="statForm">
      <div class="form-group"><label>Label</label><input name="label" value="${escapeHtml(stat?.label||'')}" required></div>
      <div class="form-group"><label>Value</label><input name="value" value="${escapeHtml(stat?.value||'')}" required></div>
      <div class="form-group"><label>Icon (emoji)</label><input name="icon" value="${escapeHtml(stat?.icon||'')}"></div>
      <div class="form-group"><label>Order</label><input type="number" name="display_order" value="${stat?.display_order||0}"></div>
      <div class="form-actions full"><button type="submit" class="btn-save">Save Stat</button></div>
    </form></div>`;
  document.getElementById('statForm').addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (stat) data.id = stat.id;
    const res = await apiFetch('/papi/save', { method: 'POST', body: JSON.stringify({ action: 'stat', data }) });
    if (res.success) { showToast('Stat saved!', 'success'); await loadDashboard(); renderTab('profile'); }
    else showToast(res.error || 'Save failed', 'error');
  });
}
async function deleteStat(id) {
  if (!confirm('Delete this stat?')) return;
  const res = await apiFetch('/papi/save', { method: 'POST', body: JSON.stringify({ action: 'deleteStat', id }) });
  if (res.success) { showToast('Deleted', 'success'); await loadDashboard(); renderTab('profile'); }
}

// ── Services ─────────────────────────────────
function loadServicesTab() {
  const items = adminData.services || [];
  return `
    <div class="admin-header"><div class="admin-title">Services</div><div class="admin-subtitle">What you offer to clients</div></div>
    <div class="admin-card">
      <div class="admin-card-header"><span class="admin-card-title">Add New Service</span></div>
      <form class="admin-form" id="serviceForm">
        <input type="hidden" name="id" id="serviceId">
        <div class="form-group"><label>Title</label><input name="title" id="serviceTitle" required></div>
        <div class="form-group"><label>Icon (emoji)</label><input name="icon" id="serviceIcon" value="🌐"></div>
        <div class="form-group full"><label>Description</label><textarea name="description" id="serviceDesc" rows="3"></textarea></div>
        <div class="form-actions full"><button type="button" class="btn-add" onclick="clearServiceForm()">New</button><button type="submit" class="btn-save">Save</button></div>
      </form>
    </div>
    <div class="admin-card">
      <div class="admin-card-header"><span class="admin-card-title">Services List</span></div>
      <div class="items-list">
        ${items.map(s => `<div class="item-row">
          <div class="item-icon">${escapeHtml(s.icon||'⚙️')}</div>
          <div class="item-body"><div class="item-title">${escapeHtml(s.title)}</div><div class="item-sub">${escapeHtml((s.description||'').slice(0,60))}...</div></div>
          <div class="item-actions">
            <button class="btn-icon" onclick="editService(${JSON.stringify(s).replace(/'/g,"&#39;")})">✏️</button>
            <button class="btn-icon danger" onclick="deleteItem('service','${escapeHtml(s.id)}','deleteService')">🗑️</button>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
}
function bindServicesEvents() {
  document.getElementById('serviceForm').addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (!data.id) delete data.id;
    const res = await apiFetch('/papi/save', { method: 'POST', body: JSON.stringify({ action: 'service', data }) });
    if (res.success) { showToast('Saved!', 'success'); clearServiceForm(); await loadDashboard(); renderTab('services'); }
    else showToast(res.error || 'Failed', 'error');
  });
}
function clearServiceForm() {
  ['serviceId','serviceTitle','serviceDesc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const icon = document.getElementById('serviceIcon'); if (icon) icon.value = '🌐';
}
function editService(s) {
  document.getElementById('serviceId').value = s.id || '';
  document.getElementById('serviceTitle').value = s.title || '';
  document.getElementById('serviceDesc').value = s.description || '';
  document.getElementById('serviceIcon').value = s.icon || '🌐';
}

// ── Tech Stack ───────────────────────────────
function loadTechStackTab() {
  const items = adminData.tech_stack || [];
  return `
    <div class="admin-header"><div class="admin-title">Tech Stack</div><div class="admin-subtitle">Technologies you work with</div></div>
    <div class="admin-card">
      <div class="admin-card-header"><span class="admin-card-title">Add Tech</span></div>
      <form class="admin-form" id="techForm">
        <input type="hidden" name="id" id="techId">
        <div class="form-group"><label>Name</label><input name="name" id="techName" required></div>
        <div class="form-group"><label>Icon (emoji)</label><input name="icon" id="techIcon" value="💻"></div>
        <div class="form-group"><label>Category</label><input name="category" id="techCategory" placeholder="backend / frontend / devops"></div>
        <div class="form-actions"><button type="button" class="btn-add" onclick="clearTechForm()">New</button><button type="submit" class="btn-save">Save</button></div>
      </form>
    </div>
    <div class="admin-card">
      <div class="admin-card-header"><span class="admin-card-title">Tech Stack List</span></div>
      <div class="items-list">
        ${items.map(t => `<div class="item-row">
          <div class="item-icon">${escapeHtml(t.icon||'💻')}</div>
          <div class="item-body"><div class="item-title">${escapeHtml(t.name)}</div><div class="item-sub">${escapeHtml(t.category||'')}</div></div>
          <div class="item-actions">
            <button class="btn-icon" onclick="editTech(${JSON.stringify(t).replace(/'/g,"&#39;")})">✏️</button>
            <button class="btn-icon danger" onclick="deleteItem('tech_stack','${escapeHtml(t.id)}','deleteTechStack')">🗑️</button>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
}
function bindTechStackEvents() {
  document.getElementById('techForm').addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (!data.id) delete data.id;
    const res = await apiFetch('/papi/save', { method: 'POST', body: JSON.stringify({ action: 'techStack', data }) });
    if (res.success) { showToast('Saved!', 'success'); clearTechForm(); await loadDashboard(); renderTab('techstack'); }
    else showToast(res.error || 'Failed', 'error');
  });
}
function clearTechForm() { ['techId','techName','techCategory'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); const i = document.getElementById('techIcon'); if (i) i.value = '💻'; }
function editTech(t) { document.getElementById('techId').value = t.id||''; document.getElementById('techName').value = t.name||''; document.getElementById('techIcon').value = t.icon||'💻'; document.getElementById('techCategory').value = t.category||''; }

// ── Projects ─────────────────────────────────
function loadProjectsTab() {
  const items = adminData.projects || [];
  return `
    <div class="admin-header"><div class="admin-title">Projects</div><div class="admin-subtitle">Showcase your work</div></div>
    <div class="admin-card">
      <div class="admin-card-header"><span class="admin-card-title">Add / Edit Project</span></div>
      <form class="admin-form" id="projectForm">
        <input type="hidden" name="id" id="projectId">
        <div class="form-group"><label>Title</label><input name="title" id="projectTitle" required></div>
        <div class="form-group"><label>GitHub URL</label><input name="github_url" id="projectGithub"></div>
        <div class="form-group"><label>Live URL</label><input name="live_url" id="projectLive"></div>
        <div class="form-group"><label>Tags (comma separated)</label><input name="tags" id="projectTags" placeholder="React, Node.js, AWS"></div>
        <div class="form-group"><label>Featured</label><select name="featured" id="projectFeatured"><option value="0">No</option><option value="1">Yes</option></select></div>
        <div class="form-group full"><label>Description</label><textarea name="description" id="projectDesc" rows="3"></textarea></div>
        <div class="form-group full"><label>Project Image</label><input type="file" id="projectImageFile" accept="image/*" style="display:block;color:var(--text-primary);"><div style="font-size:0.78rem;color:var(--text-secondary);margin-top:.3rem;">Or paste URL:</div><input name="image_url" id="projectImage" placeholder="https://..."></div>
        <div class="form-actions full"><button type="button" class="btn-add" onclick="clearProjectForm()">New</button><button type="submit" class="btn-save">Save Project</button></div>
      </form>
    </div>
    <div class="admin-card">
      <div class="admin-card-header"><span class="admin-card-title">Projects List</span></div>
      <div class="items-list">
        ${items.map(p => `<div class="item-row">
          <div class="item-icon">🚀</div>
          <div class="item-body"><div class="item-title">${escapeHtml(p.title)}</div><div class="item-sub">${p.featured ? '⭐ Featured · ' : ''}${escapeHtml((p.description||'').slice(0,50))}...</div></div>
          <div class="item-actions">
            <button class="btn-icon" onclick='editProject(${JSON.stringify(p)})'>✏️</button>
            <button class="btn-icon danger" onclick="deleteItem('projects','${escapeHtml(p.id)}','deleteProject')">🗑️</button>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
}
function bindProjectsEvents() {
  document.getElementById('projectImageFile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 3 * 1024 * 1024) { showToast('Image too large (max 3MB)', 'error'); return; }
    document.getElementById('projectImage').value = await fileToBase64(file);
  });
  document.getElementById('projectForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    if (!data.id) delete data.id;
    const tagsStr = data.tags || '';
    data.tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    data.featured = parseInt(data.featured) || 0;
    const res = await apiFetch('/papi/save', { method: 'POST', body: JSON.stringify({ action: 'project', data }) });
    if (res.success) { showToast('Project saved!', 'success'); clearProjectForm(); await loadDashboard(); renderTab('projects'); }
    else showToast(res.error || 'Failed', 'error');
  });
}
function clearProjectForm() { ['projectId','projectTitle','projectGithub','projectLive','projectDesc','projectImage','projectTags'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); const f = document.getElementById('projectFeatured'); if(f) f.value = '0'; }
function editProject(p) {
  document.getElementById('projectId').value = p.id||'';
  document.getElementById('projectTitle').value = p.title||'';
  document.getElementById('projectGithub').value = p.github_url||'';
  document.getElementById('projectLive').value = p.live_url||'';
  document.getElementById('projectDesc').value = p.description||'';
  document.getElementById('projectImage').value = p.image_url||'';
  const tags = Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags||'');
  document.getElementById('projectTags').value = tags;
  document.getElementById('projectFeatured').value = p.featured ? '1' : '0';
}

// ── Qualifications ───────────────────────────
let qualSubTab = 'skills';
function loadQualificationsTab() {
  return `<div class="admin-header"><div class="admin-title">Qualifications</div><div class="admin-subtitle">Skills, education, and experience</div></div>
    <div class="subtabs">
      <div class="subtab ${qualSubTab==='skills'?'active':''}" onclick="switchQualTab('skills')">Skills</div>
      <div class="subtab ${qualSubTab==='education'?'active':''}" onclick="switchQualTab('education')">Education</div>
      <div class="subtab ${qualSubTab==='experience'?'active':''}" onclick="switchQualTab('experience')">Experience</div>
    </div>
    <div id="qualContent">${renderQualContent()}</div>`;
}
function switchQualTab(tab) { qualSubTab = tab; document.querySelectorAll('.subtab').forEach(el => el.classList.toggle('active', el.textContent.toLowerCase()===tab)); document.getElementById('qualContent').innerHTML = renderQualContent(); bindQualificationsEvents(); }
function renderQualContent() {
  if (qualSubTab === 'skills') return renderSkillsAdmin();
  if (qualSubTab === 'education') return renderEducationAdmin();
  if (qualSubTab === 'experience') return renderExperienceAdmin();
  return '';
}
function bindQualificationsEvents() {
  const sf = document.getElementById('skillForm'); if (sf) sf.addEventListener('submit', saveSkill);
  const ef = document.getElementById('eduForm'); if (ef) ef.addEventListener('submit', saveEducation);
  const xf = document.getElementById('expForm'); if (xf) xf.addEventListener('submit', saveExperience);
}

function renderSkillsAdmin() {
  const items = adminData.skills || [];
  return `<div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Add / Edit Skill</span></div>
    <form class="admin-form" id="skillForm">
      <input type="hidden" name="id" id="skillId">
      <div class="form-group"><label>Name</label><input name="name" id="skillName" required></div>
      <div class="form-group"><label>Category</label><input name="category" id="skillCategory" placeholder="Frontend / Backend / DevOps"></div>
      <div class="form-group"><label>Icon (emoji)</label><input name="icon" id="skillIcon" value="⚡"></div>
      <div class="form-group"><label>Proficiency (0-100)</label><input type="number" name="proficiency" id="skillProficiency" min="0" max="100" value="80"></div>
      <div class="form-actions full"><button type="button" class="btn-add" onclick="clearSkillForm()">New</button><button type="submit" class="btn-save">Save</button></div>
    </form></div>
    <div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Skills</span></div>
    <div class="items-list">${items.map(s => `<div class="item-row"><div class="item-icon">${escapeHtml(s.icon||'⚡')}</div>
      <div class="item-body"><div class="item-title">${escapeHtml(s.name)}</div><div class="item-sub">${escapeHtml(s.category||'')} · ${s.proficiency}%</div></div>
      <div class="item-actions"><button class="btn-icon" onclick='editSkill(${JSON.stringify(s)})'>✏️</button><button class="btn-icon danger" onclick="deleteItem('skills','${s.id}','deleteSkill')">🗑️</button></div>
    </div>`).join('')}</div></div>`;
}
async function saveSkill(e) { e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); if (!data.id) delete data.id; data.proficiency = parseInt(data.proficiency)||50; const res = await apiFetch('/papi/save', { method:'POST', body: JSON.stringify({ action:'skill', data }) }); if (res.success) { showToast('Saved!','success'); clearSkillForm(); await loadDashboard(); switchQualTab('skills'); } else showToast(res.error||'Failed','error'); }
function clearSkillForm() { ['skillId','skillName','skillCategory'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''}); const i=document.getElementById('skillIcon');if(i)i.value='⚡'; const p=document.getElementById('skillProficiency');if(p)p.value='80'; }
function editSkill(s) { document.getElementById('skillId').value=s.id||''; document.getElementById('skillName').value=s.name||''; document.getElementById('skillCategory').value=s.category||''; document.getElementById('skillIcon').value=s.icon||'⚡'; document.getElementById('skillProficiency').value=s.proficiency||80; }

function renderEducationAdmin() {
  const items = adminData.education || [];
  return `<div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Add / Edit Education</span></div>
    <form class="admin-form" id="eduForm">
      <input type="hidden" name="id" id="eduId">
      <div class="form-group"><label>Institution</label><input name="institution" id="eduInstitution" required></div>
      <div class="form-group"><label>Degree</label><input name="degree" id="eduDegree"></div>
      <div class="form-group"><label>Field of Study</label><input name="field" id="eduField"></div>
      <div class="form-group"><label>Icon (emoji)</label><input name="icon" id="eduIcon" value="🎓"></div>
      <div class="form-group"><label>Start Year</label><input name="start_date" id="eduStart"></div>
      <div class="form-group"><label>End Year</label><input name="end_date" id="eduEnd"></div>
      <div class="form-group full"><label>Description</label><textarea name="description" id="eduDesc" rows="2"></textarea></div>
      <div class="form-actions full"><button type="button" class="btn-add" onclick="clearEduForm()">New</button><button type="submit" class="btn-save">Save</button></div>
    </form></div>
    <div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Education</span></div>
    <div class="items-list">${items.map(e => `<div class="item-row"><div class="item-icon">${escapeHtml(e.icon||'🎓')}</div>
      <div class="item-body"><div class="item-title">${escapeHtml(e.institution)}</div><div class="item-sub">${escapeHtml(e.degree||'')} ${e.field?'· '+e.field:''}</div></div>
      <div class="item-actions"><button class="btn-icon" onclick='editEdu(${JSON.stringify(e)})'>✏️</button><button class="btn-icon danger" onclick="deleteItem('education','${e.id}','deleteEducation')">🗑️</button></div>
    </div>`).join('')}</div></div>`;
}
async function saveEducation(e) { e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); if (!data.id) delete data.id; const res = await apiFetch('/papi/save', { method:'POST', body: JSON.stringify({ action:'education', data }) }); if (res.success) { showToast('Saved!','success'); clearEduForm(); await loadDashboard(); switchQualTab('education'); } else showToast(res.error||'Failed','error'); }
function clearEduForm() { ['eduId','eduInstitution','eduDegree','eduField','eduStart','eduEnd','eduDesc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''}); const i=document.getElementById('eduIcon');if(i)i.value='🎓'; }
function editEdu(e) { document.getElementById('eduId').value=e.id||''; document.getElementById('eduInstitution').value=e.institution||''; document.getElementById('eduDegree').value=e.degree||''; document.getElementById('eduField').value=e.field||''; document.getElementById('eduIcon').value=e.icon||'🎓'; document.getElementById('eduStart').value=e.start_date||''; document.getElementById('eduEnd').value=e.end_date||''; document.getElementById('eduDesc').value=e.description||''; }

function renderExperienceAdmin() {
  const items = adminData.experience || [];
  return `<div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Add / Edit Experience</span></div>
    <form class="admin-form" id="expForm">
      <input type="hidden" name="id" id="expId">
      <div class="form-group"><label>Company</label><input name="company" id="expCompany" required></div>
      <div class="form-group"><label>Position</label><input name="position" id="expPosition"></div>
      <div class="form-group"><label>Start Year</label><input name="start_date" id="expStart"></div>
      <div class="form-group"><label>End Year</label><input name="end_date" id="expEnd" placeholder="Leave blank if current"></div>
      <div class="form-group full"><label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;"><input type="checkbox" name="current" id="expCurrent" style="accent-color:var(--primary)"> Currently working here</label></div>
      <div class="form-group full"><label>Description</label><textarea name="description" id="expDesc" rows="3"></textarea></div>
      <div class="form-actions full"><button type="button" class="btn-add" onclick="clearExpForm()">New</button><button type="submit" class="btn-save">Save</button></div>
    </form></div>
    <div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Experience</span></div>
    <div class="items-list">${items.map(e => `<div class="item-row"><div class="item-icon">💼</div>
      <div class="item-body"><div class="item-title">${escapeHtml(e.company)} ${e.current?'<span class="current-badge">Current</span>':''}</div><div class="item-sub">${escapeHtml(e.position||'')}</div></div>
      <div class="item-actions"><button class="btn-icon" onclick='editExp(${JSON.stringify(e)})'>✏️</button><button class="btn-icon danger" onclick="deleteItem('experience','${e.id}','deleteExperience')">🗑️</button></div>
    </div>`).join('')}</div></div>`;
}
async function saveExperience(e) { e.preventDefault(); const form = new FormData(e.target); const data = Object.fromEntries(form); if (!data.id) delete data.id; data.current = form.get('current') === 'on' ? 1 : 0; const res = await apiFetch('/papi/save', { method:'POST', body: JSON.stringify({ action:'experience', data }) }); if (res.success) { showToast('Saved!','success'); clearExpForm(); await loadDashboard(); switchQualTab('experience'); } else showToast(res.error||'Failed','error'); }
function clearExpForm() { ['expId','expCompany','expPosition','expStart','expEnd','expDesc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''}); const c=document.getElementById('expCurrent');if(c)c.checked=false; }
function editExp(e) { document.getElementById('expId').value=e.id||''; document.getElementById('expCompany').value=e.company||''; document.getElementById('expPosition').value=e.position||''; document.getElementById('expStart').value=e.start_date||''; document.getElementById('expEnd').value=e.end_date||''; document.getElementById('expDesc').value=e.description||''; document.getElementById('expCurrent').checked=!!e.current; }

// ── Credentials ──────────────────────────────
let credSubTab = 'certifications';
function loadCredentialsTab() {
  return `<div class="admin-header"><div class="admin-title">Credentials</div><div class="admin-subtitle">Certifications, languages, interests, achievements</div></div>
    <div class="subtabs">
      ${['certifications','languages','interests','achievements'].map(t=>`<div class="subtab ${credSubTab===t?'active':''}" onclick="switchCredTab('${t}')">${t.charAt(0).toUpperCase()+t.slice(1)}</div>`).join('')}
    </div>
    <div id="credContent">${renderCredContent()}</div>`;
}
function switchCredTab(tab) { credSubTab = tab; document.querySelectorAll('.subtab').forEach(el => el.classList.toggle('active', el.textContent.toLowerCase()===tab)); document.getElementById('credContent').innerHTML = renderCredContent(); bindCredentialsEvents(); }
function renderCredContent() {
  if (credSubTab === 'certifications') return renderCertsAdmin();
  if (credSubTab === 'languages') return renderLangsAdmin();
  if (credSubTab === 'interests') return renderInterestsAdmin();
  if (credSubTab === 'achievements') return renderAchievementsAdmin();
  return '';
}
function bindCredentialsEvents() {
  const cf = document.getElementById('certForm'); if (cf) cf.addEventListener('submit', saveCert);
  const lf = document.getElementById('langForm'); if (lf) lf.addEventListener('submit', saveLang);
  const inf = document.getElementById('interestForm'); if (inf) inf.addEventListener('submit', saveInterest);
  const af = document.getElementById('achievementForm'); if (af) af.addEventListener('submit', saveAchievement);
}

function renderCertsAdmin() {
  const items = adminData.certifications || [];
  return `<div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Add / Edit Certification</span></div>
    <form class="admin-form" id="certForm">
      <input type="hidden" name="id" id="certId">
      <div class="form-group"><label>Name</label><input name="name" id="certName" required></div>
      <div class="form-group"><label>Issuer</label><input name="issuer" id="certIssuer"></div>
      <div class="form-group"><label>Date</label><input name="date" id="certDate" placeholder="2023"></div>
      <div class="form-group"><label>Credential URL</label><input name="credential_url" id="certUrl"></div>
      <div class="form-actions"><button type="button" class="btn-add" onclick="clearCertForm()">New</button><button type="submit" class="btn-save">Save</button></div>
    </form></div>
    <div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Certifications</span></div>
    <div class="items-list">${items.map(c=>`<div class="item-row"><div class="item-icon">🏆</div>
      <div class="item-body"><div class="item-title">${escapeHtml(c.name)}</div><div class="item-sub">${escapeHtml(c.issuer||'')} · ${escapeHtml(c.date||'')}</div></div>
      <div class="item-actions"><button class="btn-icon" onclick='editCert(${JSON.stringify(c)})'>✏️</button><button class="btn-icon danger" onclick="deleteItem('certifications','${c.id}','deleteCertification')">🗑️</button></div>
    </div>`).join('')}</div></div>`;
}
async function saveCert(e) { e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); if (!data.id) delete data.id; const res = await apiFetch('/papi/save', { method:'POST', body: JSON.stringify({ action:'certification', data }) }); if (res.success) { showToast('Saved!','success'); clearCertForm(); await loadDashboard(); switchCredTab('certifications'); } else showToast(res.error||'Failed','error'); }
function clearCertForm() { ['certId','certName','certIssuer','certDate','certUrl'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''}); }
function editCert(c) { document.getElementById('certId').value=c.id||''; document.getElementById('certName').value=c.name||''; document.getElementById('certIssuer').value=c.issuer||''; document.getElementById('certDate').value=c.date||''; document.getElementById('certUrl').value=c.credential_url||''; }

function renderLangsAdmin() {
  const items = adminData.languages || [];
  return `<div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Add Language</span></div>
    <form class="admin-form" id="langForm">
      <input type="hidden" name="id" id="langId">
      <div class="form-group"><label>Language</label><input name="name" id="langName" required></div>
      <div class="form-group"><label>Proficiency</label><select name="proficiency" id="langProf"><option>Native</option><option>Fluent</option><option>Conversational</option><option>Basic</option></select></div>
      <div class="form-actions"><button type="button" class="btn-add" onclick="clearLangForm()">New</button><button type="submit" class="btn-save">Save</button></div>
    </form></div>
    <div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Languages</span></div>
    <div class="items-list">${items.map(l=>`<div class="item-row"><div class="item-icon">🌐</div>
      <div class="item-body"><div class="item-title">${escapeHtml(l.name)}</div><div class="item-sub">${escapeHtml(l.proficiency||'')}</div></div>
      <div class="item-actions"><button class="btn-icon" onclick='editLang(${JSON.stringify(l)})'>✏️</button><button class="btn-icon danger" onclick="deleteItem('languages','${l.id}','deleteLanguage')">🗑️</button></div>
    </div>`).join('')}</div></div>`;
}
async function saveLang(e) { e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); if (!data.id) delete data.id; const res = await apiFetch('/papi/save', { method:'POST', body: JSON.stringify({ action:'language', data }) }); if (res.success) { showToast('Saved!','success'); clearLangForm(); await loadDashboard(); switchCredTab('languages'); } else showToast(res.error||'Failed','error'); }
function clearLangForm() { ['langId','langName'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''}); }
function editLang(l) { document.getElementById('langId').value=l.id||''; document.getElementById('langName').value=l.name||''; document.getElementById('langProf').value=l.proficiency||'Native'; }

function renderInterestsAdmin() {
  const items = adminData.interests || [];
  return `<div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Add Interest</span></div>
    <form class="admin-form" id="interestForm">
      <input type="hidden" name="id" id="interestId">
      <div class="form-group"><label>Name</label><input name="name" id="interestName" required></div>
      <div class="form-group"><label>Icon (emoji)</label><input name="icon" id="interestIcon" value="💡"></div>
      <div class="form-actions"><button type="button" class="btn-add" onclick="clearInterestForm()">New</button><button type="submit" class="btn-save">Save</button></div>
    </form></div>
    <div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Interests</span></div>
    <div class="items-list">${items.map(i=>`<div class="item-row"><div class="item-icon">${escapeHtml(i.icon||'💡')}</div>
      <div class="item-body"><div class="item-title">${escapeHtml(i.name)}</div></div>
      <div class="item-actions"><button class="btn-icon" onclick='editInterest(${JSON.stringify(i)})'>✏️</button><button class="btn-icon danger" onclick="deleteItem('interests','${i.id}','deleteInterest')">🗑️</button></div>
    </div>`).join('')}</div></div>`;
}
async function saveInterest(e) { e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); if (!data.id) delete data.id; const res = await apiFetch('/papi/save', { method:'POST', body: JSON.stringify({ action:'interest', data }) }); if (res.success) { showToast('Saved!','success'); clearInterestForm(); await loadDashboard(); switchCredTab('interests'); } else showToast(res.error||'Failed','error'); }
function clearInterestForm() { ['interestId','interestName'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''}); const i=document.getElementById('interestIcon');if(i)i.value='💡'; }
function editInterest(i) { document.getElementById('interestId').value=i.id||''; document.getElementById('interestName').value=i.name||''; document.getElementById('interestIcon').value=i.icon||'💡'; }

function renderAchievementsAdmin() {
  const items = adminData.achievements || [];
  return `<div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Add Achievement</span></div>
    <form class="admin-form" id="achievementForm">
      <input type="hidden" name="id" id="achievementId">
      <div class="form-group"><label>Title</label><input name="title" id="achievementTitle" required></div>
      <div class="form-group"><label>Icon (emoji)</label><input name="icon" id="achievementIcon" value="🏆"></div>
      <div class="form-group"><label>Date</label><input name="date" id="achievementDate" placeholder="2023"></div>
      <div class="form-group"><label>Category</label><input name="category" id="achievementCat" placeholder="work / community / personal"></div>
      <div class="form-group"><label>Link</label><input name="link" id="achievementLink" placeholder="https://..."></div>
      <div class="form-group full"><label>Description</label><textarea name="description" id="achievementDesc" rows="2"></textarea></div>
      <div class="form-actions full"><button type="button" class="btn-add" onclick="clearAchievementForm()">New</button><button type="submit" class="btn-save">Save</button></div>
    </form></div>
    <div class="admin-card"><div class="admin-card-header"><span class="admin-card-title">Achievements</span></div>
    <div class="items-list">${items.map(a=>`<div class="item-row"><div class="item-icon">${escapeHtml(a.icon||'🏆')}</div>
      <div class="item-body"><div class="item-title">${escapeHtml(a.title)}</div><div class="item-sub">${escapeHtml(a.category||'')} · ${escapeHtml(a.date||'')}</div></div>
      <div class="item-actions"><button class="btn-icon" onclick='editAchievement(${JSON.stringify(a)})'>✏️</button><button class="btn-icon danger" onclick="deleteItem('achievements','${a.id}','deleteAchievement')">🗑️</button></div>
    </div>`).join('')}</div></div>`;
}
async function saveAchievement(e) { e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); if (!data.id) delete data.id; const res = await apiFetch('/papi/save', { method:'POST', body: JSON.stringify({ action:'achievement', data }) }); if (res.success) { showToast('Saved!','success'); clearAchievementForm(); await loadDashboard(); switchCredTab('achievements'); } else showToast(res.error||'Failed','error'); }
function clearAchievementForm() { ['achievementId','achievementTitle','achievementDate','achievementCat','achievementLink','achievementDesc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''}); const i=document.getElementById('achievementIcon');if(i)i.value='🏆'; }
function editAchievement(a) { document.getElementById('achievementId').value=a.id||''; document.getElementById('achievementTitle').value=a.title||''; document.getElementById('achievementIcon').value=a.icon||'🏆'; document.getElementById('achievementDate').value=a.date||''; document.getElementById('achievementCat').value=a.category||''; document.getElementById('achievementLink').value=a.link||''; document.getElementById('achievementDesc').value=a.description||''; }

// ── Messages ─────────────────────────────────
async function loadMessagesTab() {
  const res = await apiFetch('/papi/messages');
  const messages = res.messages || [];
  const main = document.getElementById('tabContent');
  main.innerHTML = `<div class="admin-header"><div class="admin-title">Messages</div><div class="admin-subtitle">${messages.length} total · ${messages.filter(m=>!m.is_read).length} unread</div></div>
    <div id="messagesList">${messages.length === 0 ? '<div style="text-align:center;color:var(--text-secondary);padding:3rem;">No messages yet.</div>' :
    messages.map(m => `<div class="message-card ${!m.is_read?'unread':''}" id="msg-${m.id}">
      <div class="message-header">
        <div><div class="message-name">${!m.is_read?'<span class="unread-dot"></span>':''}${escapeHtml(m.name)}</div><div class="message-email">${escapeHtml(m.email)}</div></div>
        <div style="display:flex;gap:.5rem;align-items:center;">
          <span class="message-date">${new Date(m.created_at).toLocaleDateString()}</span>
          ${!m.is_read ? `<button class="btn-icon" onclick="markRead('${m.id}')">✓ Read</button>` : ''}
          <button class="btn-icon danger" onclick="deleteMsg('${m.id}')">🗑️</button>
        </div>
      </div>
      ${m.subject ? `<div class="message-subject">${escapeHtml(m.subject)}</div>` : ''}
      <div class="message-body">${escapeHtml(m.message)}</div>
    </div>`).join('')}</div>`;
  updateUnreadBadge();
}
async function markRead(id) { await apiFetch('/papi/save', { method:'POST', body: JSON.stringify({ action:'markMessageRead', id }) }); document.getElementById(`msg-${id}`)?.classList.remove('unread'); updateUnreadBadge(); }
async function deleteMsg(id) { if (!confirm('Delete message?')) return; await apiFetch('/papi/save', { method:'POST', body: JSON.stringify({ action:'deleteMessage', id }) }); loadMessagesTab(); }

// ── Settings ─────────────────────────────────
function loadSettingsTab() {
  const s = adminData.settings || {};
  const accentColors = [
    {name:'pink',color:'#ec4899'},{name:'purple',color:'#a855f7'},{name:'cyan',color:'#06b6d4'},
    {name:'emerald',color:'#10b981'},{name:'amber',color:'#f59e0b'},{name:'rose',color:'#f43f5e'},{name:'mono',color:'#ffffff'}
  ];
  const toggleRow = (label, key, val) => `<div class="toggle-row"><span class="toggle-label">${label}</span>
    <label class="toggle-switch"><input type="checkbox" id="${key}" ${val?'checked':''}><span class="toggle-slider"></span></label></div>`;
  return `<div class="admin-header"><div class="admin-title">Settings</div><div class="admin-subtitle">Customize your portfolio appearance</div></div>
    <div class="settings-grid">
      <div class="settings-section"><div class="settings-section-title">Theme</div>
        ${toggleRow('Dark Mode','themeDark', s.theme!=='light')}
        <div class="toggle-row"><span class="toggle-label">Accent Color</span></div>
        <div class="accent-colors">${accentColors.map(c=>`<button class="accent-btn ${s.accent_color===c.name?'active':''}" style="background:${c.color}" data-accent="${c.name}" onclick="setAccent('${c.name}',this)" title="${c.name}"></button>`).join('')}</div>
      </div>
      <div class="settings-section"><div class="settings-section-title">Effects</div>
        ${toggleRow('Custom Cursor','cursorEnabled',s.cursor_enabled!==0)}
        ${toggleRow('Background Effects','bgEffects',s.background_effects!==0)}
      </div>
      <div class="settings-section"><div class="settings-section-title">Sections</div>
        ${['stats','services','skills','projects','education','experience','certifications','languages','interests','achievements','contact']
          .map(sec => toggleRow(sec.charAt(0).toUpperCase()+sec.slice(1), 'show_'+sec, s['show_'+sec]!==0)).join('')}
      </div>
      <div class="settings-section"><div class="settings-section-title">Notifications</div>
        ${toggleRow('Telegram Notifications','telegramEnabled', s.telegram_enabled!==0)}
        <div class="form-group" style="margin-top:.6rem;"><label>Telegram Bot Token</label><input id="telegramBotToken" value="${escapeHtml(s.telegram_bot_token||'')}" placeholder="123456:ABC-DEF..."></div>
        <div class="form-group"><label>Telegram Chat ID</label><input id="telegramChatId" value="${escapeHtml(s.telegram_chat_id||'')}" placeholder="123456789"></div>
        <div style="font-size:.78rem;color:var(--text-secondary);">Tip: You can paste the token now and add chat ID later.</div>
      </div>
    </div>
    <div class="form-actions" style="margin-top:1.5rem;"><button class="btn-save" onclick="saveSettings()">Save Settings</button></div>`;
}

function resizeImageToDataUrl(file, size, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Center-crop to square, then resize
        const minSide = Math.min(img.width, img.height);
        const sx = Math.round((img.width - minSide) / 2);
        const sy = Math.round((img.height - minSide) / 2);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function bindSettingsEvents() {}
function setAccent(name, btn) {
  document.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.documentElement.setAttribute('data-accent', name);
}
async function saveSettings() {
  const s = adminData.settings || {};
  s.theme = document.getElementById('themeDark')?.checked ? 'dark' : 'light';
  s.accent_color = document.querySelector('.accent-btn.active')?.dataset.accent || 'pink';
  s.cursor_enabled = document.getElementById('cursorEnabled')?.checked ? 1 : 0;
  s.background_effects = document.getElementById('bgEffects')?.checked ? 1 : 0;
  s.telegram_enabled = document.getElementById('telegramEnabled')?.checked ? 1 : 0;
  s.telegram_bot_token = document.getElementById('telegramBotToken')?.value || '';
  s.telegram_chat_id = document.getElementById('telegramChatId')?.value || '';
  ['stats','services','skills','projects','education','experience','certifications','languages','interests','achievements','contact'].forEach(sec => {
    s['show_'+sec] = document.getElementById('show_'+sec)?.checked ? 1 : 0;
  });
  document.documentElement.setAttribute('data-theme', s.theme);
  const res = await apiFetch('/papi/save', { method:'POST', body: JSON.stringify({ action:'settings', data: s }) });
  if (res.success) { adminData.settings = s; showToast('Settings saved!', 'success'); }
  else showToast(res.error||'Failed', 'error');
}

// ── Generic delete ───────────────────────────
async function deleteItem(type, id, action) {
  if (!confirm('Delete this item?')) return;
  const res = await apiFetch('/papi/save', { method:'POST', body: JSON.stringify({ action, id }) });
  if (res.success) { showToast('Deleted','success'); await loadDashboard(); renderTab(currentTab); }
  else showToast(res.error||'Failed','error');
}

// ── Sidebar navigation ───────────────────────
document.querySelectorAll('.sidebar-nav-item').forEach(item => {
  item.addEventListener('click', () => switchTab(item.dataset.tab));
});

// ── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});
