import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método no permitido' });

  try {
    const projectData = req.body;
    if (!projectData || Object.keys(projectData).length === 0) {
      return res.status(400).json({ success: false, error: 'Cuerpo vacío o datos faltantes' });
    }

    // Simulate saving (in-memory)
    // For demonstration we just log
    console.log('Project received:', projectData);

    return res.json({
      success: true,
      message: 'Proyecto guardado exitosamente',
      received: projectData,
    });
  } catch (e) {
    console.error('Error saving project:', e);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
