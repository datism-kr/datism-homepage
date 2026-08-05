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

  /* 씬 안쪽에는 리빌을 걸지 않는다 — 스크롤 진행률이 이미 연출을 몰고 있어 서로 겹친다.
     남는 건 크림 면의 일반 섹션(연혁·지원 카드)뿐이다. */
  var revealTargets = document.querySelectorAll('.spec, .contact-card');

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

/* ============================================================
   3) 스크롤 씬 엔진 — 한 화면 = 한 정보

   .scene은 뷰포트보다 길고, 그 안의 .scene-stage가 sticky로 붙어 있는다.
   섹션 안에서의 진행률 p(0→1)를 --p로 흘려 넣고, 씬별 연출을 그 위에 얹는다.

   시작 상태를 만드는 건 전부 이 파일이다. CSS 기본값은 "끝난 상태"라서,
   여기가 안 돌면 씬은 그냥 읽히는 섹션이 된다(크롤러·모션 감소·JS 미작동).
   ============================================================ */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var scenes = [].slice.call(document.querySelectorAll('.scene'));
  if (!scenes.length) return;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* ── 씬 1 · 지워진 기록 ────────────────────────────
     문단을 어절로 쪼개 각 어절에 막대(.rd-b)를 덧씌운다. 원문은 그대로 남으므로
     검색엔진·스크린리더가 보는 문장은 바뀌지 않는다.
     흩어지는 좌표는 난수가 아니라 황금각으로 뽑는다 — 새로고침마다 배치가 달라지면
     같은 페이지가 매번 다른 물건처럼 보인다. */
  var redactWords = [];
  (function buildRedact() {
    var p = document.getElementById('redact');
    if (!p) return;
    var words = p.textContent.trim().split(/\s+/);
    p.textContent = '';
    words.forEach(function (w, i) {
      var span = document.createElement('span');
      span.className = 'rd';
      var txt = document.createElement('span');
      txt.className = 'rd-t';
      txt.textContent = w;
      var bar = document.createElement('i');
      bar.className = 'rd-b';
      bar.setAttribute('aria-hidden', 'true');
      span.appendChild(txt);
      span.appendChild(bar);
      p.appendChild(span);
      if (i < words.length - 1) p.appendChild(document.createTextNode(' '));

      var a = i * 2.399963;                       // 황금각 — 고르게 흩어진다
      redactWords.push({
        el: span, bar: bar, txt: txt,
        dx: Math.cos(a) * (36 + (i * 37) % 78),
        dy: Math.sin(a) * (26 + (i * 53) % 62),
        rot: ((i % 7) - 3) * 3.2,
        lag: (i % 11) / 11 * 0.26                 // 어절마다 조금씩 늦게 도착
      });
    });
  })();

  function drawRedact(p) {
    for (var i = 0; i < redactWords.length; i++) {
      var w = redactWords[i];
      var gather = easeOutCubic(clamp01((p - w.lag) / 0.42));
      var back = 1 - gather;
      w.el.style.transform = 'translate(' + (w.dx * back).toFixed(2) + 'px,' +
        (w.dy * back).toFixed(2) + 'px) rotate(' + (w.rot * back).toFixed(2) + 'deg)';
      /* 자리를 다 잡은 뒤에야 글자가 나온다 — 겹치면 둘 다 안 읽힌다.
         어절 i의 모임은 lag+0.42에 끝나고 풀림은 0.56+lag*0.55에 시작하므로, lag가 가장 큰
         어절(0.236)까지도 모임이 먼저 끝난다. 풀림은 늦어도 p=0.97에 완료된다. */
      var solve = clamp01((p - 0.56 - w.lag * 0.55) / 0.28);
      w.bar.style.opacity = (1 - solve).toFixed(3);
      w.txt.style.opacity = solve.toFixed(3);
    }
  }

  /* ── 씬 2 · 흐린 플레이 화면 3장 교차 ── */
  var bgImgs = [].slice.call(document.querySelectorAll('#tamsadae-z .scene-bg img'));
  function drawShots(p) {
    if (!bgImgs.length) return;
    var n = bgImgs.length;
    var pos = clamp01(p) * (n - 1);          // 0 → n-1
    for (var i = 0; i < n; i++) {
      var d = Math.abs(pos - i);
      bgImgs[i].style.opacity = (d >= 1 ? 0 : 1 - d).toFixed(3);
    }
  }

  /* ── 씬 3 · 분기 무게 이동 ──
     0.3~0.7 구간에서만 옮긴다. 씬 진입·이탈에서 이미 움직이고 있으면
     "내가 옮기고 있다"는 느낌이 사라진다. */
  var branch = document.getElementById('branch');
  function drawBranch(p) {
    if (!branch) return;
    branch.style.setProperty('--w', clamp01((p - 0.3) / 0.4).toFixed(3));
  }

  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    for (var i = 0; i < scenes.length; i++) {
      var s = scenes[i];
      var r = s.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;   // 화면 근처가 아니면 건너뛴다
      var span = s.offsetHeight - vh;
      var p = span > 0 ? clamp01(-r.top / span) : (r.top < 0 ? 1 : 0);
      s.style.setProperty('--p', p.toFixed(4));
      if (s.id === 'record') drawRedact(p);
      else if (s.id === 'tamsadae-z') drawShots(p);
      else if (s.id === 'branch') drawBranch(p);
    }
  }
  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  /* 배경 탭에서는 rAF가 멈춘다. 그 사이 브라우저가 스크롤 위치를 복원해 두면
     다시 보일 때까지 씬이 옛 진행률에 머문다 — 보일 때 한 번 다시 계산한다. */
  document.addEventListener('visibilitychange', request);
  window.addEventListener('load', request);
  update();
})();
