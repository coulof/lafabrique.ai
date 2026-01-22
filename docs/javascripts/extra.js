// Theme rotation for LaFabrique.AI
// Rotates between blue, red, yellow themes on each page reload

(function() {
  var themes = ['blue', 'red', 'yellow'];
  var colors = {
    blue:   { primary: '#1976d2', accent: '#1565c0' },
    red:    { primary: '#e53935', accent: '#c62828' },
    yellow: { primary: '#f9a825', accent: '#f57f17' }
  };

  function applyTheme(theme) {
    var root = document.documentElement;
    var color = colors[theme];

    root.setAttribute('data-theme', theme);
    root.style.setProperty('--md-primary-fg-color', color.primary);
    root.style.setProperty('--md-accent-fg-color', color.accent);
    root.style.setProperty('--md-primary-fg-color--light', color.primary + '1a');
    root.style.setProperty('--md-primary-fg-color--dark', color.accent);
  }

  function getNextTheme(current) {
    var available = themes.filter(function(t) { return t !== current; });
    return available[Math.floor(Math.random() * available.length)];
  }

  function initTheme() {
    var stored = sessionStorage.getItem('lafabrique-theme');
    var theme;

    if (stored && colors[stored]) {
      // On reload, pick a different theme
      theme = getNextTheme(stored);
    } else {
      // First visit, pick random
      theme = themes[Math.floor(Math.random() * themes.length)];
    }

    sessionStorage.setItem('lafabrique-theme', theme);
    applyTheme(theme);
  }

  // Run immediately
  initTheme();
})();
