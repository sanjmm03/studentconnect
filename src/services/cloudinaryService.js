const CLOUD_NAME = 'dlstoeoo2'
const UPLOAD_PRESET = 'studentconnect'

export const subirImagen = async (archivo) => {
  const formData = new FormData()
  formData.append('file', archivo)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'studentconnect/perfiles')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )
  if (!response.ok) throw new Error('Error al subir imagen')
  const data = await response.json()
  return data.secure_url
}

export const subirArchivo = async (archivo) => {
  const formData = new FormData()
  formData.append('file', archivo)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'studentconnect/recursos')

  const esImagen = archivo.type.startsWith('image/')
  const endpoint = esImagen ? 'image' : 'raw'

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpoint}/upload`,
    { method: 'POST', body: formData }
  )
  if (!response.ok) throw new Error('Error al subir archivo')
  const data = await response.json()

  // Para PDFs usar Google Docs Viewer
  if (archivo.type === 'application/pdf') {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(data.secure_url)}&embedded=true`
  }

  return data.secure_url
}