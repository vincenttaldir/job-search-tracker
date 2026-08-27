import { useLocation, Link } from 'react-router-dom';
import { TaskCenter } from './TaskCenter';
import './Layout.css';

function BrandIcon() {
  return (
    <span className="brand-icon" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="17" />
        <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
      </svg>
    </span>
  );
}

export function Layout({ children }) {
  const location = useLocation();

  const navSections = [
    { path: '/applications', label: 'Candidatures' },
    { path: '/companies', label: 'Entreprises' },
    { path: '/statistics', label: 'Statistiques' },
    { path: '/settings', label: 'Configuration' },
  ];

  const isNavActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="app-container">
      <header className="topbar">
        {/* Brand — left */}
        <Link to="/applications" className="brand-link">
          <BrandIcon />
          <span className="brand-text">
            Job<span> Search</span>
          </span>
        </Link>

        {/* Nav — centre */}
        <nav className="topbar-nav" role="navigation" aria-label="Navigation principale">
          {navSections.map((section) => (
            <Link
              key={section.path}
              to={section.path}
              className={`nav-link ${isNavActive(section.path) ? 'nav-active' : ''}`}
              aria-current={isNavActive(section.path) ? 'page' : undefined}
            >
              {section.label}
            </Link>
          ))}
        </nav>

        {/* Actions — right */}
        <div className="topbar-actions">
          <TaskCenter />
        </div>
      </header>

      <main className="content" id="main-content">
        {children}
      </main>
    </div>
  );
}
