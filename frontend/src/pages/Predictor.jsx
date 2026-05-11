import { useState, useMemo } from 'react'
import { useMLPredict } from '../hooks/useMLPredict'
import { ENTIDADES, HORA, LUGAR, DOMINIO, ESTRATO } from '../utils/catalogos'
import { getMunicipiosByEntidad } from '../utils/municipios'

const INITIAL = {
  sexo: 1, edad: 25, entidad: 9, municipio: 14,
  clave_estado_municipio: 9.14, area_urbana: 14.0,
  dominio: 'U', estrato: 3, mes: 6, hora: 3, lugar: 1,
}

function getRiskLevel(prob) {
  if (prob >= 0.35) return { level: 'danger',  badge: 'badge-danger',  label: 'RIESGO ALTO',  color: '#E53E3E' }
  if (prob >= 0.20) return { level: 'warning', badge: 'badge-warning', label: 'RIESGO MEDIO', color: '#F6AD55' }
  return               { level: 'safe',    badge: 'badge-safe',    label: 'RIESGO BAJO',  color: '#38A169' }
}

function PillGroup({ options, value, onChange }) {
  return (
    <div className="pill-group">
      {Object.entries(options).map(([k, v]) => (
        <div key={k}
          className={`pill ${String(value) === String(k) ? 'active' : ''}`}
          onClick={() => onChange(isNaN(k) ? k : +k)}>
          {v}
        </div>
      ))}
    </div>
  )
}

function RiskBar({ delito, probabilidad, porcentaje, color }) {
  return (
    <div className="risk-bar-row">
      <span className="risk-bar-label" title={delito}>
        {delito.length > 32 ? delito.slice(0, 32) + '…' : delito}
      </span>
      <div className="risk-bar-track">
        <div className="risk-bar-fill"
          style={{ width: `${probabilidad * 100}%`, background: color }} />
      </div>
      <span className="risk-bar-pct">{porcentaje}</span>
    </div>
  )
}

export default function Predictor() {
  const [form, setForm]       = useState(INITIAL)
  const [history, setHistory] = useState([])
  const [showAll, setShowAll] = useState(false)
  const { predict, result, loading, error } = useMLPredict()

  // Municipios disponibles según la entidad seleccionada
  const municipios = useMemo(() => getMunicipiosByEntidad(form.entidad), [form.entidad])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function handleEntidadChange(entidadId) {
    const municipiosDisponibles = getMunicipiosByEntidad(entidadId)
    const primerMunicipio = municipiosDisponibles[0]
    set('entidad', entidadId)
    set('municipio', primerMunicipio?.id || 1)
    set('clave_estado_municipio', parseFloat(`${entidadId}.${primerMunicipio?.id || 1}`))
  }

  function handleMunicipioChange(municipioId) {
    set('municipio', municipioId)
    set('clave_estado_municipio', parseFloat(`${form.entidad}.${municipioId}`))
  }

  async function handleSubmit() {
    const res = await predict(form)
    if (res) {
      setHistory(h => [
        { ...res, timestamp: new Date().toLocaleTimeString() },
        ...h,
      ].slice(0, 3))
      setShowAll(false)
    }
  }

  const risk = result ? getRiskLevel(result.prediccion_principal.probabilidad) : null

  return (
    <div className="page-container">
      <div className="page-hero">
        <h1 className="page-title">Predictor de Riesgo</h1>
        <p className="page-subtitle">Ingresa tus condiciones y descubre tus riesgos</p>
      </div>

      {/* ── Formulario ─────────────────────────────────────── */}
      <div className="card">
        <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>
          Tus condiciones actuales
        </h3>

        {/* Sexo */}
        <div className="form-group">
          <label>Sexo</label>
          <PillGroup options={{ 1: '👨 Hombre', 2: '👩 Mujer' }}
            value={form.sexo} onChange={v => set('sexo', v)} />
        </div>

        {/* Edad */}
        <div className="form-group">
          <label>Edad</label>
          <input type="number" min={1} max={110} value={form.edad}
            onChange={e => set('edad', +e.target.value)} />
        </div>

        {/* Entidad */}
        <div className="form-group">
          <label>Estado</label>
          <select value={form.entidad} onChange={e => handleEntidadChange(+e.target.value)}>
            {Object.entries(ENTIDADES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Municipio — dependiente de entidad */}
        <div className="form-group">
          <label>Municipio</label>
          {municipios.length > 0 ? (
            <select value={form.municipio} onChange={e => handleMunicipioChange(+e.target.value)}>
              {municipios.map(({ id, nombre }) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          ) : (
            <select disabled>
              <option>Sin datos para esta entidad</option>
            </select>
          )}
        </div>

        {/* Dominio */}
        <div className="form-group">
          <label>Tipo de zona</label>
          <PillGroup options={DOMINIO} value={form.dominio} onChange={v => set('dominio', v)} />
        </div>

        {/* Estrato */}
        <div className="form-group">
          <label>Estrato socioeconómico</label>
          <select value={form.estrato} onChange={e => set('estrato', +e.target.value)}>
            {Object.entries(ESTRATO).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Hora */}
        <div className="form-group">
          <label>Hora aproximada</label>
          <PillGroup options={{
            1: '🌙 Madrugada', 2: '🌅 Mañana',
            3: '☀️ Tarde',     4: '🌆 Noche',
          }} value={form.hora} onChange={v => set('hora', v)} />
        </div>

        {/* Lugar */}
        <div className="form-group">
          <label>Lugar donde te encuentras</label>
          <select value={form.lugar} onChange={e => set('lugar', +e.target.value)}>
            {Object.entries(LUGAR).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Mes */}
        <div className="form-group">
          <label>Mes</label>
          <select value={form.mes} onChange={e => set('mes', +e.target.value)}>
            {['Enero','Febrero','Marzo','Abril','Mayo','Junio',
              'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
              .map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            <option value={99}>No especificado</option>
          </select>
        </div>

        {error && (
          <div style={{ background:'#FFF5F5', border:'1px solid #FEB2B2',
            borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#C53030' }}>
            ⚠️ {error}. Verifica que la API esté activa en Render.
          </div>
        )}

        <button className="btn-predict" onClick={handleSubmit} disabled={loading}>
          {loading ? '⏳ Analizando...' : '🔍 Analizar mi riesgo'}
        </button>
      </div>

      {/* ── Panel de resultado ──────────────────────────────── */}
      {!result && !loading && (
        <div className="card result-empty">
          <span className="icon">🛡️</span>
          <strong style={{ fontSize: 15 }}>Ingresa tus datos</strong>
          <p style={{ fontSize: 13, maxWidth: 260 }}>
            Completa el formulario y presiona "Analizar mi riesgo" para ver tu análisis.
          </p>
        </div>
      )}

      {loading && (
        <div className="card result-empty">
          <div className="spinner" />
          <p style={{ fontSize: 13 }}>Consultando el modelo…</p>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Card principal */}
          <div className={`result-card ${risk.level}`}>
            <span className={`result-badge ${risk.badge}`}>{risk.label}</span>
            <div className="result-pct" style={{ color: risk.color }}>
              {result.prediccion_principal.porcentaje}
            </div>
            <div className="result-name">{result.prediccion_principal.delito}</div>
            <div className="result-msg">{result.mensaje}</div>
          </div>

          {/* Top 5 barras */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="chart-title">Top 5 riesgos</div>
            {result.top_5_riesgos.map((r, i) => (
              <RiskBar key={i}
                delito={r.delito}
                probabilidad={r.probabilidad}
                porcentaje={r.porcentaje}
                color={getRiskLevel(r.probabilidad).color} />
            ))}
          </div>

          {/* Ver todos */}
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div className="chart-title" style={{ marginBottom:0 }}>Todos los delitos</div>
              <button onClick={() => setShowAll(s => !s)}
                style={{ fontSize:12, color:'var(--primary)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                {showAll ? 'Ocultar ▲' : 'Ver todos ▼'}
              </button>
            </div>
            {showAll && result.todos_los_riesgos.map((r, i) => (
              <RiskBar key={i}
                delito={r.delito}
                probabilidad={r.probabilidad}
                porcentaje={r.porcentaje}
                color={getRiskLevel(r.probabilidad).color} />
            ))}
          </div>
        </>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            🕒 Últimas consultas
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {history.map((h, i) => {
              const r = getRiskLevel(h.prediccion_principal.probabilidad)
              return (
                <div key={i} className="card" style={{ padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <span className={`result-badge ${r.badge}`} style={{ fontSize:10, padding:'2px 8px' }}>
                      {h.prediccion_principal.porcentaje}
                    </span>
                    <span style={{ fontSize:12, marginLeft:8 }}>{h.prediccion_principal.delito}</span>
                  </div>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>{h.timestamp}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
