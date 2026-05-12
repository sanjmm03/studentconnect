import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import '../styles/Login.css'

function Register() {
  const navigate = useNavigate()
  const { register, isAuthenticated, isLoading, error, clearError } = useAuthStore()

  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasenia, setContrasenia] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [rol, setRol] = useState('alumno')
  const [errorLocal, setErrorLocal] = useState('')

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard')
    return () => clearError()
  }, [isAuthenticated])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorLocal('')

    if (contrasenia !== confirmar) {
      setErrorLocal('Las contraseñas no coinciden')
      return
    }

    if (contrasenia.length < 6) {
      setErrorLocal('La contraseña debe tener al menos 6 caracteres')
      return
    }

    try {
      await register(nombre, correo, contrasenia, rol)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/">
          <img src="/LogoV2.svg" alt="StudentConnect" className="auth-logo" />
        </Link>
        <h1>Crear Cuenta</h1>
        <p className="auth-subtitulo">Únete a StudentConnect</p>

        {(error || errorLocal) && (
          <div className="auth-error">{errorLocal || error}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Nombre completo</label>
            <input
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={contrasenia}
              onChange={(e) => setContrasenia(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Confirmar contraseña</label>
            <input
              type="password"
              placeholder="Repite tu contraseña"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Soy...</label>
            <div className="rol-selector">
              <button
                type="button"
                className={`rol-btn ${rol === 'alumno' ? 'activo' : ''}`}
                onClick={() => setRol('alumno')}
                disabled={isLoading}
              >
                👨‍🎓 Alumno
              </button>
              <button
                type="button"
                className={`rol-btn ${rol === 'asesor' ? 'activo' : ''}`}
                onClick={() => setRol('asesor')}
                disabled={isLoading}
              >
                👨‍🏫 Asesor
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={isLoading}>
            {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-link">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}

export default Register