import { collection, addDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

export const crearNotificacion = async (usuarioId, titulo, mensaje, tipo) => {
  try {
    await addDoc(collection(db, 'notificaciones'), {
      usuarioId,
      titulo,
      mensaje,
      tipo,
      leida: false,
      createdAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('Error al crear notificación:', err)
  }
}