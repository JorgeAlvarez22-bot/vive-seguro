import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard  from './pages/Dashboard'
import Explorador from './pages/Explorador'
import Predictor  from './pages/Predictor'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>🛡️ ViveSeguro MX</h2>
        <p>ENVIPE 2025</p>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/"           end className={({isActive}) => isActive ? 'active' : ''}>
          <span>📊</span><span>Dashboard</span>
        </NavLink>
        <NavLink to="/explorador"    className={({isActive}) => isActive ? 'active' : ''}>
          <span>🔎</span><span>Explorador</span>
        </NavLink>
        <NavLink to="/predictor"     className={({isActive}) => isActive ? 'active' : ''}>
          <span>🎯</span><span>Predictor</span>
        </NavLink>
      </nav>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/explorador" element={<Explorador />} />
            <Route path="/predictor"  element={<Predictor />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
