// Theme-of-the-week system for LaFabrique.AI
// Reads theme-config.json (updated weekly by cron) and rotates between 3 color variants per reload.

(function() {
  var CONFIG_URL = '/assets/theme-config.json';

  // Fallback theme if config fails to load
  var FALLBACK = {
    name: 'Cool',
    colors: [
      { name: 'indigo', hex: '#5c6bc0', accent: '#3949ab' },
      { name: 'teal',   hex: '#26a69a', accent: '#00897b' },
      { name: 'slate',  hex: '#78909c', accent: '#455a64' }
    ],
    banners: ['indigo-woman.png', 'emerald-man.png', 'slate-woman.png']
  };

  function applyTheme(theme, colorIndex) {
    var root = document.documentElement;
    var color = theme.colors[colorIndex];

    root.style.setProperty('--md-primary-fg-color', color.hex);
    root.style.setProperty('--md-accent-fg-color', color.accent);
    root.style.setProperty('--md-primary-fg-color--light', color.hex + '1a');
    root.style.setProperty('--md-primary-fg-color--dark', color.accent);

    // Set data attributes for CSS banner selection
    root.setAttribute('data-theme-index', colorIndex);
    root.setAttribute('data-theme-name', theme.name);

    // Show correct banner image
    var banners = document.querySelectorAll('.mdx-hero__banner');
    banners.forEach(function(img, i) {
      img.style.opacity = (i === colorIndex) ? '1' : '0';
    });

    // Update site title with theme name + icon
    var icon = theme.icon || '🎨';
    var titleText = 'LAFABRIQUE.AI — ' + theme.name + ' week ' + icon;
    document.title = titleText;

    // Update header title if present
    var headerTitle = document.querySelector('.md-header__topic .md-ellipsis');
    if (headerTitle) {
      headerTitle.textContent = titleText;
    }
  }

  function pickColorIndex(theme) {
    var lastIndex = parseInt(sessionStorage.getItem('lafabrique-color-index'), 10);
    var newIndex;
    if (!isNaN(lastIndex) && theme.colors.length > 1) {
      // Pick a different color each reload
      do {
        newIndex = Math.floor(Math.random() * theme.colors.length);
      } while (newIndex === lastIndex);
    } else {
      newIndex = Math.floor(Math.random() * theme.colors.length);
    }
    sessionStorage.setItem('lafabrique-color-index', newIndex);
    return newIndex;
  }

  function setBannerSources(theme) {
    var banners = document.querySelectorAll('.mdx-hero__banner');
    if (theme.banners && theme.banners.length >= 3) {
      banners.forEach(function(img, i) {
        if (theme.banners[i]) {
          img.src = 'assets/images/banner/' + theme.banners[i];
        }
      });
    }
  }

  function init(theme) {
    var colorIndex = pickColorIndex(theme);
    setBannerSources(theme);
    applyTheme(theme, colorIndex);
  }

  // Try loading config, fallback on error
  fetch(CONFIG_URL)
    .then(function(r) { return r.json(); })
    .then(function(config) {
      var theme = config.active || FALLBACK;
      init(theme);
    })
    .catch(function() {
      init(FALLBACK);
    });
})();
