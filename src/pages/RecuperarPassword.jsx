import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase/config'
import '../styles/Login.css'

function RecuperarPassword() {
  const [correo, setCorreo] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, correo)
      setEnviado(true)
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No existe una cuenta con ese correo')
      } else {
        setError('Error al enviar el correo. Intenta de nuevo.')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/">
          <img src="/LogoV2.svg" alt="StudentConnect" className="auth-logo" />
        </Link>
        <h1>Recuperar Contraseña</h1>
        <p className="auth-subtitulo">Te enviaremos un enlace a tu correo</p>

        {enviado ? (
          <div className="recuperar-exito">
            <p>✅ Correo enviado</p>
            <p>Revisa tu bandeja de entrada y sigue las instrucciones.</p>
            <Link to="/login" className="btn-primary" style={{marginTop: '1rem', display: 'inline-block', textAlign: 'center'}}>
              Volver al Login
            </Link>
          </div>
        ) : (
          <>
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
                  disabled={cargando}
                />
              </div>
              <button type="submit" className="btn-primary btn-full" disabled={cargando}>
                {cargando ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>
            <p className="auth-link">
              ¿Recordaste tu contraseña? <Link to="/login">Inicia sesión</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default RecuperarPassword