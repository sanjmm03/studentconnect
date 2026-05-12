import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import '../styles/Notificaciones.css'

function Notificaciones() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [notificaciones, setNotificaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'notificaciones'),
      where('usuarioId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      setNotificaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setCargando(false)
    })

    return () => unsub()
  }, [user])

  const marcarLeida = async (id) => {
    await updateDoc(doc(db, 'notificaciones', id), { leida: true })
  }

  const marcarTodasLeidas = async () => {
    const pendientes = notificaciones.filter(n => !n.leida)
    await Promise.all(pendientes.map(n => updateDoc(doc(db, 'notificaciones', n.id), { leida: true })))
  }

  const getTipoIcono = (tipo) => {
    if (tipo === 'inscripcion') return '📋'
    if (tipo === 'confirmacion') return '✅'
    if (tipo === 'rechazo') return '❌'
    if (tipo === 'chat') return '💬'
    return '🔔'
  }

  const noLeidas = notificaciones.filter(n => !n.leida).length

  return (
    <div className="noti-container">
      <div className="noti-header">
        <button className="btn-volver" onClick={() => navigate('/dashboard')}>← Volver</button>
        <div className="noti-header-top">
          <div>
            <h1>🔔 Notificaciones</h1>
            <p>{noLeidas > 0 ? `${noLeidas} sin leer` : 'Todo al día'}</p>
          </div>
          {noLeidas > 0 && (
            <button className="btn-marcar-todas" onClick={marcarTodasLeidas}>
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <p className="cargando">Cargando notificaciones...</p>
      ) : notificaciones.length === 0 ? (
        <div className="noti-vacio">
          <p>🔔 No tienes notificaciones todavía.</p>
        </div>
      ) : (
        <div className="noti-lista">
          {notificaciones.map(noti => (
            <div
              key={noti.id}
              className={`noti-card ${!noti.leida ? 'no-leida' : ''}`}
              onClick={() => !noti.leida && marcarLeida(noti.id)}
            >
              <div className="noti-icono">{getTipoIcono(noti.tipo)}</div>
              <div className="noti-info">
                <h3>{noti.titulo}</h3>
                <p>{noti.mensaje}</p>
                <span className="noti-fecha">
                  {new Date(noti.createdAt).toLocaleDateString('es-MX', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              {!noti.leida && <div className="noti-punto" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notificaciones