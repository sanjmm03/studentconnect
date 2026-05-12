import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import './BuscadorGlobal.css'

function BuscadorGlobal() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState({ cursos: [], asesores: [], recursos: [] })
  const [cargando, setCargando] = useState(false)
  const [mostrar, setMostrar] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setMostrar(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setResultados({ cursos: [], asesores: [], recursos: [] })
      setMostrar(false)
      return
    }

    const timer = setTimeout(async () => {
      setCargando(true)
      try {
        const texto = busqueda.toLowerCase()

        const snapCursos = await getDocs(query(collection(db, 'cursos'), where('estado', '==', 'activo')))
        const cursos = snapCursos.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.titulo?.toLowerCase().includes(texto) || c.materia?.toLowerCase().includes(texto))
          .slice(0, 3)

        const snapAsesores = await getDocs(query(collection(db, 'usuarios'), where('rol', '==', 'asesor')))
        const asesores = snapAsesores.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => a.nombre?.toLowerCase().includes(texto))
          .slice(0, 3)

        const snapRecursos = await getDocs(collection(db, 'recursos'))
        const recursos = snapRecursos.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.titulo?.toLowerCase().includes(texto) || r.categoria?.toLowerCase().includes(texto))
          .slice(0, 3)

        setResultados({ cursos, asesores, recursos })
        setMostrar(true)
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [busqueda])

  const totalResultados = resultados.cursos.length + resultados.asesores.length + resultados.recursos.length

  const handleSeleccionar = (tipo, item) => {
    setBusqueda('')
    setMostrar(false)
    if (tipo === 'curso') navigate('/buscar-cursos')
    if (tipo === 'asesor') navigate(`/asesor/${item.uid || item.id}`)
    if (tipo === 'recurso') window.open(item.url, '_blank')
  }

  return (
    <div className="bg-wrapper" ref={ref}>
      <div className="bg-input-container">
        <span className="bg-icono">🔍</span>
        <input
          type="text"
          placeholder="Buscar cursos, asesores, recursos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onFocus={() => busqueda.length >= 2 && setMostrar(true)}
          className="bg-input"
        />
        {busqueda && (
          <button className="bg-limpiar" onClick={() => { setBusqueda(''); setMostrar(false) }}>✕</button>
        )}
      </div>

      {mostrar && (
        <div className="bg-resultados">
          {cargando ? (
            <p className="bg-cargando">Buscando...</p>
          ) : totalResultados === 0 ? (
            <p className="bg-vacio">No se encontraron resultados para "{busqueda}"</p>
          ) : (
            <>
              {resultados.cursos.length > 0 && (
                <div className="bg-seccion">
                  <p className="bg-seccion-titulo">📚 Cursos</p>
                  {resultados.cursos.map(curso => (
                    <div key={curso.id} className="bg-item" onClick={() => handleSeleccionar('curso', curso)}>
                      <div className="bg-item-icon">📚</div>
                      <div className="bg-item-info">
                        <p className="bg-item-titulo">{curso.titulo}</p>
                        <p className="bg-item-sub">{curso.materia} · {curso.asesorNombre}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {resultados.asesores.length > 0 && (
                <div className="bg-seccion">
                  <p className="bg-seccion-titulo">👨‍🏫 Asesores</p>
                  {resultados.asesores.map(asesor => (
                    <div key={asesor.id} className="bg-item" onClick={() => handleSeleccionar('asesor', asesor)}>
                      <div className="bg-item-avatar">
                        {asesor.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div className="bg-item-info">
                        <p className="bg-item-titulo">{asesor.nombre}</p>
                        <p className="bg-item-sub">
                          {asesor.materias?.slice(0, 2).join(', ') || 'Asesor'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {resultados.recursos.length > 0 && (
                <div className="bg-seccion">
                  <p className="bg-seccion-titulo">📁 Recursos</p>
                  {resultados.recursos.map(recurso => (
                    <div key={recurso.id} className="bg-item" onClick={() => handleSeleccionar('recurso', recurso)}>
                      <div className="bg-item-icon">📁</div>
                      <div className="bg-item-info">
                        <p className="bg-item-titulo">{recurso.titulo}</p>
                        <p className="bg-item-sub">{recurso.categoria} · Por {recurso.autorNombre}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default BuscadorGlobal