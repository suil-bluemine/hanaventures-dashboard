#!/usr/bin/env python3
"""
하나벤처스 뉴스 대시보드 데이터 수집 스크립트
- 포트폴리오 목록: 하나벤처스 사이트 스크래핑
- 포트폴리오사 뉴스: 네이버 뉴스 검색 API
- VC/스타트업 뉴스: RSS 피드 수집
- AI 요약: Claude API
"""

import json
import os
import re
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ── .env 로더 (외부 라이브러리 불필요) ────────────────────────────────────────
def _load_dotenv():
    env_path = Path(__file__).parent.parent / ".env"
    if not env_path.exists():
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))

_load_dotenv()

# ── 설정 ──────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY   = os.environ.get("ANTHROPIC_API_KEY")
NAVER_CLIENT_ID     = os.environ.get("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.environ.get("NAVER_CLIENT_SECRET")

KST = timezone(timedelta(hours=9))
OUTPUT_DIR = Path(__file__).parent.parent / "src" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── RSS 뉴스 소스 ──────────────────────────────────────────────────────────────
RSS_SOURCES = [
    {"name": "플래텀",       "url": "https://platum.kr/feed", "category": "국내VC"},
    {"name": "벤처스퀘어",   "url": "https://www.venturesquare.net/feed", "category": "국내VC"},
    {"name": "TechCrunch",   "url": "https://techcrunch.com/feed/", "category": "글로벌"},
    {"name": "CB Insights",  "url": "https://www.cbinsights.com/research/feed/", "category": "글로벌"},
]

# ── 유틸리티 ──────────────────────────────────────────────────────────────────
def http_get(url: str, headers: dict = None) -> bytes:
    req = urllib.request.Request(url, headers=headers or {
        "User-Agent": "Mozilla/5.0 (compatible; HanaVenturesDashboard/1.0)"
    })
    with urllib.request.urlopen(req, timeout=10) as res:
        return res.read()

def truncate(text: str, n: int = 300) -> str:
    return text[:n] + "..." if len(text) > n else text

# ── 1. 포트폴리오 스크래핑 ────────────────────────────────────────────────────
def scrape_portfolio() -> list[dict]:
    portfolio = []
    for ptype, url in [
        ("국내", "https://www.hanaventures.co.kr/main/portfolio/domestic"),
        ("해외", "https://www.hanaventures.co.kr/main/portfolio/foreign"),
    ]:
        try:
            html = http_get(url).decode("utf-8", errors="ignore")
            # 패턴: <h2>회사명</h2> ... <카테고리>
            entries = re.findall(
                r'<h2>(.*?)</h2>\s*<p[^>]*class="ex"[^>]*>(.*?)</p>\s*<p[^>]*class="type"[^>]*>(.*?)</p>',
                html, re.DOTALL
            )
            for name, desc, category in entries:
                name = re.sub(r'<.*?>', '', name).strip()
                desc = re.sub(r'<.*?>', '', desc).strip()
                category = re.sub(r'<.*?>', '', category).strip()
                if name:
                    portfolio.append({"name": name, "desc": desc, "category": category, "type": ptype})
            print(f"  [{ptype}] {len(entries)}개 파싱")
        except Exception as e:
            print(f"  [{ptype}] 스크래핑 오류: {e}")
    return portfolio

# ── 2. 네이버 뉴스 검색 (포트폴리오사별) ─────────────────────────────────────
def search_naver_news(company: str) -> list[dict]:
    if not NAVER_CLIENT_ID:
        return []
    try:
        query = urllib.parse.quote(company)
        url = f"https://openapi.naver.com/v1/search/news.json?query={query}&display=3&sort=date"
        data = json.loads(http_get(url, headers={
            "X-Naver-Client-Id": NAVER_CLIENT_ID,
            "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
        }).decode("utf-8"))
        items = []
        for item in data.get("items", []):
            items.append({
                "title":   re.sub(r'<.*?>', '', item["title"]),
                "link":    item["link"],
                "desc":    re.sub(r'<.*?>', '', item.get("description", "")),
                "pubDate": item.get("pubDate", ""),
                "source":  "네이버뉴스",
            })
        return items
    except Exception as e:
        print(f"    네이버 뉴스 오류 ({company}): {e}")
        return []

# ── 3. RSS 피드 수집 ──────────────────────────────────────────────────────────
def parse_rss(source: dict) -> list[dict]:
    try:
        xml = http_get(source["url"]).decode("utf-8", errors="ignore")
        items = re.findall(r'<item>(.*?)</item>', xml, re.DOTALL)
        results = []
        for item in items[:5]:
            def tag(t): 
                m = re.search(rf'<{t}[^>]*>(.*?)</{t}>', item, re.DOTALL)
                return re.sub(r'<.*?>', '', m.group(1)).strip() if m else ""
            title = tag("title").replace("<![CDATA[", "").replace("]]>", "").strip()
            link  = tag("link") or tag("guid")
            desc  = truncate(tag("description").replace("<![CDATA[", "").replace("]]>", "").strip())
            pub   = tag("pubDate")
            if title:
                results.append({
                    "title": title, "link": link, "desc": desc,
                    "pubDate": pub, "source": source["name"], "category": source["category"]
                })
        print(f"  [{source['name']}] {len(results)}개")
        return results
    except Exception as e:
        print(f"  [{source['name']}] RSS 오류: {e}")
        return []

# ── 4. Claude API 요약 ────────────────────────────────────────────────────────
def summarize_with_claude(articles: list[dict]) -> str:
    if not ANTHROPIC_API_KEY or not articles:
        return ""
    try:
        text_list = "\n".join([
            f"- [{a['source']}] {a['title']}: {a.get('desc','')[:200]}"
            for a in articles[:10]
        ])
        payload = json.dumps({
            "model": "claude-sonnet-4-6",
            "max_tokens": 1000,
            "messages": [{
                "role": "user",
                "content": f"""다음 VC/스타트업 뉴스 목록을 투자팀 관점에서 3~5줄로 핵심만 요약해 주세요.
투자 시사점이나 주목할 트렌드 위주로, 한국어로 작성하세요.

{text_list}"""
            }]
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            }
        )
        res = json.loads(urllib.request.urlopen(req, timeout=30).read().decode("utf-8"))
        return res["content"][0]["text"]
    except Exception as e:
        print(f"  Claude API 오류: {e}")
        return ""

# ── 5. 메인 실행 ──────────────────────────────────────────────────────────────
def main():
    now = datetime.now(KST)
    print(f"\n{'='*50}")
    print(f"하나벤처스 대시보드 데이터 수집 - {now.strftime('%Y-%m-%d %H:%M KST')}")
    print(f"{'='*50}\n")

    # 포트폴리오 목록
    print("[1/4] 포트폴리오 스크래핑...")
    portfolio = scrape_portfolio()

    # 포트폴리오사 뉴스 (전체, API rate limit 0.2s)
    print(f"\n[2/4] 포트폴리오사 뉴스 검색 ({len(portfolio)}개)...")
    portfolio_news = []
    for company in portfolio:
        news = search_naver_news(company["name"])
        if news:
            portfolio_news.append({
                "company": company["name"],
                "category": company["category"],
                "type": company["type"],
                "news": news
            })
        time.sleep(0.2)  # API rate limit

    # VC/스타트업 RSS 뉴스
    print("\n[3/4] RSS 피드 수집...")
    rss_articles = []
    for source in RSS_SOURCES:
        rss_articles.extend(parse_rss(source))

    # AI 요약
    print("\n[4/4] Claude API 요약 생성...")
    summary = summarize_with_claude(rss_articles)

    # JSON 출력
    output = {
        "updatedAt":      now.isoformat(),
        "updatedAtLabel": now.strftime("%Y년 %m월 %d일 %H:%M"),
        "summary":        summary,
        "portfolioNews":  portfolio_news,
        "rssArticles":    rss_articles,
        "portfolioCount": len(portfolio),
    }
    out_path = OUTPUT_DIR / "news.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n[DONE] {out_path}")
    print(f"   포트폴리오: {len(portfolio)}개")
    print(f"   포트폴리오 뉴스: {len(portfolio_news)}개사")
    print(f"   RSS 기사: {len(rss_articles)}개")

if __name__ == "__main__":
    main()
