import { useState, useRef, useEffect } from 'react';
import { 
  Layout, 
  Globe, 
  Smartphone, 
  Palette, 
  Share2, 
  Plus, 
  Image as ImageIcon, 
  Send, 
  History, 
  CheckCircle2, 
  Loader2, 
  Copy, 
  LogOut,
  ChevronRight,
  MessageSquare,
  DollarSign,
  Clock,
  ShieldCheck,
  CreditCard,
  ImagePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";
import { auth, db } from './firebase';
import { CategoryType, SubPackage, Project, ChatMessage } from './types';
import { PACKAGES_DATA } from './constants';
import Logo from './components/Logo';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES: { type: CategoryType; icon: any; description: string }[] = [
  { type: 'Desarrollo Web', icon: Globe, description: 'Landing pages, E-commerce, Sitios corporativos' },
  { type: 'Aplicaciones Web', icon: Smartphone, description: 'Web apps y aplicaciones móviles' },
  { type: 'Branding', icon: Palette, description: 'Logos, manuales de marca, identidad visual' },
  { type: 'Social Media', icon: Share2, description: 'Estrategia, contenido y gestión de redes' },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [selectedSubPackage, setSelectedSubPackage] = useState<SubPackage | null>(null);
  const [images, setImages] = useState<{url: string, type: 'logo' | 'referencia' | 'paleta'}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'ai'>('form');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiType, setAiType] = useState<'chat' | 'image' | 'video'>('chat');
  const [aiComplexity, setAiComplexity] = useState<'fast' | 'general' | 'high'>('general');
  const [aiQuality, setAiQuality] = useState<'standard' | 'high'>('standard');
  const [aiAspectRatio, setAiAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsLoggedIn(true);
    } else {
      alert('Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'referencia' | 'paleta') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // Validar tamaño (máximo 5MB por imagen)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert(`La imagen ${file.name} es demasiado grande. Máximo 5MB por imagen.`);
        return;
      }

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert(`El archivo ${file.name} no es una imagen válida.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadstart = () => {
        // Mostrar loading mientras se procesa
        console.log(`Procesando imagen: ${file.name}`);
      };
      reader.onloadend = () => {
        setImages(prev => [...prev, { url: reader.result as string, type }]);
      };
      reader.onerror = () => {
        alert(`Error al procesar la imagen ${file.name}. Intenta con otra imagen.`);
      };
      reader.readAsDataURL(file);
    });

    // Limpiar el input para permitir seleccionar la misma imagen de nuevo
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const startProcessing = async () => {
    if (!clientName || !projectName || !selectedSubPackage) return;
    setIsProcessing(true);
    setChatMessages([
      { role: 'model', text: `¡Hola! Soy el Agente de DigiMarket RD. He recibido los datos para el proyecto **${projectName}** de **${clientName}**. \n\nHas seleccionado el paquete **${selectedSubPackage.name}** (${selectedSubPackage.price}). \n\nEste paquete incluye: \n${selectedSubPackage.features.map(f => `* ${f}`).join('\n')}\n\n¿Hay algún detalle específico o preferencia visual que quieras que los agentes consideren antes de generar la propuesta final?` }
    ]);
  };

  const sendMessage = async () => {
    if (!currentInput.trim()) return;
    const userMsg = currentInput;
    setCurrentInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);

    setTimeout(async () => {
      setChatMessages(prev => [...prev, { role: 'model', text: 'Entendido. Estoy analizando las referencias y los requerimientos del paquete. Los agentes especializados están redactando el plan de ejecución...' }]);
      await generateFinalResult(userMsg);
    }, 1000);
  };

  const generateFinalResult = async (userInstructions: string) => {
    try {
      let endpoint = '';
      if (selectedCategory === 'Branding') endpoint = '/api/generate-branding';
      else if (selectedCategory === 'Desarrollo Web' || selectedCategory === 'Aplicaciones Web') endpoint = '/api/generate-web';
      else if (selectedCategory === 'Social Media') endpoint = '/api/generate-social';

      if (endpoint) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName,
            projectName,
            subPackage: selectedSubPackage,
            extraInfo: `${extraInfo}\nInstrucciones del chat: ${userInstructions}`,
            images
          })
        });

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          data = await response.json();
        } else {
          const text = await response.text();
          throw new Error(`Error del servidor: ${response.status} - ${text.substring(0, 100)}...`);
        }
        
        if (data.success) {
          const newProject: Project = {
            id: Date.now().toString(),
            userId: 'admin',
            clientName,
            projectName,
            extraInfo,
            category: selectedCategory!,
            subPackageId: selectedSubPackage!.id,
            images,
            status: 'completed',
            createdAt: Date.now(),
            result: data.data
          };
          setHistory(prev => [newProject, ...prev]);
          setResult(data.data); // Store the full result object
        } else {
          throw new Error(data.error);
        }
      } else {
        // Fallback for other categories using Gemini directly for now
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("La clave de API de Gemini no está configurada.");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = "gemini-3-flash-preview";

        const prompt = `Actúa como un Agente Maestro de Marketing y Tecnología en DigiMarket RD (República Dominicana). 
        Tu tarea es generar un plan de ejecución y propuesta técnica IRREFUTABLE para un cliente.
        
        DATOS DEL CLIENTE:
        - Cliente: ${clientName}
        - Proyecto: ${projectName}
        - Categoría: ${selectedCategory}
        
        DETALLES DEL PAQUETE SELECCIONADO:
        - Nombre: ${selectedSubPackage?.name}
        - Precio: ${selectedSubPackage?.price}
        - Tiempo de Entrega: ${selectedSubPackage?.deliveryTime}
        - Revisiones: ${selectedSubPackage?.revisions}
        - Condiciones de Pago: ${selectedSubPackage?.paymentTerms}
        - Características Incluidas: ${selectedSubPackage?.features.join(', ')}
        
        CONTEXTO ADICIONAL:
        - Info Extra: ${extraInfo}
        - Instrucciones del Chat: ${userInstructions}
        
        ESTRUCTURA DEL DOCUMENTO FINAL (Markdown):
        1. 📋 RESUMEN DE LA PROPUESTA (Enfocado en el valor para el cliente)
        2. 🎯 OBJETIVOS DEL PROYECTO (Específicos y medibles)
        3. 🛠️ ALCANCE TÉCNICO Y CREATIVO (Detallar cada punto del paquete ${selectedSubPackage?.name})
        4. 📅 CRONOGRAMA DE TRABAJO (Basado en ${selectedSubPackage?.deliveryTime})
        5. 💳 RESUMEN FINANCIERO Y TÉRMINOS (Precio: ${selectedSubPackage?.price}, Términos: ${selectedSubPackage?.paymentTerms})
        6. 🇩🇴 CONSIDERACIONES PARA EL MERCADO DOMINICANO (Cultura, tendencias locales, etc.)
        
        IMPORTANTE: No inventes precios ni tiempos. Usa exactamente los proporcionados. Sé extremadamente profesional y detallado.`;

        const parts: any[] = [{ text: prompt }];

        if (images.length > 0) {
          images.forEach(img => {
            try {
              const [header, data] = img.url.split(',');
              const mimeType = header.split(':')[1].split(';')[0];
              parts.push({
                text: `Esta imagen es de tipo: ${img.type.toUpperCase()}`
              });
              parts.push({
                inlineData: {
                  mimeType,
                  data
                }
              });
            } catch (e) {
              console.error("Error processing image for AI:", e);
            }
          });
        }

        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
        });

        const text = response.text || "Error al generar el resultado.";
        setResult(text);
        
        const newProject: Project = {
          id: Date.now().toString(),
          userId: 'admin',
          clientName,
          projectName,
          extraInfo,
          category: selectedCategory!,
          subPackageId: selectedSubPackage!.id,
          images,
          status: 'completed',
          createdAt: Date.now(),
          result: text
        };
        setHistory(prev => [newProject, ...prev]);
      }
    } catch (error: any) {
      console.error("Error generating content:", error);
      let errorMessage = "Hubo un error al conectar con los agentes. Por favor, intenta de nuevo.";
      
      if (error.message?.includes("API key not valid")) {
        errorMessage = "Error: La clave de API de Gemini no es válida.";
      } else if (error.message?.includes("quota")) {
        errorMessage = "Error: Se ha excedido la cuota de la API de Gemini.";
      } else if (error.message) {
        errorMessage = `Error de los agentes: ${error.message}`;
      }
      
      setResult(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Funciones para persistencia en Firebase
  const saveProject = async () => {
    if (!result) {
      alert('No hay resultado para guardar');
      return;
    }

    try {
      const projectData = {
        clientName,
        projectName,
        extraInfo,
        branding: selectedCategory === 'Branding' ? result : null,
        web: (selectedCategory === 'Desarrollo Web' || selectedCategory === 'Aplicaciones Web') ? result : null,
        social: selectedCategory === 'Social Media' ? result : null,
        app: null // Por ahora
      };

      const response = await fetch('/api/save-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Error del servidor: ${response.status} - ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      if (data.success) {
        alert('Proyecto guardado exitosamente');
      } else {
        throw new Error(data.error || 'No se pudo guardar el proyecto');
      }
    } catch (error: any) {
      console.error('Error saving project:', error);
      alert('Error al guardar el proyecto: ' + error.message);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/get-projects');
      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid response type:', contentType);
        return;
      }
      
      const data = await response.json();
      if (data.success && data.projects && data.projects.length > 0) {
        const firebaseProjects: Project[] = data.projects.map((p: any) => ({
          id: p.id,
          userId: 'admin',
          clientName: p.clientName,
          projectName: p.projectName || p.clientName,
          extraInfo: p.extraInfo,
          category: p.branding ? 'Branding' : p.web ? 'Desarrollo Web' : p.social ? 'Social Media' : 'Aplicaciones Web',
          subPackageId: 'unknown',
          images: [],
          status: 'completed',
          createdAt: new Date(p.createdAt).getTime(),
          result: p.branding || p.web || p.social || p.app
        }));
        setHistory(firebaseProjects);
        setActiveTab('history');
      }
    } catch (error: any) {
      console.error('Error loading projects:', error);
    }
  };

  // Cargar proyectos al iniciar
  useEffect(() => {
    if (isLoggedIn) {
      loadProjects();
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-brand-card border border-brand-border rounded-2xl p-8 shadow-2xl"
        >
          <div className="text-center mb-8">
            <Logo className="mx-auto" size="lg" showText={false} />
            <h1 className="text-3xl font-extrabold text-brand-cyan tracking-tight mt-4">DigiMarket <span className="text-white font-light">RD</span></h1>
            <p className="text-brand-muted mt-2">Panel de Administración de Agencia</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Usuario</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:border-brand-cyan outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:border-brand-cyan outline-none transition-colors"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-transparent border-2 border-brand-cyan text-brand-cyan font-bold py-3 rounded-xl hover:bg-brand-cyan hover:text-black transition-all shadow-lg shadow-brand-cyan-glow"
            >
              Ingresar al Panel
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="h-20 bg-brand-card border-b border-brand-border px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Logo size="sm" showText={false} />
          <div>
            <h1 className="text-xl font-black text-brand-cyan">DigiMarket <span className="text-brand-secondary font-light">RD</span></h1>
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-muted">Diseño Web · Redes Sociales · Diseño Gráfico</p>
          </div>
          <nav className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('form')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'form' ? "bg-brand-border text-brand-cyan" : "text-brand-muted hover:text-white"
              )}
            >
              Nuevo Proyecto
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'history' ? "bg-brand-border text-brand-cyan" : "text-brand-muted hover:text-white"
              )}
            >
              Historial
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'ai' ? "bg-brand-border text-brand-cyan" : "text-brand-muted hover:text-white"
              )}
            >
              IA Generativa
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-cyan flex items-center justify-center text-black font-bold text-xs">A</div>
            <span className="text-sm font-medium text-brand-muted hidden sm:inline">admin</span>
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="p-2 text-brand-muted hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        {activeTab === 'form' ? (
          // Vista del formulario (ya existe)
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contenido del formulario */}
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-brand-card border border-brand-border rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Plus className="text-brand-cyan" /> Configuración del Proyecto
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Nombre del Cliente</label>
                    <input 
                      type="text" 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:border-brand-cyan outline-none transition-colors"
                      placeholder="Ej: Inmobiliaria Santo Domingo"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Nombre del Proyecto</label>
                    <input 
                      type="text" 
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:border-brand-cyan outline-none transition-colors"
                      placeholder="Ej: Lanzamiento App Móvil"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Información Extra / Contexto</label>
                    <textarea 
                      value={extraInfo}
                      onChange={(e) => setExtraInfo(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:border-brand-cyan outline-none transition-colors min-h-[80px] font-mono text-sm"
                      placeholder="Detalles adicionales, objetivos específicos..."
                    />
                  </div>
                </div>

                <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-4">1. Selecciona la Categoría</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.type;
                    return (
                      <button
                        key={cat.type}
                        onClick={() => {
                          setSelectedCategory(cat.type);
                          setSelectedSubPackage(null);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                          isSelected 
                            ? "bg-brand-bg border-brand-cyan text-brand-cyan shadow-lg shadow-brand-cyan-glow" 
                            : "bg-brand-bg border-brand-border text-brand-muted hover:border-brand-muted hover:text-white"
                        )}
                      >
                        <Icon size={20} />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-center">{cat.type}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedCategory && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-4">2. Selecciona el Paquete</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {PACKAGES_DATA[selectedCategory]?.map((pkg) => {
                          const isSelected = selectedSubPackage?.id === pkg.id;
                          return (
                            <motion.button
                              key={pkg.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedSubPackage(pkg)}
                              className={cn(
                                "p-4 rounded-xl border text-left transition-all",
                                isSelected 
                                  ? "bg-brand-bg border-brand-cyan text-brand-cyan shadow-lg shadow-brand-cyan-glow" 
                                  : "bg-brand-bg border-brand-border text-brand-muted hover:border-brand-muted hover:text-white"
                              )}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-sm">{pkg.name}</span>
                                <span className="text-xs font-black text-brand-cyan">{pkg.price}</span>
                              </div>
                              <p className="text-[10px] leading-tight opacity-80 mb-2">{pkg.description}</p>
                              <div className="flex items-center gap-2 text-[9px] opacity-60">
                                <Clock size={10} />
                                <span>{pkg.deliveryTime}</span>
                                <span>•</span>
                                <span>{pkg.revisions} revisiones</span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedSubPackage && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-brand-bg rounded-xl p-4 border border-brand-border"
                      >
                        <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-green-500" />
                          Paquete Seleccionado: {selectedSubPackage.name}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-brand-muted">Precio:</span>
                            <span className="text-white font-bold ml-1">{selectedSubPackage.price}</span>
                          </div>
                          <div>
                            <span className="text-brand-muted">Entrega:</span>
                            <span className="text-white font-bold ml-1">{selectedSubPackage.deliveryTime}</span>
                          </div>
                          <div>
                            <span className="text-brand-muted">Revisiones:</span>
                            <span className="text-white font-bold ml-1">{selectedSubPackage.revisions}</span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <span className="text-brand-muted text-xs">Características incluidas:</span>
                          <ul className="text-xs text-white mt-1 space-y-0.5">
                            {selectedSubPackage.features.map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-brand-cyan rounded-full" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}

                    {(selectedCategory === 'Branding' || selectedCategory === 'Social Media') && (
                      <motion.section 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-brand-bg rounded-xl p-4 border border-brand-border"
                      >
                        <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                          <ImagePlus size={16} className="text-brand-cyan" />
                          Referencias Visuales
                        </h4>
                        <div className="flex flex-wrap gap-3 mb-4">
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-brand-border border border-brand-border rounded-xl text-xs font-bold hover:border-brand-cyan transition-colors flex items-center gap-2"
                          >
                            <ImagePlus size={14} />
                            Subir Imágenes
                          </button>
                          {selectedCategory === 'Branding' && (
                            <button 
                              onClick={() => handleImageUpload({ target: { files: [] } } as any, 'logo')}
                              className="px-4 py-2 bg-brand-border border border-brand-border rounded-xl text-xs font-bold hover:border-brand-cyan transition-colors"
                            >
                              Logo
                            </button>
                          )}
                          <button 
                            onClick={() => handleImageUpload({ target: { files: [] } } as any, 'referencia')}
                            className="px-4 py-2 bg-brand-border border border-brand-border rounded-xl text-xs font-bold hover:border-brand-cyan transition-colors"
                          >
                            Referencia
                          </button>
                          <button 
                            onClick={() => handleImageUpload({ target: { files: [] } } as any, 'paleta')}
                            className="px-4 py-2 bg-brand-border border border-brand-border rounded-xl text-xs font-bold hover:border-brand-cyan transition-colors"
                          >
                            Paleta
                          </button>
                        </div>
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          multiple 
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'referencia')}
                          className="hidden"
                        />
                        {images.length > 0 && (
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4 p-4 bg-brand-bg rounded-xl border border-brand-border">
                            {images.map((img, idx) => (
                              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-brand-border group">
                                <img src={img.url} alt="Ref" className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[8px] font-bold text-center py-0.5 uppercase text-brand-cyan">
                                  {img.type}
                                </div>
                                <button onClick={() => removeImage(idx)} className="absolute top-0.5 right-0.5 bg-black/60 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Plus size={10} className="rotate-45" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.section>
                    )}
                  </motion.div>
                )}

                <button 
                  onClick={startProcessing}
                  disabled={!clientName || !projectName || !selectedSubPackage || isProcessing}
                  className="w-full py-4 bg-brand-cyan text-black font-black rounded-2xl hover:bg-[#00cfff] transition-all shadow-xl shadow-brand-cyan-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <ChevronRight />}
                  Comenzar Ejecución con Agentes
                </button>

                {result && (
                  <button 
                    onClick={saveProject}
                    className="w-full py-3 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wide text-sm mt-4"
                  >
                    <CheckCircle2 size={16} />
                    Guardar Proyecto
                  </button>
                )}
              </section>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-brand-card border border-brand-border rounded-2xl h-[650px] flex flex-col sticky top-24 overflow-hidden">
                <div className="p-4 border-b border-brand-border bg-brand-bg/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <h3 className="text-sm font-bold">Canal de Agentes</h3>
                  </div>
                  {isProcessing && <Loader2 size={14} className="animate-spin text-brand-cyan" />}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
                      <MessageSquare size={40} className="mb-4" />
                      <p className="text-xs">Configura el proyecto para iniciar la comunicación con los agentes.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className={cn(
                        "max-w-[90%] p-3 rounded-xl text-xs leading-relaxed",
                        msg.role === 'user' 
                          ? "bg-brand-cyan text-black ml-auto rounded-tr-none font-medium" 
                          : "bg-brand-bg border border-brand-border text-brand-text rounded-tl-none"
                      )}>
                        <div className="prose prose-invert prose-xs max-w-none">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {chatMessages.length > 0 && (
                  <div className="p-4 border-t border-brand-border bg-brand-bg/50">
                    <div className="flex gap-2">
                      <input 
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Escribe instrucciones adicionales..."
                        className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs focus:border-brand-cyan outline-none transition-colors"
                      />
                      <button 
                        onClick={sendMessage}
                        disabled={!currentInput.trim() || isProcessing}
                        className="px-4 py-2 bg-brand-cyan text-black font-bold rounded-xl hover:bg-[#00cfff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'history' ? (
          // Vista del historial
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Historial de Proyectos</h2>
              <button onClick={() => setActiveTab('form')} className="text-brand-cyan text-sm font-bold flex items-center gap-2 hover:underline">
                <Plus size={16} /> Nuevo Proyecto
              </button>
            </div>
            
            {history.length === 0 ? (
              <div className="bg-brand-card border border-brand-border rounded-2xl p-12 text-center">
                <History size={48} className="text-brand-border mx-auto mb-4" />
                <p className="text-brand-muted">No hay proyectos generados todavía.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {history.map((proj) => (
                  <motion.div 
                    key={proj.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-brand-card border border-brand-border rounded-2xl p-6 hover:border-brand-cyan transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-lg">{proj.projectName}</h3>
                          <span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded text-[10px] font-bold text-brand-cyan uppercase">{proj.category}</span>
                        </div>
                        <p className="text-brand-muted text-sm">Cliente: <span className="text-white">{proj.clientName}</span> · {new Date(proj.createdAt).toLocaleDateString('es-DO')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setResult(proj.result);
                            setClientName(proj.clientName);
                            setProjectName(proj.projectName);
                            setSelectedCategory(proj.category);
                            setActiveTab('form');
                          }}
                          className="px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold hover:border-brand-cyan transition-colors"
                        >
                          Ver Detalles
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(typeof proj.result === 'string' ? proj.result : JSON.stringify(proj.result))} className="p-2 bg-brand-bg border border-brand-border rounded-xl text-brand-muted hover:text-brand-cyan transition-colors">
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'ai' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-brand-card border border-brand-border rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Plus className="text-brand-cyan" /> Configuración del Proyecto
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Nombre del Cliente</label>
                    <input 
                      type="text" 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:border-brand-cyan outline-none transition-colors"
                      placeholder="Ej: Inmobiliaria Santo Domingo"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Nombre del Proyecto</label>
                    <input 
                      type="text" 
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:border-brand-cyan outline-none transition-colors"
                      placeholder="Ej: Lanzamiento App Móvil"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Información Extra / Contexto</label>
                    <textarea 
                      value={extraInfo}
                      onChange={(e) => setExtraInfo(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:border-brand-cyan outline-none transition-colors min-h-[80px] font-mono text-sm"
                      placeholder="Detalles adicionales, objetivos específicos..."
                    />
                  </div>
                </div>

                <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-4">1. Selecciona la Categoría</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.type;
                    return (
                      <button
                        key={cat.type}
                        onClick={() => {
                          setSelectedCategory(cat.type);
                          setSelectedSubPackage(null);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                          isSelected 
                            ? "bg-brand-bg border-brand-cyan text-brand-cyan shadow-lg shadow-brand-cyan-glow" 
                            : "bg-brand-bg border-brand-border text-brand-muted hover:border-brand-muted hover:text-white"
                        )}
                      >
                        <Icon size={20} />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-center">{cat.type}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedCategory && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider">2. Selecciona el Paquete Específico</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {PACKAGES_DATA[selectedCategory].map((pkg) => {
                        const isSelected = selectedSubPackage?.id === pkg.id;
                        return (
                          <button
                            key={pkg.id}
                            onClick={() => setSelectedSubPackage(pkg)}
                            className={cn(
                              "p-4 rounded-xl border transition-all text-left flex flex-col justify-between h-full",
                              isSelected 
                                ? "bg-brand-bg border-brand-cyan ring-1 ring-brand-cyan" 
                                : "bg-brand-bg border-brand-border hover:border-brand-muted"
                            )}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-sm">{pkg.name}</span>
                                <span className="text-brand-cyan font-black text-xs">{pkg.price}</span>
                              </div>
                              <p className="text-[10px] text-brand-muted line-clamp-2 mb-4">{pkg.description}</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {pkg.features.slice(0, 3).map((f, i) => (
                                <span key={i} className="text-[8px] bg-brand-card px-1.5 py-0.5 rounded text-brand-muted border border-brand-border">{f}</span>
                              ))}
                              {pkg.features.length > 3 && <span className="text-[8px] text-brand-cyan font-bold">+{pkg.features.length - 3} más</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </section>

              {selectedSubPackage && (
                <motion.section 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-brand-card border border-brand-border rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider">Detalles del Paquete Seleccionado</h3>
                    <div className="text-brand-cyan font-black text-lg">{selectedSubPackage.price}</div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-brand-bg p-3 rounded-xl border border-brand-border flex items-center gap-3">
                      <Clock size={16} className="text-brand-cyan" />
                      <div>
                        <p className="text-[8px] font-bold text-brand-muted uppercase">Entrega</p>
                        <p className="text-xs font-bold">{selectedSubPackage.deliveryTime}</p>
                      </div>
                    </div>
                    <div className="bg-brand-bg p-3 rounded-xl border border-brand-border flex items-center gap-3">
                      <ShieldCheck size={16} className="text-brand-cyan" />
                      <div>
                        <p className="text-[8px] font-bold text-brand-muted uppercase">Revisiones</p>
                        <p className="text-xs font-bold">{selectedSubPackage.revisions}</p>
                      </div>
                    </div>
                    <div className="bg-brand-bg p-3 rounded-xl border border-brand-border flex items-center gap-3">
                      <CreditCard size={16} className="text-brand-cyan" />
                      <div>
                        <p className="text-[8px] font-bold text-brand-muted uppercase">Pago</p>
                        <p className="text-xs font-bold">{selectedSubPackage.paymentTerms}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-8">
                    <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Características Incluidas:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedSubPackage.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-brand-text">
                          <CheckCircle2 size={12} className="text-brand-cyan" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider">Activos de Marca y Referencias</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <button onClick={() => { fileInputRef.current!.accept = "image/*"; fileInputRef.current!.onchange = (e) => handleImageUpload(e as any, 'logo'); fileInputRef.current?.click(); }} className="p-3 rounded-xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center text-brand-muted hover:border-brand-cyan hover:text-brand-cyan transition-all">
                      <ImageIcon size={20} className="mb-2" />
                      <span className="text-[10px] font-bold uppercase">Subir Logo</span>
                    </button>
                    <button onClick={() => { fileInputRef.current!.accept = "image/*"; fileInputRef.current!.onchange = (e) => handleImageUpload(e as any, 'paleta'); fileInputRef.current?.click(); }} className="p-3 rounded-xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center text-brand-muted hover:border-brand-cyan hover:text-brand-cyan transition-all">
                      <Palette size={20} className="mb-2" />
                      <span className="text-[10px] font-bold uppercase">Subir Paleta</span>
                    </button>
                    <button onClick={() => { fileInputRef.current!.accept = "image/*"; fileInputRef.current!.onchange = (e) => handleImageUpload(e as any, 'referencia'); fileInputRef.current?.click(); }} className="p-3 rounded-xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center text-brand-muted hover:border-brand-cyan hover:text-brand-cyan transition-all">
                      <ImagePlus size={20} className="mb-2" />
                      <span className="text-[10px] font-bold uppercase">Subir Referencia</span>
                    </button>
                  </div>

                  <input type="file" ref={fileInputRef} multiple className="hidden" />
                  
                  {images.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4 p-4 bg-brand-bg rounded-xl border border-brand-border">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-brand-border group">
                          <img src={img.url} alt="Ref" className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[8px] font-bold text-center py-0.5 uppercase text-brand-cyan">
                            {img.type}
                          </div>
                          <button onClick={() => removeImage(idx)} className="absolute top-0.5 right-0.5 bg-black/60 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={10} className="rotate-45" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.section>
              )}

              <button 
                onClick={startProcessing}
                disabled={!clientName || !projectName || !selectedSubPackage || isProcessing}
                className="w-full py-4 bg-brand-cyan text-black font-black rounded-2xl hover:bg-[#00cfff] transition-all shadow-xl shadow-brand-cyan-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <ChevronRight />}
                Comenzar Ejecución con Agentes
              </button>

              {result && (
                <button 
                  onClick={saveProject}
                  className="w-full py-3 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wide text-sm mt-4"
                >
                  <CheckCircle2 size={16} />
                  Guardar Proyecto
                </button>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-brand-card border border-brand-border rounded-2xl h-[650px] flex flex-col sticky top-24 overflow-hidden">
                <div className="p-4 border-b border-brand-border bg-brand-bg/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <h3 className="text-sm font-bold">Canal de Agentes</h3>
                  </div>
                  {isProcessing && <Loader2 size={14} className="animate-spin text-brand-cyan" />}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
                      <MessageSquare size={40} className="mb-4" />
                      <p className="text-xs">Configura el proyecto para iniciar la comunicación con los agentes.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className={cn(
                        "max-w-[90%] p-3 rounded-xl text-xs leading-relaxed",
                        msg.role === 'user' 
                          ? "bg-brand-cyan text-black ml-auto rounded-tr-none font-medium" 
                          : "bg-brand-bg border border-brand-border text-brand-text rounded-tl-none"
                      )}>
                        {msg.text}
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-brand-bg/30 border-t border-brand-border">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={!isProcessing && chatMessages.length === 0}
                      className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-4 py-2 text-xs outline-none focus:border-brand-cyan transition-colors disabled:opacity-50"
                      placeholder="Escribe instrucciones..."
                    />
                    <button 
                      onClick={sendMessage}
                      disabled={!isProcessing && chatMessages.length === 0}
                      className="p-2 bg-brand-cyan text-black rounded-xl hover:bg-[#00cfff] transition-colors disabled:opacity-50"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Historial de Proyectos</h2>
              <button onClick={() => setActiveTab('form')} className="text-brand-cyan text-sm font-bold flex items-center gap-2 hover:underline">
                <Plus size={16} /> Nuevo Proyecto
              </button>
            </div>
            
            {history.length === 0 ? (
              <div className="bg-brand-card border border-brand-border rounded-2xl p-12 text-center">
                <History size={48} className="text-brand-border mx-auto mb-4" />
                <p className="text-brand-muted">No hay proyectos generados todavía.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {history.map((proj) => (
                  <motion.div 
                    key={proj.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-brand-card border border-brand-border rounded-2xl p-6 hover:border-brand-cyan transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-lg">{proj.projectName}</h3>
                          <span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded text-[10px] font-bold text-brand-cyan uppercase">{proj.category}</span>
                        </div>
                        <p className="text-brand-muted text-sm">Cliente: <span className="text-white">{proj.clientName}</span> · {new Date(proj.createdAt).toLocaleDateString('es-DO')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setResult(proj.result);
                            setClientName(proj.clientName);
                            setProjectName(proj.projectName);
                            setSelectedCategory(proj.category);
                            setActiveTab('form');
                          }}
                          className="px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold hover:border-brand-cyan transition-colors"
                        >
                          Ver Detalles
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(typeof proj.result === 'string' ? proj.result : JSON.stringify(proj.result))} className="p-2 bg-brand-bg border border-brand-border rounded-xl text-brand-muted hover:text-brand-cyan transition-colors">
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="mt-12 bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-brand-border bg-brand-bg/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-green-500" />
                  <h3 className="text-lg font-bold">Resultado Final</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigator.clipboard.writeText(typeof result === 'string' ? result : JSON.stringify(result))} className="flex items-center gap-2 px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold hover:border-brand-cyan transition-colors">
                    <Copy size={14} /> Copiar
                  </button>
                  <button onClick={() => setResult(null)} className="p-2 bg-brand-bg border border-brand-border rounded-xl text-brand-muted hover:text-white transition-colors">
                    <Plus size={18} className="rotate-45" />
                  </button>
                </div>
              </div>
              <div className="p-8">
                {typeof result === 'string' ? (
                  <div className="prose prose-invert max-w-none text-brand-text leading-relaxed text-sm">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Code Files */}
                    {result.code && (
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Copy size={20} className="text-brand-cyan" />
                          Código Generado
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(result.code).map(([filename, content]: [string, any], idx: number) => (
                            <div key={idx} className="bg-brand-bg p-4 rounded-xl border border-brand-border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-brand-cyan uppercase">{filename}</span>
                                <button 
                                  onClick={() => navigator.clipboard.writeText(content)}
                                  className="text-brand-muted hover:text-white transition-colors"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                              <pre className="text-xs text-brand-text overflow-x-auto bg-brand-dark p-2 rounded">
                                <code>{content}</code>
                              </pre>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Logos Section */}
                    {result.generatedLogos && (
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <ImageIcon size={20} className="text-brand-cyan" />
                          Propuestas de Logo
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {result.generatedLogos.map((logo: string, idx: number) => (
                            <div key={idx} className="bg-brand-bg rounded-xl border border-brand-border overflow-hidden group">
                              <div className="aspect-square relative">
                                <img src={logo} alt={`Propuesta ${idx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <a href={logo} download={`logo-propuesta-${idx+1}.jpg`} className="bg-brand-cyan text-brand-dark px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
                                    <Copy size={16} /> Descargar
                                  </a>
                                </div>
                              </div>
                              <div className="p-3 text-center border-t border-brand-border">
                                <span className="text-xs font-bold text-brand-muted uppercase">Propuesta {idx + 1}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Color Palette */}
                    {result.colorPalette && (
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Palette size={20} className="text-brand-cyan" />
                          Paleta de Colores
                        </h3>
                        <div className="flex flex-wrap gap-4">
                          {result.colorPalette.map((color: any, idx: number) => (
                            <div key={idx} className="flex flex-col items-center">
                              <div 
                                className="w-16 h-16 rounded-full shadow-lg border-2 border-brand-border mb-2"
                                style={{ backgroundColor: color.hex }}
                              />
                              <span className="text-xs font-bold text-white">{color.hex}</span>
                              <span className="text-[10px] text-brand-muted uppercase">{color.usage}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Typography */}
                    {result.typography && (
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Layout size={20} className="text-brand-cyan" />
                          Tipografías
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {result.typography.map((type: any, idx: number) => (
                            <div key={idx} className="bg-brand-bg p-4 rounded-xl border border-brand-border">
                              <div className="text-xs font-bold text-brand-cyan uppercase mb-1">{type.usage}</div>
                              <div className="text-xl font-bold text-white">{type.name}</div>
                              <div className="text-3xl mt-2 opacity-50" style={{ fontFamily: type.name }}>Aa Bb Cc</div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Brand Manual */}
                    {result.brandManual && (
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <CheckCircle2 size={20} className="text-brand-cyan" />
                          Manual de Marca
                        </h3>
                        <div className="bg-brand-bg p-6 rounded-xl border border-brand-border prose prose-invert prose-brand max-w-none">
                          <ReactMarkdown>{result.brandManual}</ReactMarkdown>
                        </div>
                        {/* ZIP Download Button */}
                        <div className="mt-4">
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/generate-branding-zip', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    clientName,
                                    subPackage: selectedSubPackage,
                                    extraInfo,
                                    images: images
                                  })
                                });
                                if (!response.ok) throw new Error('Error generando ZIP');
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${clientName}-branding.zip`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                window.URL.revokeObjectURL(url);
                              } catch (err: any) {
                                alert('Error al generar ZIP: ' + err.message);
                              }
                            }}
                            className="flex items-center gap-2 bg-brand-cyan text-black px-4 py-2 rounded-lg font-medium hover:bg-brand-cyan/90 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Descargar ZIP Completo
                          </button>
                        </div>
                      </section>
                    )}

                    {/* Web Mockup */}
                    {result.mockupImage && (
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Globe size={20} className="text-brand-cyan" />
                          Mockup Visual de la Web
                        </h3>
                        <div className="bg-brand-bg rounded-xl border border-brand-border overflow-hidden">
                          <img src={result.mockupImage} alt="Web Mockup" className="w-full h-auto" />
                        </div>
                      </section>
                    )}

                    {/* Web Sitemap */}
                    {result.sitemap && (
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Layout size={20} className="text-brand-cyan" />
                          Sitemap Propuesto
                        </h3>
                        <div className="bg-brand-bg p-6 rounded-xl border border-brand-border">
                          <ul className="list-disc list-inside space-y-2 text-brand-text">
                            {result.sitemap.map((page: string, idx: number) => (
                              <li key={idx}>{page}</li>
                            ))}
                          </ul>
                        </div>
                      </section>
                    )}

                    {/* Web Hero Copy */}
                    {result.heroCopy && (
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <MessageSquare size={20} className="text-brand-cyan" />
                          Copy Principal (Inicio)
                        </h3>
                        <div className="bg-brand-bg p-6 rounded-xl border border-brand-border space-y-4">
                          <div>
                            <span className="text-xs font-bold text-brand-cyan uppercase">Título Principal (H1)</span>
                            <h1 className="text-3xl font-bold text-white mt-1">{result.heroCopy.title}</h1>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-brand-cyan uppercase">Subtítulo</span>
                            <p className="text-lg text-brand-text mt-1">{result.heroCopy.subtitle}</p>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-brand-cyan uppercase">Call to Action (Botón)</span>
                            <div className="mt-2 inline-block px-6 py-3 bg-brand-cyan text-brand-dark font-bold rounded-xl">
                              {result.heroCopy.cta}
                            </div>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Social Media Strategy */}
                    {result.strategy && (
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Share2 size={20} className="text-brand-cyan" />
                          Estrategia de Contenido
                        </h3>
                        <div className="bg-brand-bg p-6 rounded-xl border border-brand-border text-brand-text">
                          <p>{result.strategy}</p>
                        </div>
                      </section>
                    )}

                    {/* Social Media Posts */}
                    {result.posts && (
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <ImageIcon size={20} className="text-brand-cyan" />
                          Primera Tanda de Contenido (Posts)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {result.posts.map((post: any, idx: number) => (
                            <div key={idx} className="bg-brand-bg rounded-xl border border-brand-border overflow-hidden flex flex-col">
                              <div className="aspect-square relative bg-brand-dark">
                                <img src={post.imageUrl} alt={`Post ${idx + 1}`} className="w-full h-full object-cover" />
                              </div>
                              <div className="p-6 flex-1 flex flex-col">
                                <div className="prose prose-invert text-sm text-brand-text mb-4 flex-1 whitespace-pre-wrap">
                                  {post.copy}
                                </div>
                                <div className="text-xs font-bold text-brand-cyan mt-auto">
                                  {post.hashtags}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-8 text-center border-t border-brand-border bg-brand-card/30 mt-12">
        <p className="text-brand-muted text-[10px] font-bold tracking-[0.3em] uppercase">DigiMarket RD © 2026 · Agentes de Inteligencia Artificial</p>
      </footer>
    </div>
  );
}
