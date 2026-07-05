/**
 * nav.js — Shared sidebar + topbar renderer
 *
 * Each page calls: renderShell({ page, title, subtitle })
 * This injects the sidebar and topbar into the .app-shell div,
 * then reveals it. It also enforces the session check -- if the
 * user somehow navigates directly to a page without the session
 * flag set, they get bounced back to the login gate.
 */

function renderShell({ page, title, subtitle = '' }) {
  // Session guard: every page runs this on load
  if (sessionStorage.getItem('backstage_access') !== 'granted') {
    window.location.href = 'index.html'
    return
  }

  const shell = document.querySelector('.app-shell')
  if (!shell) return

  // SVG icons as inline strings to avoid external deps
  const icons = {
    dashboard: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    schedule:  `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    rto:       `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><line x1="19" y1="8" x2="23" y2="8"/><line x1="21" y1="6" x2="21" y2="10"/></svg>`,
    traffic:   `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    ops:       `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    admin:     `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard',   href: 'dashboard.html', icon: icons.dashboard },
    { id: 'schedule',  label: 'Schedule',    href: 'schedule.html',  icon: icons.schedule  },
    { id: 'rto',       label: 'Time Off',    href: 'rto.html',       icon: icons.rto, badge: 3 },
    { id: 'traffic',   label: 'Traffic',     href: 'traffic.html',   icon: icons.traffic   },
    { id: 'ops',       label: 'Daily Ops',   href: '#',              icon: icons.ops       },
    { id: 'admin',     label: 'Admin',       href: '#',              icon: icons.admin     },
  ]

  const navHTML = navItems.map(item => `
    <a href="${item.href}"
       class="nav-item ${item.id === page ? 'active' : ''}"
       ${item.href === '#' ? 'onclick="return false" title="Not in showcase"' : ''}>
      ${item.icon}
      ${item.label}
      ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
    </a>
  `).join('')

  shell.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-name">Backstage</div>
        <div class="sidebar-brand-sub">Retail Ops Platform</div>
      </div>

      <div class="store-switcher">
        <div class="store-dot" style="background:#2E5B8A;">LP</div>
        <div>
          <div class="store-name">Lincoln Park</div>
          <div class="store-city">Chicago, IL</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">Operations</div>
        ${navHTML}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">AR</div>
          <div>
            <div class="user-name">Andres R.</div>
            <div class="user-role">Store Leader</div>
          </div>
        </div>
      </div>
    </aside>

    <div class="main-content">
      <header class="topbar">
        <div>
          <div class="topbar-title">${title}</div>
          ${subtitle ? `<div class="topbar-sub">${subtitle}</div>` : ''}
        </div>
        <div class="topbar-right">
          <span class="showcase-badge">Showcase Mode</span>
        </div>
      </header>

      <div class="page-body" id="page-content"></div>
    </div>
  `

  shell.classList.add('visible')

  // Return the content mount point for the page to fill
  return document.getElementById('page-content')
}
