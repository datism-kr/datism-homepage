document.documentElement.classList.add('js');

(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var revealTargets = document.querySelectorAll(
    '.tz-cards .card, .shots-grid img, .card-mini, .spec, .contact-card'
  );

  [document.querySelectorAll('.tz-cards .card'), document.querySelectorAll('.shots-grid img')]
    .forEach(function (group) {
      group.forEach(function (el, i) { el.style.transitionDelay = (i * 70) + 'ms'; });
    });

  revealTargets.forEach(function (el) { el.classList.add('reveal'); });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  }

  var heroText = document.querySelector('.hero-text');
  var heroArt = document.querySelector('.hero-art');
  if (heroText && heroArt) {
    heroText.classList.add('reveal-hero');
    heroArt.classList.add('reveal-hero');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        heroText.classList.add('is-visible');
        heroArt.classList.add('is-visible');
      });
    });
  }

  if (window.innerWidth >= 720 && heroArt) {
    var heroImg = heroArt.querySelector('img');
    var heroSection = document.getElementById('top');
    var ticking = false;
    var update = function () {
      ticking = false;
      var rect = heroSection.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      var offset = Math.max(-20, Math.min(20, window.scrollY * -0.05));
      heroImg.style.transform = 'translateY(' + offset + 'px)';
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  }
})();
