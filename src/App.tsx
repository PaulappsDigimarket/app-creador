import { useState, useRef, useEffect } from 'react';
import { 
  Layout, Globe, Smartphone, Palette, Share2, Plus, 
  Image as ImageIcon, Send, History, CheckCircle2, 
  Loader2, Copy, LogOut, ChevronRight, MessageSquare,
  DollarSign, Clock, ShieldCheck, CreditCard, ImagePlus,
  AlertTriangle, X, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CategoryType, SubPackage, Project, ChatMessage } from './types';
import { PACKAGES_DATA } from './constants';
import Logo from './components/Logo';
import jsPDF from 'jspdf';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Toast {
  id: number;
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
}

let toastId = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl text-sm font-medium shadow-2xl",
              t.type === 'error' && "bg-red-500/10 border-red-500/25 text-red-300",
              t.type === 'warning' && "bg-yellow-500/10 border-yellow-500/25 text-yellow-300",
              t.type === 'success' && "bg-green-500/10 border-green-500/25 text-green-300",
              t.type === 'info' && "bg-blue-500/10 border-blue-500/25 text-blue-300",
            )}
          >
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
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
  const [images, setImages] = useState<{ url: string; type: 'logo' | 'referencia' | 'paleta' }[]>([]);
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
  const [activeUploadType, setActiveUploadType] = useState<'logo' | 'referencia' | 'paleta'>('referencia');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: Toast['type'], message: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  };

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsLoggedIn(true);
    } else {
      showToast('error', 'Credenciales incorrectas');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'referencia' | 'paleta') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast('warning', `La imagen ${file.name} es demasiado grande. Máximo 5MB.`);
        return;
      }
      if (!file.type.startsWith('image/')) {
        showToast('warning', `El archivo ${file.name} no es una imagen válida.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, { url: reader.result as string, type }]);
      };
      reader.onerror = () => {
        showToast('error', `Error al procesar ${file.name}.`);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const startProcessing = async () => {
    if (!clientName || !projectName || !selectedSubPackage) return;
    setIsProcessing(true);
    setResult(null);
    setChatMessages([
      {
        role: 'model',
        text: `¡Hola! Soy el Agente de DigiMarket RD. He recibido los datos para el proyecto **${projectName}** de **${clientName}**.\n\nHas seleccionado el paquete **${selectedSubPackage.name}** (${selectedSubPackage.price}).\n\nEste paquete incluye:\n${selectedSubPackage.features.map(f => `* ${f}`).join('\n')}\n\n¿Hay algún detalle específico o preferencia visual que quieras que los agentes consideren antes de generar la propuesta final?`
      }
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
      1. 📋 RESUMEN DE LA PROPUESTA
      2. 🎯 OBJETIVOS DEL PROYECTO
      3. 🛠️ ALCANCE TÉCNICO Y CREATIVO
      4. 📅 CRONOGRAMA DE TRABAJO
      5. 💳 RESUMEN FINANCIERO Y TÉRMINOS
      6. 🇩🇴 CONSIDERACIONES PARA EL MERCADO DOMINICANO

      IMPORTANTE: No inventes precios ni tiempos. Usa exactamente los proporcionados. Sé extremadamente profesional y detallado.`;

      // Usa el backend (Groq) en lugar de Gemini directo
      const response = await fetch('/api/generate-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          subPackage: selectedSubPackage,
          extraInfo,
          images
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error del backend');
      }

      // Para la propuesta final combinamos chat y resultado técnico
      const webData = data.data || {};
      let finalText = '## 📋 RESUMEN DE LA PROPUESTA\n\n';
      finalText += webData.heroCopy?.title ? `### ${webData.heroCopy.title}\n\n` : '';
      finalText += webData.heroCopy?.subtitle ? `${webData.heroCopy.subtitle}\n\n` : '';
      finalText += webData.heroCopy?.cta ? `**CTA:** ${webData.heroCopy.cta}\n\n` : '';
      finalText += '\n## 🗺️ SITEMAP\n\n';
      finalText += (webData.sitemap || []).map((s: string) => `- ${s}`).join('\n') + '\n\n';

      const text = finalText;

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

      // Guardar automáticamente en localStorage
      const existing = JSON.parse(localStorage.getItem('digi_projects') || '[]');
      existing.unshift(newProject);
      localStorage.setItem('digi_projects', JSON.stringify(existing));

      setHistory(prev => [newProject, ...prev]);
      setChatMessages(prev => [...prev, { role: 'model', text: '✅ **Propuesta generada exitosamente usando Groq.**' }]);
      showToast('success', 'Propuesta generada correctamente');

    } catch (error: any) {
      console.error("Error generating content:", error);
      let errorMessage = "Hubo un error al conectar con el backend (Groq).";

      if (error.message?.includes("429")) {
        errorMessage = "Límite de requests agotado. Esperá un momento e intentá de nuevo.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setChatMessages(prev => [...prev, { role: 'model', text: `⚠️ **Error:** ${errorMessage}` }]);
      showToast('error', errorMessage);
      setResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAsPDF = (content: string) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(0, 200, 255); // Color Cyan DigiMarket
    doc.text("DigiMarket RD - Propuesta Técnica", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Cliente: ${clientName}`, 20, 35);
    doc.text(`Proyecto: ${projectName}`, 20, 42);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-DO')}`, 20, 49);
    
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);
    
    const splitText = doc.splitTextToSize(content, 170);
    doc.text(splitText, 20, 65);
    
    doc.save(`Propuesta_${projectName}_${clientName}.pdf`);
    showToast('success', 'PDF descargado correctamente');
  };

  const loadProjects = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('digi_projects') || '[]');
      if (stored.length > 0) {
        setHistory(stored);
      }
    } catch {
      // ignore parse errors
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadProjects();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

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
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
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
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-bg rounded-xl p-4 border border-brand-border">
                        <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-green-500" />
                          Paquete Seleccionado: {selectedSubPackage.name}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div><span className="text-brand-muted">Precio:</span><span className="text-white font-bold ml-1">{selectedSubPackage.price}</span></div>
                          <div><span className="text-brand-muted">Entrega:</span><span className="text-white font-bold ml-1">{selectedSubPackage.deliveryTime}</span></div>
                          <div><span className="text-brand-muted">Revisiones:</span><span className="text-white font-bold ml-1">{selectedSubPackage.revisions}</span></div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                <div className="mt-8 space-y-4">
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
                      onClick={() => downloadAsPDF(result)} 
                      className="w-full py-3 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
                    >
                      <Download size={16} /> Descargar Propuesta en PDF
                    </button>
                  )}
                </div>
              </section>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-brand-card border border-brand-border rounded-2xl h-[650px] flex flex-col sticky top-24 overflow-hidden">
                <div className="p-4 border-b border-brand-border bg-brand-bg/50 flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><h3 className="text-sm font-bold">Canal de Agentes</h3></div>
                  {isProcessing && <Loader2 size={14} className="animate-spin text-brand-cyan" />}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40"><MessageSquare size={40} className="mb-4" /><p className="text-xs">Configura el proyecto para iniciar la comunicación con los agentes.</p></div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className={cn("max-w-[90%] p-3 rounded-xl text-xs leading-relaxed", msg.role === 'user' ? "bg-brand-cyan text-black ml-auto rounded-tr-none font-medium" : "bg-brand-bg border border-brand-border text-brand-text rounded-tl-none")}>
                        <div className="prose prose-invert prose-xs max-w-none"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                {chatMessages.length > 0 && (
                  <div className="p-4 border-t border-brand-border bg-brand-bg/50">
                    <div className="flex gap-2">
                      <input value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Escribe instrucciones adicionales..." className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs focus:border-brand-cyan outline-none transition-colors" />
                      <button onClick={sendMessage} disabled={!currentInput.trim() || isProcessing} className="px-4 py-2 bg-brand-cyan text-black font-bold rounded-xl hover:bg-[#00cfff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"><Send size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Historial de Proyectos (Local)</h2>
              <button onClick={() => setActiveTab('form')} className="text-brand-cyan text-sm font-bold flex items-center gap-2 hover:underline"><Plus size={16} /> Nuevo Proyecto</button>
            </div>
            {history.length === 0 ? (
              <div className="bg-brand-card border border-brand-border rounded-2xl p-12 text-center"><History size={48} className="text-brand-border mx-auto mb-4" /><p className="text-brand-muted">No hay proyectos guardados en este navegador.</p></div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {history.map((proj) => (
                  <motion.div key={proj.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-brand-card border border-brand-border rounded-2xl p-6 hover:border-brand-cyan transition-all group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1"><h3 className="font-bold text-lg">{proj.projectName}</h3><span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded text-[10px] font-bold text-brand-cyan uppercase">{proj.category}</span></div>
                        <p className="text-brand-muted text-sm">Cliente: <span className="text-white">{proj.clientName}</span> · {new Date(proj.createdAt).toLocaleDateString('es-DO')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => { setResult(proj.result); setClientName(proj.clientName); setProjectName(proj.projectName); setSelectedCategory(proj.category); setActiveTab('form'); }} className="px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold hover:border-brand-cyan transition-colors">Ver Detalles</button>
                        <button onClick={() => downloadAsPDF(proj.result)} className="p-2 bg-brand-bg border border-brand-border rounded-xl text-brand-muted hover:text-brand-cyan transition-colors"><Download size={16} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
