import { VercelRequest, VercelResponse } from '@vercel/node';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/firebase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { clientName, extraInfo, branding, web, social, app } = req.body;

    if (!clientName) {
      return res.status(400).json({ success: false, error: 'clientName is required' });
    }

    const projectData = {
      clientName,
      extraInfo: extraInfo || '',
      branding: branding || null,
      web: web || null,
      social: social || null,
      app: app || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'projects'), projectData);

    res.json({
      success: true,
      projectId: docRef.id,
      message: 'Project saved successfully'
    });
  } catch (error: any) {
    console.error('Error saving project:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save project'
    });
  }
}