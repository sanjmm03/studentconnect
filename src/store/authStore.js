import { create } from 'zustand';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const useAuthStore = create((set) => ({
  user: null,
  perfil: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Registrar nuevo usuario
  register: async (nombre, correo, contrasenia, rol) => {
    set({ isLoading: true, error: null });
    try {
      // Crear usuario en Firebase Auth
      const credencial = await createUserWithEmailAndPassword(auth, correo, contrasenia);
      const uid = credencial.user.uid;

      // Guardar perfil en Firestore
      const perfilData = {
        uid,
        nombre,
        correo,
        rol, // 'alumno' o 'asesor'
        fotoPerfil: '',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'usuarios', uid), perfilData);

      set({ 
        user: credencial.user, 
        perfil: perfilData,
        isAuthenticated: true, 
        isLoading: false 
      });

    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Iniciar sesión
  login: async (correo, contrasenia) => {
    set({ isLoading: true, error: null });
    try {
      const credencial = await signInWithEmailAndPassword(auth, correo, contrasenia);
      const uid = credencial.user.uid;

      // Obtener perfil de Firestore
      const docRef = doc(db, 'usuarios', uid);
      const docSnap = await getDoc(docRef);
      const perfilData = docSnap.exists() ? docSnap.data() : null;

      set({ 
        user: credencial.user, 
        perfil: perfilData,
        isAuthenticated: true, 
        isLoading: false 
      });

    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Cerrar sesión
  logout: async () => {
    await signOut(auth);
    set({ user: null, perfil: null, isAuthenticated: false });
  },

  // Limpiar errores
  clearError: () => set({ error: null }),

  // Inicializar listener (detecta si ya hay sesión activa)
  initAuth: () => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'usuarios', user.uid);
        const docSnap = await getDoc(docRef);
        const perfilData = docSnap.exists() ? docSnap.data() : null;
        set({ user, perfil: perfilData, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, perfil: null, isAuthenticated: false, isLoading: false });
      }
    });
  }
}));

export default useAuthStore;