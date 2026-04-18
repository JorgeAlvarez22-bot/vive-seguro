import { useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { DELITOS, HORA, LUGAR, ENTIDADES } from '../utils/catalogos'

const PAGE_SIZE = 10

export default function Explorador() {
  const [filters, setFilters] = useState({
    sexo: '', entidad: '', hora: '', lugar: '', delito: '',
  })
  const [page, setPage] = useState(0)
  const [applied, setApplied] = useState(filters)

  // Conteo total con filtros
  const { data: countRes } = useSupabase(sb => {
    let q = sb.from('envipe').select('*', { count: 'exact', head: true })
    if (applied.sexo)    q = q.eq('sexo',          +applied.sexo)
    if (applied.entidad) q = q.eq('entidad',        +applied.entidad)
    if (applied.hora)    q = q.eq('hora',           +applied.hora)
    if (applied.lugar)   q = q.eq('lugar',          +applied.lugar)
    if (applied.delito)  q = q.eq('codigo_delito',  +applied.delito)
    return q
  }, [applied])

  // Página actual
  const { data: rows, loading } = useSupabase(sb => {
    let q = sb.from('envipe')
      .select('sexo,edad,entidad,hora,lugar,codigo_delito')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (applied.sexo)    q = q.eq('sexo',         +applied.sexo)
    if (applied.entidad) q = q.eq('entidad',       +applied.entidad)
    if (applied.hora)    q = q.eq('hora',          +applied.hora)
    if (applied.lugar)   q = q.eq('lugar',         +applied.lugar)
    if (applied.delito)  q = q.eq('codigo_delito', +applied.delito)
    return q
  }, [applied, page])

  const total = countRes?.count ?? 0

  function applyFilters() { setApplied({ ...filters }); setPage(0) }

  function exportCSV() {
    if (!rows) return
    const header = ['Sexo','Edad','Entidad','Hora','Lugar','Delito']
    const lines  = rows.map(r => [
      r.sexo === 1 ? 'Hombre' : 'Mujer',
      r.edad,
      ENTIDADES[r.entidad] || r.entidad,
      HORA[r.hora]?.replace(/[^\w\s]/gi,'') || r.hora,
      LUGAR[r.lugar] || r.lugar,
      DELITOS[r.codigo_delito] || r.codigo_delito,
    ])
    const csv  = [header, ...lines].map(l => l.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: 'envipe_filtrado.csv' }).click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="page-header">
        <h1>🔎 Explorador de Datos</h1>
        <p>Filtra y explora los {(39503).toLocaleString()} registros del ENVIPE 2025</p>
      </div>

      {/* Filtros */}
      <div className="card" style={{marginBottom:20}}>
        <div className="filters-bar">
          <select className="filter-select" value={filters.sexo}
            onChange={e => setFilters(f => ({...f, sexo: e.target.value}))}>
            <option value="">Sexo (todos)</option>
            <option value="1">Hombre</option>
            <option value="2">Mujer</option>
          </select>

          <select className="filter-select" value={filters.entidad}
            onChange={e => setFilters(f => ({...f, entidad: e.target.value}))}>
            <option value="">Entidad (todas)</option>
            {Object.entries(ENTIDADES).map(([k,v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select className="filter-select" value={filters.hora}
            onChange={e => setFilters(f => ({...f, hora: e.target.value}))}>
            <option value="">Hora (todas)</option>
            {Object.entries(HORA).map(([k,v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select className="filter-select" value={filters.lugar}
            onChange={e => setFilters(f => ({...f, lugar: e.target.value}))}>
            <option value="">Lugar (todos)</option>
            {Object.entries(LUGAR).map(([k,v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select className="filter-select" value={filters.delito}
            onChange={e => setFilters(f => ({...f, delito: e.target.value}))}>
            <option value="">Delito (todos)</option>
            {Object.entries(DELITOS).map(([k,v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <button className="btn-predict" style={{width:'auto',padding:'8px 20px',marginTop:0}}
            onClick={applyFilters}>
            Aplicar filtros
          </button>
          <button onClick={exportCSV}
            style={{padding:'8px 16px',border:'1px solid #ccc',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:13}}>
            ⬇️ Exportar CSV
          </button>
        </div>
        <p style={{fontSize:13,color:'var(--text-muted)'}}>
          Mostrando <strong>{rows?.length ?? 0}</strong> de <strong>{total.toLocaleString()}</strong> registros
        </p>
      </div>

      {/* Tabla */}
      <div className="card">
        {loading ? <div className="spinner"/> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Sexo</th><th>Edad</th><th>Entidad</th>
                <th>Hora</th><th>Lugar</th><th>Delito</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r, i) => (
                <tr key={i}>
                  <td>{r.sexo === 1 ? '👨 Hombre' : '👩 Mujer'}</td>
                  <td>{r.edad}</td>
                  <td>{ENTIDADES[r.entidad] || r.entidad}</td>
                  <td>{HORA[r.hora]?.split('(')[0]?.trim()}</td>
                  <td>{LUGAR[r.lugar]}</td>
                  <td>{DELITOS[r.codigo_delito]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="pagination">
          <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}>← Anterior</button>
          <span>Página {page + 1} de {Math.ceil(total / PAGE_SIZE)}</span>
          <button onClick={() => setPage(p => p+1)} disabled={(page+1)*PAGE_SIZE >= total}>Siguiente →</button>
        </div>
      </div>
    </div>
  )
}
