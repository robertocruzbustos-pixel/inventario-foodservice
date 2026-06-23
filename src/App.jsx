import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, LayoutDashboard, List, Plus, Search, AlertTriangle, 
  Image as ImageIcon, UploadCloud, Printer, Trash2, Edit, X, Save, ChefHat, Camera, LogOut
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDFpFveD-2WdqHxcm_uVY8PhrVAaSqX4yg",
  authDomain: "foodservice-inventario.firebaseapp.com",
  projectId: "foodservice-inventario",
  storageBucket: "foodservice-inventario.firebasestorage.app",
  messagingSenderId: "228274277356",
  appId: "1:228274277356:web:8b198cf8a036d0b9d28ec9",
  measurementId: "G-J0RK53W69V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "default-app-id";

// --- UTILIDAD DE COMPRESIÓN DE IMÁGENES (Para artículos) ---
const compressImage = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

const CATEGORIAS = ['Equipamiento', 'Bazar / Vajilla', 'Utensilios de Cocina'];

export default function CateringInventory() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', categoria: 'Equipamiento', cantidad: 0, stockMinimo: 5, descripcion: '', fotoBase64: '', marca: '', modelo: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error en login:", error);
      alert("Hubo un error al iniciar sesión.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (!user) return;
    const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'inventario_compartido');
    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      (item.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [items, searchTerm]);

  const itemsEnAlerta = useMemo(() => items.filter(i => Number(i.cantidad) <= Number(i.stockMinimo)), [items]);

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    setFormData(item ? { ...item } : { nombre: '', categoria: 'Equipamiento', cantidad: 0, stockMinimo: 5, descripcion: '', fotoBase64: '', marca: '', modelo: '' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setFormData(prev => ({ ...prev, fotoBase64: compressed }));
    } catch (error) { alert("Error al procesar la imagen"); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'inventario_compartido');
      const docRef = editingItem ? doc(itemsRef, editingItem.id) : doc(itemsRef);
      await setDoc(docRef, { ...formData, cantidad: Number(formData.cantidad), stockMinimo: Number(formData.stockMinimo), updated: serverTimestamp() }, { merge: true });
      handleCloseModal();
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar artículo?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventario_compartido', id));
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500 animate-pulse">Cargando...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-sm">
          <ChefHat size={64} className="mx-auto text-emerald-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-100 mb-6">Inventario FoodService</h1>
          <button onClick={handleGoogleLogin} className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold">Iniciar con Google</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col">
        <div className="p-6 text-center border-b border-slate-800">
          <ChefHat size={40} className="mx-auto text-emerald-500 mb-2" />
          <h1 className="text-xl font-bold text-slate-100">Inventario <br/><span className="text-emerald-500">FoodService</span></h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className="w-full text-left p-3 rounded-lg hover:bg-slate-800">Dashboard</button>
          <button onClick={() => setActiveTab('inventario')} className="w-full text-left p-3 rounded-lg hover:bg-slate-800">Catálogo</button>
        </nav>
        <button onClick={handleLogout} className="p-4 border-t border-slate-800 text-sm text-slate-400">Cerrar Sesión</button>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 bg-slate-900 border-b border-slate-800">
          <h2 className="font-semibold">{activeTab === 'dashboard' ? 'Panel de Control' : 'Catálogo'}</h2>
          <button onClick={() => handleOpenModal()} className="bg-emerald-600 px-4 py-2 rounded-lg text-sm">+ Nuevo</button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                   <p className="text-slate-400">Total Artículos</p>
                   <p className="text-3xl font-bold">{items.length}</p>
                </div>
             </div>
          ) : (
             <div className="space-y-4">
               {filteredItems.map(i => (
                 <div key={i.id} className="bg-slate-900 p-4 rounded-lg flex justify-between items-center border border-slate-800">
                   <div>
                     <p className="font-bold">{i.nombre}</p>
                     <p className="text-xs text-slate-500">{i.categoria}</p>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => handleOpenModal(i)}><Edit size={16}/></button>
                     <button onClick={() => handleDelete(i.id)}><Trash2 size={16} className="text-rose-500"/></button>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </main>

      {/* Modal ABM simplificado */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
           <form onSubmit={handleSave} className="bg-slate-900 p-6 rounded-xl w-full max-w-sm border border-slate-800 space-y-4">
             <input type="text" placeholder="Nombre" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-slate-950 p-3 rounded" />
             <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full bg-slate-950 p-3 rounded">
               {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <div className="flex gap-2">
               <button type="button" onClick={handleCloseModal} className="w-full py-2 border border-slate-700">Cancelar</button>
               <button type="submit" className="w-full py-2 bg-emerald-600">Guardar</button>
             </div>
           </form>
        </div>
      )}
    </div>
  );
}