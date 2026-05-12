import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, addDoc, query, where, getDocs,
  onSnapshot, orderBy, doc, setDoc, updateDoc, getDoc
} from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuthStore from '../store/authStore'
import '../styles/Chat.css'

function Chat() {
  const navigate = useNavigate()
  const { user, perfil } = useAuthStore()

  const [contactos, setContactos] = useState([])
  const [chatActivo, setChatActivo] = useState(null)
  const [mensajes, setMensajes] = useState([])
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const [cargando, setCargando] = useState(true)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState({})
  const mensajesEndRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const unsubContactosRef = useRef([])

  const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_')

  useEffect(() => {
    const cargarContactos = async () => {
      try {
        const campo = perfil?.rol === 'alumno' ? 'alumnoId' : 'asesorId'
        const campoCont = perfil?.rol === 'alumno' ? 'asesorId' : 'alumnoId'
        const nombreCont = perfil?.rol === 'alumno' ? 'asesorNombre' : 'alumnoNombre'

        const q = query(
          collection(db, 'inscripciones'),
          where(campo, '==', user.uid),
          where('estado', '==', 'confirmada')
        )
        const snapshot = await getDocs(q)

        const contactosMap = {}
        snapshot.docs.forEach(d => {
          const data = d.data()
          const contactoId = data[campoCont]
          if (!contactosMap[contactoId]) {
            contactosMap[contactoId] = { id: contactoId, nombre: data[nombreCont] }
          }
        })
        const listaContactos = Object.values(contactosMap)
        setContactos(listaContactos)

        // Escuchar mensajes no leídos de cada contacto
        listaContactos.forEach(contacto => {
          const chatId = getChatId(user.uid, contacto.id)
          const qNoLeidos = query(
            collection(db, 'chats', chatId, 'mensajes'),
            where('leido', '==', false),
            where('senderId', '!=', user.uid)
          )
          const unsub = onSnapshot(qNoLeidos, snap => {
            setMensajesNoLeidos(prev => ({
              ...prev,
              [contacto.id]: snap.size
            }))
          })
          unsubContactosRef.current.push(unsub)
        })
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargarContactos()

    return () => {
      unsubContactosRef.current.forEach(unsub => unsub())
    }
  }, [user, perfil])

  useEffect(() => {
    if (!chatActivo) return
    if (unsubscribeRef.current) unsubscribeRef.current()

    const chatId = getChatId(user.uid, chatActivo.id)
    const q = query(
      collection(db, 'chats', chatId, 'mensajes'),
      orderBy('createdAt', 'asc')
    )

    unsubscribeRef.current = onSnapshot(q, async (snapshot) => {
      const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setMensajes(lista)
      setTimeout(() => mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

      // Marcar como leídos los mensajes del otro
      const noLeidos = snapshot.docs.filter(d => !d.data().leido && d.data().senderId !== user.uid)
      await Promise.all(noLeidos.map(d => updateDoc(doc(db, 'chats', chatId, 'mensajes', d.id), { leido: true })))
    })

    return () => { if (unsubscribeRef.current) unsubscribeRef.current() }
  }, [chatActivo])

  const totalNoLeidos = Object.values(mensajesNoLeidos).reduce((sum, n) => sum + n, 0)

  const handleEnviar = async (e) => {
    e.preventDefault()
    if (!nuevoMensaje.trim() || !chatActivo) return

    const chatId = getChatId(user.uid, chatActivo.id)
    const mensaje = {
      texto: nuevoMensaje.trim(),
      senderId: user.uid,
      senderNombre: perfil.nombre,
      leido: false,
      createdAt: new Date().toISOString()
    }

    try {
      await setDoc(doc(db, 'chats', chatId), {
        participantes: [user.uid, chatActivo.id],
        updatedAt: new Date().toISOString()
      }, { merge: true })

      await addDoc(collection(db, 'chats', chatId, 'mensajes'), mensaje)
      setNuevoMensaje('')
    } catch (err) {
      console.error(err)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar(e)
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button className="btn-volver-chat" onClick={() => navigate('/dashboard')}>← Volver</button>
          <h2>💬 Chat {totalNoLeidos > 0 && <span className="chat-badge-total">{totalNoLeidos}</span>}</h2>
        </div>

        {cargando ? (
          <p className="chat-cargando">Cargando...</p>
        ) : contactos.length === 0 ? (
          <div className="chat-sin-contactos">
            <p>No tienes chats disponibles.</p>
            <small>
              {perfil?.rol === 'alumno'
                ? 'Agenda y confirma una asesoría para chatear con tu asesor.'
                : 'Confirma una asesoría para chatear con tus alumnos.'}
            </small>
          </div>
        ) : (
          <div className="contactos-lista">
            {contactos.map(contacto => (
              <div
                key={contacto.id}
                className={`contacto-item ${chatActivo?.id === contacto.id ? 'activo' : ''}`}
                onClick={() => setChatActivo(contacto)}
              >
                <div className="contacto-avatar">
                  {contacto.nombre?.charAt(0).toUpperCase()}
                </div>
                <span className="contacto-nombre">{contacto.nombre}</span>
                {mensajesNoLeidos[contacto.id] > 0 && (
                  <span className="chat-badge">{mensajesNoLeidos[contacto.id]}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chat-main">
        {!chatActivo ? (
          <div className="chat-placeholder">
            <p>👈 Selecciona un contacto para iniciar el chat</p>
          </div>
        ) : (
          <>
            <div className="chat-main-header">
              <div className="contacto-avatar">
                {chatActivo.nombre?.charAt(0).toUpperCase()}
              </div>
              <h3>{chatActivo.nombre}</h3>
            </div>

            <div className="mensajes-lista">
              {mensajes.length === 0 && (
                <p className="mensajes-vacio">No hay mensajes aún. ¡Empieza la conversación!</p>
              )}
              {mensajes.map(msg => (
                <div key={msg.id} className={`mensaje ${msg.senderId === user.uid ? 'propio' : 'ajeno'}`}>
                  <div className="mensaje-burbuja">
                    <p>{msg.texto}</p>
                    <span className="mensaje-hora">
                      {new Date(msg.createdAt).toLocaleTimeString('es-MX', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                      {msg.senderId === user.uid && (
                        <span className="mensaje-leido">{msg.leido ? ' ✓✓' : ' ✓'}</span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={mensajesEndRef} />
            </div>

            <form onSubmit={handleEnviar} className="chat-input-form">
              <textarea
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje... (Enter para enviar)"
                className="chat-input"
                rows={1}
              />
              <button type="submit" className="btn-enviar" disabled={!nuevoMensaje.trim()}>
                ➤
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default Chat