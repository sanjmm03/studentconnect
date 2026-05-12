import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import '../styles/GestionarCursos.css'

const MATERIAS = ['Matemáticas', 'Física', 'Química', 'Programación', 'Historia', 'Inglés', 'Biología', 'Economía', 'Estadística', 'Cálculo', 'Álgebra', 'Otro']
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const HORAS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']

function GestionarCursos() {
  const navigate = useNavigate()
  const { user, perfil } = useAuthStore()

  const [cursos, setCursos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [cursoExpandido, setCursoExpandido] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Form curso
  const [titulo, setTitulo] = useState('')
  const [materia, setMateria] = useState('Matemáticas')
  const [descripcion, setDescripcion] = useState('')
  const [cupo, setCupo] = useState(10)

  // Form horario
  const [dia, setDia] = useState('Lunes')
  const [horaInicio, setHoraInicio] = useState('07:00')
  const [horaFin, setHoraFin] = useState('08:00')
  const [agregandoHorario, setAgregandoHorario] = useState(false)

  useEffect(() => {
    cargarCursos()
  }, [user])

  const cargarCursos = async () => {
    try {
      const q = query(collection(db, 'cursos'), where('asesorId', '==', user.uid))
      const snap = await getDocs(q)
      const lista = await Promise.all(snap.docs.map(async d => {
        const curso = { id: d.id, ...d.data() }
        // Cargar horarios del curso
        const qH = query(collection(db, 'horarios'), where('cursoId', '==', d.id))
        const snapH = await getDocs(qH)
        curso.horarios = snapH.docs.map(h => ({ id: h.id, ...h.data() }))
        return curso
      }))
      lista.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setCursos(lista)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  const handleCrearCurso = async (e) => {
    e.preventDefault()
    if (!titulo.trim() || !descripcion.trim()) {
      setError('El título y la descripción son obligatorios')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const nuevoCurso = {
        titulo: titulo.trim(),
        materia,
        descripcion: descripcion.trim(),
        cupoMaximo: Number(cupo),
        asesorId: user.uid,
        asesorNombre: perfil.nombre,
        estado: 'activo',
        createdAt: new Date().toISOString()
      }
      const docRef = await addDoc(collection(db, 'cursos'), nuevoCurso)
      const cursoConId = { id: docRef.id, ...nuevoCurso, horarios: [] }
      setCursos([cursoConId, ...cursos])
      setTitulo(''); setDescripcion(''); setMateria('Matemáticas'); setCupo(10)
      setMostrarForm(false)
    } catch (err) {
      setError('Error al crear el curso')
    } finally {
      setGuardando(false)
    }
  }

  const handleAgregarHorario = async (cursoId) => {
    if (horaInicio >= horaFin) {
      setError('La hora de fin debe ser mayor a la de inicio')
      return
    }
    setAgregandoHorario(true)
    setError('')
    try {
      const nuevoHorario = {
        cursoId,
        asesorId: user.uid,
        dia,
        horaInicio,
        horaFin,
        disponible: true,
        inscritos: 0,
        createdAt: new Date().toISOString()
      }
      const docRef = await addDoc(collection(db, 'horarios'), nuevoHorario)
      setCursos(cursos.map(c => {
        if (c.id === cursoId) {
          return { ...c, horarios: [...c.horarios, { id: docRef.id, ...nuevoHorario }] }
        }
        return c
      }))
    } catch (err) {
      setError('Error al agregar horario')
    } finally {
      setAgregandoHorario(false)
    }
  }

  const handleEliminarHorario = async (cursoId, horarioId) => {
    try {
      await deleteDoc(doc(db, 'horarios', horarioId))
      setCursos(cursos.map(c => {
        if (c.id === cursoId) {
          return { ...c, horarios: c.horarios.filter(h => h.id !== horarioId) }
        }
        return c
      }))
    } catch (err) {
      setError('Error al eliminar horario')
    }
  }

  const handleCambiarEstado = async (cursoId, nuevoEstado) => {
    try {
      await updateDoc(doc(db, 'cursos', cursoId), { estado: nuevoEstado })
      setCursos(cursos.map(c => c.id === cursoId ? { ...c, estado: nuevoEstado } : c))
    } catch (err) {
      setError('Error al cambiar estado')
    }
  }

  const handleEliminarCurso = async (cursoId) => {
    if (!confirm('¿Eliminar este curso? También se eliminarán sus horarios.')) return
    try {
      // Eliminar horarios del curso
      const curso = cursos.find(c => c.id === cursoId)
      await Promise.all(curso.horarios.map(h => deleteDoc(doc(db, 'horarios', h.id))))
      await deleteDoc(doc(db, 'cursos', cursoId))
      setCursos(cursos.filter(c => c.id !== cursoId))
    } catch (err) {
      setError('Error al eliminar el curso')
    }
  }

  const getEstadoColor = (estado) => {
    if (estado === 'activo') return 'estado-activo'
    if (estado === 'pausado') return 'estado-pausado'
    return 'estado-finalizado'
  }

  return (
    <div className="gc-container">
      <div className="gc-header">
        <button className="btn-volver" onClick={() => navigate('/dashboard')}>← Volver</button>
        <div className="gc-header-top">
          <div>
            <h1>📚 Mis Cursos</h1>
            <p>Crea y gestiona tus cursos de asesoría</p>
          </div>
          <button className="btn-primary" onClick={() => setMostrarForm(!mostrarForm)}>
            {mostrarForm ? '✕ Cancelar' : '+ Nuevo curso'}
          </button>
        </div>
      </div>

      {error && <div className="gc-error">{error}</div>}

      {/* Formulario nuevo curso */}
      {mostrarForm && (
        <div className="gc-form-card">
          <h2>Crear nuevo curso</h2>
          <form onSubmit={handleCrearCurso} className="gc-form">
            <div className="form-row-2">
              <div className="form-group">
                <label>Título del curso *</label>
                <input type="text" placeholder="Ej: Cálculo Integral" value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={guardando} />
              </div>
              <div className="form-group">
                <label>Materia</label>
                <select value={materia} onChange={(e) => setMateria(e.target.value)}>
                  {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Descripción *</label>
              <textarea placeholder="Describe el contenido del curso, objetivos, requisitos..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} disabled={guardando} />
            </div>
            <div className="form-group" style={{maxWidth: '200px'}}>
              <label>Cupo máximo por horario</label>
              <input type="number" min="1" max="50" value={cupo} onChange={(e) => setCupo(e.target.value)} disabled={guardando} />
            </div>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? 'Creando...' : '✓ Crear curso'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de cursos */}
      {cargando ? (
        <p className="cargando">Cargando cursos...</p>
      ) : cursos.length === 0 ? (
        <div className="gc-vacio">
          <p>📭 No tienes cursos creados todavía.</p>
          <p>Crea tu primer curso usando el botón de arriba.</p>
        </div>
      ) : (
        <div className="gc-lista">
          {cursos.map(curso => (
            <div key={curso.id} className="gc-card">
              <div className="gc-card-header">
                <div className="gc-card-info">
                  <div className="gc-card-titulo-row">
                    <h3>{curso.titulo}</h3>
                    <span className={`estado-badge ${getEstadoColor(curso.estado)}`}>
                      {curso.estado === 'activo' ? '🟢 Activo' : curso.estado === 'pausado' ? '⏸️ Pausado' : '🔴 Finalizado'}
                    </span>
                  </div>
                  <span className="gc-materia-tag">{curso.materia}</span>
                  <p className="gc-descripcion">{curso.descripcion}</p>
                  <p className="gc-cupo">👥 Cupo máximo: {curso.cupoMaximo} alumnos por horario</p>
                </div>
                <div className="gc-card-acciones">
                  <button
                    className="btn-expandir"
                    onClick={() => setCursoExpandido(cursoExpandido === curso.id ? null : curso.id)}
                  >
                    {cursoExpandido === curso.id ? '▲ Ocultar' : '▼ Gestionar'}
                  </button>
                  <button
                    className="btn-inscripciones"
                    onClick={() => navigate(`/inscripciones-curso/${curso.id}`)}
                  >
                    👥 Ver inscritos
                  </button>
                </div>
              </div>

              {/* Panel expandible */}
              {cursoExpandido === curso.id && (
                <div className="gc-expandido">
                  <div className="gc-horarios-section">
                    <h4>📅 Horarios del curso</h4>

                    {/* Agregar horario */}
                    <div className="gc-agregar-horario">
                      <select value={dia} onChange={(e) => setDia(e.target.value)}>
                        {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)}>
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span>a</span>
                      <select value={horaFin} onChange={(e) => setHoraFin(e.target.value)}>
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <button
                        className="btn-primary"
                        onClick={() => handleAgregarHorario(curso.id)}
                        disabled={agregandoHorario}
                      >
                        + Agregar
                      </button>
                    </div>

                    {/* Lista horarios */}
                    {curso.horarios.length === 0 ? (
                      <p className="sin-horarios">No hay horarios. Agrega uno arriba.</p>
                    ) : (
                      <div className="gc-horarios-chips">
                        {curso.horarios.map(h => (
                          <div key={h.id} className="horario-chip">
                            <span>📆 {h.dia} · {h.horaInicio} - {h.horaFin}</span>
                            <span className="chip-inscritos">({h.inscritos || 0}/{curso.cupoMaximo})</span>
                            <button className="chip-eliminar" onClick={() => handleEliminarHorario(curso.id, h.id)}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acciones del curso */}
                  <div className="gc-estado-acciones">
                    {curso.estado === 'activo' && (
                      <button className="btn-pausar" onClick={() => handleCambiarEstado(curso.id, 'pausado')}>⏸️ Pausar curso</button>
                    )}
                    {curso.estado === 'pausado' && (
                      <button className="btn-activar" onClick={() => handleCambiarEstado(curso.id, 'activo')}>▶️ Activar curso</button>
                    )}
                    {curso.estado !== 'finalizado' && (
                      <button className="btn-finalizar" onClick={() => handleCambiarEstado(curso.id, 'finalizado')}>🔴 Finalizar curso</button>
                    )}
                    <button className="btn-eliminar-curso" onClick={() => handleEliminarCurso(curso.id)}>🗑️ Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default GestionarCursos