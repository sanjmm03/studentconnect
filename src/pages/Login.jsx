import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import '../styles/Login.css'

function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore()

  const [correo, setCorreo] = useState('')
  const [contrasenia, setContrasenia] = useState('')

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard')
    return () => clearError()
  }, [isAuthenticated])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(correo, contrasenia)
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
        <h1>Iniciar Sesión</h1>
        <p className="auth-subtitulo">Bienvenido de nuevo</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
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
              placeholder="Tu contraseña"
              value={contrasenia}
              onChange={(e) => setContrasenia(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

         <div style={{textAlign: 'right'}}>
          <Link to="/recuperar-password" style={{fontSize: '0.85rem', color: 'var(--accent)', fontWeight: '500'}}>
            ¿Olvidaste tu contraseña?
          </Link>
         </div> 

          <button type="submit" className="btn-primary btn-full" disabled={isLoading}>
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="auth-link">
          ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  )
}

export default Login