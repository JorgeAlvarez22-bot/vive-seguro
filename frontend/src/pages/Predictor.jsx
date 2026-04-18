import { useState } from 'react'
import { useMLPredict } from '../hooks/useMLPredict'
import { ENTIDADES, HORA, LUGAR, DOMINIO, ESTRATO } from '../utils/catalogos'

const INITIAL = {
  sexo: 1, edad: 25, entidad: 9, municipio: 14,
  clave_estado_municipio: 9.14, area_urbana: 14.0,
  dominio: 'U', estrato: 3, mes: 6, hora: 3, lugar: 1,
}

function getRiskLevel(prob) {
  if (prob >= 0.35) return { level: 'danger',  badge: 'badge-danger',  label: 'RIESGO ALTO',    color: '#D32F2F' }
  if (prob >= 0.20) return { level: 'warning', badge: 'badge-warning', label: 'RIESGO MEDIO',   color: '#F57C00' }
  return               { level: 'safe',    badge: 'badge-safe',    label: 'RIESGO BAJO',    color: '#2E7D32' }
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
  const [form, setForm]           = useState(INITIAL)
  const [history, setHistory]     = useState([])
  const [showAll, setShowAll]     = useState(false)
  const { predict, result, loading, error } = useMLPredict()

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

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
    <div>
      <div className="page-header">
        <h1>🎯 Predictor de Riesgo Criminal</h1>
        <p>Ingresa tus condiciones actuales y descubre a qué delitos eres más propenso</p>
      </div>

      <div className="predictor-grid">

        {/* ── Formulario ─────────────────────────────────────────── */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 15, color: 'var(--primary)' }}>
            📋 Tus condiciones actuales
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
            <label>Entidad federativa</label>
            <select value={form.entidad}
              onChange={e => {
                const v = +e.target.value
                set('entidad', v)
                set('clave_estado_municipio', parseFloat(`${v}.1`))
              }}>
              {Object.entries(ENTIDADES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
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
            <div style={{ background:'#FFEBEE', border:'1px solid #EF9A9A',
              borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#C62828' }}>
              ⚠️ {error}. Verifica que la API esté activa en Render.
            </div>
          )}

          <button className="btn-predict" onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Analizando...' : '🔍 Analizar mi riesgo'}
          </button>
        </div>

        {/* ── Panel de resultado ──────────────────────────────────── */}
        <div>
          {!result && !loading && (
            <div className="card result-empty">
              <span className="icon">🛡️</span>
              <strong style={{ fontSize: 16 }}>Ingresa tus datos</strong>
              <p style={{ fontSize: 14, maxWidth: 260 }}>
                Completa el formulario y presiona "Analizar mi riesgo" para ver tu análisis personalizado.
              </p>
            </div>
          )}

          {loading && (
            <div className="card result-empty">
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <p>Consultando el modelo…</p>
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
              <div className="card" style={{ marginBottom: 16 }}>
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
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                🕒 Últimas consultas
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {history.map((h, i) => {
                  const r = getRiskLevel(h.prediccion_principal.probabilidad)
                  return (
                    <div key={i} className="card" style={{ padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <span className={`result-badge ${r.badge}`} style={{ fontSize:10, padding:'2px 8px' }}>{h.prediccion_principal.porcentaje}</span>
                        <span style={{ fontSize:13, marginLeft:8 }}>{h.prediccion_principal.delito}</span>
                      </div>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{h.timestamp}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
