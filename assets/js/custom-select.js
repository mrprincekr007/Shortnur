// ============================================================
// LINK BABA - Custom Select dropdown (reusable widget)
// Works alongside a hidden native <select> so existing
// change listeners keep working untouched.
// ============================================================

document.querySelectorAll('.cselect').forEach((cs) => {
  const trigger = cs.querySelector('.cselect-trigger');
  const menu = cs.querySelector('.cselect-menu');
  const native = cs.querySelector('select.cselect-native');
  const valueEl = cs.querySelector('.cselect-value');
  if (!trigger || !menu || !native) return;

  function sync() {
    const val = native.value;
    const opt = native.querySelector('option[value="' + val + '"]');
    valueEl.textContent = opt ? opt.textContent : (native.options[native.selectedIndex] ? native.options[native.selectedIndex].textContent : '');
    menu.querySelectorAll('.cselect-option').forEach((o) => {
      const isSel = o.dataset.value === val;
      o.classList.toggle('selected', isSel);
      o.setAttribute('aria-selected', isSel ? 'true' : 'false');
    });
  }

  function setOpen(open) {
    cs.classList.toggle('open', open);
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!cs.classList.contains('open'));
  });

  menu.querySelectorAll('.cselect-option').forEach((o) => {
    o.addEventListener('click', (e) => {
      e.stopPropagation();
      native.value = o.dataset.value;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      sync();
      setOpen(false);
    });
  });

  document.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  sync();
});
