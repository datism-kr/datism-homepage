# 검색 노출 — 진단과 실행 순서

목표: `datism` · `데이티즘` · `탐사대 Z` 검색에서 datism.kr이 최상단에 나오게 한다.

최종 갱신: 2026-08-05

---

## 1. 진단 — 사이트는 멀쩡하다, 발견이 안 됐을 뿐이다

2026-08-05 확인:

| 항목 | 결과 |
|---|---|
| `https://datism.kr/` | **HTTP 200** (GitHub Pages, 서울 엣지) |
| DNS | 185.199.108~111.153 (GitHub Pages 정상) + `www` → `datism-kr.github.io` |
| `robots.txt` | 404 → **본 작업에서 추가** |
| `sitemap.xml` | 404 → **본 작업에서 추가** |
| `noindex` 태그 | index.html에 없음 (문제 없음) |
| `site:datism.kr` | 결과 0건 = **색인된 페이지가 하나도 없다** |

색인 0건은 "구글이 우리 사이트를 싫어한다"가 아니라 **아직 와 본 적이 없다**는 뜻이다.
새 도메인은 ① 외부에서 걸린 링크를 타고 발견되거나 ② 소유자가 직접 알려주거나 둘 중 하나로
크롤링이 시작되는데, 지금 둘 다 없다. 그래서 아래 §3이 실제로 결정적인 단계다 — §2는
그다음에 순위를 지탱하는 준비일 뿐, 그것만으로는 색인이 되지 않는다.

---

## 2. 저장소에서 끝낸 것

| 파일 | 내용 |
|---|---|
| `robots.txt` | 전체 허용 + `_preview/` 차단 + 사이트맵 위치 고지 |
| `sitemap.xml` | `https://datism.kr/` 1건. 내용을 크게 고치면 `lastmod`를 갱신한다 |
| `index.html` | `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">` |
| `index.html` | 구조화 데이터를 `@graph`로 확장 — Organization · WebSite · VideoGame(탐사대 Z) |

구조화 데이터에서 중요한 건 **`alternateName`에 `Datism`·`데이티즘`을 함께 넣은 것**이다.
화면 문구에서 두 표기가 나란히 나오는 곳은 푸터의 "데이티즘 주식회사 (Datism Co., Ltd.)"
한 줄뿐이라, 검색엔진에 "이 둘은 같은 조직"이라고 알려줄 자리가 사실상 여기밖에 없다.
`탐사대 Z`도 별도 개체로 선언해야 그 질의에서 이 페이지가 **공식 출처**로 인식된다.

`privacy.html`은 `noindex`라서 사이트맵에 넣지 않았다 — 사이트맵에 올려놓고 noindex를 거는
건 서로 어긋나는 신호다. 색인시키고 싶다면 `privacy.html`의 `noindex`부터 지워야 한다.

### 인트로 오버레이는 색인에 영향이 없다
전면 인트로가 본문을 덮지만 **본문은 DOM에 그대로 있다**(숨기지 않는다). JS가 안 도는
환경에서는 오버레이 자체가 아예 켜지지 않으므로, 크롤러가 보는 HTML은 인트로가 없을 때와
같다. 히어로 이미지도 인트로가 도는 동안 숨기지 않는데, 이건 LCP(Core Web Vitals) 때문이다
— 자세한 근거는 `main.js`의 해당 주석에 적어뒀다.

---

## 3. 오너만 할 수 있는 일 — 이 순서대로

계정 소유자 본인이 해야 하는 일이라 대신 처리할 수 없다. **위에서부터 순서대로**가 중요하다.

### 3-1. 푸시해서 배포한다 (선행 조건)
`robots.txt`·`sitemap.xml`이 실제로 200을 반환해야 그다음 단계가 의미를 갖는다.

```bash
cd ~/Documents/datism-homepage && git push origin main
```

1~2분 뒤 확인:

```bash
curl -sI https://datism.kr/robots.txt | head -1; curl -sI https://datism.kr/sitemap.xml | head -1
```

### 3-2. Google Search Console 등록 — **이게 결정적인 단계다**
<https://search.google.com/search-console>

- 속성 유형은 **도메인**(DNS)을 고른다. `www`·`http`·`https`를 한 번에 덮는다.
- 구글이 주는 TXT 레코드를 도메인 등록처(가비아 등) DNS에 추가한다.
  DNS 전파에 수십 분 걸릴 수 있다.
- **URL 접두어** 방식을 택하면 HTML 인증 파일을 저장소에 넣어야 한다 — 그 파일을 받아
  전달해주면 커밋해 드리겠다.

### 3-3. 사이트맵 제출
Search Console → 색인 생성 → Sitemaps → `sitemap.xml` 입력 → 제출.

### 3-4. 색인 생성 요청
Search Console 상단 검색창에 `https://datism.kr/` 입력 → URL 검사 →
**색인 생성 요청**. 크롤링 대기열에 직접 넣는 유일한 수단이다.

### 3-5. 네이버 서치어드바이저 — 한국어 질의에는 이쪽이 더 중요할 수 있다
<https://searchadvisor.naver.com/>
`데이티즘`·`탐사대 Z`처럼 한글로 찾는 사람은 네이버 비중이 크다. 사이트 등록 → 소유확인 →
robots.txt·사이트맵 제출 → 웹페이지 수집 요청까지 한다.

### 3-6. Bing 웹마스터 도구
<https://www.bing.com/webmasters> — Search Console에서 가져오기가 되어 몇 분이면 끝난다.
Bing 색인은 DuckDuckGo와 여러 AI 검색의 소스로도 쓰인다.

### 3-7. 외부 링크를 최소 한 개 만든다
크롤러가 우리를 발견하는 자연 경로이고, 신규 도메인 신뢰도에도 직접 작용한다. 쉬운 것부터:

- **GitHub 조직 프로필**(<https://github.com/datism-kr>, 현재 공개 상태 확인됨) —
  Organization 설정의 **URL 필드에 `https://datism.kr` 입력**. 가장 손쉽고 확실하다.
- 저장소 `datism-homepage`의 About → Website에도 같은 주소.
- 탐사대 Z를 itch.io 등에 올릴 때 개발사 링크로 datism.kr.
- 채용 공고(원티드·잡코리아 등)를 낸다면 회사 홈페이지 칸에 datism.kr.

---

## 4. 기대치 — 언제, 어디까지 오르나

| 질의 | 전망 |
|---|---|
| `데이티즘` | 색인만 되면 최상단이 자연스럽다. 동명 경쟁자가 사실상 없다 |
| `탐사대 Z` | 동명 제품이 검색되지 않는다. 색인되면 곧 1위권 |
| `datism` | **경쟁이 있다.** 영어권 사전 표제어다(OED·Wordnik·Urban Dictionary) — 게다가 `dataism`(데이터주의) 담론과도 섞인다. 한국에서 검색하는 사람 기준으로는 상위 진입이 가능하지만, 글로벌 1위는 기대하지 않는 편이 맞다 |

색인 요청 후 실제 반영까지 **보통 며칠, 늦으면 2주**다. 그전에 `site:datism.kr`이 비어 있어도
정상이니 반복 요청하지 않는다(오히려 도움이 안 된다).

`site:datism.kr`에 결과가 하나라도 뜨는 순간이 진짜 시작점이다 — 거기서부터 순위 이야기를
하면 된다.

---

## 5. 나중에 효과가 큰 것 (지금은 아님)

- **콘텐츠를 늘린다.** 한 장짜리 사이트는 브랜드명 외의 질의로는 오르기 어렵다.
  탐사대 Z 개발 기록을 `/blog/` 같은 정적 페이지로 쌓으면 `한국 괴담 게임`,
  `텍스트 어드벤처` 같은 질의로 유입 경로가 생긴다.
- **탐사대 Z 전용 페이지 분리.** 지금은 `#tamsadae-z` 앵커라 독립 URL이 없다.
  제품이 출시되면 `/tamsadae-z/`로 떼어내고 사이트맵에 추가한다.
- `privacy.html`의 `noindex` 해제 — 법인 사이트의 신뢰 신호로 쓰인다.
