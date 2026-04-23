// Simple test script to generate Social Media Starter content
import https from 'https';
import fs from 'fs';
import path from 'path';

// Mock data for testing (simulating what Gemini would return)
const mockSocialMediaPlan = {
  success: true,
  type: 'social',
  subPackageId: 'social-starter',
  data: {
    strategy: "Estrategia de Social Media para Test Company\n\n1. Posicionamiento: Marca moderna enfocada en tecnología con contenido educativo y valor agregado.\n\n2. Frecuencia: Posts diarios con énfasis en calidad sobre cantidad, priorizando engagement y conversión.",
    posts: [
      {
        platform: "Instagram",
        title: "Post 1: Introducción a la marca",
        content: "Conoce Test Company - Tu aliado en soluciones tecnológicas modernas. Descubre cómo podemos transformar tu negocio.",
        type: "carrusel",
        hashtags: "#TestCompany #Tecnología #Innovación"
      },
      {
        platform: "Instagram",
        title: "Post 2: Tip de industria",
        content: "💡 Tip: Las marcas modernas usan IA para personalizar experiencias. Aquí te mostramos cómo...",
        type: "post",
        hashtags: "#IA #Marketing #Tendencias"
      },
      {
        platform: "Instagram",
        title: "Post 3: Case Study",
        content: "Caso de éxito: Cómo una empresa pequeña creció 300% con estrategia digital adecuada.",
        type: "post",
        hashtags: "#CasoDeÉxito #Crecimiento"
      }
    ],
    reels: [
      {
        title: "Reel 1: ¿Qué es la transformación digital?",
        duration: "15-30 segundos",
        script: "Mostrar evolución de negocio tradicional a digital con gráficos animados"
      },
      {
        title: "Reel 2: Top 3 errores en redes sociales",
        duration: "20-45 segundos",
        script: "Enumeración animada de errores comunes con soluciones"
      }
    ],
    stories: [
      {
        title: "Story 1: Encuesta - ¿Cuál es tu prioridad?",
        content: "Poll interactivo: Crecimiento vs Sostenibilidad"
      },
      {
        title: "Story 2: Pregunta abierta",
        content: "¿Cuál es tu mayor reto digital? Ayúdanos a entender tu negocio"
      }
    ]
  }
};

// Save to assets folder
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const outputPath = path.join(assetsDir, 'social-media-starter-result.json');
fs.writeFileSync(outputPath, JSON.stringify(mockSocialMediaPlan, null, 2));

console.log('✅ Mock result saved to: ' + outputPath);
console.log('\n📊 Generated content:');
console.log(JSON.stringify(mockSocialMediaPlan, null, 2));
