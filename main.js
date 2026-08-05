document.documentElement.classList.add('js');

/* ============================================================
   1) 인트로 시퀀스
   A→Analyze · B→Build · C→Craft · D→Datism(+마크) → 록업 → 상단바 인계.

   재생 조건은 <head>의 게이트 스크립트가 이미 판정해 html.intro-on으로
   넘겨준다(세션 1회 · 모션 감소 제외). 여기서는 재생만 한다.
   ============================================================ */
(function () {
  var html = document.documentElement;
  var intro = document.getElementById('intro');
  var done = false;
  var doneCallbacks = [];

  function onIntroDone(fn) { done ? fn() : doneCallbacks.push(fn); }
  function fireDone() {
    if (done) return;
    done = true;
    html.classList.remove('intro-on');
    try { sessionStorage.setItem('dtm-intro', '1'); } catch (e) {}
    doneCallbacks.forEach(function (fn) { fn(); });
  }

  if (!intro || !html.classList.contains('intro-on')) {
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    html.classList.remove('intro-on');
    fireDone();
  } else {
    play();
  }

  /* 페이지 리빌은 인트로가 끝난 뒤에 시작한다 — 그래야 본문이 "도착"하는 것처럼 보인다 */
  window.dtmAfterIntro = onIntroDone;

  function play() {
    var beatEl = document.getElementById('intro-beat');
    var leadEl = document.getElementById('intro-lead');
    var restEl = document.getElementById('intro-rest');
    var markEl = document.getElementById('intro-mark');
    var finalEl = document.getElementById('intro-final');
    var lockupEl = document.getElementById('intro-lockup');
    var railEl = document.getElementById('intro-rail-fill');
    var skipEl = document.getElementById('intro-skip');
    var topWordmark = document.querySelector('.topbar .wordmark');
    var topMark = document.querySelector('.wordmark-mark');

    /* 마크 SVG는 상단바 것을 복제해 쓴다 — 같은 path를 파일에 세 번 적지 않기 위해 */
    if (topMark) {
      var m1 = topMark.cloneNode(true);
      m1.removeAttribute('class'); m1.removeAttribute('width'); m1.removeAttribute('height');
      m1.style.marginRight = '0.14em';
      markEl.appendChild(m1);
      var m2 = topMark.cloneNode(true);
      m2.removeAttribute('class'); m2.removeAttribute('width'); m2.removeAttribute('height');
      lockupEl.insertBefore(m2, lockupEl.firstChild);
    }

    var BEATS = [['A', 'nalyze'], ['B', 'uild'], ['C', 'raft'], ['D', 'atism']];

    /* 한곳에서 조율하는 타임라인(ms). 총 재생 ≈ 2.9초.
       A·B·C 한 비트 안의 배치: 0 머리글자 진입 → 100 단어 열림(220) → 320 다 열림
       → 390 물러남 시작(130) → 520 다음 비트. 70ms 정지 구간이 있어야 단어가 읽힌다. */
    var T = {
      beat: 520,      // A·B·C 한 비트 간격
      leadIn: 190,    // 머리글자 진입
      writeAt: 100,   // 비트 시작 → 단어가 열리기 시작
      write: 220,     // 단어가 열리는 시간
      exitAt: 130,    // 다음 비트 시작 몇 ms 전에 물러나기 시작하는가
      exit: 130,
      markAt: 380,    // D 비트 시작 → 마크 진입
      mark: 280,
      beat4: 760,     // D 비트 총 길이
      settle: 320,    // 록업 수렴
      handoff: 300    // 상단바 인계
    };

    /* ?slow / ?slow=8 — 모션 검수용 배속 저하. 모션은 정지 화면으로 못 고치므로
       한 비트씩 눈으로 확인할 수단을 남겨둔다. 값이 없으면 등배속. */
    var slow = parseFloat((location.search.match(/[?&]slow(?:=(\d+))?/) || [])[1] || 0)
            || (/[?&]slow/.test(location.search) ? 5 : 1);
    if (slow !== 1) {
      for (var k in T) T[k] *= slow;
      intro.style.animation = 'none';   /* 6초 안전망이 배속 검수를 잘라먹지 않게 */
    }

    var EASE_OUT = 'cubic-bezier(0.16, 0.84, 0.28, 1)';   // 진입 — 앞이 빠른 편이 또렷하다
    var EASE_IN = 'cubic-bezier(0.7, 0, 0.84, 0)';
    /* 단어가 열리는 곡선만 따로 둔다. EASE_OUT을 쓰면 시간의 6%에서 폭의 47%가 나와
       "써지는" 게 아니라 튀어나오는 것처럼 보인다. easeOutCubic 정도가 타이핑에 가깝다. */
    var EASE_WRITE = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
    var timers = [];
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function clearAll() { timers.forEach(clearTimeout); timers = []; }

    /* 폰트가 들어오기 전에 재면 글자 폭이 틀려 뒷글자가 잘린다.
       다만 CDN이 느릴 때 인트로가 인질이 되면 안 되므로 800ms에서 끊는다. */
    var fontsReady = (document.fonts && document.fonts.ready)
      ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 800); })])
      : Promise.resolve();

    fontsReady.then(start);

    function start() {
      if (done) return;
      BEATS.forEach(function (b, i) {
        var t0 = i * T.beat;
        if (i > 0) at(t0 - T.exitAt, function () { retreat(); });
        at(t0, function () { enter(b[0], b[1], i); });
        at(t0 + T.writeAt, function () { openWord(); });
      });

      var t4 = 3 * T.beat;
      at(t4 + T.markAt, revealMark);
      at(t4 + T.beat4, settle);
      at(t4 + T.beat4 + T.settle, handoff);
      at(t4 + T.beat4 + T.settle + T.handoff, finish);
    }

    function enter(lead, rest, i) {
      leadEl.textContent = lead;
      restEl.textContent = rest;
      restEl.style.transition = 'none';
      restEl.style.width = '0px';
      leadEl.style.transition = 'none';
      leadEl.style.transform = 'translateY(0.2em)';
      leadEl.style.opacity = '0';
      void leadEl.offsetWidth;                       /* 리플로 강제 — 없으면 위 상태가 무시된다 */
      leadEl.style.transition = 'transform ' + T.leadIn + 'ms ' + EASE_OUT +
                                ', opacity ' + (T.leadIn - 40) + 'ms ease-out';
      leadEl.style.transform = 'translateY(0)';
      leadEl.style.opacity = '1';
      railEl.style.transform = 'scaleX(' + ((i + 1) / BEATS.length) + ')';
    }

    function openWord() {
      restEl.style.transition = 'width ' + T.write + 'ms ' + EASE_WRITE;
      restEl.style.width = restEl.scrollWidth + 'px';
    }

    function retreat() {
      restEl.style.transition = 'width ' + T.exit + 'ms ' + EASE_IN;
      restEl.style.width = '0px';
      leadEl.style.transition = 'transform ' + T.exit + 'ms ' + EASE_IN +
                                ', opacity ' + T.exit + 'ms ease-in';
      leadEl.style.transform = 'translateY(-0.18em)';
      leadEl.style.opacity = '0';
    }

    /* D가 다 써진 뒤 마크가 왼쪽에서 밀고 들어와 록업이 완성된다 —
       A·B·C는 태그라인의 머리글자지만 D는 로고 그 자체라는 게 이 비트의 요지다. */
    function revealMark() {
      markEl.style.transition = 'width ' + T.mark + 'ms ' + EASE_OUT +
                                ', opacity ' + (T.mark - 60) + 'ms ease-out';
      markEl.style.width = markEl.scrollWidth + 'px';
      markEl.style.opacity = '1';
    }

    function settle() {
      beatEl.style.transition = 'opacity ' + (T.settle - 120) + 'ms ease-in, transform ' + T.settle + 'ms ' + EASE_IN;
      beatEl.style.opacity = '0';
      beatEl.style.transform = 'scale(0.95)';
      finalEl.style.transition = 'opacity ' + T.settle + 'ms ease-out, transform ' + T.settle + 'ms ' + EASE_OUT;
      finalEl.style.opacity = '1';
      finalEl.style.transform = 'scale(1)';
      /* 세 단어가 다시 모이는 느낌 — 순서대로 80ms씩 */
      var words = finalEl.querySelectorAll('.intro-tag span');
      Array.prototype.forEach.call(words, function (w, i) {
        w.style.transition = 'opacity 260ms ease-out ' + (60 + i * 80) + 'ms';
        w.style.opacity = '1';
      });
      railEl.parentNode.style.transition = 'opacity 240ms ease-out';
      railEl.parentNode.style.opacity = '0';
      skipEl.style.transition = 'opacity 200ms ease-out';
      skipEl.style.opacity = '0';
    }

    /* 록업이 그대로 상단바 워드마크 자리로 축소·이동한다 — 인트로가 페이지의 일부가 된다 */
    function handoff() {
      /* 오버레이가 걷히는 속도를 록업이 날아가는 속도와 같이 묶는다(배속 검수에서도 어긋나지 않게) */
      intro.style.transition = 'opacity ' + T.handoff + 'ms ease-out';
      intro.style.opacity = '0';
      finalEl.querySelector('.intro-tag').style.opacity = '0';
      if (topWordmark) {
        var a = lockupEl.getBoundingClientRect();
        var b = topWordmark.getBoundingClientRect();
        if (a.width > 0 && b.width > 0) {
          var s = b.width / a.width;
          var dx = (b.left + b.width / 2) - (a.left + a.width / 2);
          var dy = (b.top + b.height / 2) - (a.top + a.height / 2);
          lockupEl.style.transition = 'transform ' + T.handoff + 'ms cubic-bezier(0.62, 0, 0.2, 1)';
          lockupEl.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
        }
      }
      doneCallbacks.forEach(function (fn) { fn(); });   /* 본문 리빌은 인트로가 물러나는 동안 겹쳐서 시작 */
      doneCallbacks = [];
    }

    function finish() {
      clearAll();
      if (intro.parentNode) intro.parentNode.removeChild(intro);
      fireDone();
    }

    /* 건너뛰기 — 클릭·키·스크롤·터치 어느 것이든 즉시 끝낸다 */
    function skip() {
      clearAll();
      intro.style.transition = 'opacity 180ms ease-out';
      intro.style.opacity = '0';
      html.classList.remove('intro-on');
      setTimeout(function () { if (intro.parentNode) intro.parentNode.removeChild(intro); }, 200);
      fireDone();
    }
    skipEl.addEventListener('click', skip);
    intro.addEventListener('click', skip);
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('wheel', skip, { once: true, passive: true });
    window.addEventListener('touchstart', skip, { once: true, passive: true });
  }
})();

/* ============================================================
   2) 인터랙션 레이어 — 스크롤 리빌 · 히어로 진입 · 미세 패럴랙스
   ============================================================ */
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
    /* 히어로 이미지는 이 페이지의 LCP 요소다. 인트로가 도는 동안 opacity:0으로 숨기면
       LCP가 인트로 길이(≈2.9초)만큼 통째로 밀린다 — Core Web Vitals에 그대로 잡힌다.
       오버레이가 이미 화면을 덮고 있어 숨길 이유도 없으므로, 인트로가 도는 판에서는
       이미지를 그냥 칠하게 두고 텍스트만 올린다. 인트로가 없을 때는 종전대로 둘 다. */
    var introPlaying = document.documentElement.classList.contains('intro-on');
    heroText.classList.add('reveal-hero');
    if (!introPlaying) heroArt.classList.add('reveal-hero');
    /* 인트로가 있으면 그것이 물러나는 순간에 맞춰 올라온다 */
    (window.dtmAfterIntro || function (fn) { fn(); })(function () {
      /* rAF 두 번은 .reveal-hero(숨김)와 .is-visible(보임)이 같은 프레임에 붙어
         트랜지션이 통째로 생략되는 걸 막는 장치다. 인트로 경로에서는 숨김 상태가 이미
         몇 초 전에 커밋됐으므로 필요 없고, 오히려 위험하다 — 배경 탭에서는 rAF가 돌지
         않아 본문이 보이지 않는 채로 남는다. 그래서 그때는 바로 붙인다. */
      if (introPlaying) {
        heroText.classList.add('is-visible');
        heroArt.classList.add('is-visible');
        return;
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          heroText.classList.add('is-visible');
          heroArt.classList.add('is-visible');
        });
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
