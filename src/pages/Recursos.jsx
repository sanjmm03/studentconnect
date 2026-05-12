import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  updateDoc, increment, query, orderBy
} from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import { subirArchivo } from '../services/cloudinaryService'
import '../styles/Recursos.css'

const TIPOS = ['PDF', 'Video', 'Enlace', 'Imagen', 'Otro']
const CATEGORIAS = ['Matemáticas', 'Física', 'Química', 'Programación', 'Historia', 'Inglés', 'Biología', 'Economía', 'Estadística', 'Cálculo', 'Álgebra', 'Otro']

function ComentarioItem({ comentario, user, perfil, recursoId, nivel = 0 }) {
  const [mostrarRespuestas, setMostrarRespuestas] = useState(false)
  const [respuestas, setRespuestas] = useState([])
  const [respondiendo, setRespondiendo] = useState(false)
  const [textoRespuesta, setTextoRespuesta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [totalRespuestas, setTotalRespuestas] = useState(comentario.totalRespuestas || 0)

  const cargarRespuestas = async () => {
    try {
      const snap = await getDocs(
        collection(db, 'recursos', recursoId, 'comentarios', comentario.id, 'respuestas')
      )
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      lista.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      setRespuestas(lista)
      setTotalRespuestas(lista.length)
      setMostrarRespuestas(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handleResponder = async () => {
    if (!textoRespuesta.trim()) return
    setEnviando(true)
    try {
      await addDoc(
        collection(db, 'recursos', recursoId, 'comentarios', comentario.id, 'respuestas'),
        {
          texto: textoRespuesta.trim(),
          autorId: user.uid,
          autorNombre: perfil.nombre,
          createdAt: new Date().toISOString()
        }
      )
      await updateDoc(doc(db, 'recursos', recursoId, 'comentarios', comentario.id), {
        totalRespuestas: increment(1)
      })
      setTextoRespuesta('')
      setRespondiendo(false)
      cargarRespuestas()
    } catch (err) {
      console.error(err)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={`comentario-item ${nivel > 0 ? 'respuesta' : ''}`}>
      <div className="comentario-avatar">
        {comentario.autorNombre?.charAt(0).toUpperCase()}
      </div>
      <div className="comentario-contenido">
        <div className="comentario-header">
          <strong>{comentario.autorNombre}</strong>
          <span className="comentario-fecha">
            {new Date(comentario.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <p className="comentario-texto">{comentario.texto}</p>
        {nivel === 0 && (
          <div className="comentario-acciones">
            <button className="btn-responder" onClick={() => setRespondiendo(!respondiendo)}>
              ↩ Responder
            </button>
            {totalRespuestas > 0 && (
              <button className="btn-ver-respuestas" onClick={() => !mostrarRespuestas ? cargarRespuestas() : setMostrarRespuestas(false)}>
                {mostrarRespuestas ? '▲ Ocultar respuestas' : `▼ Ver ${totalRespuestas} respuesta(s)`}
              </button>
            )}
          </div>
        )}
        {respondiendo && (
          <div className="respuesta-form">
            <input
              type="text"
              placeholder="Escribe una respuesta..."
              value={textoRespuesta}
              onChange={(e) => setTextoRespuesta(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleResponder()}
              disabled={enviando}
            />
            <button className="btn-enviar-comentario" onClick={handleResponder} disabled={enviando}>
              {enviando ? '...' : '→'}
            </button>
          </div>
        )}
        {mostrarRespuestas && respuestas.map(r => (
          <ComentarioItem key={r.id} comentario={r} user={user} perfil={perfil} recursoId={recursoId} nivel={1} />
        ))}
      </div>
    </div>
  )
}

function RecursoCard({ recurso, user, perfil, onEliminar }) {
  const [votos, setVotos] = useState(recurso.votos || 0)
  const [miVoto, setMiVoto] = useState(recurso.votosUsuarios?.[user.uid] || 0)
  const [mostrarComentarios, setMostrarComentarios] = useState(false)
  const [comentarios, setComentarios] = useState([])
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [totalComentarios, setTotalComentarios] = useState(recurso.totalComentarios || 0)

  const getTipoIcono = (tipo) => {
    if (tipo === 'PDF') return '📄'
    if (tipo === 'Video') return '🎥'
    if (tipo === 'Enlace') return '🔗'
    if (tipo === 'Imagen') return '🖼️'
    return '📁'
  }

  const handleVoto = async (valor) => {
    const nuevoMiVoto = miVoto === valor ? 0 : valor
    const diferencia = nuevoMiVoto - miVoto
    try {
      await updateDoc(doc(db, 'recursos', recurso.id), {
        votos: increment(diferencia),
        [`votosUsuarios.${user.uid}`]: nuevoMiVoto
      })
      setVotos(v => v + diferencia)
      setMiVoto(nuevoMiVoto)
    } catch (err) { console.error(err) }
  }

  const cargarComentarios = async () => {
    try {
      const q = query(collection(db, 'recursos', recurso.id, 'comentarios'), orderBy('createdAt', 'asc'))
      const snap = await getDocs(q)
      setComentarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { console.error(err) }
  }

  const toggleComentarios = () => {
    if (!mostrarComentarios) cargarComentarios()
    setMostrarComentarios(!mostrarComentarios)
  }

  const handleComentario = async () => {
    if (!nuevoComentario.trim()) return
    setEnviando(true)
    try {
      const ref = await addDoc(collection(db, 'recursos', recurso.id, 'comentarios'), {
        texto: nuevoComentario.trim(),
        autorId: user.uid,
        autorNombre: perfil.nombre,
        totalRespuestas: 0,
        createdAt: new Date().toISOString()
      })
      await updateDoc(doc(db, 'recursos', recurso.id), { totalComentarios: increment(1) })
      setComentarios([...comentarios, {
        id: ref.id, texto: nuevoComentario.trim(),
        autorId: user.uid, autorNombre: perfil.nombre,
        totalRespuestas: 0, createdAt: new Date().toISOString()
      }])
      setTotalComentarios(t => t + 1)
      setNuevoComentario('')
    } catch (err) { console.error(err) } finally { setEnviando(false) }
  }

  return (
    <div className="recurso-card">
      <div className="recurso-body">
        <div className="recurso-tipo-icono">{getTipoIcono(recurso.tipo)}</div>
        <div className="recurso-info">
          <div className="recurso-top">
            <span className="recurso-categoria">{recurso.categoria}</span>
            <span className="recurso-tipo">{recurso.tipo}</span>
          </div>
          <h3>{recurso.titulo}</h3>
          {recurso.descripcion && <p className="recurso-descripcion">{recurso.descripcion}</p>}
          <p className="recurso-autor">Por {recurso.autorNombre}</p>
        </div>
        <div className="recurso-acciones-right">
          <a href={recurso.url} target="_blank" rel="noopener noreferrer" className="btn-ver">
            Ver recurso
          </a>
          {recurso.autorId === user.uid && (
            <button className="btn-eliminar-recurso" onClick={() => onEliminar(recurso.id)}>🗑️</button>
          )}
        </div>
      </div>

      <div className="recurso-footer">
        <button className="btn-comentarios" onClick={toggleComentarios}>
          💬 {totalComentarios} comentario(s) {mostrarComentarios ? '▲' : '▼'}
        </button>
        <div className="votos-footer">
          <button className={`voto-btn ${miVoto === 1 ? 'activo-up' : ''}`} onClick={() => handleVoto(1)} title="Me gusta">👍</button>
          <button className={`voto-btn ${miVoto === -1 ? 'activo-down' : ''}`} onClick={() => handleVoto(-1)} title="No me gusta">👎</button>
        </div>
      </div>

      {mostrarComentarios && (
        <div className="comentarios-section">
          <div className="nuevo-comentario">
            <input
              type="text"
              placeholder="Escribe un comentario..."
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComentario()}
              disabled={enviando}
            />
            <button className="btn-enviar-comentario" onClick={handleComentario} disabled={enviando || !nuevoComentario.trim()}>
              {enviando ? '...' : '→'}
            </button>
          </div>
          <div className="comentarios-lista">
            {comentarios.length === 0 ? (
              <p className="sin-comentarios">Sé el primero en comentar.</p>
            ) : (
              comentarios.map(c => (
                <ComentarioItem key={c.id} comentario={c} user={user} perfil={perfil} recursoId={recurso.id} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Recursos() {
  const navigate = useNavigate()
  const { user, perfil } = useAuthStore()

  const [recursos, setRecursos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const [error, setError] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [orden, setOrden] = useState('recientes')

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [url, setUrl] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [tipo, setTipo] = useState('Enlace')
  const [categoria, setCategoria] = useState('Otro')

  useEffect(() => {
    const cargarRecursos = async () => {
      try {
        const snap = await getDocs(collection(db, 'recursos'))
        let lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        lista.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setRecursos(lista)
      } catch (err) { console.error(err) } finally { setCargando(false) }
    }
    cargarRecursos()
  }, [])

  const handleAgregar = async (e) => {
    e.preventDefault()
    if (!titulo.trim()) { setError('El título es obligatorio'); return }
    if (!archivo && !url.trim()) { setError('Sube un archivo o ingresa un enlace'); return }
    setGuardando(true); setError('')
    try {
      let urlFinal = url.trim()
      if (archivo) {
        setSubiendoArchivo(true)
        urlFinal = await subirArchivo(archivo)
        setSubiendoArchivo(false)
      }
      const nuevo = {
        titulo: titulo.trim(), descripcion: descripcion.trim(),
        url: urlFinal, tipo, categoria,
        autorId: user.uid, autorNombre: perfil.nombre,
        votos: 0, votosUsuarios: {}, totalComentarios: 0,
        createdAt: new Date().toISOString()
      }
      const docRef = await addDoc(collection(db, 'recursos'), nuevo)
      setRecursos([{ id: docRef.id, ...nuevo }, ...recursos])
      setTitulo(''); setDescripcion(''); setUrl('')
      setArchivo(null); setTipo('Enlace'); setCategoria('Otro')
      setMostrarForm(false)
    } catch (err) {
      setError('Error al guardar el recurso')
      setSubiendoArchivo(false)
    } finally { setGuardando(false) }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este recurso?')) return
    try {
      await deleteDoc(doc(db, 'recursos', id))
      setRecursos(recursos.filter(r => r.id !== id))
    } catch (err) { setError('Error al eliminar') }
  }

  const recursosFiltrados = recursos
    .filter(r => filtroCategoria === 'Todas' || r.categoria === filtroCategoria)
    .sort((a, b) => orden === 'votos'
      ? (b.votos || 0) - (a.votos || 0)
      : new Date(b.createdAt) - new Date(a.createdAt)
    )

  return (
    <div className="recursos-container">
      <div className="recursos-header">
        <button className="btn-volver" onClick={() => navigate('/dashboard')}>← Volver</button>
        <div className="recursos-header-top">
          <div>
            <h1>📁 Recursos</h1>
            <p>Material de estudio compartido por la comunidad</p>
          </div>
          <button className="btn-primary" onClick={() => setMostrarForm(!mostrarForm)}>
            {mostrarForm ? '✕ Cancelar' : '+ Agregar recurso'}
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div className="recursos-form-card">
          <h2>Nuevo recurso</h2>
          {error && <div className="recursos-error">{error}</div>}
          <form onSubmit={handleAgregar} className="recursos-form">
            <div className="form-row-2">
              <div className="form-group">
                <label>Título *</label>
                <input type="text" placeholder="Nombre del recurso" value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={guardando} />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select value={tipo} onChange={(e) => { setTipo(e.target.value); setArchivo(null) }}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <input type="text" placeholder="Breve descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} disabled={guardando} />
            </div>
            <div className="form-group">
              <label>Categoría</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {tipo === 'PDF' ? (
              <>
                <div className="form-group">
                  <label>Enlace del PDF *</label>
                  <input type="url" placeholder="https://drive.google.com/..." value={url} onChange={(e) => setUrl(e.target.value)} disabled={guardando} />
                </div>
                <div className="pdf-aviso">
                  <p>📄 ¿Cómo compartir un PDF?</p>
                  <ol>
                    <li>Sube el PDF a <strong>Google Drive</strong></li>
                    <li>Clic derecho → <strong>"Obtener enlace"</strong></li>
                    <li>Cambia a <strong>"Cualquier persona con el enlace"</strong></li>
                    <li>Pega el enlace arriba</li>
                  </ol>
                </div>
              </>
            ) : tipo === 'Imagen' ? (
              <>
                <div className="form-group">
                  <label>Sube una imagen</label>
                  <div className="archivo-upload">
                    <label className="archivo-btn">
                      {archivo ? `✅ ${archivo.name}` : '📎 Seleccionar imagen'}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.gif,.webp"
                        onChange={(e) => { setArchivo(e.target.files[0] || null); if (e.target.files[0]) setUrl('') }}
                        style={{display: 'none'}}
                        disabled={guardando}
                      />
                    </label>
                    {archivo && <button type="button" className="archivo-limpiar" onClick={() => setArchivo(null)}>✕</button>}
                  </div>
                  {subiendoArchivo && <p className="archivo-subiendo">⏳ Subiendo imagen...</p>}
                </div>
                <div className="form-group">
                  <label>O pega un enlace de imagen</label>
                  <input type="url" placeholder="https://..." value={url} onChange={(e) => { setUrl(e.target.value); if (e.target.value) setArchivo(null) }} disabled={guardando || !!archivo} />
                </div>
              </>
            ) : (
              <div className="form-group">
                <label>Enlace / URL *</label>
                <input type="url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} disabled={guardando} />
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={guardando || subiendoArchivo}>
              {subiendoArchivo ? 'Subiendo...' : guardando ? 'Guardando...' : '✓ Guardar recurso'}
            </button>
          </form>
        </div>
      )}

      <div className="recursos-controles">
        <div className="filtros">
          {['Todas', ...CATEGORIAS].map(cat => (
            <button key={cat} className={`filtro-btn ${filtroCategoria === cat ? 'activo' : ''}`} onClick={() => setFiltroCategoria(cat)}>
              {cat}
            </button>
          ))}
        </div>
        <div className="orden-controles">
          <button className={`orden-btn ${orden === 'recientes' ? 'activo' : ''}`} onClick={() => setOrden('recientes')}>🕐 Recientes</button>
          <button className={`orden-btn ${orden === 'votos' ? 'activo' : ''}`} onClick={() => setOrden('votos')}>🔥 Más votados</button>
        </div>
      </div>

      {cargando ? (
        <p className="cargando">Cargando recursos...</p>
      ) : recursosFiltrados.length === 0 ? (
        <div className="recursos-vacio">
          <p>📭 No hay recursos disponibles.</p>
          <p>Sé el primero en compartir material.</p>
        </div>
      ) : (
        <div className="recursos-lista">
          {recursosFiltrados.map(recurso => (
            <RecursoCard key={recurso.id} recurso={recurso} user={user} perfil={perfil} onEliminar={handleEliminar} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Recursos