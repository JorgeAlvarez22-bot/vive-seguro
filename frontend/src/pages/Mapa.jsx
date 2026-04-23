export default function Mapa() {
  return (
    <div className="page-container">
      <div className="page-hero">
        <h1 className="page-title">Mapa de Riesgo</h1>
        <p className="page-subtitle">Visualización geográfica de delitos por entidad</p>
      </div>

      <div className="mapa-placeholder">
        <div className="mapa-coming">
          <div className="mapa-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
          </div>
          <h2>Próximamente</h2>
          <p>El mapa interactivo de riesgo criminal por municipio estará disponible próximamente.</p>
          <div className="mapa-features">
            <div className="feature-chip">📍 Datos por municipio</div>
            <div className="feature-chip">🎨 Mapa de calor</div>
            <div className="feature-chip">🔍 Filtros por delito</div>
            <div className="feature-chip">📊 Comparativa nacional</div>
          </div>
        </div>
      </div>
    </div>
  )
}
