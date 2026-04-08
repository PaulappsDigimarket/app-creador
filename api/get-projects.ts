import { VercelRequest, VercelResponse } from '@vercel/node';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../src/firebase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const projects = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Función helper para convertir timestamps
      const convertTimestamp = (timestamp: any) => {
        if (timestamp?.toDate) {
          return timestamp.toDate().toISOString();
        }
        if (typeof timestamp === 'string') {
          return timestamp;
        }
        return new Date().toISOString();
      };

      return {
        id: doc.id,
        clientName: data.clientName || '',
        projectName: data.projectName || data.clientName || '',
        extraInfo: data.extraInfo || '',
        branding: data.branding || null,
        web: data.web || null,
        social: data.social || null,
        app: data.app || null,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      };
    });

    res.json({
      success: true,
      projects,
      total: projects.length
    });
  } catch (error: any) {
    console.error('Error getting projects:', error);
    res.status(200).json({
      success: false,
      error: error.message || 'No se pudieron cargar los proyectos',
      projects: [],
      total: 0
    });
  }
}