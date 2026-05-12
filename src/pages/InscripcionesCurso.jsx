import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { collection, getDocs, query, where, updateDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import '../styles/InscripcionesCurso.css'
import { crearNotificacion } from '../services/notificacionService'

function InscripcionesCurso() {
  const navigate = useNavigate()
  const { cursoId } = useParams()
  const [curso, setCurso] = useState(null)
  const [inscripciones, setInscripciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!cursoId) return
    const cargar = async () => {
      try {
        const cursoSnap = await getDoc(doc(db, 'cursos', cursoId))
        if (!cursoSnap.exists()) { navigate('/gestionar-cursos'); return }
        const cursoData = { id: cursoSnap.id, ...cursoSnap.data() }
        const qH = query(collection(db, 'horarios'), where('cursoId', '==', cursoId))
        const snapH = await getDocs(qH)
        cursoData.horarios = snapH.docs.map(h => ({ id: h.id, ...h.data() }))
        setCurso(cursoData)
        const q = query(collection(db, 'inscripciones'), where('cursoId', '==', cursoId))
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
    cargar()
  }, [cursoId])

  const cambiarEstado = async (id, estado) => {
  try {
    await updateDoc(doc(db, 'inscripciones', id), { estado })
    setInscripciones(inscripciones.map(i => i.id === id ? { ...i, estado } : i))

    // Buscar la inscripción para notificar al alumno
    const inscripcion = inscripciones.find(i => i.id === id)
    if (inscripcion) {
      const mensaje = estado === 'confirmada'
        ? `Tu inscripción al curso "${inscripcion.cursoTitulo}" fue confirmada`
        : `Tu inscripción al curso "${inscripcion.cursoTitulo}" fue rechazada`
      await crearNotificacion(
        inscripcion.alumnoId,
        estado === 'confirmada' ? 'Inscripción confirmada' : 'Inscripción rechazada',
        mensaje,
        estado === 'confirmada' ? 'confirmacion' : 'rechazo'
      )
    }
  } catch (err) {
    setError('Error al actualizar')
  }
}

  const filtradas = inscripciones.filter(i => filtro === 'todas' || i.estado === filtro)
  const confirmados = inscripciones.filter(i => i.estado === 'confirmada').length
  const pendientes = inscripciones.filter(i => i.estado === 'pendiente').length

  return (
    <div className="ic-container">
      <div className="ic-header">
        <button className="btn-volver" onClick={() => navigate('/gestionar-cursos')}>
          Volver a mis cursos
        </button>
        {curso && (
          <div>
            <h1>Inscripciones</h1>
            <p>{curso.titulo} - {curso.materia}</p>
          </div>
        )}
      </div>

      {error && <div className="ic-error">{error}</div>}

      {!cargando && (
        <div className="ic-stats">
          <div className="ic-stat-card">
            <span className="ic-stat-numero">{inscripciones.length}</span>
            <span className="ic-stat-label">Total</span>
          </div>
          <div className="ic-stat-card confirmada">
            <span className="ic-stat-numero">{confirmados}</span>
            <span className="ic-stat-label">Confirmados</span>
          </div>
          <div className="ic-stat-card pendiente">
            <span className="ic-stat-numero">{pendientes}</span>
            <span className="ic-stat-label">Pendientes</span>
          </div>
        </div>
      )}

      <div className="filtros">
        {['todas', 'pendiente', 'confirmada', 'cancelada'].map(f => (
          <button
            key={f}
            className={filtro === f ? 'filtro-btn activo' : 'filtro-btn'}
            onClick={() => setFiltro(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="cargando">Cargando...</p>
      ) : filtradas.length === 0 ? (
        <div className="ic-vacio">
          <p>No hay inscripciones todavia.</p>
        </div>
      ) : (
        <div className="ic-lista">
          {filtradas.map(ins => (
            <div key={ins.id} className="ic-card">
              <div className="ic-alumno-row">
                <div className="ic-avatar">
                  {ins.alumnoNombre?.charAt(0).toUpperCase()}
                </div>
                <div style={{flex: 1}}>
                  <h3>{ins.alumnoNombre}</h3>
                  <p className="ic-fecha">
                    {new Date(ins.createdAt).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                  <div className="ic-horarios-chips">
                    {ins.horarios?.map((h, i) => (
                      <span key={i} className="ic-horario-chip">
                        {h.dia} {h.horaInicio} - {h.horaFin}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={ins.estado === 'confirmada' ? 'estado-badge estado-confirmada' : ins.estado === 'cancelada' ? 'estado-badge estado-cancelada' : 'estado-badge estado-pendiente'}>
                  {ins.estado === 'confirmada' ? 'Confirmada' : ins.estado === 'cancelada' ? 'Cancelada' : 'Pendiente'}
                </span>
              </div>

              {ins.estado === 'pendiente' && (
                <div className="ic-acciones">
                  <button className="btn-confirmar" onClick={() => cambiarEstado(ins.id, 'confirmada')}>
                    Confirmar
                  </button>
                  <button className="btn-rechazar" onClick={() => cambiarEstado(ins.id, 'cancelada')}>
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default InscripcionesCurso