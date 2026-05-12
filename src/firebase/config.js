import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZGDlxiypWERfc2uSLILXKIGEgie-eL7M",
  authDomain: "studentconnect-fbdd6.firebaseapp.com",
  projectId: "studentconnect-fbdd6",
  storageBucket: "studentconnect-fbdd6.firebasestorage.app",
  messagingSenderId: "372659952187",
  appId: "1:372659952187:web:34c0de68fe47084b951a1e"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);

// Habilitar modo offline (para que funcione sin internet en el celular)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log('Persistencia no disponible: múltiples pestañas abiertas');
  } else if (err.code === 'unimplemented') {
    console.log('El navegador no soporta persistencia offline');
  }
});