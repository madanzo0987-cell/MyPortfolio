let portfolioData = {};

async function fetchData() {
  try {
    const data = await apiFetch('/papi/data');
    portfolioData = data;
    return data;
  } catch (e) {
    console.error('Failed to fetch data', e);
    return null;
  }
}

function applySettings(settings) {
  if (!settings) return;
  document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  document.documentElement.setAttribute('data-accent', settings.accent_color || 'pink');
  if (!settings.cursor_enabled) {
    document.getElementById('cursorDot').style.display = 'none';
    document.getElementById('cursorRing').style.display = 'none';
  }
  if (!settings.background_effects) {
    const orbs = document.querySelector('.bg-orbs');
    if (orbs) orbs.style.display = 'none';
  }
  const sections = ['stats','services','skills','projects','education','experience','certifications','languages','interests','achievements','contact'];
  sections.forEach(s => {
    const el = document.getElementById(s);
    if (el && settings['show_' + s] === 0) el.style.display = 'none';
  });
}

function renderHero(data) {
  const p = data.portfolio || {};
  document.getElementById('heroName').textContent = p.name || 'Your Name';
  document.getElementById('heroTitle').textContent = p.title || 'Full Stack Developer';
  document.getElementById('heroAbout').textContent = p.about || '';
  document.getElementById('navName').textContent = p.name ? p.name.split(' ')[0] : 'Portfolio';
  document.getElementById('footerName').textContent = p.name || 'Portfolio';
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  document.title = (p.name || 'Portfolio') + ' — ' + (p.title || 'Developer');

  if (!p.is_available) document.getElementById('availabilityBadge').style.display = 'none';

  if (p.avatar_url) {
    const img = document.createElement('img');
    img.src = p.avatar_url;
    img.alt = p.name;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
    const container = document.getElementById('heroAvatar');
    container.innerHTML = '';
    container.appendChild(img);
  } else {
    const initials = (p.name || 'AJ').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const el = document.getElementById('avatarInitials');
    if (el) el.textContent = initials;
  }

  if (p.resume_url) {
    document.getElementById('resumeBtn').href = p.resume_url;
    document.getElementById('resumeBtn').setAttribute('download', '');
  } else {
    document.getElementById('resumeBtn').style.display = 'none';
  }

  const social = document.getElementById('heroSocial');
  const links = [
    { key: 'github',   cls: 'fab fa-github',     label: 'GitHub' },
    { key: 'linkedin', cls: 'fab fa-linkedin-in', label: 'LinkedIn' },
    { key: 'twitter',  cls: 'fab fa-x-twitter',   label: 'X / Twitter' },
    { key: 'instagram', cls: 'fab fa-instagram',   label: 'Instagram' },
    { key: 'website',  cls: 'fas fa-globe',        label: 'Website' },
  ];
  links.forEach(l => {
    if (p[l.key]) {
      const a = document.createElement('a');
      a.href = p[l.key];
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'social-link';
      a.title = l.label;
      a.innerHTML = `<i class="${l.cls}"></i>`;
      social.appendChild(a);
    }
  });
}

function renderStats(stats) {
  const container = document.getElementById('statsContainer');
  if (!stats || !stats.length) { document.getElementById('stats').style.display = 'none'; return; }
  container.innerHTML = stats.map(s => `
    <div class="stat-item reveal">
      <div class="stat-icon">${renderIcon(s.icon, 'fas fa-chart-bar')}</div>
      <div class="stat-value">${escapeHtml(s.value)}</div>
      <div class="stat-label">${escapeHtml(s.label)}</div>
    </div>
  `).join('');
}

function renderAbout(data) {
  const tech = data.tech_stack || [];
  const p = data.portfolio || {};
  const skills = data.skills || [];

  const techGrid = document.getElementById('techGrid');
  if (tech.length === 0) {
    techGrid.innerHTML = '<p style="color:var(--text-secondary);font-size:0.88rem;">No tech stack added yet.</p>';
  } else {
    const byCategory = {};
    tech.forEach(t => {
      const cat = t.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(t);
    });

    techGrid.innerHTML = Object.entries(byCategory).map(([cat, items]) => `
      <div class="tech-category">
        <div class="tech-cat-label">${escapeHtml(cat)}</div>
        <div class="tech-items">
          ${items.map(t => `
            <div class="tech-pill">
              <span class="tech-pill-icon">${renderIcon(t.icon, 'fas fa-code')}</span>
              <span class="tech-pill-name">${escapeHtml(t.name)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  const tabContent = document.getElementById('tabContent');
  function renderTab(tab) {
    if (tab === 'skills') {
      const topSkills = skills.slice(0, 6);
      if (!topSkills.length) { tabContent.innerHTML = '<p style="color:var(--text-secondary)">No skills added yet.</p>'; return; }
      tabContent.innerHTML = topSkills.map(s => `
        <div style="margin-bottom:0.75rem;">
          <div class="skill-header">
            <span class="skill-name">${renderIcon(s.icon, 'fas fa-code')} ${escapeHtml(s.name)}</span>
            <span class="skill-pct">${s.proficiency}%</span>
          </div>
          <div class="skill-bar-bg"><div class="skill-bar" data-width="${s.proficiency}" style="width:0%"></div></div>
        </div>
      `).join('');
      setTimeout(() => animateSkillBars(), 100);
    } else if (tab === 'bio') {
      tabContent.innerHTML = `<p>${escapeHtml(p.about || 'No bio provided.')}</p>`;
    } else if (tab === 'contact') {
      const rows = [
        { icon: 'fas fa-envelope',      label: 'Email',    value: p.email },
        { icon: 'fas fa-phone',         label: 'Phone',    value: p.phone },
        { icon: 'fas fa-location-dot',  label: 'Location', value: p.location },
      ].filter(r => r.value);
      tabContent.innerHTML = rows.map(r => `
        <div class="info-row">
          <span class="info-icon"><i class="${r.icon}"></i></span>
          <span class="info-label">${r.label}:</span>
          <span class="info-value">${escapeHtml(r.value)}</span>
        </div>
      `).join('') || '<p style="color:var(--text-secondary)">No contact info available.</p>';
    }
  }

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.dataset.tab);
    });
  });
  renderTab('skills');
}

function renderServices(services) {
  const grid = document.getElementById('servicesGrid');
  if (!services || !services.length) { document.getElementById('services').style.display = 'none'; return; }
  grid.innerHTML = services.map(s => `
    <div class="service-card card-hover reveal">
      <div class="service-icon">${renderIcon(s.icon, 'fas fa-star')}</div>
      <div class="service-title">${escapeHtml(s.title)}</div>
      <div class="service-desc">${escapeHtml(s.description)}</div>
    </div>
  `).join('');
}

function renderSkills(skills) {
  const container = document.getElementById('skillsContainer');
  if (!skills || !skills.length) { document.getElementById('skills').style.display = 'none'; return; }
  const byCategory = {};
  skills.forEach(s => {
    const cat = s.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  });
  container.innerHTML = Object.entries(byCategory).map(([cat, items]) => `
    <div class="skills-category reveal">
      <div class="skills-cat-title">${escapeHtml(cat)}</div>
      <div class="skills-list">
        ${items.map(s => `
          <div class="skill-item">
            <div class="skill-header">
              <span class="skill-name">${renderIcon(s.icon, 'fas fa-code')} ${escapeHtml(s.name)}</span>
              <span class="skill-pct">${s.proficiency}%</span>
            </div>
            <div class="skill-bar-bg"><div class="skill-bar" data-width="${s.proficiency}" style="width:0%"></div></div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function renderProjects(projects) {
  const grid = document.getElementById('projectsGrid');
  if (!projects || !projects.length) { document.getElementById('projects').style.display = 'none'; return; }
  grid.innerHTML = projects.map(p => {
    const tags = Array.isArray(p.tags) ? p.tags : [];
    return `
    <div class="project-card reveal">
      <div class="project-img">
        ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}">` : '<i class="fas fa-rocket" style="font-size:3rem;color:var(--primary)"></i>'}
      </div>
      <div class="project-body">
        <div class="project-title">${escapeHtml(p.title)}</div>
        <div class="project-desc">${escapeHtml(p.description)}</div>
        <div class="project-tags">${tags.map(t => `<span class="project-tag">${escapeHtml(t)}</span>`).join('')}</div>
        <div class="project-links">
          ${p.github_url ? `<a href="${escapeHtml(p.github_url)}" target="_blank" rel="noopener" class="project-link"><i class="fab fa-github"></i> Code</a>` : ''}
          ${p.live_url ? `<a href="${escapeHtml(p.live_url)}" target="_blank" rel="noopener" class="project-link"><i class="fas fa-arrow-up-right-from-square"></i> Live</a>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderEducation(education) {
  const timeline = document.getElementById('educationTimeline');
  if (!education || !education.length) { document.getElementById('education').style.display = 'none'; return; }
  timeline.innerHTML = education.map(e => `
    <div class="timeline-item reveal">
      <div class="timeline-dot"></div>
      <div class="timeline-card">
        <div class="timeline-header">
          <div class="timeline-icon">${renderIcon(e.icon, 'fas fa-graduation-cap')}</div>
          <div>
            <div class="timeline-title">${escapeHtml(e.institution)}</div>
            <div class="timeline-sub">${escapeHtml(e.degree || '')} ${e.field ? '— ' + e.field : ''}</div>
            <div class="timeline-date"><i class="fas fa-calendar-alt"></i> ${formatDate(e.start_date)} — ${e.end_date ? formatDate(e.end_date) : 'Present'}</div>
          </div>
        </div>
        ${e.description ? `<div class="timeline-desc">${escapeHtml(e.description)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function renderExperience(experience) {
  const timeline = document.getElementById('experienceTimeline');
  if (!experience || !experience.length) { document.getElementById('experience').style.display = 'none'; return; }
  timeline.innerHTML = experience.map(e => `
    <div class="timeline-item reveal">
      <div class="timeline-dot"></div>
      <div class="timeline-card">
        <div class="timeline-header">
          <div class="timeline-icon"><i class="fas fa-briefcase"></i></div>
          <div>
            <div class="timeline-title">${escapeHtml(e.company)}${e.current ? '<span class="current-badge">Current</span>' : ''}</div>
            <div class="timeline-sub">${escapeHtml(e.position || '')}</div>
            <div class="timeline-date"><i class="fas fa-calendar-alt"></i> ${formatDate(e.start_date)} — ${e.current ? 'Present' : formatDate(e.end_date)}</div>
          </div>
        </div>
        ${e.description ? `<div class="timeline-desc">${escapeHtml(e.description)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function renderCertifications(certs) {
  const grid = document.getElementById('certsGrid');
  if (!certs || !certs.length) { document.getElementById('certifications').style.display = 'none'; return; }
  grid.innerHTML = certs.map(c => `
    <div class="cert-card reveal">
      <div class="cert-icon"><i class="fas fa-certificate"></i></div>
      <div>
        <div class="cert-name">${escapeHtml(c.name)}</div>
        <div class="cert-issuer">${escapeHtml(c.issuer || '')}</div>
        <div class="cert-date"><i class="fas fa-calendar"></i> ${formatDate(c.date)}</div>
        ${c.credential_url ? `<a href="${escapeHtml(c.credential_url)}" target="_blank" rel="noopener" class="cert-link"><i class="fas fa-arrow-up-right-from-square"></i> View Credential</a>` : ''}
      </div>
    </div>
  `).join('');
}

function renderLanguages(languages) {
  const grid = document.getElementById('langsGrid');
  if (!languages || !languages.length) { document.getElementById('languages').style.display = 'none'; return; }
  grid.innerHTML = languages.map(l => `
    <div class="lang-badge reveal">
      <div class="lang-icon"><i class="fas fa-language"></i></div>
      <div class="lang-name">${escapeHtml(l.name)}</div>
      <span class="lang-level">${escapeHtml(l.proficiency || '')}</span>
    </div>
  `).join('');
}

function renderInterests(interests) {
  const grid = document.getElementById('interestsGrid');
  if (!interests || !interests.length) { document.getElementById('interests').style.display = 'none'; return; }
  grid.innerHTML = interests.map(i => `
    <div class="interest-item reveal">
      <span class="interest-icon">${renderIcon(i.icon, 'fas fa-heart')}</span>
      <span class="interest-name">${escapeHtml(i.name)}</span>
    </div>
  `).join('');
}

function renderAchievements(achievements) {
  const grid = document.getElementById('achievementsGrid');
  if (!achievements || !achievements.length) { document.getElementById('achievements').style.display = 'none'; return; }
  grid.innerHTML = achievements.map(a => `
    <div class="achievement-card reveal">
      <div class="achievement-icon">${renderIcon(a.icon, 'fas fa-trophy')}</div>
      <div class="achievement-title">${escapeHtml(a.title)}</div>
      <div class="achievement-desc">${escapeHtml(a.description || '')}</div>
      <div class="achievement-meta">
        ${a.date ? `<span class="achievement-tag"><i class="fas fa-calendar"></i> ${formatDate(a.date)}</span>` : ''}
        ${a.category ? `<span class="achievement-tag">${escapeHtml(a.category)}</span>` : ''}
        ${a.link ? `<a href="${escapeHtml(a.link)}" target="_blank" rel="noopener" class="achievement-tag" style="text-decoration:none"><i class="fas fa-link"></i> View</a>` : ''}
      </div>
    </div>
  `).join('');
}

function renderContact(portfolio) {
  const info = document.getElementById('contactInfo');
  const p = portfolio || {};
  const items = [
    { icon: 'fas fa-envelope',     label: 'Email',    value: p.email,    href: p.email    ? 'mailto:' + p.email : null },
    { icon: 'fas fa-phone',        label: 'Phone',    value: p.phone,    href: p.phone    ? 'tel:' + p.phone : null },
    { icon: 'fas fa-location-dot', label: 'Location', value: p.location, href: null },
    { icon: 'fas fa-globe',        label: 'Website',  value: p.website,  href: p.website },
  ].filter(i => i.value);

  info.innerHTML = `<h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1.25rem;">Let's Connect</h3>` +
    items.map(i => `
    <div class="contact-item">
      <div class="contact-item-icon"><i class="${i.icon}"></i></div>
      <div>
        <div class="contact-item-label">${i.label}</div>
        <div class="contact-item-value">${i.href ? `<a href="${escapeHtml(i.href)}" target="_blank" rel="noopener">${escapeHtml(i.value)}</a>` : escapeHtml(i.value)}</div>
      </div>
    </div>
  `).join('');
}

function setupNavigation() {
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
    let current = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
    navLinks.forEach(l => {
      l.classList.remove('active');
      if (l.getAttribute('href') === '#' + current) l.classList.add('active');
    });
  }, { passive: true });

  navLinks.forEach(l => {
    l.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(l.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      document.getElementById('navLinks').classList.remove('open');
      document.getElementById('hamburger').classList.remove('open');
    });
  });
}

function setupMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
}

async function submitContact(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('submitBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  btn.disabled = true;
  const data = Object.fromEntries(new FormData(form));
  try {
    const res = await apiFetch('/papi/contact', { method: 'POST', body: JSON.stringify(data) });
    if (res.success) {
      showToast(res.message || 'Message sent!', 'success');
      form.reset();
    } else {
      showToast(res.error || 'Failed to send', 'error');
    }
  } catch {
    showToast('Connection error. Please try again.', 'error');
  }
  btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
  btn.disabled = false;
}

async function init() {
  const data = await fetchData();
  if (!data) return;
  applySettings(data.settings);
  renderHero(data);
  renderStats(data.stats);
  renderAbout(data);
  renderServices(data.services);
  renderSkills(data.skills);
  renderProjects(data.projects);
  renderEducation(data.education);
  renderExperience(data.experience);
  renderCertifications(data.certifications);
  renderLanguages(data.languages);
  renderInterests(data.interests);
  renderAchievements(data.achievements);
  renderContact(data.portfolio);
  document.getElementById('contactForm').addEventListener('submit', submitContact);
  setupNavigation();
  setupMobileMenu();
  initScrollReveal();
  initScrollProgress();
  setTimeout(() => animateSkillBars(), 600);
  if (data.settings && data.settings.cursor_enabled !== 0) initCursor();
}

document.addEventListener('DOMContentLoaded', init);
