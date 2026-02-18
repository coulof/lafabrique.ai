// Theme rotation for LaFabrique.AI
// Rotates between 6 color themes × 2 character variants on each page reload

(function() {
  var themes = ['indigo', 'amber', 'emerald', 'crimson', 'noir', 'slate'];
  var genders = ['woman', 'man'];
  var colors = {
    indigo:  { primary: '#5c6bc0', accent: '#3949ab' },
    amber:   { primary: '#ff8f00', accent: '#e65100' },
    emerald: { primary: '#26a69a', accent: '#00897b' },
    crimson: { primary: '#ec407a', accent: '#c62828' },
    noir:    { primary: '#78909c', accent: '#546e7a' },
    slate:   { primary: '#78909c', accent: '#455a64' }
  };

  function applyTheme(theme, gender) {
    var root = document.documentElement;
    var color = colors[theme];

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-gender', gender);
    root.style.setProperty('--md-primary-fg-color', color.primary);
    root.style.setProperty('--md-accent-fg-color', color.accent);
    root.style.setProperty('--md-primary-fg-color--light', color.primary + '1a');
    root.style.setProperty('--md-primary-fg-color--dark', color.accent);
  }

  function pickRandom(arr, exclude) {
    var available = arr.filter(function(t) { return t !== exclude; });
    return available[Math.floor(Math.random() * available.length)];
  }

  function initTheme() {
    var storedTheme = sessionStorage.getItem('lafabrique-theme');
    var theme, gender;

    if (storedTheme && colors[storedTheme]) {
      theme = pickRandom(themes, storedTheme);
    } else {
      theme = themes[Math.floor(Math.random() * themes.length)];
    }

    gender = genders[Math.floor(Math.random() * genders.length)];

    sessionStorage.setItem('lafabrique-theme', theme);
    applyTheme(theme, gender);
  }

  initTheme();
})();
