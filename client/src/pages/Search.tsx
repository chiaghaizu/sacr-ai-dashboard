import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiUrl } from "../lib/apiUrl";
import "./Search.css";

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function SpinnerIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="search-spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function Search() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(apiUrl("/api/search"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during search",
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      <h1 className="page-heading">Semantic Search</h1>
      <p className="page-subtext">
        Search across the latest intelligence, research, and news feeds.
      </p>

      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-wrapper">
          <span className="search-input-icon">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for vulnerabilities, trends, or companies..."
            className="search-input"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="search-submit"
          >
            {isSearching ? <SpinnerIcon size={16} /> : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <div className="search-error">
          <AlertIcon />
          <div>
            <strong>Search Failed</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {isSearching && (
        <div className="search-loading">
          <SpinnerIcon size={28} />
          <h3>Analyzing Sources</h3>
          <p>
            Scanning the web and cross-referencing with your tracked
            companies...
          </p>
        </div>
      )}

      {result && !isSearching && (
        <div className="search-result">
          <Markdown remarkPlugins={[remarkGfm]}>{result}</Markdown>
        </div>
      )}
    </>
  );
}
