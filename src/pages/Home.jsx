import { Link } from 'react-router-dom'
import '../styles/Home.css'

function Home() {
  return (
    <div className="home-container">
      <header className="home-header">
        <img src="/LogoV2.svg" alt="StudentConnect" className="home-logo" />
        <nav className="home-nav">
          <Link to="/login" className="btn-outline">Iniciar Sesión</Link>
          <Link to="/register" className="btn-primary">Registrarse</Link>
        </nav>
      </header>

      <main className="home-hero">
        <div className="hero-texto">
          <h1>Conecta con los mejores <span>asesores</span> de tu universidad</h1>
          <p>Encuentra asesorías académicas, gestiona horarios y mejora tu rendimiento estudiantil.</p>
          <Link to="/register" className="btn-primary btn-grande">Comenzar ahora</Link>
        </div>
        <div className="hero-imagen">
          <img src="/main_img.png" alt="Estudiantes" />
        </div>
      </main>
    </div>
  )
}

export default Home