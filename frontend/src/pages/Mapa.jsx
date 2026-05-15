import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

const DELITOS = {
  0:"Todos los delitos",1:"Asalto en vía pública o transporte",
  2:"Robo sin violencia (carterismo, etc.)",3:"Fraude o engaño económico",
  4:"Extorsión o cobro de piso",5:"Amenazas o intimidación personal",
  6:"Agresión física o golpes",7:"Secuestro o retención ilegal",
  8:"Acoso o agresión sexual",9:"Robo de vehículo o autopartes",
  10:"Robo a domicilio",11:"Vandalismo, daño a propiedad o delitos menores",
  12:"Homicidio por accidente o negligencia",13:"Corrupción o abuso de autoridad",
  14:"Asalto en carretera",15:"Delitos federales (narcóticos, tráfico, etc.)",
};

const ESTADOS = {
  1:"Aguascalientes",2:"Baja California",3:"Baja California Sur",
  4:"Campeche",5:"Coahuila",6:"Colima",7:"Chiapas",8:"Chihuahua",
  9:"Ciudad de México",10:"Durango",11:"Guanajuato",12:"Guerrero",
  13:"Hidalgo",14:"Jalisco",15:"Estado de México",16:"Michoacán",
  17:"Morelos",18:"Nayarit",19:"Nuevo León",20:"Oaxaca",
  21:"Puebla",22:"Querétaro",23:"Quintana Roo",24:"San Luis Potosí",
  25:"Sinaloa",26:"Sonora",27:"Tabasco",28:"Tamaulipas",
  29:"Tlaxcala",30:"Veracruz",31:"Yucatán",32:"Zacatecas",
};

const COLOR_EMPTY = "#182820";
const colorScale = d3.scaleSequentialLog(d3.interpolateYlOrRd);

function getColor(val, max) {
  if (!val || val === 0) return COLOR_EMPTY;
  colorScale.domain([1, Math.max(max, 2)]);
  return colorScale(Math.min(val, max));
}

// Estado global — persiste entre re-renders sin closures obsoletos
const G = {
  features: [],
  crime: {},    // { "ent_mun": { "delito": count } }
  delito: 0,
  max: 0,
  svg: null,
  path: null,
};

function calcMax(delito) {
  let mx = 0;
  for (const k of Object.keys(G.crime)) {
    const d = G.crime[k];
    const v = delito === 0
      ? Object.values(d).reduce((a, b) => a + b, 0)
      : (d[String(delito)] ?? 0);
    if (v > mx) mx = v;
  }
  return mx;
}

function getVal(sc, mc) {
  const d = G.crime[`${sc}_${mc}`];
  if (!d) return null;
  return G.delito === 0
    ? Object.values(d).reduce((a, b) => a + b, 0)
    : (d[String(G.delito)] ?? 0);
}

function paintAll() {
  if (!G.svg) return;
  d3.select(G.svg).selectAll(".mun").attr("fill", d => {
    if (!d?.properties) return COLOR_EMPTY;
    return getColor(getVal(d.properties.state_code, d.properties.mun_code), G.max);
  });
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tooltip({ data, x, y, visible }) {
  if (!visible || !data) return null;
  return (
    <div style={{
      position:"fixed", left:x+14, top:y-10, zIndex:3000,
      background:"rgba(5,10,20,0.97)", color:"#f1f5f9",
      padding:"10px 14px", borderRadius:10, fontSize:13,
      fontFamily:"'DM Sans',sans-serif", pointerEvents:"none",
      border:"1px solid rgba(11,127,199,0.4)",
      boxShadow:"0 8px 32px rgba(0,0,0,0.7)", maxWidth:240,
    }}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{data.name}</div>
      <div style={{color:"#475569",fontSize:11,marginBottom:7}}>{data.state}</div>
      {data.count != null ? (
        <div style={{fontWeight:700,fontSize:17,
          color:data.count > 0 ? "#fb923c" : "#4ade80"}}>
          {data.count > 0
            ? `${data.count.toLocaleString()} delito${data.count !== 1 ? "s" : ""}`
            : "Sin delitos registrados"}
        </div>
      ) : (
        <div style={{color:"#1e3a5f",fontSize:12}}>Sin muestra ENVIPE</div>
      )}
    </div>
  );
}

// ── Leyenda ───────────────────────────────────────────────────────────────────
function Leyenda({ max }) {
  const n = 8;
  colorScale.domain([1, Math.max(max, 2)]);
  const colors = Array.from({length:n}, (_, i) =>
    colorScale(1 + (i / (n - 1)) * (Math.max(max, 2) - 1))
  );
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8}}>
      <span style={{fontSize:10,color:"#64748b",whiteSpace:"nowrap"}}>✅ Bajo</span>
      <div style={{display:"flex",height:10,flex:1,maxWidth:150,borderRadius:3,
        overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)"}}>
        {colors.map((c,i) => <div key={i} style={{flex:1,background:c}}/>)}
      </div>
      <span style={{fontSize:10,color:"#64748b",whiteSpace:"nowrap"}}>🔴 Alto</span>
      {max > 0 && <span style={{fontSize:10,color:"#1e3a5f",marginLeft:2,whiteSpace:"nowrap"}}>
        máx {max.toLocaleString()}
      </span>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Mapa() {
  const svgRef      = useRef(null);
  const containerRef= useRef(null);
  const zoomRef     = useRef(null);

  const [selectedDelito, setSelectedDelito] = useState(0);
  const [tooltip, setTooltip] = useState({visible:false,x:0,y:0,data:null});
  const [status,  setStatus]  = useState("loading");
  const [maxValue,setMaxValue]= useState(0);

  // ── Construir SVG ──────────────────────────────────────────────────────────
  function buildSVG() {
    if (!svgRef.current || !containerRef.current || !G.features.length) return;
    G.svg = svgRef.current;

    const C = containerRef.current;
    const W = C.clientWidth  || window.innerWidth;
    const H = C.clientHeight || window.innerHeight - 200;

    const geo = { type:"FeatureCollection", features:G.features };
    const proj = d3.geoMercator().fitSize([W, H], geo);
    G.path = d3.geoPath().projection(proj);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`)
       .style("width","100%").style("height","100%");
    svg.append("rect").attr("width",W).attr("height",H).attr("fill","#050d1a");

    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([1,20])
      .on("zoom", ev => g.attr("transform", ev.transform));
    svg.call(zoom);
    zoomRef.current = zoom;

    g.selectAll(".mun")
      .data(G.features)
      .enter().append("path")
      .attr("class","mun")
      .attr("d", G.path)
      .attr("fill", d => {
        if (!d?.properties) return COLOR_EMPTY;
        // Pintar con datos ya disponibles
        return getColor(getVal(d.properties.state_code, d.properties.mun_code), G.max);
      })
      .attr("stroke","rgba(255,255,255,0.12)")
      .attr("stroke-width",0.2)
      .style("cursor","pointer")
      .on("mousemove", function(ev, d) {
        const { state_code:sc, mun_code:mc, mun_name:mn } = d.properties;
        const count = getVal(sc, mc);
        setTooltip({visible:true, x:ev.clientX, y:ev.clientY,
          data:{name:mn||`Mun ${mc}`, state:ESTADOS[sc]||`Estado ${sc}`, count}});
        d3.select(this).attr("stroke","#fff").attr("stroke-width",1.2).raise();
      })
      .on("mouseleave", function() {
        setTooltip(t => ({...t, visible:false}));
        d3.select(this).attr("stroke","rgba(255,255,255,0.12)").attr("stroke-width",0.2);
      });
  }

  // ── Cargar ambos archivos en paralelo, luego dibujar ──────────────────────
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/mx-municipios.json").then(r => r.json()),
      fetch("/crime-data.json").then(r => r.json()),
    ]).then(([geo, crime]) => {
      if (!alive) return;
      G.features = geo.features;
      G.crime    = crime;
      G.delito   = 0;
      G.max      = calcMax(0);
      buildSVG();
      setMaxValue(G.max);
      setStatus("ok");
    }).catch(e => {
      if (!alive) return;
      console.error("Error cargando archivos:", e);
      setStatus("error");
    });
    return () => { alive = false; };
  // eslint-disable-next-line
  }, []);

  // ── Cambio de delito ───────────────────────────────────────────────────────
  useEffect(() => {
    G.delito = selectedDelito;
    G.max    = calcMax(selectedDelito);
    setMaxValue(G.max);
    paintAll();
  // eslint-disable-next-line
  }, [selectedDelito]);

  // ── ResizeObserver ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let timer = null;
    const obs = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!G.features.length || !svgRef.current || !containerRef.current) return;
        const C = containerRef.current;
        const W = C.clientWidth  || window.innerWidth;
        const H = C.clientHeight || window.innerHeight - 200;
        const geo = { type:"FeatureCollection", features:G.features };
        G.path = d3.geoPath().projection(d3.geoMercator().fitSize([W,H], geo));
        const svg = d3.select(svgRef.current);
        svg.attr("viewBox", `0 0 ${W} ${H}`);
        svg.select("rect").attr("width",W).attr("height",H);
        svg.selectAll("path").attr("d", G.path);
        paintAll();
      }, 150);
    });
    obs.observe(containerRef.current);
    return () => { obs.disconnect(); clearTimeout(timer); };
  // eslint-disable-next-line
  }, []);

  const resetZoom = () => {
    if (svgRef.current && zoomRef.current)
      d3.select(svgRef.current).transition().duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div className="mapa-page" style={{
      background:"#0a1520", color:"#f1f5f9",
      fontFamily:"'DM Sans',sans-serif",
    }}>
      <div style={{padding:"11px 14px 9px",
        borderBottom:"1px solid rgba(255,255,255,0.07)",
        background:"rgba(6,12,22,0.95)", flexShrink:0}}>

        <div style={{display:"flex",alignItems:"center",
          justifyContent:"space-between",marginBottom:7}}>
          <span style={{fontSize:11,fontWeight:700,color:"#0B7FC7",
            textTransform:"uppercase",letterSpacing:1}}>
            Mapa de Incidencia Delictiva
          </span>
          <button onClick={resetZoom} style={{
            background:"rgba(11,127,199,0.12)",
            border:"1px solid rgba(11,127,199,0.3)",
            color:"#0B7FC7",borderRadius:6,padding:"3px 9px",
            fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
            ↺ Reset
          </button>
        </div>

        <div style={{position:"relative"}}>
          <select value={selectedDelito}
            onChange={e => setSelectedDelito(Number(e.target.value))}
            style={{width:"100%",padding:"8px 28px 8px 12px",
              background:"rgba(12,20,36,0.95)",color:"#f1f5f9",
              border:"1px solid rgba(11,127,199,0.4)",borderRadius:8,
              fontSize:13,fontFamily:"inherit",appearance:"none",
              cursor:"pointer",outline:"none"}}>
            {Object.entries(DELITOS).map(([k,v]) => (
              <option key={k} value={k}>{k==="0"?"🔍 ":`${k}. `}{v}</option>
            ))}
          </select>
          <div style={{position:"absolute",right:9,top:"50%",
            transform:"translateY(-50%)",color:"#0B7FC7",
            pointerEvents:"none",fontSize:10}}>▼</div>
        </div>

        <Leyenda max={maxValue}/>

        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:6}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:10,height:10,borderRadius:2,background:COLOR_EMPTY,
              border:"1px solid rgba(255,255,255,0.1)"}}/>
            <span style={{fontSize:10,color:"#1e3a5f"}}>Sin muestra ENVIPE</span>
          </div>
          <span style={{fontSize:10,color:"#1e3a5f"}}>Scroll=zoom · Arrastra=mover</span>
        </div>
      </div>

      <div ref={containerRef} style={{flex:1,position:"relative",overflow:"hidden",minHeight:0}}>
        {status==="loading" && (
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",gap:14,background:"#0a1520"}}>
            <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
            <div style={{width:40,height:40,
              border:"3px solid rgba(11,127,199,0.15)",
              borderTopColor:"#0B7FC7",borderRadius:"50%",
              animation:"spin 1s linear infinite"}}/>
            <div style={{fontSize:13,color:"#475569"}}>Cargando mapa…</div>
          </div>
        )}
        {status==="error" && (
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",gap:12,padding:28,textAlign:"center"}}>
            <div style={{fontSize:46}}>🗺️</div>
            <div style={{fontWeight:700,color:"#f1f5f9"}}>Error al cargar el mapa</div>
            <button onClick={() => window.location.reload()} style={{
              padding:"9px 22px",background:"#0B7FC7",color:"#fff",
              border:"none",borderRadius:8,cursor:"pointer",
              fontSize:13,fontFamily:"inherit"}}>Reintentar</button>
          </div>
        )}
        <svg ref={svgRef} style={{
          display:"block",width:"100%",height:"100%",
          opacity:status==="ok"?1:0,transition:"opacity 0.4s"}}/>
      </div>

      <Tooltip {...tooltip}/>
    </div>
  );
}
