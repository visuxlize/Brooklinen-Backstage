/**
 * nav.js — Shared sidebar + topbar renderer
 *
 * Mirrors the real app's shell (components/layout/Sidebar.tsx +
 * components/layout/TopBar.tsx): sidebar is a store switcher, page
 * navigation lives in the topbar as tab pills. Sidebar is a binary
 * show/hide (not a rail) toggled by the hamburger, same as the real app.
 *
 * Each page calls: renderShell({ page, title, subtitle })
 */

const ICONS = {
  menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  users: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  mail: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z" stroke="none"/><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6 12 13 2 6"/></svg>`,
  sun: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
  moon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  logout: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function currentTheme() {
  return localStorage.getItem('backstage_theme') === 'dark' ? 'dark' : 'light'
}

function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark'
  localStorage.setItem('backstage_theme', next)
  applyTheme(next)
  const btn = document.getElementById('theme-toggle-label')
  const icon = document.getElementById('theme-toggle-icon')
  if (btn) btn.textContent = next === 'dark' ? 'Light mode' : 'Dark mode'
  if (icon) icon.innerHTML = next === 'dark' ? ICONS.sun.match(/<svg[^>]*>(.*)<\/svg>/s)[1] : ICONS.moon.match(/<svg[^>]*>(.*)<\/svg>/s)[1]
}

function isSidebarOpen() {
  const stored = sessionStorage.getItem('backstage_sidebar')
  if (stored !== null) return stored === 'open'
  return window.innerWidth >= 1024
}

function setSidebarOpen(open) {
  sessionStorage.setItem('backstage_sidebar', open ? 'open' : 'closed')
  const sidebar = document.querySelector('.sidebar')
  const main = document.querySelector('.main-content')
  if (sidebar) sidebar.classList.toggle('closed', !open)
  if (main) main.classList.toggle('sidebar-closed', !open)
}

function renderShell({ page, title, subtitle = '' }) {
  // Session guard: every page runs this on load
  if (sessionStorage.getItem('backstage_access') !== 'granted') {
    window.location.href = 'index.html'
    return
  }

  applyTheme(currentTheme())

  const shell = document.querySelector('.app-shell')
  if (!shell) return

  document.title = `Backstage — ${title}`

  const currentUser = { name: 'Andres R.', role: 'Store Leader' }
  const activeStore = STORES[0] // Lincoln Park

  const pendingCount = (typeof RTO_DATA !== 'undefined' && RTO_DATA.pending) ? RTO_DATA.pending.length : 0

  const storesHTML = STORES.map((store) => `
    <button class="store-item ${store.id === activeStore.id ? 'active' : ''}" ${store.id !== activeStore.id ? "onclick=\"showcaseToast('Switching stores is not available in showcase mode')\"" : ''}>
      <span class="store-dot" style="background:${store.color}"></span>
      <div class="store-item-info">
        <div class="store-item-name">${store.name}</div>
        <div class="store-item-city">${store.city}</div>
      </div>
      ${store.id === activeStore.id && pendingCount > 0 ? `<span class="store-pending-badge">${pendingCount > 9 ? '9+' : pendingCount}</span>` : ''}
    </button>
  `).join('')

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
    { id: 'schedule',  label: 'Schedule',  href: 'schedule.html' },
    { id: 'ops',       label: 'Daily Ops', href: '#' },
    { id: 'availability', label: 'Availability', href: '#' },
    { id: 'traffic',   label: 'Traffic',   href: 'traffic.html' },
    { id: 'rto',       label: 'RTO',       href: 'rto.html', badge: pendingCount },
  ]

  const tabsHTML = tabs.map((tab) => {
    const active = tab.id === page
    const disabled = tab.href === '#'
    return `
      <a href="${tab.href}" class="topbar-tab ${active ? 'active' : ''}"
         ${disabled ? `onclick="showcaseToast('Not included in this showcase'); return false" title="Not in showcase"` : ''}>
        ${tab.label}
        ${tab.badge ? `<span class="tab-badge">${tab.badge > 9 ? '9+' : tab.badge}</span>` : ''}
      </a>
    `
  }).join('')

  shell.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-inner">
        <div class="sidebar-header">
          <div class="sidebar-logo">Brooklinen</div>
          <div class="sidebar-app-name">Backstage</div>
        </div>

        <div class="sidebar-user">
          <div class="avatar avatar-sm" style="background:${activeStore.color}">${getInitials(currentUser.name)}</div>
          <div class="min-w-0">
            <div class="sidebar-user-name truncate">${currentUser.name}</div>
            <div class="sidebar-user-role">${currentUser.role}</div>
          </div>
        </div>

        <div class="sidebar-search">
          <div class="sidebar-search-wrap">
            <span class="sidebar-search-icon">${ICONS.search}</span>
            <input type="text" placeholder="Search stores..." onclick="showcaseToast('Search is disabled in showcase mode')" readonly>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="sidebar-nav-label">Stores</div>
          ${storesHTML}
        </nav>

        <div class="sidebar-mgmt">
          <div class="sidebar-nav-label">Management</div>
          <button class="mgmt-link" onclick="showcaseToast('Not included in this showcase')">
            ${ICONS.users}
            User Management
          </button>
          <button class="mgmt-link" onclick="showcaseToast('Not included in this showcase')">
            ${ICONS.mail}
            Email templates
          </button>
        </div>

        <div class="sidebar-footer-divider">
          <button class="sidebar-footer-btn" onclick="toggleTheme()">
            <span id="theme-toggle-icon">${currentTheme() === 'dark' ? ICONS.sun : ICONS.moon}</span>
            <span id="theme-toggle-label">${currentTheme() === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button class="sidebar-footer-btn" onclick="window.location.href='index.html'; sessionStorage.removeItem('backstage_access')">
            ${ICONS.logout}
            Sign out
          </button>
        </div>
      </div>
    </aside>

    <div class="main-content">
      <header class="topbar">
        <button class="topbar-icon-btn" onclick="setSidebarOpen(document.querySelector('.sidebar').classList.contains('closed'))">
          ${ICONS.menu}
        </button>
        <div class="topbar-logo hide-mobile">Brooklinen</div>
        <div class="topbar-store">
          <span class="store-dot" style="background:${activeStore.color}"></span>
          <span class="topbar-store-name">${activeStore.name}</span>
          <span class="topbar-store-sep md-show">&middot;</span>
          <span class="topbar-store-city md-show">${activeStore.city}</span>
        </div>
        <nav class="topbar-tabs">${tabsHTML}</nav>
        <div class="topbar-right">
          <span class="chip chip-amber chip-sm">Showcase</span>
          <div class="avatar-menu-wrap">
            <button class="avatar-btn" onclick="document.getElementById('avatar-menu').classList.toggle('open')">
              <div class="avatar avatar-sm" style="background:${activeStore.color}">${getInitials(currentUser.name)}</div>
              <span class="avatar-btn-name">${currentUser.name.split(' ')[0]}</span>
              ${ICONS.chevron}
            </button>
            <div class="avatar-menu" id="avatar-menu">
              <div class="avatar-menu-item" onclick="showcaseToast('Not included in this showcase')">
                ${ICONS.user}
                My Settings
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="page-body" id="page-content"></div>
    </div>
  `

  shell.classList.add('visible')
  setSidebarOpen(isSidebarOpen())

  // Close avatar menu on outside click
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.avatar-menu-wrap')
    const menu = document.getElementById('avatar-menu')
    if (wrap && menu && !wrap.contains(e.target)) menu.classList.remove('open')
  })

  return document.getElementById('page-content')
}

/**
 * showcaseToast — small non-blocking notice used across pages for
 * actions that are non-functional/disabled in this static demo.
 */
function showcaseToast(message) {
  let toast = document.getElementById('showcase-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'showcase-toast'
    toast.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:999;
      background:var(--brand-navy);color:white;font-size:13px;font-weight:500;
      padding:12px 18px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.25);
      opacity:0;transform:translateY(8px);transition:opacity 0.2s,transform 0.2s;
      pointer-events:none;max-width:320px;
    `
    document.body.appendChild(toast)
  }
  toast.textContent = message
  toast.style.opacity = '1'
  toast.style.transform = 'translateY(0)'
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(8px)'
  }, 2600)
}
