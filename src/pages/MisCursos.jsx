import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where, updateDoc, doc, increment } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import '../styles/MisCursos.css'

function MisCursos() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [inscripciones, setInscripciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [error, setError] = useState('')

  useEffect(() => {
    const cargarInscripciones = async () => {
      try {
        const q = query(collection(db, 'inscripciones'), where('alumnoId', '==', user.uid))
        const snap = await getDocs(q)
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        lista.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setInscripciones(lista)
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargarInscripciones()
  }, [user])

  const handleCancelar = async (inscripcion) => {
    if (!confirm('¿Cancelar esta inscripción?')) return
    try {
      await updateDoc(doc(db, 'inscripciones', inscripcion.id), { estado: 'cancelada' })
      // Decrementar inscritos en cada horario
      await Promise.all(inscripcion.horarioIds.map(hId =>
        updateDoc(doc(db, 'horarios', hId), { inscritos: increment(-1) })
      ))
      setInscripciones(inscripciones.map(i =>
        i.id === inscripcion.id ? { ...i, estado: 'cancelada' } : i
      ))
    } catch (err) {
      setError('Error al cancelar')
    }
  }

  const getEstadoColor = (estado) => {
    if (estado === 'confirmada') return 'estado-confirmada'
    if (estado === 'cancelada') return 'estado-cancelada'
    return 'estado-pendiente'
  }

  const getEstadoTexto = (estado) => {
    if (estado === 'confirmada') return '✅ Confirmada'
    if (estado === 'cancelada') return '❌ Cancelada'
    return '⏳ Pendiente'
  }

  const inscripcionesFiltradas = inscripciones.filter(i => {
    if (filtro === 'todas') return true
    return i.estado === filtro
  })

  return (
    <div className="mc-container">
      <div className="mc-header">
        <button className="btn-volver" onClick={() => navigate('/dashboard')}>← Volver</button>
        <h1>📖 Mis Cursos</h1>
        <p>Cursos en los que estás inscrito</p>
      </div>

      {error && <div className="mc-error">{error}</div>}

      <div className="filtros">
        {['todas', 'pendiente', 'confirmada', 'cancelada'].map(f => (
          <button
            key={f}
            className={`filtro-btn ${filtro === f ? 'activo' : ''}`}
            onClick={() => setFiltro(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="cargando">Cargando cursos...</p>
      ) : inscripcionesFiltradas.length === 0 ? (
        <div className="mc-vacio">
          <p>📭 No tienes inscripciones {filtro !== 'todas' ? `con estado "${filtro}"` : ''}.</p>
          <button className="btn-primary" onClick={() => navigate('/buscar-cursos')}>
            Buscar cursos
          </button>
        </div>
      ) : (
        <div className="mc-lista">
          {inscripcionesFiltradas.map(inscripcion => (
            <div key={inscripcion.id} className="mc-card">
              <div className="mc-card-header">
                <div className="mc-card-info">
                  <div className="mc-titulo-row">
                    <h3>{inscripcion.cursoTitulo}</h3>
                    <span className={`estado-badge ${getEstadoColor(inscripcion.estado)}`}>
                      {getEstadoTexto(inscripcion.estado)}
                    </span>
                  </div>
                  <span className="mc-materia-tag">{inscripcion.materia}</span>
                  <p className="mc-asesor">👨‍🏫 {inscripcion.asesorNombre}</p>

                  {/* Horarios inscritos */}
                  <div className="mc-horarios">
                    <p className="mc-horarios-titulo">📅 Tus horarios:</p>
                    <div className="mc-horarios-chips">
                      {inscripcion.horarios?.map((h, i) => (
                        <span key={i} className="mc-horario-chip">
                          {h.dia} · {h.horaInicio} - {h.horaFin}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="mc-fecha">
                    Inscrito el {new Date(inscripcion.createdAt).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>

                <div className="mc-acciones">
                  {inscripcion.estado === 'confirmada' && (
                    <button
                      className="btn-chat"
                      onClick={() => navigate('/chat')}
                    >
                      💬 Chat con asesor
                    </button>
                  )}
                  {inscripcion.estado === 'pendiente' && (
                    <button
                      className="btn-cancelar"
                      onClick={() => handleCancelar(inscripcion)}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MisCursos