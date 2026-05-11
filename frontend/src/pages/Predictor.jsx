import { useState, useMemo } from 'react'
import { useMLPredict } from '../hooks/useMLPredict'
import { ENTIDADES, HORA, LUGAR, DOMINIO, ESTRATO, RECOMENDACIONES } from '../utils/catalogos'
import { getMunicipiosByEntidad } from '../utils/municipios'

const INITIAL = {
  sexo: 1, edad: 25, entidad: 9, municipio: 14,
  clave_estado_municipio: 9.14, area_urbana: 14.0,
  dominio: 'U', estrato: 3, mes: 6, hora: 3, lugar: 1,
}

function getRiskLevel(prob) {
  if (prob >= 0.35) return { level: 'danger',  badge: 'badge-danger',  label: 'RIESGO ALTO',  color: '#E53E3E', bg: '#FFF5F5', border: '#FEB2B2' }
  if (prob >= 0.20) return { level: 'warning', badge: 'badge-warning', label: 'RIESGO MEDIO', color: '#C05621', bg: '#FFFAF0', border: '#FBD38D' }
  return               { level: 'safe',    badge: 'badge-safe',    label: 'RIESGO BAJO',  color: '#276749', bg: '#F0FFF4', border: '#9AE6B4' }
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

export default function Predictor() {
  const [form, setForm]       = useState(INITIAL)
  const [history, setHistory] = useState([])
  const { predict, result, loading, error } = useMLPredict()

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
    }
  }

  const principal = result?.prediccion_principal
  const risk      = principal ? getRiskLevel(principal.probabilidad) : null
  const recomends = principal ? (RECOMENDACIONES[principal.codigo] || []) : []
  const otros3    = result?.todos_los_riesgos?.slice(1, 4) || []

  return (
    <div className="page-container">
      <div className="page-hero">
        <h1 className="page-title">Predictor de Riesgo</h1>
        <p className="page-subtitle">Ingresa tus condiciones y descubre tus riesgos</p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>
          Tus condiciones actuales
        </h3>

        <div className="form-group">
          <label>Sexo</label>
          <PillGroup options={{ 1: '👨 Hombre', 2: '👩 Mujer' }}
            value={form.sexo} onChange={v => set('sexo', v)} />
        </div>

        <div className="form-group">
          <label>Edad</label>
          <input type="number" min={1} max={110} value={form.edad}
            onChange={e => set('edad', +e.target.value)} />
        </div>

        <div className="form-group">
          <label>Estado</label>
          <select value={form.entidad} onChange={e => handleEntidadChange(+e.target.value)}>
            {Object.entries(ENTIDADES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Municipio</label>
          {municipios.length > 0 ? (
            <select value={form.municipio} onChange={e => handleMunicipioChange(+e.target.value)}>
              {municipios.map(({ id, nombre }) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          ) : (
            <select disabled><option>Sin datos para esta entidad</option></select>
          )}
        </div>

        <div className="form-group">
          <label>Tipo de zona</label>
          <PillGroup options={DOMINIO} value={form.dominio} onChange={v => set('dominio', v)} />
        </div>

        <div className="form-group">
          <label>Estrato socioeconomico</label>
          <select value={form.estrato} onChange={e => set('estrato', +e.target.value)}>
            {Object.entries(ESTRATO).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Hora aproximada</label>
          <PillGroup options={{
            1: 'Madrugada', 2: 'Manana',
            3: 'Tarde',     4: 'Noche',
          }} value={form.hora} onChange={v => set('hora', v)} />
        </div>

        <div className="form-group">
          <label>Lugar donde te encuentras</label>
          <select value={form.lugar} onChange={e => set('lugar', +e.target.value)}>
            {Object.entries(LUGAR).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

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
            {error}. Verifica que la API este activa en Render.
          </div>
        )}

        <button className="btn-predict" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Analizando...' : 'Analizar mi riesgo'}
        </button>
      </div>

      {!result && !loading && (
        <div className="card result-empty">
          <span className="icon">shield</span>
          <strong style={{ fontSize: 15 }}>Ingresa tus datos</strong>
          <p style={{ fontSize: 13, maxWidth: 260 }}>
            Completa el formulario y presiona Analizar mi riesgo para ver tu analisis.
          </p>
        </div>
      )}

      {loading && (
        <div className="card result-empty">
          <div className="spinner" />
          <p style={{ fontSize: 13 }}>Consultando el modelo...</p>
        </div>
      )}

      {result && !loading && principal && (
        <>
          <div className="card" style={{
            background: risk.bg, border: `1.5px solid ${risk.border}`, marginBottom: 12,
          }}>
            <span className={`result-badge ${risk.badge}`} style={{ marginBottom: 10 }}>
              {risk.label}
            </span>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
              Delito mas probable segun tu perfil
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: risk.color, lineHeight: 1.3 }}>
              {principal.delito}
            </h2>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>Recomendaciones de seguridad</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recomends.map((rec, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 12px', background: '#F7FAFC',
                  borderRadius: 10, border: '1px solid var(--border)',
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--primary)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                Tambien podrias ser victima de
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {otros3.map((r, i) => {
                const rv = getRiskLevel(r.probabilidad)
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: rv.bg,
                    borderRadius: 10, border: `1px solid ${rv.border}`,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', flex: 1, marginRight: 8 }}>
                      {r.delito}
                    </span>
                    <span className={`result-badge ${rv.badge}`} style={{ fontSize: 10, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                      {rv.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {history.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                Ultimas consultas
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((h, i) => {
                  const r = getRiskLevel(h.prediccion_principal.probabilidad)
                  return (
                    <div key={i} className="card" style={{ padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`result-badge ${r.badge}`} style={{ fontSize:10, padding:'2px 8px' }}>
                          {r.label}
                        </span>
                        <span style={{ fontSize:12 }}>{h.prediccion_principal.delito}</span>
                      </div>
                      <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink: 0 }}>{h.timestamp}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
