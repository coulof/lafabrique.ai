// Theme rotation for LaFabrique.AI
// Changes theme on each page reload within a session

(function() {
  const themes = ['blue', 'red', 'yellow'];

  function getRandomTheme() {
    const index = Math.floor(Math.random() * themes.length);
    return themes[index];
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function initTheme() {
    // Check if we should rotate theme (on page load)
    const lastTheme = sessionStorage.getItem('lafabrique-theme');
    let newTheme;

    if (lastTheme) {
      // Get a different theme from the current one
      const availableThemes = themes.filter(t => t !== lastTheme);
      const index = Math.floor(Math.random() * availableThemes.length);
      newTheme = availableThemes[index];
    } else {
      newTheme = getRandomTheme();
    }

    sessionStorage.setItem('lafabrique-theme', newTheme);
    applyTheme(newTheme);
  }

  // Apply theme as soon as possible to prevent flash
  if (document.readyState === 'loading') {
    // Apply immediately if DOM not ready
    const savedTheme = sessionStorage.getItem('lafabrique-theme');
    if (savedTheme) {
      applyTheme(savedTheme);
    }
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
