(function () {
  if (!window.BlockBannedSearch || !Array.isArray(BlockBannedSearch.terms)) return;

  const terms = BlockBannedSearch.terms
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // escape for regex

  if (!terms.length) return;

  // Build a single word-boundary regex, case-insensitive.
  // Using \b avoids catching substrings like "assistant" (vs "ass").
  const re = new RegExp('\\b(' + terms.join('|') + ')\\b', 'i');
  const msg = String(BlockBannedSearch.message || 'That search isn’t allowed.');

  // Find common search forms: Elementor, core, and generics.
  function getSearchForms() {
    const forms = new Set();
    document.querySelectorAll('form[role="search"], form.search-form, form.elementor-search-form, form[action][method="get"]').forEach(f => {
      // Heuristic: must have an input named "s" or a search input.
      if (f.querySelector('input[name="s"], input[type="search"]')) {
        forms.add(f);
      }
    });
    return Array.from(forms);
  }

  function ensureErrorNode(form) {
    let el = form.querySelector('.bbs-error');
    if (!el) {
      el = document.createElement('div');
      el.className = 'bbs-error';
      el.setAttribute('role', 'alert');
      el.setAttribute('aria-live', 'polite');
      // Place after the input if possible, else append to form.
      const input = form.querySelector('input[name="s"], input[type="search"]');
      if (input && input.parentNode) {
        input.parentNode.insertBefore(el, input.nextSibling);
      } else {
        form.appendChild(el);
      }
    }
    return el;
  }

  function clearError(form) {
    const el = form.querySelector('.bbs-error');
    if (el) el.textContent = '';
  }

  function hasBanned(text) {
    return re.test(text || '');
  }

  function handleSubmit(e) {
    const form = e.target;
    const input = form.querySelector('input[name="s"], input[type="search"]');
    if (!input) return;

    const value = (input.value || '').trim();
    if (hasBanned(value)) {
      e.preventDefault();
      const el = ensureErrorNode(form);
      el.textContent = msg;
      // Keep focus for accessibility
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      input.addEventListener('input', function onInput() {
        input.removeEventListener('input', onInput);
        input.removeAttribute('aria-invalid');
        clearError(form);
      });
    } else {
      clearError(form);
    }
  }

  function bind(form) {
    if (form.__bbsBound) return;
    form.addEventListener('submit', handleSubmit);
    form.__bbsBound = true;

    // Also intercept clicks on explicit submit buttons (Elementor’s icon button, etc.)
    form.querySelectorAll('button[type="submit"], input[type="submit"], .elementor-search-form__submit').forEach(btn => {
      if (btn.__bbsBound) return;
      btn.addEventListener('click', function (e) {
        // Let the submit handler run; nothing else needed here.
      });
      btn.__bbsBound = true;
    });
  }

  function init() {
    getSearchForms().forEach(bind);
  }

  // Initial bind
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();

  // Re-bind if Elementor or other JS injects headers dynamically
  const mo = new MutationObserver(() => init());
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
