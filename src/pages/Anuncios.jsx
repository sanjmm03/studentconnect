import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import '../styles/Anuncios.css'

function Anuncios() {
  const navigate = useNavigate()
  const { user, perfil } = useAuthStore()

  const [anuncios, setAnuncios] = useState([])
  const [cursos, setCursos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [filtroCurso, setFiltroCurso] = useState('todos')
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null)

  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [tipo, setTipo] = useState('info')

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        if (perfil?.rol === 'asesor') {
          const qCursos = query(collection(db, 'cursos'), where('asesorId', '==', user.uid))
          const snapCursos = await getDocs(qCursos)
          const listaCursos = snapCursos.docs.map(d => ({ id: d.id, ...d.data() }))
          setCursos(listaCursos)
          if (listaCursos.length > 0) setCursoSeleccionado(listaCursos[0])

          const qAnuncios = query(
            collection(db, 'anuncios'),
            where('asesorId', '==', user.uid),
            orderBy('createdAt', 'desc')
          )
          const snapAnuncios = await getDocs(qAnuncios)
          setAnuncios(snapAnuncios.docs.map(d => ({ id: d.id, ...d.data() })))
        } else {
          const qInsc = query(
            collection(db, 'inscripciones'),
            where('alumnoId', '==', user.uid),
            where('estado', '==', 'confirmada')
          )
          const snapInsc = await getDocs(qInsc)
          const cursoIds = [...new Set(snapInsc.docs.map(d => d.data().cursoId))]

          if (cursoIds.length > 0) {
            const qAnuncios = query(
              collection(db, 'anuncios'),
              where('cursoId', 'in', cursoIds),
              orderBy('createdAt', 'desc')
            )
            const snapAnuncios = await getDocs(qAnuncios)
            setAnuncios(snapAnuncios.docs.map(d => ({ id: d.id, ...d.data() })))

            const cursosDatos = await Promise.all(
              cursoIds.map(async id => {
                const cursoDoc = await getDoc(doc(db, 'cursos', id))
                return cursoDoc.exists() ? { id: cursoDoc.id, ...cursoDoc.data() } : null
              })
            )
            setCursos(cursosDatos.filter(Boolean))
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargarDatos()
  }, [user, perfil])

  const handlePublicar = async (e) => {
    e.preventDefault()
    if (!titulo.trim() || !mensaje.trim() || !cursoSeleccionado) {
      setError('Todos los campos son obligatorios')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const nuevoAnuncio = {
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        tipo,
        cursoId: cursoSeleccionado.id,
        cursoTitulo: cursoSeleccionado.titulo,
        asesorId: user.uid,
        asesorNombre: perfil.nombre,
        createdAt: new Date().toISOString()
      }
      const docRef = await addDoc(collection(db, 'anuncios'), nuevoAnuncio)
setAnuncios([{ id: docRef.id, ...nuevoAnuncio }, ...anuncios])

// Notificar a todos los alumnos inscritos en el curso
const qInsc = query(
  collection(db, 'inscripciones'),
  where('cursoId', '==', cursoSeleccionado.id),
  where('estado', '==', 'confirmada')
)
const snapInsc = await getDocs(qInsc)
await Promise.all(snapInsc.docs.map(d =>
  addDoc(collection(db, 'notificaciones'), {
    usuarioId: d.data().alumnoId,
    titulo: '📢 Nuevo anuncio',
    mensaje: `${perfil.nombre} publicó: "${titulo.trim()}" en ${cursoSeleccionado.titulo}`,
    tipo: 'anuncio',
    leida: false,
    createdAt: new Date().toISOString()
  })
))
      setTitulo('')
      setMensaje('')
      setTipo('info')
      setMostrarForm(false)
      setExito(true)
      setTimeout(() => setExito(false), 3000)
    } catch (err) {
      setError('Error al publicar el anuncio')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este anuncio?')) return
    try {
      await deleteDoc(doc(db, 'anuncios', id))
      setAnuncios(anuncios.filter(a => a.id !== id))
    } catch (err) {
      setError('Error al eliminar')
    }
  }

  const getTipoIcono = (tipo) => {
    if (tipo === 'urgente') return '🚨'
    if (tipo === 'tarea') return '📝'
    if (tipo === 'examen') return '📋'
    return 'ℹ️'
  }

  const getTipoColor = (tipo) => {
    if (tipo === 'urgente') return 'anuncio-urgente'
    if (tipo === 'tarea') return 'anuncio-tarea'
    if (tipo === 'examen') return 'anuncio-examen'
    return 'anuncio-info'
  }

  const anunciosFiltrados = filtroCurso === 'todos'
    ? anuncios
    : anuncios.filter(a => a.cursoId === filtroCurso)

  return (
    <div className="anuncios-container">
      <div className="anuncios-header">
        <button className="btn-volver" onClick={() => navigate('/dashboard')}>← Volver</button>
        <div className="anuncios-header-top">
          <div>
            <h1>📢 Anuncios</h1>
            <p>{perfil?.rol === 'asesor' ? 'Comunica avisos a tus alumnos' : 'Avisos de tus cursos'}</p>
          </div>
          {perfil?.rol === 'asesor' && (
            <button className="btn-primary" onClick={() => setMostrarForm(!mostrarForm)}>
              {mostrarForm ? '✕ Cancelar' : '+ Nuevo anuncio'}
            </button>
          )}
        </div>
      </div>

      {exito && <div className="anuncios-exito">✅ Anuncio publicado correctamente</div>}

      {mostrarForm && perfil?.rol === 'asesor' && (
        <div className="anuncios-form-card">
          <h2>Nuevo anuncio</h2>
          {error && <div className="anuncios-error">{error}</div>}
          <form onSubmit={handlePublicar} className="anuncios-form">
            <div className="form-row-2">
              <div className="form-group">
                <label>Curso *</label>
                <select
                  value={cursoSeleccionado?.id || ''}
                  onChange={(e) => {
                    const curso = cursos.find(c => c.id === e.target.value)
                    setCursoSeleccionado(curso)
                  }}
                >
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>{c.titulo}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="info">ℹ️ Información</option>
                  <option value="tarea">📝 Tarea</option>
                  <option value="examen">📋 Examen</option>
                  <option value="urgente">🚨 Urgente</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                placeholder="Título del anuncio"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                disabled={guardando}
              />
            </div>
            <div className="form-group">
              <label>Mensaje *</label>
              <textarea
                placeholder="Escribe el mensaje del anuncio..."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={4}
                disabled={guardando}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? 'Publicando...' : '📢 Publicar anuncio'}
            </button>
          </form>
        </div>
      )}

      {cursos.length > 1 && (
        <div className="filtros" style={{marginBottom: '1.5rem'}}>
          <button className={`filtro-btn ${filtroCurso === 'todos' ? 'activo' : ''}`} onClick={() => setFiltroCurso('todos')}>
            Todos
          </button>
          {cursos.map(c => (
            <button key={c.id} className={`filtro-btn ${filtroCurso === c.id ? 'activo' : ''}`} onClick={() => setFiltroCurso(c.id)}>
              {c.titulo}
            </button>
          ))}
        </div>
      )}

      {cargando ? (
        <p className="cargando">Cargando anuncios...</p>
      ) : anunciosFiltrados.length === 0 ? (
        <div className="anuncios-vacio">
          <p>📭 No hay anuncios todavía.</p>
          {perfil?.rol === 'asesor' && <p>Crea tu primer anuncio para informar a tus alumnos.</p>}
          {perfil?.rol === 'alumno' && <p>Cuando tu asesor publique un aviso aparecerá aquí.</p>}
        </div>
      ) : (
        <div className="anuncios-lista">
          {anunciosFiltrados.map(anuncio => (
            <div key={anuncio.id} className={`anuncio-card ${getTipoColor(anuncio.tipo)}`}>
              <div className="anuncio-header">
                <div className="anuncio-tipo-badge">
                  {getTipoIcono(anuncio.tipo)}
                  <span>{anuncio.tipo.charAt(0).toUpperCase() + anuncio.tipo.slice(1)}</span>
                </div>
                <div className="anuncio-meta">
                  <span className="anuncio-curso">{anuncio.cursoTitulo}</span>
                  <span className="anuncio-fecha">
                    {new Date(anuncio.createdAt).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <h3>{anuncio.titulo}</h3>
              <p className="anuncio-mensaje">{anuncio.mensaje}</p>
              <div className="anuncio-footer">
                <span className="anuncio-autor">Por {anuncio.asesorNombre}</span>
                {perfil?.rol === 'asesor' && anuncio.asesorId === user.uid && (
                  <button className="btn-eliminar-anuncio" onClick={() => handleEliminar(anuncio.id)}>
                    🗑️ Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Anuncios