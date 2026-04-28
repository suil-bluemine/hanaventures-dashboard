import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── HTML 엔티티 디코더 (이중 인코딩 &amp;#8220; 처리) ─────────────────────
const decodeHtml = (str) => {
  if (!str) return str
  const el = document.createElement('textarea')
  el.innerHTML = str
  const once = el.value
  el.innerHTML = once
  return el.value
}

// ── 인라인 마크다운 렌더러 (**bold** → <strong>) ───────────────────────────
function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return <br key={i} />
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g)
    return (
      <p key={i} className="mb-1.5">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="text-gray-100 font-semibold">{part.slice(2, -2)}</strong>
            : part
        )}
      </p>
    )
  })
}

// ── 카테고리 배지 색상 ──────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  '국내VC':              'bg-emerald-900/40 text-emerald-400 border-emerald-800',
  '글로벌':              'bg-blue-900/40 text-blue-400 border-blue-800',
  '정책/규제':           'bg-amber-900/40 text-amber-400 border-amber-800',
  'Biotech & Healthcare':'bg-rose-900/40 text-rose-400 border-rose-800',
  'Software & Infrastructure':'bg-violet-900/40 text-violet-400 border-violet-800',
  'Consumer Internet & Fintech':'bg-cyan-900/40 text-cyan-400 border-cyan-800',
  'Hardware & Industrial':'bg-orange-900/40 text-orange-400 border-orange-800',
  'Gaming & Contents':   'bg-pink-900/40 text-pink-400 border-pink-800',
  'Smart Mobility & Aerospace':'bg-sky-900/40 text-sky-400 border-sky-800',
  'Others':              'bg-gray-800/40 text-gray-400 border-gray-700',
}

const categoryColor = (cat) =>
  CATEGORY_COLORS[cat] || 'bg-gray-800/40 text-gray-400 border-gray-700'

// ── 날짜 포맷 ────────────────────────────────────────────────────────────────
const formatDate = (str) => {
  if (!str) return ''
  try {
    const d = new Date(str)
    return `${d.getMonth()+1}/${d.getDate()}`
  } catch { return '' }
}

// ── 뉴스 카드 컴포넌트 ──────────────────────────────────────────────────────
function NewsCard({ article, index }) {
  return (
    <motion.a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="news-card block bg-hana-surface border border-hana-border rounded-lg p-4 no-underline"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded border font-body ${categoryColor(article.category || article.source)}`}>
          {article.source}
        </span>
        <span className="text-xs text-hana-muted font-mono shrink-0">
          {formatDate(article.pubDate)}
        </span>
      </div>
      <h3 className="text-sm font-body font-medium text-gray-100 leading-snug mb-1 line-clamp-2">
        {decodeHtml(article.title)}
      </h3>
      {article.desc && (
        <p className="text-xs text-hana-muted leading-relaxed line-clamp-2">
          {decodeHtml(article.desc)}
        </p>
      )}
    </motion.a>
  )
}

// ── 포트폴리오 뉴스 섹션 ────────────────────────────────────────────────────
function PortfolioNews({ items }) {
  const [expanded, setExpanded] = useState(null)
  if (!items?.length) return null
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1.5 h-6 bg-hana-gold rounded-full" />
        <h2 className="font-display text-lg text-gray-100">포트폴리오사 뉴스</h2>
        <span className="text-xs text-hana-muted font-mono">{items.length}개사</span>
      </div>
      <div className="space-y-2">
        {items.map((company, i) => (
          <motion.div
            key={company.company}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="bg-hana-surface border border-hana-border rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-body font-medium text-sm text-gray-100">{company.company}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${categoryColor(company.category)}`}>
                  {company.category}
                </span>
                <span className="text-xs text-hana-muted">{company.type}투자</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-hana-muted">{company.news.length}건</span>
                <span className="text-hana-gold">{expanded === i ? '▲' : '▼'}</span>
              </div>
            </button>
            <AnimatePresence>
              {expanded === i && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2 border-t border-hana-border pt-3">
                    {company.news.map((item, j) => (
                      <a
                        key={j}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-gray-300 hover:text-hana-gold transition-colors py-1"
                      >
                        <span className="text-hana-muted text-xs font-mono mr-2">{formatDate(item.pubDate)}</span>
                        {decodeHtml(item.title)}
                      </a>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ── 메인 앱 ──────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data/news.json')
      .then(r => { if (!r.ok) throw new Error('데이터 없음'); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const tabs = [
    { id: 'all',       label: '전체' },
    { id: '국내VC',    label: '국내 VC' },
    { id: '글로벌',    label: '글로벌' },
    { id: 'portfolio', label: '포트폴리오' },
  ]

  const filteredArticles = data?.rssArticles?.filter(a =>
    activeTab === 'all' || activeTab === 'portfolio' ? true : a.category === activeTab
  ) ?? []

  return (
    <div className="min-h-screen bg-hana-dark">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-hana-dark/95 backdrop-blur border-b border-hana-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-hana-green rounded flex items-center justify-center">
              <span className="text-xs font-bold text-white">H</span>
            </div>
            <span className="font-display text-sm text-gray-100">하나벤처스</span>
            <span className="text-hana-muted text-xs font-mono">/ 뉴스 대시보드</span>
          </div>
          {data && (
            <span className="text-xs text-hana-muted font-mono">
              {data.updatedAtLabel} 기준
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">

        {/* 로딩 */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-hana-muted text-sm font-mono animate-pulse">데이터 로딩 중...</div>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-sm text-red-400">
            ⚠ {error} — <code className="text-xs">python scripts/fetch_data.py</code>를 먼저 실행하세요.
          </div>
        )}

        {data && (
          <>
            {/* AI 요약 */}
            {data.summary && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1.5 h-6 bg-hana-gold rounded-full" />
                  <h2 className="font-display text-lg text-gray-100">AI 투자 브리핑</h2>
                  <span className="text-xs bg-hana-gold/10 text-hana-gold px-2 py-0.5 rounded border border-hana-gold/20">
                    Claude 요약
                  </span>
                </div>
                <div className="summary-box rounded-lg p-5">
                  <div className="text-sm text-gray-300 leading-relaxed font-body">
                    {renderMarkdown(data.summary)}
                  </div>
                </div>
              </motion.section>
            )}

            {/* 탭 */}
            <div className="flex gap-1 border-b border-hana-border pb-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-body transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-hana-gold text-hana-gold'
                      : 'border-transparent text-hana-muted hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 포트폴리오 탭 */}
            {activeTab === 'portfolio' ? (
              <PortfolioNews items={data.portfolioNews} />
            ) : (
              /* RSS 뉴스 그리드 */
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1.5 h-6 bg-hana-green rounded-full" />
                  <h2 className="font-display text-lg text-gray-100">
                    {tabs.find(t => t.id === activeTab)?.label} 뉴스
                  </h2>
                  <span className="text-xs text-hana-muted font-mono">{filteredArticles.length}건</span>
                </div>
                {filteredArticles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredArticles.map((article, i) => (
                      <NewsCard key={i} article={article} index={i} />
                    ))}
                  </div>
                ) : (
                  <p className="text-hana-muted text-sm text-center py-12">
                    해당 카테고리 뉴스가 없습니다
                  </p>
                )}
              </section>
            )}

            {/* 푸터 */}
            <footer className="pt-8 border-t border-hana-border text-center">
              <p className="text-xs text-hana-muted font-mono">
                © {new Date().getFullYear()} 하나벤처스 내부용 — 포트폴리오 {data.portfolioCount}개사 모니터링 중
              </p>
            </footer>
          </>
        )}
      </main>
    </div>
  )
}
