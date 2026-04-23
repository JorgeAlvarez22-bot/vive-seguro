import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard  from './pages/Dashboard'
import Mapa       from './pages/Mapa'
import Predictor  from './pages/Predictor'

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        <span>Dashboard</span>
      </NavLink>
      <NavLink to="/mapa" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
        <span>Mapa</span>
      </NavLink>
      <NavLink to="/predictor" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>Predictor</span>
      </NavLink>
    </nav>
  )
}

function Header({ title, subtitle }) {
  return (
    <header className="app-header">
      <div className="header-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>ViveSeguro MX</span>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/mapa"      element={<Mapa />} />
            <Route path="/predictor" element={<Predictor />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
