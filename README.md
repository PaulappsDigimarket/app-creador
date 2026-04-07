<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DigiMarket RD - Generador de Propuestas

Generador automático de propuestas de marketing digital para agencias. Usa **Google Gemini AI** para crear branding, sitios web, imágenes y videos.

## 🚀 Demo en Producción

**URL**: [https://digimarket-rd-generador-de-propuestas.vercel.app](https://digimarket-rd-generador-de-propuestas.vercel.app)

## ✨ Características

- **Generación de Branding**: Manual de marca, paletas de colores, tipografías, prompts para logos
- **Generación de Web**: Sitemap, copy, mockups generados con IA
- **Generación de Imágenes**: Creación de imágenes con Gemini AI
- **Generación de Videos**: Creación de videos con Veo 3.1
- **Chat con IA**: Asistente conversacional con diferentes niveles de complejidad

## 🛠️ Tecnologías

- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **Backend**: Express.js (API)
- **AI**: Google Gemini API
- **Database**: Firebase (Firestore + Auth)
- **Deployment**: Vercel

## 📋 Requisitos Previos

- Node.js 18+
- Cuenta de Google Cloud con API de Gemini habilitada
- Proyecto de Firebase (opcional, para persistencia)

## 🏃‍♂️ Ejecución Local

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd digimarket-rd-generador-de-propuestas
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Required - Google Gemini API Key
GEMINI_API_KEY="tu_api_key_de_gemini"

# Optional - Firebase Configuration
VITE_FIREBASE_PROJECT_ID="tu_project_id"
VITE_FIREBASE_APP_ID="tu_app_id"
VITE_FIREBASE_API_KEY="tu_api_key"
VITE_FIREBASE_AUTH_DOMAIN="tu_dominio"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="tu_database_id"
VITE_FIREBASE_STORAGE_BUCKET="tu_bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="tu_sender_id"
VITE_FIREBASE_MEASUREMENT_ID="tu_measurement_id"

# Optional - External APIs
HUGGINGFACE_API_KEY=""
REPLICATE_API_TOKEN=""
SERPER_API_KEY=""
```

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

## ☁️ Despliegue en Vercel

### Opción 1: Deploy automático desde GitHub

1. Ve a [Vercel](https://vercel.com) e inicia sesión
2. Click en **"Add New..."** → **"Project"**
3. Importa tu repositorio de GitHub
4. Configura las variables de entorno en Vercel:
   - `GEMINI_API_KEY` = tu clave de API de Gemini
   - Las variables de Firebase (opcional)
5. Click en **Deploy**

### Opción 2: Deploy desde Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## 📡 Endpoints de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Health check del servidor |
| POST | `/api/generate-branding` | Genera branding completo |
| POST | `/api/generate-web` | Genera sitio web con mockup |
| POST | `/api/ai/image` | Genera imagen con IA |
| POST | `/api/ai/video` | Genera video con IA |
| POST | `/api/ai/chat` | Chat con IA |

## 📁 Estructura del Proyecto

```
├── src/                    # Código fuente del frontend
│   ├── components/         # Componentes React
│   ├── pages/              # Páginas de la aplicación
│   ├── lib/                # Utilidades y configuración
│   └── firebase.ts         # Configuración de Firebase
├── server.ts               # Servidor Express con API
├── vite.config.ts          # Configuración de Vite
├── tailwind.config.js      # Configuración de Tailwind
├── vercel.json             # Configuración de Vercel
└── package.json            # Dependencias y scripts
```

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - DigiMarket RD

---

¿Necesitas ayuda? Abre un issue en el repositorio o contacta al equipo de DigiMarket RD.