import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useSupabase } from '../hooks/useSupabase'
import { DELITOS, HORA, LUGAR } from '../utils/catalogos'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#1A237E','#3949AB','#5C6BC0','#7986CB','#9FA8DA',
                '#C5CAE9','#283593','#1565C0','#0D47A1','#01579B']

export default function Dashboard() {
  // Total registros
  const { data: countData, loading: l1 } = useSupabase(
    sb => sb.from('envipe').select('*', { count: 'exact', head: true })
  )

  /// Todos los registros para calcular estadísticas
const [rows, setRows] = useState(null)
const [l2, setL2] = useState(true)

useEffect(() => {
  async function fetchAll() {
    let all = []
    let from = 0
    const batchSize = 1000
    while (true) {
      const { data } = await supabase
        .from('envipe')
        .select('codigo_delito, hora, lugar, sexo')
        .range(from, from + batchSize - 1)
      if (!data || data.length === 0) break
      all = [...all, ...data]
      if (data.length < batchSize) break
      from += batchSize
    }
    setRows(all)
    setL2(false)
  }
  fetchAll()
}, [])

  if (l1 || l2) return (
    <div>
      <div className="page-header"><h1>📊 Dashboard</h1><p>Cargando datos…</p></div>
      <div className="kpi-grid">
        {[1,2,3,4].map(i => (
          <div key={i} className="kpi-card">
            <div className="skeleton" style={{height:12,width:'60%',marginBottom:8}}/>
            <div className="skeleton" style={{height:28,width:'40%'}}/>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Calcular estadísticas desde los rows ──────────────────────────────────
  if (!rows) return null

  // Frecuencia por delito
  const delitoCounts = {}
  const horaCounts   = {}
  const lugarCounts  = {}
  const sexoCounts   = { Hombre: 0, Mujer: 0 }
  const delitoSexo   = {}

  rows.forEach(r => {
    const d = r.codigo_delito
    const h = r.hora
    const l = r.lugar
    const s = r.sexo

    delitoCounts[d] = (delitoCounts[d] || 0) + 1
    horaCounts[h]   = (horaCounts[h]   || 0) + 1
    lugarCounts[l]  = (lugarCounts[l]  || 0) + 1
    if (s === 1) sexoCounts.Hombre++
    else          sexoCounts.Mujer++

    if (!delitoSexo[d]) delitoSexo[d] = { Hombre: 0, Mujer: 0 }
    if (s === 1) delitoSexo[d].Hombre++
    else          delitoSexo[d].Mujer++
  })

  const topDelitos = Object.entries(delitoCounts)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => ({ name: DELITOS[+k] || `D${k}`, value: v }))

  const delitoMasFrecuente = topDelitos[0]

  const horaData = Object.entries(horaCounts)
    .map(([k, v]) => ({ name: HORA[+k]?.replace(/\(.*\)/,'').trim() || `H${k}`, value: v }))

  const horaMasRiesgosa = Object.entries(horaCounts).sort((a,b) => b[1]-a[1])[0]
  const lugarMasRiesgoso = Object.entries(lugarCounts).sort((a,b) => b[1]-a[1])[0]

  // Top 5 por sexo
  const delitoSexoData = Object.entries(delitoSexo)
    .sort((a,b) => (b[1].Hombre+b[1].Mujer) - (a[1].Hombre+a[1].Mujer))
    .slice(0, 5)
    .map(([k, v]) => ({ name: `D${k}`, ...v }))

  return (
    <div>
      <div className="page-header">
        <h1>📊 Dashboard — Panorama Criminal ENVIPE 2025</h1>
        <p>Análisis de {rows.length.toLocaleString()} registros de victimización en México</p>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="label">Total victimizaciones</div>
          <div className="value">{rows.length.toLocaleString()}</div>
          <div className="sub">Registros ENVIPE 2025</div>
        </div>
        <div className="kpi-card">
          <div className="label">Delito más frecuente</div>
          <div className="value" style={{fontSize:18}}>{delitoMasFrecuente?.name}</div>
          <div className="sub">{delitoMasFrecuente?.value.toLocaleString()} casos</div>
        </div>
        <div className="kpi-card">
          <div className="label">Hora de mayor riesgo</div>
          <div className="value" style={{fontSize:18}}>
            {HORA[+horaMasRiesgosa?.[0]]?.split('(')[0]?.trim()}
          </div>
          <div className="sub">{horaMasRiesgosa?.[1]?.toLocaleString()} casos</div>
        </div>
        <div className="kpi-card">
          <div className="label">Lugar de mayor riesgo</div>
          <div className="value" style={{fontSize:18}}>{LUGAR[+lugarMasRiesgoso?.[0]]}</div>
          <div className="sub">{lugarMasRiesgoso?.[1]?.toLocaleString()} casos</div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="charts-grid">
        <div className="card">
          <div className="chart-title">Top 10 delitos por frecuencia</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topDelitos} layout="vertical" margin={{left:8,right:16}}>
              <XAxis type="number" tick={{fontSize:11}} />
              <YAxis type="category" dataKey="name" tick={{fontSize:11}} width={160}/>
              <Tooltip />
              <Bar dataKey="value" name="Casos" fill="#1A237E" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="chart-title">Distribución por hora del día</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={horaData} dataKey="value" nameKey="name"
                   cx="50%" cy="50%" outerRadius={95} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                   labelLine={false} fontSize={11}>
                {horaData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="chart-title">Top 5 delitos por sexo</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={delitoSexoData}>
              <XAxis dataKey="name" tick={{fontSize:11}}/>
              <YAxis tick={{fontSize:11}}/>
              <Tooltip />
              <Legend />
              <Bar dataKey="Hombre" fill="#1A237E" radius={[4,4,0,0]}/>
              <Bar dataKey="Mujer"  fill="#E91E63" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="chart-title">Distribución hombre vs mujer</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={[
                {name:'Hombre', value: sexoCounts.Hombre},
                {name:'Mujer',  value: sexoCounts.Mujer},
              ]} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={85}
                label={({name,percent})=>`${name} ${(percent*100).toFixed(1)}%`}>
                <Cell fill="#1A237E"/>
                <Cell fill="#E91E63"/>
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
