import { useMemo, useState } from 'react';
import { Calendar, ExternalLink, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import type { NewsItem } from '../services/intelligence';
import { RefreshCw } from 'lucide-react';

const ALL_FILTER = "All";

function formatItemDate(dateValue: string): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

interface HistoryViewProps {
  history: { date: string; news: NewsItem[] }[];
  isGenerating: boolean;
}

export function HistoryView({ history, isGenerating }: HistoryViewProps) {
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);

  const allNews = useMemo(() => {
    const items: NewsItem[] = [];
    for (const snapshot of history) {
      items.push(...snapshot.news);
    }
    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [history]);

  const companies = useMemo(() => {
    const names = new Set<string>();
    for (const item of allNews) {
      names.add(item.company);
    }
    return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
  }, [allNews]);

  const filteredNews = useMemo(() => {
    if (activeFilter === ALL_FILTER) return allNews;
    return allNews.filter(item => item.company === activeFilter);
  }, [activeFilter, allNews]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, NewsItem[]>();
    for (const item of filteredNews) {
      const dateKey = item.date.split('T')[0]; // YYYY-MM-DD
      const existing = groups.get(dateKey) ?? [];
      existing.push(item);
      groups.set(dateKey, existing);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredNews]);

  return (
    <div className="w-full max-w-4xl mx-auto pb-20">
      <header className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-[var(--color-text-primary)]">
          News History
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-2">
          Browse past intelligence updates across all tracked companies.
        </p>
      </header>

      {isGenerating && allNews.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="mb-4 text-[var(--color-text-secondary)]"
          >
            <RefreshCw size={24} />
          </motion.div>
          <h3 className="text-lg font-medium mb-2">Loading History</h3>
          <p className="text-[var(--color-text-secondary)] text-sm max-w-sm">
            Fetching historical intelligence data...
          </p>
        </div>
      ) : allNews.length === 0 ? (
        <div className="py-20 text-center text-[var(--color-text-secondary)]">
          No history available yet.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-6 overflow-hidden">
            <span className="text-sm font-bold text-[var(--color-text-secondary)]">Filter by Company</span>
            <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-1" role="tablist">
              <button
                onClick={() => setActiveFilter(ALL_FILTER)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border shrink-0",
                  activeFilter === ALL_FILTER
                    ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                    : "bg-[var(--color-bg-sidebar)] text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]"
                )}
              >
                All ({allNews.length})
              </button>
              {companies.map(company => (
                <button
                  key={company}
                  onClick={() => setActiveFilter(company)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border shrink-0",
                    activeFilter === company
                      ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                      : "bg-[var(--color-bg-sidebar)] text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {company}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {groupedByDate.map(([dateKey, items]) => (
              <div key={dateKey}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4 flex items-center gap-2">
                  <Calendar size={14} />
                  {formatItemDate(dateKey)}
                </h2>
                <div className="space-y-4">
                  {items.map((item, idx) => (
                    <motion.div
                      key={`${dateKey}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.03 }}
                      className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-5 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 size={14} className="text-[var(--color-text-secondary)]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                          {item.company}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2 leading-tight">
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent)] hover:underline flex items-start gap-2">
                            {item.title}
                            <ExternalLink size={14} className="shrink-0 mt-1.5 opacity-50" />
                          </a>
                        ) : (
                          item.title
                        )}
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                        {item.summary}
                      </p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {item.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 bg-[var(--color-bg-sidebar)] rounded text-[var(--color-text-secondary)]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
