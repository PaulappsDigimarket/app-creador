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

    const projects = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
    }));

    res.json({
      success: true,
      projects,
      total: projects.length
    });
  } catch (error: any) {
    console.error('Error getting projects:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get projects'
    });
  }
}