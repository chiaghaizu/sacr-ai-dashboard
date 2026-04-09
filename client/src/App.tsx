import { NavLink, Route, Routes } from "react-router-dom";

import "./App.css";
import { SacrLogo, useTheme } from "./components";
import { History, TodaysFeed } from "./pages";

function ThemeIcon({ theme }: { theme: "light" | "dark" }) {
  if (theme === "dark") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function App() {
  const { effectiveTheme, toggleMode } = useTheme();
  const nextTheme = effectiveTheme === "dark" ? "light" : "dark";

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-body">
          <div className="brand">
            <SacrLogo />
            <div className="brand-wordmark">SACR Cyber Intel</div>
          </div>

          <nav className="sidebar-nav" aria-label="Main navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
            >
              Today&apos;s Feed
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
            >
              History
            </NavLink>
          </nav>
        </div>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleMode}
          title={`Switch to ${nextTheme} mode`}
          aria-label={`Switch to ${nextTheme} mode`}
        >
          <ThemeIcon theme={nextTheme} />
          <span className="theme-toggle-label">
            {nextTheme === "light" ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
      </aside>

      <div className="content-shell">
        <main className="content">
          <Routes>
            <Route path="/" element={<TodaysFeed />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
