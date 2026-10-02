const pages = [
  { id: 'home', href: 'main.html', icon: '⌂', label: 'Inicio' },
  { id: 'alineaciones', href: 'index.html', icon: '▤', label: 'Alineaciones' },
  { id: 'plantillas', href: 'plantillas.html', icon: '♟', label: 'Plantillas' },
  { id: 'partidos', href: 'partidos.html', icon: '⚽', label: 'Partidos' },
  { id: 'estadisticas', href: 'stats.html', icon: '▥', label: 'Estadísticas' },
  { id: 'clasificacion', href: 'clasificacion.html', icon: '♛', label: 'Clasificación' }
];
const release = '20261002-j24-2';
const pageUrl = href => `${href}?v=${release}`;

class SliHeader extends HTMLElement {
  connectedCallback() {
    const current = document.body.dataset.page || '';
    this.innerHTML = `
      <header class="site-header">
        <div class="site-header-inner">
          <a class="site-brand" href="${pageUrl('main.html')}" aria-label="Liga SLI, inicio">
            <span class="site-brand-mark" aria-hidden="true">SLI</span>
            <span class="site-brand-copy"><strong>Liga SLI</strong><small>Liga virtual</small></span>
          </a>
          <nav class="site-nav" aria-label="Navegación principal">
            ${pages.map(page => `<a class="site-nav-link" href="${pageUrl(page.href)}" title="${page.label}" aria-label="${page.label}"${current === page.id ? ' aria-current="page"' : ''}>
              <span class="site-nav-icon" aria-hidden="true">${page.icon}</span><span class="site-nav-label">${page.label}</span>
            </a>`).join('')}
          </nav>
        </div>
      </header>`;
  }
}

if (!customElements.get('sli-header')) customElements.define('sli-header', SliHeader);
