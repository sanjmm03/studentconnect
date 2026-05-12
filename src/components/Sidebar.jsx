import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import './Sidebar.css'
import useThemeStore from '../store/themeStore'

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { perfil, user, logout } = useAuthStore()
  const [abierto, setAbierto] = useState(false)
  const [notisNoLeidas, setNotisNoLeidas] = useState(0)
  const [chatsNoLeidos, setChatsNoLeidos] = useState(0)
  const { darkMode, toggleDarkMode } = useThemeStore()

  useEffect(() => {
    if (!user) return

    const qNoti = query(
      collection(db, 'notificaciones'),
      where('usuarioId', '==', user.uid),
      where('leida', '==', false)
    )
    const unsubNoti = onSnapshot(qNoti, snap => setNotisNoLeidas(snap.size))

    const cargarChats = async () => {
      const campo = perfil?.rol === 'alumno' ? 'alumnoId' : 'asesorId'
      const campoCont = perfil?.rol === 'alumno' ? 'asesorId' : 'alumnoId'
      const q = query(
        collection(db, 'inscripciones'),
        where(campo, '==', user.uid),
        where('estado', '==', 'confirmada')
      )
      const snap = await getDocs(q)
      const contactIds = [...new Set(snap.docs.map(d => d.data()[campoCont]))]
      const contadores = {}
      const unsubChats = []

      contactIds.forEach(contactoId => {
        const chatId = [user.uid, contactoId].sort().join('_')
        const qMsg = query(
          collection(db, 'chats', chatId, 'mensajes'),
          where('leido', '==', false),
          where('senderId', '!=', user.uid)
        )
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

    return () => { unsubNoti(); cleanupChats() }
  }, [user, perfil])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  const NavBtn = ({ path, icon, label, badge }) => (
    <button
      className={`sb-item ${isActive(path) ? 'activo' : ''}`}
      onClick={() => { navigate(path); setAbierto(false) }}
    >
      <span className="sb-icon">{icon}</span>
      {abierto && <span className="sb-label">{label}</span>}
      {badge > 0 && <span className="sb-badge">{badge}</span>}
    </button>
  )

  return (
    <>
      {/* Overlay en móvil */}
      {abierto && <div className="sb-overlay" onClick={() => setAbierto(false)} />}

      <aside className={`sb-sidebar ${abierto ? 'abierto' : 'cerrado'}`}>
        {/* Header del sidebar */}
        <div className="sb-header">
          <button className="sb-hamburger" onClick={() => setAbierto(!abierto)}>
            {abierto ? '✕' : '☰'}
          </button>
          {abierto && (
          <button className="sb-dark-toggle" onClick={toggleDarkMode}>
          {darkMode ? '☀️' : '🌙'}
          </button>
        )}
        </div>

        {/* Avatar */}
        {abierto && (
          <div className="sb-perfil" onClick={() => { navigate('/perfil'); setAbierto(false) }}>
            <div className="sb-avatar">
              {perfil?.fotoPerfil
                ? <img src={perfil.fotoPerfil} alt="Perfil" />
                : <span>{perfil?.nombre?.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div>
              <p className="sb-nombre">{perfil?.nombre}</p>
              <p className="sb-rol">{perfil?.rol === 'asesor' ? '👨‍🏫 Asesor' : '👨‍🎓 Alumno'}</p>
            </div>
          </div>
        )}

        <nav className="sb-nav">
          {abierto && <p className="sb-seccion">MENÚ</p>}
          <NavBtn path="/dashboard" icon="🏠" label="Inicio" />
          <NavBtn path="/perfil" icon="👤" label="Mi Perfil" />

          {perfil?.rol === 'asesor' && (
            <>
              {abierto && <p className="sb-seccion">ASESOR</p>}
              <NavBtn path="/gestionar-cursos" icon="📚" label="Mis Cursos" />
            </>
          )}

          {perfil?.rol === 'alumno' && (
            <>
              {abierto && <p className="sb-seccion">ALUMNO</p>}
              <NavBtn path="/buscar-cursos" icon="🔍" label="Buscar Cursos" />
              <NavBtn path="/mis-cursos" icon="📖" label="Mis Cursos" />
            </>
          )}

          {abierto && <p className="sb-seccion">GENERAL</p>}
          <NavBtn path="/recursos" icon="📁" label="Recursos" />
          <NavBtn path="/chat" icon="💬" label="Chat" badge={chatsNoLeidos} />
          <NavBtn path="/calificaciones" icon="⭐" label="Calificaciones" />
          <NavBtn path="/notificaciones" icon="🔔" label="Notificaciones" badge={notisNoLeidas} />
          <NavBtn path="/estadisticas" icon="📊" label="Estadísticas" />
          <NavBtn path="/anuncios" icon="📢" label="Anuncios" />
        </nav>

        <button className="sb-logout" onClick={handleLogout}>
          <span className="sb-icon">🚪</span>
          {abierto && <span>Cerrar Sesión</span>}
        </button>
      </aside>
    </>
  )
}

export default Sidebar