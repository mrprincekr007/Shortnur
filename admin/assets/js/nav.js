// ============================================================
// Shortnur Admin - Sidebar dropdown toggle
// ============================================================
(function () {
  document.querySelectorAll('.sidebar-nav .nav-group').forEach(function (group) {
    var toggle = group.querySelector('.nav-dropdown-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      group.classList.toggle('open');
    });
  });

  var activeSub = document.querySelector('.sidebar-nav .nav-dropdown .nav-link.active');
  if (activeSub) {
    var group = activeSub.closest('.nav-group');
    if (group) group.classList.add('open');
  }
})();

// Guarantee animation replays on every visit (incl. back/forward cache)
window.addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });
