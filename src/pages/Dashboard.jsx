import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import Sidebar from '../components/Sidebar'
import BuscadorGlobal from '../components/BuscadorGlobal'
import '../styles/Dashboard.css'

function Dashboard() {
  const { perfil, user } = useAuthStore()
  const navigate = useNavigate()
  const [notisNoLeidas, setNotisNoLeidas] = useState(0)
  const [chatsNoLeidos, setChatsNoLeidos] = useState(0)
  const [cursosRecientes, setCursosRecientes] = useState([])
  const [recursosPopulares, setRecursosPopulares] = useState([])
  const [actividadReciente, setActividadReciente] = useState([])
  const [statsRapidas, setStatsRapidas] = useState({ cursos: 0, confirmadas: 0, calificaciones: 0 })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!user) return

    const qNoti = query(collection(db, 'notificaciones'), where('usuarioId', '==', user.uid), where('leida', '==', false))
    const unsubNoti = onSnapshot(qNoti, snap => setNotisNoLeidas(snap.size))

    const cargarChats = async () => {
      const campo = perfil?.rol === 'alumno' ? 'alumnoId' : 'asesorId'
      const campoCont = perfil?.rol === 'alumno' ? 'asesorId' : 'alumnoId'
      const q = query(collection(db, 'inscripciones'), where(campo, '==', user.uid), where('estado', '==', 'confirmada'))
      const snap = await getDocs(q)
      const contactIds = [...new Set(snap.docs.map(d => d.data()[campoCont]))]
      const contadores = {}
      const unsubChats = []
      contactIds.forEach(contactoId => {
        const chatId = [user.uid, contactoId].sort().join('_')
        const qMsg = query(collection(db, 'chats', chatId, 'mensajes'), where('leido', '==', false), where('senderId', '!=', user.uid))
        const unsub = onSnapshot(qMsg, snap => {
          contadores[contactoId] = snap.size
          setChatsNoLeidos(Object.values(contadores).reduce((s, n) => s + n, 0))
        })
        unsubChats.push(unsub)
      })
      return () => unsubChats.forEach(u => u())
    }

    let cleanupChats = () => {}
    cargarChats().then(cleanup => { if (cleanup) cleanupChats = cleanup })

    const cargarFeed = async () => {
      try {
        const qCursos = query(collection(db, 'cursos'), where('estado', '==', 'activo'), orderBy('createdAt', 'desc'), limit(4))
        const snapCursos = await getDocs(qCursos)
        setCursosRecientes(snapCursos.docs.map(d => ({ id: d.id, ...d.data() })))

        const qRecursos = query(collection(db, 'recursos'), orderBy('createdAt', 'desc'), limit(4))
        const snapRecursos = await getDocs(qRecursos)
        setRecursosPopulares(snapRecursos.docs.map(d => ({ id: d.id, ...d.data() })))

        const campoActividad = perfil?.rol === 'alumno' ? 'alumnoId' : 'asesorId'
        const qActividad = query(collection(db, 'inscripciones'), where(campoActividad, '==', user.uid), orderBy('createdAt', 'desc'), limit(5))
        const snapActividad = await getDocs(qActividad)
        setActividadReciente(snapActividad.docs.map(d => ({ id: d.id, ...d.data() })))

        const campoStats = perfil?.rol === 'alumno' ? 'alumnoId' : 'asesorId'
        const qStats = query(collection(db, 'inscripciones'), where(campoStats, '==', user.uid))
        const snapStats = await getDocs(qStats)
        const inscripciones = snapStats.docs.map(d => d.data())
        const confirmadas = inscripciones.filter(i => i.estado === 'confirmada').length
        const qCal = query(collection(db, 'calificaciones'), where('asesorId', '==', user.uid))
        const snapCal = await getDocs(qCal)

        if (perfil?.rol === 'asesor') {
          const qMisCursos = query(collection(db, 'cursos'), where('asesorId', '==', user.uid))
          const snapMisCursos = await getDocs(qMisCursos)
          setStatsRapidas({ cursos: snapMisCursos.size, confirmadas, calificaciones: snapCal.size })
        } else {
          setStatsRapidas({ cursos: inscripciones.length, confirmadas, calificaciones: 0 })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargarFeed()

    return () => { unsubNoti(); cleanupChats() }
  }, [user, perfil])

  const getEstadoColor = (estado) => {
    if (estado === 'confirmada') return '#22c55e'
    if (estado === 'cancelada') return '#ef4444'
    return '#f59e0b'
  }

  const getTipoIcono = (tipo) => {
    if (tipo === 'PDF') return '📄'
    if (tipo === 'Video') return '🎥'
    if (tipo === 'Enlace') return '🔗'
    if (tipo === 'Imagen') return '🖼️'
    return '📁'
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <h1>Bienvenido, {perfil?.nombre} 👋</h1>
            <p className="dashboard-rol">{perfil?.rol === 'asesor' ? '👨‍🏫 Asesor' : '👨‍🎓 Alumno'}</p>
          </div>
          <BuscadorGlobal />
          <div className="dashboard-header-right">
            <button className="noti-header-btn" onClick={() => navigate('/chat')}>
              💬
              {chatsNoLeidos > 0 && <span className="noti-badge">{chatsNoLeidos}</span>}
            </button>
            <button className="noti-header-btn" onClick={() => navigate('/notificaciones')}>
              🔔
              {notisNoLeidas > 0 && <span className="noti-badge">{notisNoLeidas}</span>}
            </button>
            <div className="dashboard-avatar" onClick={() => navigate('/perfil')} style={{cursor: 'pointer'}}>
              {perfil?.fotoPerfil ? (
                <img src={perfil.fotoPerfil} alt="Perfil" />
              ) : (
                <div className="avatar-placeholder">{perfil?.nombre?.charAt(0).toUpperCase()}</div>
              )}
            </div>
          </div>
        </div>

        <div className="feed-stats">
          <div className="feed-stat-card">
            <span className="feed-stat-icon">{perfil?.rol === 'asesor' ? '📚' : '📖'}</span>
            <div>
              <p className="feed-stat-numero">{statsRapidas.cursos}</p>
              <p className="feed-stat-label">{perfil?.rol === 'asesor' ? 'Cursos creados' : 'Cursos inscritos'}</p>
            </div>
          </div>
          <div className="feed-stat-card">
            <span className="feed-stat-icon">✅</span>
            <div>
              <p className="feed-stat-numero">{statsRapidas.confirmadas}</p>
              <p className="feed-stat-label">Confirmadas</p>
            </div>
          </div>
          {perfil?.rol === 'asesor' && (
            <div className="feed-stat-card">
              <span className="feed-stat-icon">⭐</span>
              <div>
                <p className="feed-stat-numero">{statsRapidas.calificaciones}</p>
                <p className="feed-stat-label">Reseñas recibidas</p>
              </div>
            </div>
          )}
          <div className="feed-stat-card clickable" onClick={() => navigate('/notificaciones')}>
            <span className="feed-stat-icon">🔔</span>
            <div>
              <p className="feed-stat-numero">{notisNoLeidas}</p>
              <p className="feed-stat-label">Notificaciones</p>
            </div>
          </div>
        </div>

        <div className="feed-layout">
          <div className="feed-main">
            <div className="feed-section">
              <div className="feed-section-header">
                <h2>📚 Cursos disponibles</h2>
                <button onClick={() => navigate(perfil?.rol === 'alumno' ? '/buscar-cursos' : '/gestionar-cursos')}>
                  Ver todos →
                </button>
              </div>
              {cargando ? (
                <p className="feed-cargando">Cargando...</p>
              ) : cursosRecientes.length === 0 ? (
                <div className="feed-vacio"><p>No hay cursos disponibles todavía.</p></div>
              ) : (
                <div className="feed-cursos-grid">
                  {cursosRecientes.map(curso => (
                    <div key={curso.id} className="feed-curso-card" onClick={() => navigate(perfil?.rol === 'alumno' ? '/buscar-cursos' : '/gestionar-cursos')}>
                      <div className="feed-curso-top">
                        <span className="feed-materia-tag">{curso.materia}</span>
                      </div>
                      <h3>{curso.titulo}</h3>
                      <p className="feed-curso-desc">{curso.descripcion}</p>
                      <div className="feed-curso-bottom">
                        <div className="feed-asesor-mini">
                          <div className="feed-avatar-mini">{curso.asesorNombre?.charAt(0).toUpperCase()}</div>
                          <span>{curso.asesorNombre}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="feed-section">
              <div className="feed-section-header">
                <h2>📁 Recursos recientes</h2>
                <button onClick={() => navigate('/recursos')}>Ver todos →</button>
              </div>
              {cargando ? (
                <p className="feed-cargando">Cargando...</p>
              ) : recursosPopulares.length === 0 ? (
                <div className="feed-vacio"><p>No hay recursos compartidos todavía.</p></div>
              ) : (
                <div className="feed-recursos-lista">
                  {recursosPopulares.map(recurso => (
                    <div key={recurso.id} className="feed-recurso-item" onClick={() => window.open(recurso.url, '_blank')}>
                      <span className="feed-recurso-icono">{getTipoIcono(recurso.tipo)}</span>
                      <div className="feed-recurso-info">
                        <h4>{recurso.titulo}</h4>
                        <p>{recurso.categoria} · Por {recurso.autorNombre}</p>
                      </div>
                      <span className="feed-recurso-arrow">→</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="feed-sidebar">
            <div className="feed-panel">
              <h3>⚡ Acciones rápidas</h3>
              <div className="feed-acciones">
                {perfil?.rol === 'asesor' ? (
                  <>
                    <button className="feed-accion-btn" onClick={() => navigate('/gestionar-cursos')}>+ Crear curso</button>
                    <button className="feed-accion-btn outline" onClick={() => navigate('/anuncios')}>📢 Publicar anuncio</button>
                    <button className="feed-accion-btn outline" onClick={() => navigate('/estadisticas')}>Ver estadísticas</button>
                    <button className="feed-accion-btn outline" onClick={() => navigate('/calificaciones')}>Ver reseñas</button>
                  </>
                ) : (
                  <>
                    <button className="feed-accion-btn" onClick={() => navigate('/buscar-cursos')}>Buscar cursos</button>
                    <button className="feed-accion-btn outline" onClick={() => navigate('/anuncios')}>📢 Ver anuncios</button>
                    <button className="feed-accion-btn outline" onClick={() => navigate('/mis-cursos')}>Mis cursos</button>
                    <button className="feed-accion-btn outline" onClick={() => navigate('/recursos')}>Ver recursos</button>
                  </>
                )}
              </div>
            </div>

            <div className="feed-panel">
              <h3>⚡ Actividad reciente</h3>
              {cargando ? (
                <p className="feed-cargando">Cargando...</p>
              ) : actividadReciente.length === 0 ? (
                <p className="feed-vacio-small">Sin actividad reciente.</p>
              ) : (
                <div className="feed-actividad-lista">
                  {actividadReciente.map(item => (
                    <div key={item.id} className="feed-actividad-item">
                      <div className="feed-actividad-dot" style={{backgroundColor: getEstadoColor(item.estado)}} />
                      <div>
                        <p className="feed-actividad-titulo">{item.cursoTitulo}</p>
                        <p className="feed-actividad-sub">
                          {perfil?.rol === 'alumno' ? item.asesorNombre : item.alumnoNombre}
                          {' · '}
                          <span style={{color: getEstadoColor(item.estado)}}>{item.estado}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard