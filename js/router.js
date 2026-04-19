export function initRouter(onNavigate) {
  function handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const page = hash === '/' ? 'dashboard' : hash.slice(1);

    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    onNavigate(page);
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

export function navigate(page) {
  window.location.hash = page === 'dashboard' ? '/' : `/${page}`;
}
