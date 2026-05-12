import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Perfil from './pages/Perfil'
import RecuperarPassword from './pages/RecuperarPassword'
import Calificaciones from './pages/Calificaciones'
import Chat from './pages/Chat'
import Recursos from './pages/Recursos'
import GestionarCursos from './pages/GestionarCursos'
import BuscarCursos from './pages/BuscarCursos'
import MisCursos from './pages/MisCursos'
import InscripcionesCurso from './pages/InscripcionesCurso'
import Notificaciones from './pages/Notificaciones'
import Estadisticas from './pages/Estadisticas'
import PerfilPublico from './pages/PerfilPublico'
import Anuncios from './pages/Anuncios'

const ProtectedRoute = ({ children, rolesPermitidos }) => {
  const { isAuthenticated, perfil, isLoading } = useAuthStore()
  if (isLoading) return <div className="loading">Cargando...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (rolesPermitidos && !rolesPermitidos.includes(perfil?.rol)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/perfil" element={
          <ProtectedRoute><Perfil /></ProtectedRoute>
        } />
        <Route path="/calificaciones" element={
          <ProtectedRoute><Calificaciones /></ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute><Chat /></ProtectedRoute>
        } />
        <Route path="/recursos" element={
          <ProtectedRoute><Recursos /></ProtectedRoute>
        } />
        <Route path="/gestionar-cursos" element={
          <ProtectedRoute rolesPermitidos={['asesor']}>
            <GestionarCursos />
          </ProtectedRoute>
        } />
        <Route path="/buscar-cursos" element={
          <ProtectedRoute rolesPermitidos={['alumno']}>
           <BuscarCursos />
          </ProtectedRoute>
        } />
        <Route path="/mis-cursos" element={
          <ProtectedRoute rolesPermitidos={['alumno']}>
            <MisCursos />
          </ProtectedRoute>
        } />
        <Route path="/inscripciones-curso/:cursoId" element={
          <ProtectedRoute rolesPermitidos={['asesor']}>
            <InscripcionesCurso />
          </ProtectedRoute>
        } />
        <Route path="/notificaciones" element={
          <ProtectedRoute>
            <Notificaciones />
        </ProtectedRoute>
        } />
        <Route path="/estadisticas" element={
          <ProtectedRoute>
            <Estadisticas />
          </ProtectedRoute>
        } />
        <Route path="/asesor/:asesorId" element={
          <ProtectedRoute>
            <PerfilPublico />
          </ProtectedRoute>
        } />
        <Route path="/anuncios" element={
          <ProtectedRoute>
            <Anuncios />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App