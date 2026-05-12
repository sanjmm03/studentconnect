import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where, addDoc, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import '../styles/BuscarCursos.css'

const MATERIAS = ['Todas', 'Matemáticas', 'Física', 'Química', 'Programación', 'Historia', 'Inglés', 'Biología', 'Economía', 'Estadística', 'Cálculo', 'Álgebra', 'Otro']

function BuscarCursos() {
  const navigate = useNavigate()
  const { user, perfil } = useAuthStore()

  const [cursos, setCursos] = useState([])
  const [horarios, setHorarios] = useState([])
  const [calificaciones, setCalificaciones] = useState([])
  const [inscripciones, setInscripciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroMateria, setFiltroMateria] = useState('Todas')
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null)
  const [horariosSeleccionados, setHorariosSeleccionados] = useState([])
  const [agendando, setAgendando] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const qCursos = query(collection(db, 'cursos'), where('estado', '==', 'activo'))
        const snapCursos = await getDocs(qCursos)
        setCursos(snapCursos.docs.map(d => ({ id: d.id, ...d.data() })))

        const snapHorarios = await getDocs(collection(db, 'horarios'))
        setHorarios(snapHorarios.docs.map(d => ({ id: d.id, ...d.data() })))

        const snapCal = await getDocs(collection(db, 'calificaciones'))
        setCalificaciones(snapCal.docs.map(d => ({ id: d.id, ...d.data() })))

        const qInsc = query(collection(db, 'inscripciones'), where('alumnoId', '==', user.uid))
        const snapInsc = await getDocs(qInsc)
        setInscripciones(snapInsc.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargarDatos()
  }, [user])

  const getPromedioAsesor = (asesorId) => {
    const cals = calificaciones.filter(c => c.asesorId === asesorId)
    if (cals.length === 0) return null
    return (cals.reduce((sum, c) => sum + c.estrellas, 0) / cals.length).toFixed(1)
  }

  const getHorariosCurso = (cursoId) => horarios.filter(h => h.cursoId === cursoId)

  const yaInscrito = (cursoId) => inscripciones.some(i => i.cursoId === cursoId && i.estado !== 'cancelada')

  const toggleHorario = (horario) => {
    if (horariosSeleccionados.find(h => h.id === horario.id)) {
      setHorariosSeleccionados(horariosSeleccionados.filter(h => h.id !== horario.id))
    } else {
      setHorariosSeleccionados([...horariosSeleccionados, horario])
    }
  }

  const handleInscribirse = async () => {
    if (horariosSeleccionados.length === 0) { setError('Selecciona al menos un horario'); return }
    setAgendando(true); setError('')
    try {
      const nuevaInscripcion = {
        alumnoId: user.uid,
        alumnoNombre: perfil.nombre,
        asesorId: cursoSeleccionado.asesorId,
        asesorNombre: cursoSeleccionado.asesorNombre,
        cursoId: cursoSeleccionado.id,
        cursoTitulo: cursoSeleccionado.titulo,
        materia: cursoSeleccionado.materia,
        horarioIds: horariosSeleccionados.map(h => h.id),
        horarios: horariosSeleccionados.map(h => ({
          id: h.id, dia: h.dia, horaInicio: h.horaInicio, horaFin: h.horaFin
        })),
        estado: 'pendiente',
        createdAt: new Date().toISOString()
      }
      const docRef = await addDoc(collection(db, 'inscripciones'), nuevaInscripcion)
      await Promise.all(horariosSeleccionados.map(h =>
        updateDoc(doc(db, 'horarios', h.id), { inscritos: increment(1) })
      ))
      setInscripciones([...inscripciones, { id: docRef.id, ...nuevaInscripcion }])
      setExito(true)
      setCursoSeleccionado(null)
      setHorariosSeleccionados([])
    } catch (err) {
      setError('Error al inscribirse')
    } finally {
      setAgendando(false)
    }
  }

  const cursosFiltrados = cursos.filter(c => {
    const coincideNombre = c.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.asesorNombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideMateria = filtroMateria === 'Todas' || c.materia === filtroMateria
    return coincideNombre && coincideMateria
  })

  return (
    <div className="bc-container">
      <div className="bc-header">
        <button className="btn-volver" onClick={() => navigate('/dashboard')}>← Volver</button>
        <h1>🔍 Buscar Cursos</h1>
        <p>Encuentra el curso perfecto para ti</p>
      </div>

      {exito && (
        <div className="bc-exito">✅ Solicitud enviada. Ve a "Mis Cursos" para ver el estado.</div>
      )}

      <input
        type="text"
        placeholder="🔍 Buscar por curso o asesor..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="bc-input"
      />

      <div className="bc-filtros">
        {MATERIAS.map(m => (
          <button key={m} className={`filtro-btn ${filtroMateria === m ? 'activo' : ''}`} onClick={() => setFiltroMateria(m)}>
            {m}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="cargando">Cargando cursos...</p>
      ) : cursosFiltrados.length === 0 ? (
        <div className="bc-vacio"><p>No se encontraron cursos con esos filtros.</p></div>
      ) : (
        <div className="bc-grid">
          {cursosFiltrados.map(curso => {
            const horariosCurso = getHorariosCurso(curso.id)
            const promedio = getPromedioAsesor(curso.asesorId)
            const inscrito = yaInscrito(curso.id)
            return (
              <div
                key={curso.id}
                className={`bc-card ${cursoSeleccionado?.id === curso.id ? 'seleccionado' : ''} ${inscrito ? 'inscrito' : ''}`}
                onClick={() => {
                  if (!inscrito) {
                    setCursoSeleccionado(cursoSeleccionado?.id === curso.id ? null : curso)
                    setHorariosSeleccionados([])
                    setExito(false)
                    setError('')
                  }
                }}
              >
                <div className="bc-card-top">
                  <span className="bc-materia-tag">{curso.materia}</span>
                  {inscrito && <span className="bc-inscrito-badge">✓ Inscrito</span>}
                </div>
                <h3>{curso.titulo}</h3>
                <p className="bc-descripcion">{curso.descripcion}</p>
                <div className="bc-asesor-row">
                  <div className="bc-asesor-avatar">{curso.asesorNombre?.charAt(0).toUpperCase()}</div>
                  <div>
                    <p
                      className="bc-asesor-nombre asesor-link"
                      onClick={(e) => { e.stopPropagation(); navigate(`/asesor/${curso.asesorId}`) }}
                    >
                      {curso.asesorNombre}
                    </p>
                    {promedio && <p className="bc-promedio">⭐ {promedio}</p>}
                  </div>
                </div>
                <div className="bc-horarios-count">📅 {horariosCurso.length} horario(s) disponible(s)</div>
              </div>
            )
          })}
        </div>
      )}

      {cursoSeleccionado && (
        <div className="bc-panel">
          <h2>📖 {cursoSeleccionado.titulo}</h2>
          <p className="bc-panel-desc">{cursoSeleccionado.descripcion}</p>
          {error && <div className="bc-error">{error}</div>}
          <p className="bc-panel-subtitulo">Selecciona los horarios a los que quieres asistir:</p>
          <div className="bc-horarios-grid">
            {getHorariosCurso(cursoSeleccionado.id).map(h => {
              const seleccionado = horariosSeleccionados.find(hs => hs.id === h.id)
              const lleno = h.inscritos >= cursoSeleccionado.cupoMaximo
              return (
                <div
                  key={h.id}
                  className={`bc-horario-opcion ${seleccionado ? 'seleccionado' : ''} ${lleno ? 'lleno' : ''}`}
                  onClick={() => !lleno && toggleHorario(h)}
                >
                  <span className="horario-dia">{h.dia}</span>
                  <span className="horario-tiempo">{h.horaInicio} - {h.horaFin}</span>
                  <span className="horario-cupo">{lleno ? '🔴 Lleno' : `${h.inscritos || 0}/${cursoSeleccionado.cupoMaximo}`}</span>
                </div>
              )
            })}
          </div>
          <button
            className="btn-primary btn-inscribirse"
            onClick={handleInscribirse}
            disabled={agendando || horariosSeleccionados.length === 0}
          >
            {agendando ? 'Enviando...' : `✓ Inscribirme a ${horariosSeleccionados.length} horario(s)`}
          </button>
        </div>
      )}
    </div>
  )
}

export default BuscarCursos