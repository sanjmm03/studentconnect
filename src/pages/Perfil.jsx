import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import { subirImagen } from '../services/cloudinaryService'
import '../styles/Perfil.css'

const MATERIAS_DISPONIBLES = [
  'Matemáticas', 'Física', 'Química', 'Programación',
  'Historia', 'Inglés', 'Biología', 'Economía',
  'Estadística', 'Cálculo', 'Álgebra', 'Otro'
]

function Perfil() {
  const navigate = useNavigate()
  const { perfil, user, logout } = useAuthStore()

  const [nombre, setNombre] = useState(perfil?.nombre || '')
  const [bio, setBio] = useState(perfil?.bio || '')
  const [materias, setMaterias] = useState(perfil?.materias || [])
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [fotoPreview, setFotoPreview] = useState(perfil?.fotoPerfil || '')

  const toggleMateria = (materia) => {
    if (materias.includes(materia)) {
      setMaterias(materias.filter(m => m !== materia))
    } else {
      setMaterias([...materias, materia])
    }
  }

  const handleFotoChange = async (e) => {
    const archivo = e.target.files[0]
    if (!archivo) return

    if (!archivo.type.startsWith('image/')) {
      setError('Solo se permiten imágenes')
      return
    }

    if (archivo.size > 5 * 1024 * 1024) {
      setError('La imagen no puede ser mayor a 5MB')
      return
    }

    setSubiendoFoto(true)
    setError('')
    try {
      const url = await subirImagen(archivo)
      setFotoPreview(url)
      await updateDoc(doc(db, 'usuarios', user.uid), { fotoPerfil: url })
      useAuthStore.setState(state => ({
        perfil: { ...state.perfil, fotoPerfil: url }
      }))
    } catch (err) {
      setError('Error al subir la foto')
    } finally {
      setSubiendoFoto(false)
    }
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    setExito(false)
    try {
      const datos = { nombre, bio }
      if (perfil?.rol === 'asesor') datos.materias = materias
      await updateDoc(doc(db, 'usuarios', user.uid), datos)
      useAuthStore.setState(state => ({
        perfil: { ...state.perfil, ...datos }
      }))
      setExito(true)
    } catch (err) {
      setError('Error al guardar los cambios')
    } finally {
      setGuardando(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="perfil-container">
      <div className="perfil-card">
        <button className="btn-volver" onClick={() => navigate('/dashboard')}>
          ← Volver al Dashboard
        </button>

        {/* Avatar con opción de cambiar foto */}
        <div className="perfil-avatar-grande">
          <div className="perfil-foto-container">
            {fotoPreview ? (
              <img src={fotoPreview} alt="Perfil" />
            ) : (
              <div className="avatar-grande-placeholder">
                {perfil?.nombre?.charAt(0).toUpperCase()}
              </div>
            )}
            <label className="perfil-foto-btn" title="Cambiar foto">
              {subiendoFoto ? '⏳' : '📷'}
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                style={{display: 'none'}}
                disabled={subiendoFoto}
              />
            </label>
          </div>
          {subiendoFoto && <p className="perfil-subiendo">Subiendo foto...</p>}
        </div>

        <h1>{perfil?.nombre}</h1>
        <p className="perfil-rol">
          {perfil?.rol === 'asesor' ? '👨‍🏫 Asesor' : '👨‍🎓 Alumno'}
        </p>
        <p className="perfil-correo">{perfil?.correo}</p>

        <div className="perfil-divider" />

        <h2>Editar información</h2>

        {exito && <div className="perfil-exito">✅ Cambios guardados correctamente</div>}
        {error && <div className="perfil-error">{error}</div>}

        <form onSubmit={handleGuardar} className="perfil-form">
          <div className="form-group">
            <label>Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={guardando}
            />
          </div>

          <div className="form-group">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={perfil?.correo || ''}
              disabled
              className="input-disabled"
            />
            <small>El correo no se puede cambiar</small>
          </div>

          {perfil?.rol === 'asesor' && (
            <>
              <div className="form-group">
                <label>Biografía / Descripción</label>
                <textarea
                  placeholder="Cuéntale a los alumnos sobre ti..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  disabled={guardando}
                />
              </div>
              <div className="form-group">
                <label>Materias que impartes</label>
                <div className="materias-grid">
                  {MATERIAS_DISPONIBLES.map(materia => (
                    <button
                      key={materia}
                      type="button"
                      className={`materia-btn ${materias.includes(materia) ? 'activa' : ''}`}
                      onClick={() => toggleMateria(materia)}
                      disabled={guardando}
                    >
                      {materia}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Rol</label>
            <input
              type="text"
              value={perfil?.rol === 'asesor' ? 'Asesor' : 'Alumno'}
              disabled
              className="input-disabled"
            />
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>

        <button className="btn-logout-perfil" onClick={handleLogout}>
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default Perfil