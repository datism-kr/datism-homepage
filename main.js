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

  /* 인트로가 실제로 재생된 페이지에서만 "봤음"을 기록한다. 이 파일은 하위 페이지
     (/about·/careers)도 함께 쓰는데, 거기서 깃발을 세워버리면 그 뒤에 첫 화면으로
     들어온 사람이 인트로를 영영 못 본다. */
  var played = !!intro && html.classList.contains('intro-on');

  function onIntroDone(fn) { done ? fn() : doneCallbacks.push(fn); }
  function fireDone() {
    if (done) return;
    done = true;
    html.classList.remove('intro-on');
    if (played) { try { sessionStorage.setItem('dtm-intro', '1'); } catch (e) {} }
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
    var veilEl = document.getElementById('intro-veil');
    var skyEl = document.getElementById('intro-sky');

    /* 별밭은 첫 화면(#top)의 하늘을 그대로 복제한다 — 같은 자리에 같은 별이라야
       오버레이가 걷히는 순간에 하늘이 이어진 것처럼 보인다.
       스크롤로 움직이는 조준선·화살·별은 여기 있으면 안 되므로 떼어낸다. */
    var pageSky = document.querySelector('#top .aim-sky svg');
    if (pageSky && skyEl) {
      var skyClone = pageSky.cloneNode(true);
      ['aim-line', 'aim-arrow', 'aim-target', 'aim-burst'].forEach(function (id) {
        var n = skyClone.querySelector('#' + id);
        if (n) n.parentNode.removeChild(n);
      });
      skyClone.removeAttribute('id');
      skyEl.appendChild(skyClone);
    }

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

      /* 깊은 밤 → 별이 뜨며 인디고로. 첫 두 비트에 걸쳐 끝내야 "Datism"이 나올 때쯤
         하늘이 다 차 있고, 그 상태 그대로 페이지의 밤하늘로 넘어간다. */
      at(60, function () {
        if (veilEl) {
          veilEl.style.transition = 'opacity ' + (T.beat * 2) + 'ms ease-out';
          veilEl.style.opacity = '0';
        }
        if (skyEl) {
          skyEl.style.transition = 'opacity ' + (T.beat * 2.4) + 'ms ease-in';
          skyEl.style.opacity = '1';
        }
      });

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

  /* ── 씬 0 · 밤하늘 — 겨냥 → 발사 → 명중 → 파열 → 암전 ──
     로고(활에 화살을 건 D)의 뜻을 그대로 옮긴 자리다. 구간을 겹치지 않게 끊어야
     네 동작으로 읽힌다.
       0.00–0.30 조준선이 별까지 뻗는다
       0.32–0.52 화살이 선을 타고 날아간다
       0.50–0.60 스파클이 부풀었다가
       0.54–0.80 조각으로 터져 흩어진다
       0.74–1.00 화면이 먹빛으로 잠기며 다음 씬으로 넘어간다
     별이 바닥으로 떨어져 빛무리를 남기던 초판은 폐기했다 — 웅덩이가 화면을 지저분하게
     하고, 다음 씬으로 넘어가는 다리 역할은 암전이 더 깨끗하게 한다. */
  var VB_W = 1200, VB_H = 800;
  var AIM = { x0: 210, y0: 540, x1: 872, y1: 198, r: 26 };
  var aimLine = document.getElementById('aim-line');
  var aimArrow = document.getElementById('aim-arrow');
  var aimTarget = document.getElementById('aim-target');
  var aimBurst = document.getElementById('aim-burst');
  var shards = aimBurst ? [].slice.call(aimBurst.children) : [];
  var aimLen = 0, aimDeg = 0;

  function layoutAim() {
    var sky = document.querySelector('#top .aim-sky');
    var kick = document.querySelector('#top .aim-kicker');
    if (!sky || !kick) return;
    var w = sky.clientWidth, h = sky.clientHeight;
    if (!w || !h) return;

    /* 하늘 SVG는 preserveAspectRatio="slice"라 세로로 긴 화면에서는 viewBox 좌우가
       잘려 나간다. 지금 실제로 보이는 구간을 구해 그 안에서만 배치한다. */
    var scale = Math.max(w / VB_W, h / VB_H);
    var visW = w / scale, visH = h / scale;
    var x0 = (VB_W - visW) / 2, y0 = (VB_H - visH) / 2;
    var skyRect = sky.getBoundingClientRect();

    /* 별은 카피 바로 위에 서야 한다 — 키커의 화면 좌표를 viewBox 좌표로 되돌린다.
       (하늘은 별도 좌표계라 이 환산을 거치지 않으면 둘이 같은 세로줄에 못 선다.) */
    var kr = kick.getBoundingClientRect();
    var gap = Math.max(38, visH * 0.09);
    AIM.x1 = x0 + ((kr.left + kr.right) / 2 - skyRect.left) / scale;
    AIM.y1 = y0 + (kr.top - skyRect.top) / scale - gap;
    AIM.x0 = x0 + visW * 0.09;
    AIM.y0 = y0 + visH * 0.86;
    AIM.r = Math.max(13, visH * 0.028);

    aimLen = Math.hypot(AIM.x1 - AIM.x0, AIM.y1 - AIM.y0);
    aimDeg = Math.atan2(AIM.y1 - AIM.y0, AIM.x1 - AIM.x0) * 180 / Math.PI;
    if (aimLine) {
      aimLine.setAttribute('x1', AIM.x0.toFixed(1)); aimLine.setAttribute('y1', AIM.y0.toFixed(1));
      aimLine.setAttribute('x2', AIM.x1.toFixed(1)); aimLine.setAttribute('y2', AIM.y1.toFixed(1));
    }
  }

  function drawAim(p) {
    if (!aimLine) return;

    /* 구간 배치
         0.00–0.24  조준선이 별까지 뻗는다
         0.24–0.40  화살을 걸고 뒤로 당긴다 (느리게 — 여기서 힘이 쌓인다)
         0.40–0.475 발사. 당김의 1/2 시간에 열 배의 거리를 간다 — 이 대비가 "팍"이다
         0.465–0.53 명중해 스파클이 부풀었다 꺼진다
         0.50–0.86  여덟 조각으로 파열 (길게 — 스크롤로 지나가도 보이게)
         0.78–1.00  먹빛으로 잠기며 다음 씬으로 */
    var ux = (AIM.x1 - AIM.x0) / (aimLen || 1);
    var uy = (AIM.y1 - AIM.y0) / (aimLen || 1);

    var draw = easeOutCubic(clamp01(p / 0.24));
    aimLine.style.strokeDasharray = aimLen;
    aimLine.style.strokeDashoffset = (aimLen * (1 - draw)).toFixed(1);

    var nock = clamp01((p - 0.24) / 0.16);
    var release = clamp01((p - 0.40) / 0.075);

    /* 당기는 동안 조준선이 팽팽해졌다가(진해짐) 화살이 떠나면 툭 끊긴다 */
    var tension = 0.5 + 0.34 * nock * (1 - release);
    aimLine.style.opacity = (tension * (1 - clamp01((p - 0.44) / 0.10))).toFixed(3);

    /* 뒤로 당긴 거리는 음수. 발사는 앞이 빠른 곡선(0.72제곱)이라 시작부터 튀어 나간다. */
    var back = -0.09 * aimLen * easeOutCubic(nock);
    var travel = back + (aimLen - back) * Math.pow(release, 0.72);
    var ax = AIM.x0 + ux * travel;
    var ay = AIM.y0 + uy * travel;
    /* 당길 때 살짝 눌렸다가 놓는 순간 길어진다 — 정지 화면에서도 힘이 실려 보인다 */
    var stretch = 1 + 0.5 * release * (1 - release) * 4;
    aimArrow.setAttribute('transform',
      'translate(' + ax.toFixed(1) + ',' + ay.toFixed(1) + ') rotate(' + aimDeg.toFixed(1) +
      ') scale(' + stretch.toFixed(2) + ',1)');
    aimArrow.setAttribute('opacity', (nock > 0 && release < 1 ? Math.min(1, nock * 4) : 0).toFixed(2));

    var grow = 0.55 + 0.45 * easeOutCubic(clamp01(p / 0.4));
    var hit = clamp01((p - 0.465) / 0.065);
    var gone = clamp01((p - 0.50) / 0.09);
    var sc = AIM.r * (grow + 1.6 * Math.sin(hit * Math.PI)) * (1 - gone);
    aimTarget.setAttribute('transform',
      'translate(' + AIM.x1.toFixed(1) + ',' + AIM.y1.toFixed(1) + ') rotate(' + (p * 90).toFixed(1) + ') scale(' + Math.max(0, sc).toFixed(2) + ')');
    aimTarget.setAttribute('opacity', (1 - gone).toFixed(3));

    /* 밀려나는 거리는 easeOut, 투명도는 뒤늦게 빠져야 "터졌다"로 읽힌다 —
       둘을 같은 곡선에 묶으면 그냥 사라지는 것처럼 보인다. */
    var burst = clamp01((p - 0.50) / 0.36);
    aimBurst.setAttribute('opacity', burst > 0 && burst < 1 ? 1 : 0);
    if (burst > 0 && burst < 1) {
      var push = easeOutCubic(burst) * AIM.r * 6;
      var fadeS = 1 - clamp01((burst - 0.42) / 0.58);
      for (var i = 0; i < shards.length; i++) {
        var a = (i / shards.length) * Math.PI * 2;
        var sx = AIM.x1 + Math.cos(a) * push;
        var sy = AIM.y1 + Math.sin(a) * push;
        shards[i].setAttribute('transform',
          'translate(' + sx.toFixed(1) + ',' + sy.toFixed(1) + ') rotate(' + (a * 180 / Math.PI + 90).toFixed(1) +
          ') scale(' + (AIM.r * 0.5 * fadeS).toFixed(2) + ',' + (AIM.r * (0.9 + burst * 0.9)).toFixed(2) + ')');
        shards[i].setAttribute('opacity', fadeS.toFixed(3));
      }
    }
  }

  /* ── 상단바 면색 — 지금 상단바 밑에 깔린 씬을 따라간다 ──
     sticky 상단바가 어두운 씬 위에서 크림으로 남으면 화면을 가로지르는 띠가 된다. */
  var bar = document.querySelector('.topbar');
  var barState = '';
  function syncBar() {
    if (!bar) return;
    /* 재는 지점은 바의 "아래 경계"다. 한가운데로 재면 스크롤 0에서 씬이 아직 바 밑에
       닿지 않아 첫 화면만 크림 띠로 남는다. 경계로 재면 바가 바로 아래 면색을 따라간다.
       높이를 매번 읽는 이유는 460px 브레이크포인트에서 바 높이가 바뀌기 때문이다. */
    var probe = bar.offsetHeight + 1;
    var want = '';
    for (var i = 0; i < scenes.length; i++) {
      var r = scenes[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) {
        want = scenes[i].classList.contains('scene-night') ? 'bar-night' : 'bar-dark';
        break;
      }
    }
    if (want === barState) return;
    document.documentElement.classList.remove('bar-night', 'bar-dark');
    if (want) document.documentElement.classList.add(want);
    barState = want;
  }

  layoutAim();

  /* 씬 끝은 먹빛으로 잠기고 다음 씬은 그 먹빛에서 밝아진다 — 두 씬의 경계선을 지운다.
     첫 씬(#top)은 시작 페이드가 없다. 첫 화면이 검게 시작하면 안 되기 때문이다. */
  function drawVeil(sec, p) {
    var v = sec.querySelector(':scope > .scene-stage > .scene-veil');
    if (!v) return;
    var vIn = sec.classList.contains('scene-night') ? 0 : (1 - clamp01(p / 0.10));
    var vOut = clamp01((p - 0.80) / 0.20) * 0.96;
    v.style.opacity = Math.max(vIn, vOut).toFixed(3);
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
      else if (s.id === 'top') drawAim(p);
      drawVeil(s, p);
    }
    syncBar();
  }
  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { layoutAim(); request(); });
  /* 별은 키커 바로 위에 서야 하는데, 그 위치는 글꼴이 들어와야 확정된다.
     폰트 전후로 두 번 잡는다 — 한 번만 잡으면 대체 글꼴 기준 좌표가 그대로 굳는다. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { layoutAim(); request(); });
  }
  /* 배경 탭에서는 rAF가 멈춘다. 그 사이 브라우저가 스크롤 위치를 복원해 두면
     다시 보일 때까지 씬이 옛 진행률에 머문다 — 보일 때 한 번 다시 계산한다. */
  document.addEventListener('visibilitychange', request);
  window.addEventListener('load', request);
  update();
})();

/* ============================================================
   4) 탭으로 다음 화면 — 터치 기기 전용

   씬 하나를 통과하려면 손가락을 여러 번 밀어야 한다. 빈 곳을 탭하면 다음 정지점으로
   미끄러지게 한다. html의 scroll-behavior:smooth를 타므로, 이동하는 동안 그 씬의
   연출이 빠르게 재생된다 — 건너뛰는 게 아니라 빨리 감는 것이다.

   'click'을 쓰는 게 핵심이다. 스크롤 제스처는 click을 만들지 않으므로,
   밀어서 넘기는 동작과 탭이 저절로 구분된다(touchstart로 잡으면 둘이 섞인다).
   ============================================================ */
(function () {
  /* ?tap=1 — 마우스 환경에서도 켜서 검수한다(터치 판정을 흉내 낼 수단이 없다) */
  var force = /[?&]tap\b/.test(location.search);
  if (!force && !window.matchMedia('(pointer: coarse)').matches) return;
  if (force) document.documentElement.classList.add('tap-on');

  var main = document.getElementById('main');
  if (!main) return;
  var bar = document.querySelector('.topbar');
  var hint = document.getElementById('tap-hint');

  /* 정지점은 섹션의 머리뿐이다. 초판은 씬마다 "연출이 끝나는 지점"을 하나 더 뒀는데,
     그러면 첫 탭이 암전된 상태에서 멈추고 한 번 더 눌러야 넘어간다 — 번거롭다.
     지금은 탭 한 번이 그 씬을 통째로 재생하고 다음 씬 머리에 내려놓는다. */
  function stops() {
    var barH = bar ? bar.offsetHeight : 0;
    var list = [];
    var secs = main.children;
    for (var i = 0; i < secs.length; i++) {
      var s = secs[i];
      if (s.tagName !== 'SECTION') continue;
      var top = s.getBoundingClientRect().top + window.scrollY;
      list.push(Math.max(0, Math.round(top - barH)));
    }
    var foot = document.querySelector('.footer');
    if (foot) list.push(Math.round(foot.getBoundingClientRect().top + window.scrollY - barH));
    list.sort(function (a, b) { return a - b; });
    return list;
  }

  /* 브라우저 기본 smooth 스크롤은 길이도 곡선도 제각각이라, 씬 하나가 눈 깜짝할 사이에
     지나가기도 하고 늘어지기도 한다. 직접 굴려서 파열이 보일 만큼의 시간을 확보한다.
     모션 감소 설정이면 그냥 즉시 이동한다. */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var busyUntil = 0;
  function glide(to) {
    if (reduce) { window.scrollTo(0, to); return; }
    var from = window.scrollY, dist = to - from;
    var dur = Math.min(1100, Math.max(460, Math.abs(dist) * 0.62));
    busyUntil = performance.now() + dur;
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      /* easeInOutCubic — 출발과 도착이 부드럽고 가운데가 빠르다 */
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      window.scrollTo(0, Math.round(from + dist * e));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    /* 링크·버튼·입력은 원래 하던 일을 한다. 인트로는 자기 건너뛰기가 따로 있다. */
    if (t.closest('a, button, input, textarea, select, label, [role="button"], .intro')) return;
    /* 글을 긁어 읽는 중이면 화면을 옮기지 않는다 */
    if (window.getSelection && String(window.getSelection()).length > 0) return;
    /* 활공 중에 또 눌리면 중간 위치를 기준으로 다음 칸을 잡아 두 칸이 넘어간다.
       고정된 대기 시간이 아니라 실제 활공 길이만큼 잠근다(거리에 따라 460~1100ms). */
    if (performance.now() < busyUntil) return;

    var y = window.scrollY, list = stops(), next = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] > y + 12) { next = list[i]; break; }
    }
    if (next === null) return;               /* 끝에 닿았으면 아무 일도 하지 않는다 */

    glide(next);
    if (hint) hint.classList.add('is-gone');
  });
})();
