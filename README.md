# 하나벤처스 뉴스 대시보드

하나벤처스 투자팀/백오피스 대상 자동 뉴스 대시보드

## 구성

```
├── scripts/fetch_data.py      # 데이터 수집 (포트폴리오 + RSS + Claude 요약)
├── src/
│   ├── App.jsx                # React 메인 UI
│   ├── data/news.json         # 수집된 데이터 (자동 생성)
│   └── index.css
├── .github/workflows/
│   └── update-news.yml        # 매일 06:00 KST 자동 실행
```

## 로컬 실행

### 1. 환경변수 설정

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
$env:NAVER_CLIENT_ID   = "..."          # 선택 (포트폴리오 뉴스용)
$env:NAVER_CLIENT_SECRET = "..."        # 선택
```

### 2. 데이터 수집

```powershell
python scripts/fetch_data.py
```

### 3. 개발 서버

```powershell
npm install
npm run dev
```

## GitHub Pages 배포

### Secrets 설정 (Repository → Settings → Secrets)

| 이름 | 값 |
|------|----|
| `ANTHROPIC_API_KEY` | Claude API 키 |
| `NAVER_CLIENT_ID` | 네이버 개발자센터 Client ID |
| `NAVER_CLIENT_SECRET` | 네이버 개발자센터 Secret |

### 배포

```powershell
git init
git remote add origin https://github.com/[org]/hanaventures-dashboard.git
git add .
git commit -m "init"
git push -u origin main
```

GitHub Actions가 매일 자동으로 데이터 수집 → 빌드 → 배포

## 네이버 뉴스 API 발급

1. https://developers.naver.com → 애플리케이션 등록
2. 검색 API 선택 → Client ID/Secret 발급 (무료, 하루 25,000 호출)

## 접근 제어

사내용이면 GitHub Pages를 **Private**으로 설정하거나,
Cloudflare Access로 SSO 인증 추가 권장
