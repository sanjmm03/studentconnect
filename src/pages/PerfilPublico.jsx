import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import '../styles/PerfilPublico.css'

function Estrellas({ valor }) {
  return (
    <div className="estrellas-mini">
      {[1,2,3,4,5].map(e => (
        <span key={e} className={`estrella-mini ${e <= Math.round(valor) ? 'activa' : ''}`}>★</span>
      ))}
    </div>
  )
}

function PerfilPublico() {
  const navigate = useNavigate()
  const { asesorId } = useParams()
  const { user } = useAuthStore()

  const [asesor, setAsesor] = useState(null)
  const [cursos, setCursos] = useState([])
  const [calificaciones, setCalificaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      try {
        const asesorDoc = await getDoc(doc(db, 'usuarios', asesorId))
        if (!asesorDoc.exists()) { navigate(-1); return }
        setAsesor({ id: asesorDoc.id, ...asesorDoc.data() })

        const qCursos = query(
          collection(db, 'cursos'),
          where('asesorId', '==', asesorId),
          where('estado', '==', 'activo')
        )
        const snapCursos = await getDocs(qCursos)
        setCursos(snapCursos.docs.map(d => ({ id: d.id, ...d.data() })))

        const qCal = query(collection(db, 'calificaciones'), where('asesorId', '==', asesorId))
        const snapCal = await getDocs(qCal)
        setCalificaciones(snapCal.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [asesorId])

  const promedio = calificaciones.length > 0
    ? (calificaciones.reduce((sum, c) => sum + c.estrellas, 0) / calificaciones.length).toFixed(1)
    : null

  if (cargando) return <div className="pp-loading">Cargando perfil...</div>
  if (!asesor) return null

  return (
    <div className="pp-container">
      <button className="btn-volver" onClick={() => navigate(-1)}>← Volver</button>

      {/* Header del perfil */}
      <div className="pp-header-card">
        <div className="pp-avatar-grande">
          {asesor.fotoPerfil ? (
            <img src={asesor.fotoPerfil} alt={asesor.nombre} />
          ) : (
            <div className="pp-avatar-placeholder">
              {asesor.nombre?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="pp-info">
          <h1>{asesor.nombre}</h1>
          <p className="pp-rol">👨‍🏫 Asesor</p>
          {promedio && (
            <div className="pp-promedio">
              <Estrellas valor={promedio} />
              <span>{promedio} · {calificaciones.length} reseña(s)</span>
            </div>
          )}
          {asesor.bio && <p className="pp-bio">{asesor.bio}</p>}
          {asesor.materias && asesor.materias.length > 0 && (
            <div className="pp-materias">
              {asesor.materias.map(m => (
                <span key={m} className="pp-materia-tag">{m}</span>
              ))}
            </div>
          )}
        </div>
        {user?.uid !== asesorId && (
          <button className="btn-primary pp-btn-chat" onClick={() => navigate('/chat')}>
            💬 Enviar mensaje
          </button>
        )}
      </div>

      {/* Cursos activos */}
      <div className="pp-section">
        <h2>📚 Cursos activos ({cursos.length})</h2>
        {cursos.length === 0 ? (
          <div className="pp-vacio">No tiene cursos activos actualmente.</div>
        ) : (
          <div className="pp-cursos-grid">
            {cursos.map(curso => (
              <div
                key={curso.id}
                className="pp-curso-card"
                onClick={() => navigate('/buscar-cursos')}
              >
                <span className="pp-materia-tag">{curso.materia}</span>
                <h3>{curso.titulo}</h3>
                <p>{curso.descripcion}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reseñas */}
      <div className="pp-section">
        <h2>⭐ Reseñas ({calificaciones.length})</h2>
        {calificaciones.length === 0 ? (
          <div className="pp-vacio">Este asesor aún no tiene reseñas.</div>
        ) : (
          <div className="pp-resenas">
            {calificaciones.map(cal => (
              <div key={cal.id} className="pp-resena-card">
                <div className="pp-resena-header">
                  <div className="pp-resena-avatar">
                    {cal.alumnoNombre?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong>{cal.alumnoNombre}</strong>
                    <p className="pp-resena-fecha">
                      {new Date(cal.createdAt).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <Estrellas valor={cal.estrellas} />
                </div>
                {cal.comentario && (
                  <p className="pp-resena-comentario">"{cal.comentario}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PerfilPublico