import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts'
import '../styles/Estadisticas.css'

function Estadisticas() {
  const navigate = useNavigate()
  const { user, perfil } = useAuthStore()
  const { darkMode } = useThemeStore()

  const gridColor = darkMode ? '#334155' : '#e2e8f0'
  const textColor = darkMode ? '#94a3b8' : '#64748b'
  const tooltipBg = darkMode ? '#1e293b' : '#ffffff'
  const tooltipBorder = darkMode ? '#334155' : '#e2e8f0'
  const COLORES = darkMode
    ? ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe']
    : ['#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']

  const [cargando, setCargando] = useState(true)
  const [stats, setStats] = useState({
    totalCursos: 0,
    totalInscripciones: 0,
    inscripcionesConfirmadas: 0,
    inscripcionesPendientes: 0,
    totalCalificaciones: 0,
    promedioCalificacion: 0,
    cursosMasPopulares: [],
    inscripcionesPorEstado: [],
    calificacionesPorEstrella: []
  })

  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        if (perfil?.rol === 'asesor') {
          const qCursos = query(collection(db, 'cursos'), where('asesorId', '==', user.uid))
          const snapCursos = await getDocs(qCursos)
          const cursos = snapCursos.docs.map(d => ({ id: d.id, ...d.data() }))

          const qInsc = query(collection(db, 'inscripciones'), where('asesorId', '==', user.uid))
          const snapInsc = await getDocs(qInsc)
          const inscripciones = snapInsc.docs.map(d => ({ id: d.id, ...d.data() }))

          const qCal = query(collection(db, 'calificaciones'), where('asesorId', '==', user.uid))
          const snapCal = await getDocs(qCal)
          const calificaciones = snapCal.docs.map(d => ({ id: d.id, ...d.data() }))

          const confirmadas = inscripciones.filter(i => i.estado === 'confirmada').length
          const pendientes = inscripciones.filter(i => i.estado === 'pendiente').length
          const canceladas = inscripciones.filter(i => i.estado === 'cancelada').length

          const promedio = calificaciones.length > 0
            ? (calificaciones.reduce((sum, c) => sum + c.estrellas, 0) / calificaciones.length).toFixed(1)
            : 0

          const cursosMasPopulares = cursos.map(c => ({
            nombre: c.titulo.length > 12 ? c.titulo.substring(0, 12) + '...' : c.titulo,
            inscritos: inscripciones.filter(i => i.cursoId === c.id).length
          })).sort((a, b) => b.inscritos - a.inscritos).slice(0, 5)

          const inscripcionesPorEstado = [
            { nombre: 'Confirmadas', valor: confirmadas },
            { nombre: 'Pendientes', valor: pendientes },
            { nombre: 'Canceladas', valor: canceladas }
          ].filter(i => i.valor > 0)

          const calificacionesPorEstrella = [1, 2, 3, 4, 5].map(estrella => ({
            estrella: `${estrella}⭐`,
            cantidad: calificaciones.filter(c => c.estrellas === estrella).length
          }))

          setStats({
            totalCursos: cursos.length,
            totalInscripciones: inscripciones.length,
            inscripcionesConfirmadas: confirmadas,
            inscripcionesPendientes: pendientes,
            totalCalificaciones: calificaciones.length,
            promedioCalificacion: promedio,
            cursosMasPopulares,
            inscripcionesPorEstado,
            calificacionesPorEstrella
          })
        } else {
          const qInsc = query(collection(db, 'inscripciones'), where('alumnoId', '==', user.uid))
          const snapInsc = await getDocs(qInsc)
          const inscripciones = snapInsc.docs.map(d => ({ id: d.id, ...d.data() }))

          const qCal = query(collection(db, 'calificaciones'), where('alumnoId', '==', user.uid))
          const snapCal = await getDocs(qCal)
          const calificaciones = snapCal.docs.map(d => ({ id: d.id, ...d.data() }))

          const confirmadas = inscripciones.filter(i => i.estado === 'confirmada').length
          const pendientes = inscripciones.filter(i => i.estado === 'pendiente').length
          const canceladas = inscripciones.filter(i => i.estado === 'cancelada').length

          const inscripcionesPorEstado = [
            { nombre: 'Confirmadas', valor: confirmadas },
            { nombre: 'Pendientes', valor: pendientes },
            { nombre: 'Canceladas', valor: canceladas }
          ].filter(i => i.valor > 0)

          const cursosPorMateria = inscripciones.reduce((acc, i) => {
            const materia = i.materia || 'Otro'
            acc[materia] = (acc[materia] || 0) + 1
            return acc
          }, {})

          const cursosMasPopulares = Object.entries(cursosPorMateria).map(([nombre, inscritos]) => ({
            nombre, inscritos
          }))

          setStats({
            totalCursos: inscripciones.length,
            totalInscripciones: inscripciones.length,
            inscripcionesConfirmadas: confirmadas,
            inscripcionesPendientes: pendientes,
            totalCalificaciones: calificaciones.length,
            promedioCalificacion: 0,
            cursosMasPopulares,
            inscripcionesPorEstado,
            calificacionesPorEstrella: []
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargarEstadisticas()
  }, [user, perfil])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: tooltipBg, border: `1px solid ${tooltipBorder}`,
          padding: '0.6rem 1rem', borderRadius: '8px',
          fontSize: '0.85rem', color: textColor, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <p style={{fontWeight: 600, marginBottom: '0.2rem'}}>{label}</p>
          <p>{payload[0].value}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="stats-container">
      <div className="stats-header">
        <button className="btn-volver" onClick={() => navigate('/dashboard')}>← Volver</button>
        <h1>📊 Estadísticas</h1>
        <p>{perfil?.rol === 'asesor' ? 'Resumen de tu actividad como asesor' : 'Resumen de tu actividad'}</p>
      </div>

      {cargando ? (
        <p className="cargando">Cargando estadísticas...</p>
      ) : (
        <>
          <div className="stats-cards">
            <div className="stats-card azul">
              <span className="stats-card-numero">{perfil?.rol === 'asesor' ? stats.totalCursos : stats.totalInscripciones}</span>
              <span className="stats-card-label">{perfil?.rol === 'asesor' ? 'Cursos creados' : 'Cursos inscritos'}</span>
            </div>
            <div className="stats-card verde">
              <span className="stats-card-numero">{stats.inscripcionesConfirmadas}</span>
              <span className="stats-card-label">{perfil?.rol === 'asesor' ? 'Alumnos confirmados' : 'Confirmados'}</span>
            </div>
            <div className="stats-card amarillo">
              <span className="stats-card-numero">{stats.inscripcionesPendientes}</span>
              <span className="stats-card-label">Pendientes</span>
            </div>
            {perfil?.rol === 'asesor' && (
              <div className="stats-card naranja">
                <span className="stats-card-numero">{stats.promedioCalificacion || '—'}</span>
                <span className="stats-card-label">Promedio ⭐</span>
              </div>
            )}
          </div>

          <div className="stats-graficas">
            {stats.cursosMasPopulares.length > 0 && (
              <div className="grafica-card">
                <h2>{perfil?.rol === 'asesor' ? 'Inscripciones por curso' : 'Cursos por materia'}</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.cursosMasPopulares} margin={{top: 5, right: 10, left: -20, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="inscritos" fill={COLORES[0]} radius={[6, 6, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {stats.inscripcionesPorEstado.length > 0 && (
              <div className="grafica-card">
                <h2>Estado de inscripciones</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={stats.inscripcionesPorEstado}
                      dataKey="valor"
                      nameKey="nombre"
                      cx="50%" cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                    >
                      {stats.inscripcionesPorEstado.map((_, i) => (
                        <Cell key={i} fill={COLORES[i % COLORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '0.82rem', color: textColor }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {perfil?.rol === 'asesor' && stats.calificacionesPorEstrella.length > 0 && (
              <div className="grafica-card grafica-full">
                <h2>Distribución de calificaciones recibidas</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.calificacionesPorEstrella} margin={{top: 5, right: 10, left: -20, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="estrella" tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {stats.totalInscripciones === 0 && stats.totalCursos === 0 && (
            <div className="stats-vacio">
              <p>📊 No hay datos suficientes para mostrar estadísticas todavía.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Estadisticas