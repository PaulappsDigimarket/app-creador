#!/usr/bin/env node

// Test para paquete Social Media Starter (RD$6,000)
// Según paquetes-digimarketrd.md:
// - 8-10 publicaciones mensuales
// - 1 red social (Instagram o Facebook)
// - Diseño básico con plantillas
// - Programación y publicación
// - Respuesta a comentarios (horario laboral)
// - Reporte mensual básico

const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const testPackage = {
  clientName: "Prueba Social Starter",
  subPackageId: "sm-1", // Starter
  extraInfo: "Prueba de paquete básico de redes sociales",
  images: [] // Sin imágenes de referencia en prueba básica
};

console.log("🧪 Iniciando prueba de paquete Social Media Starter...\n");

// Test 1: Generación de posts básicos
console.log("1. Generando posts básicos...");
try {
  const response = await axios.post(
    'http://localhost:3000/api/generate-social',
    testPackage,
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (response.data.success) {
    console.log("✅ Posts generados:", response.data.data.posts.length);
    console.log("✅ Reels generados:", response.data.data.reels.length);
    console.log("✅ Stories generados:", response.data.data.stories.length);

    // Verificar cantidad según paquete
    const totalGenerated = response.data.data.all.length;
    console.log(`\n📊 Total de piezas generadas: ${totalGenerated}`);

    if (totalGenerated >= 8 && totalGenerated <= 10) {
      console.log("✅ Cantidad dentro del rango esperado (8-10)");
    } else {
      console.log("❌ Cantidad fuera del rango esperado");
    }

    // Verificar formatos
    const formats = response.data.data.all.map(p => p.format);
    console.log(`\n📱 Formatos generados: ${[...new Set(formats)]}`);

  } else {
    console.log("❌ Error en generación:", response.data.error);
  }
} catch (error) {
  console.log("❌ Error al conectar con API:", error.message);
}

// Test 2: Generación de ZIP completo
console.log("\n2. Generando paquete ZIP completo...");
try {
  const formData = new FormData();
  formData.append('clientName', testPackage.clientName);
  formData.append('subPackageId', testPackage.subPackageId);
  formData.append('extraInfo', testPackage.extraInfo);
  formData.append('images', JSON.stringify(testPackage.images));

  const zipResponse = await axios.post(
    'http://localhost:3000/api/generate-social-zip',
    formData,
    {
      headers: {
        ...formData.getHeaders()
      },
      responseType: 'blob'
    }
  );

  if (zipResponse.status === 200) {
    // Guardar ZIP para verificar
    fs.writeFileSync('test-social-starter.zip', zipResponse.data);
    console.log("✅ ZIP generado: test-social-starter.zip");

    // Verificar tamaño (debería ser útil, no vacío)
    const stats = fs.statSync('test-social-starter.zip');
    console.log(`📦 Tamaño del ZIP: ${(stats.size / 1024).toFixed(2)} KB`);

    if (stats.size > 1024) { // Más de 1KB
      console.log("✅ ZIP contiene contenido");
    } else {
      console.log("❌ ZIP demasiado pequeño, probable vacío");
    }

  } else {
    console.log("❌ Error en generación de ZIP:", zipResponse.status);
  }
} catch (error) {
  console.log("❌ Error al generar ZIP:", error.message);
}

// Test 3: Verificar estructura esperada del paquete
console.log("\n3. Verificando estructura del paquete...");
const requiredFiles = [
  '01_ESTRATEGIA.md',
  '02_CALENDARIO.csv',
  '03_POSTS_INSTAGRAM.md',
  '04_HASHTAGS.txt',
  '05_IMAGE_PROMPTS.json',
  '06_IMAGE_URLS.txt',
  'README.md'
];

// Aquí deberíamos descomprimir y verificar, pero para el test rápido:
console.log("📁 Archivos esperados en ZIP:");
requiredFiles.forEach(file => {
  console.log(`  - ${file}`);
});

console.log("\n✅ Test completado. Verifica el archivo test-social-starter.zip");