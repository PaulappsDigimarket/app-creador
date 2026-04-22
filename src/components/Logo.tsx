import React, { useState } from 'react';
import { jsPDF } from 'jspdf';

const LOGOS = {
  logo1: '/logos/logo1.svg',
  logo2: '/logos/logo2.svg',
  logo3: '/logos/logo3.svg',
};

const PALETTE = ['#FF6B6B', '#4ECCA3', '#1E90FF'];

export default function Logo() {
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const downloadPNG = (url: string, bg: 'transparent' | 'white') => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (bg === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 800);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 800, 800);
      const link = document.createElement('a');
      link.download = `logo-${bg}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  const generatePDF = () => {
    setPdfGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(16);
      doc.text('Manual de Marca Paul Naar', 15, 25);
      doc.setFontSize(12);
      doc.text('Estilo Profesional y Sofisticado', 15, 40);
      doc.text('Enfoque: Música y Elegancia', 15, 55);
      doc.text('Pasión y dedicación a la música', 15, 70);

      doc.text('Paleta de colores:', 15, 85);
      PALETTE.forEach((c, i) => {
        doc.setFillColor(c);
        doc.rect(15 + i * 30, 90, 20, 10, 'F');
      });

      doc.save('branding-manual.pdf');
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {Object.entries(LOGOS).map(([key, src]) => (
        <div key={key} style={{ marginBottom: 30 }}>
          <h3>{key}</h3>
          <img src={src} alt={key} style={{ width: 200, height: 200, objectFit: 'contain', marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => downloadPNG(src, 'transparent')} style={{ padding: '8px 16px' }}>
              PNG (Transparente)
            </button>
            <button onClick={() => downloadPNG(src, 'white')} style={{ padding: '8px 16px' }}>
              PNG (Blanco)
            </button>
          </div>
        </div>
      ))}
      <button onClick={generatePDF} disabled={pdfGenerating} style={{ padding: '12px 24px', marginTop: 30 }}>
        {pdfGenerating ? 'Generando...' : 'Generar PDF'}
      </button>
    </div>
  );
}
