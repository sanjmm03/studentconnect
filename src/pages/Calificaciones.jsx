import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import '../styles/Calificaciones.css'

function Estrellas({ valor, onChange, readonly }) {
  return (
    <div className="estrellas">
      {[1, 2, 3, 4, 5].map(estrella => (
        <span
          key={estrella}
          className={`estrella ${estrella <= valor ? 'activa' : ''} ${!readonly ? 'clickable' : ''}`}
          onClick={() => !readonly && onChange && onChange(estrella)}
        >
          ★
        </span>
      ))}
    </div>
  )
}

function Calificaciones() {
  const navigate = useNavigate()
  const { user, perfil } = useAuthStore()

  const [asesorias, setAsesorias] = useState([])
  const [calificaciones, setCalificaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [asesoriaSeleccionada, setAsesoriaSeleccionada] = useState(null)
  const [estrellas, setEstrellas] = useState(5)
  const [comentario, setComentario] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar asesorías confirmadas del alumno
        if (perfil?.rol === 'alumno') {
          const qAsesorias = query(
            collection(db, 'inscripciones'),
            where('alumnoId', '==', user.uid),
            where('estado', '==', 'confirmada')
          )
          const snapAsesorias = await getDocs(qAsesorias)
          setAsesorias(snapAsesorias.docs.map(d => ({ id: d.id, ...d.data() })))
        }

        // Cargar calificaciones recibidas (para asesor) o dadas (para alumno)
        const campo = perfil?.rol === 'asesor' ? 'asesorId' : 'alumnoId'
        const qCal = query(
          collection(db, 'calificaciones'),
          where(campo, '==', user.uid)
        )
        const snapCal = await getDocs(qCal)
        setCalificaciones(snapCal.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargarDatos()
  }, [user, perfil])

  const yaCalificada = (asesoriaId) => {
    return calificaciones.some(c => c.asesoriaId === asesoriaId)
  }

  const handleCalificar = async (e) => {
    e.preventDefault()
    if (!asesoriaSeleccionada) return
    setGuardando(true)
    setError('')
    try {
      const nuevaCalificacion = {
        asesoriaId: asesoriaSeleccionada.id,
        cursoTitulo: asesoriaSeleccionada.cursoTitulo,
        alumnoId: user.uid,
        alumnoNombre: perfil.nombre,
        asesorId: asesoriaSeleccionada.asesorId,
        asesorNombre: asesoriaSeleccionada.asesorNombre,
        estrellas,
        comentario: comentario.trim(),
        createdAt: new Date().toISOString()
      }
      await addDoc(collection(db, 'calificaciones'), nuevaCalificacion)
      setCalificaciones([...calificaciones, nuevaCalificacion])
      setAsesoriaSeleccionada(null)
      setEstrellas(5)
      setComentario('')
      setExito(true)
      setTimeout(() => setExito(false), 3000)
    } catch (err) {
      setError('Error al guardar la calificación')
    } finally {
      setGuardando(false)
    }
  }

  const promedioEstrellas = calificaciones.length > 0
    ? (calificaciones.reduce((sum, c) => sum + c.estrellas, 0) / calificaciones.length).toFixed(1)
    : null

  return (
    <div className="cal-container">
      <div className="cal-header">
        <button className="btn-volver" onClick={() => navigate('/dashboard')}>
          ← Volver
        </button>
        <h1>⭐ Calificaciones</h1>
        <p>
          {perfil?.rol === 'alumno'
            ? 'Califica a tus asesores'
            : 'Reseñas que has recibido'}
        </p>
      </div>

      {/* Promedio para asesor */}
      {perfil?.rol === 'asesor' && promedioEstrellas && (
        <div className="cal-promedio-card">
          <h2>Tu calificación promedio</h2>
          <div className="promedio-numero">{promedioEstrellas}</div>
          <Estrellas valor={Math.round(promedioEstrellas)} readonly />
          <p>{calificaciones.length} reseña(s)</p>
        </div>
      )}

      {/* Formulario para calificar (solo alumno) */}
      {perfil?.rol === 'alumno' && (
        <div className="cal-form-card">
          <h2>Calificar una asesoría</h2>

          {exito && <div className="cal-exito">✅ ¡Calificación enviada correctamente!</div>}
          {error && <div className="cal-error">{error}</div>}

          {asesorias.length === 0 ? (
            <p className="cal-vacio">No tienes asesorías confirmadas para calificar.</p>
          ) : (
            <>
              <p className="cal-subtitulo">Selecciona una asesoría:</p>
              <div className="asesorias-opciones">
                {asesorias.map(asesoria => {
                  const calificada = yaCalificada(asesoria.id)
                  return (
                    <div
                      key={asesoria.id}
                      className={`asesoria-opcion ${asesoriaSeleccionada?.id === asesoria.id ? 'seleccionada' : ''} ${calificada ? 'calificada' : ''}`}
                      onClick={() => !calificada && setAsesoriaSeleccionada(asesoria)}
                    >
                      <div>
                        <strong>{asesoria.asesorNombre}</strong>
                        <p>{asesoria.cursoTitulo}</p>
                      </div>
                      {calificada && <span className="badge-calificada">✓ Calificada</span>}
                    </div>
                  )
                })}
              </div>

              {asesoriaSeleccionada && (
                <form onSubmit={handleCalificar} className="cal-form">
                  <div className="form-group">
                    <label>Calificación</label>
                    <Estrellas valor={estrellas} onChange={setEstrellas} />
                  </div>
                  <div className="form-group">
                    <label>Comentario (opcional)</label>
                    <textarea
                      placeholder="Escribe tu experiencia con este asesor..."
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      rows={3}
                      disabled={guardando}
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={guardando}>
                    {guardando ? 'Enviando...' : '⭐ Enviar calificación'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}

      {/* Lista de calificaciones */}
      <div className="cal-lista">
        <h2>{perfil?.rol === 'asesor' ? 'Reseñas recibidas' : 'Calificaciones que has dado'}</h2>
        {cargando ? (
          <p className="cargando">Cargando...</p>
        ) : calificaciones.length === 0 ? (
          <div className="cal-vacio-card">
            <p>📭 No hay calificaciones aún.</p>
          </div>
        ) : (
          calificaciones.map(cal => (
            <div key={cal.id} className="cal-card">
              <div className="cal-card-header">
                <div className="cal-avatar">
                  {(perfil?.rol === 'asesor' ? cal.alumnoNombre : cal.asesorNombre)?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong>{perfil?.rol === 'asesor' ? cal.alumnoNombre : cal.asesorNombre}</strong>
                  <p className="cal-fecha">
                    {new Date(cal.createdAt).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
                <Estrellas valor={cal.estrellas} readonly />
              </div>
              {cal.comentario && (
                <p className="cal-comentario">"{cal.comentario}"</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Calificaciones