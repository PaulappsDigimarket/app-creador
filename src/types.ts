export type CategoryType = 'Desarrollo Web' | 'Aplicaciones Web' | 'Social Media' | 'Branding' | 'Marketing Digital' | 'Videos y Reels';

export interface SubPackage {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  deliveryTime: string;
  revisions: string;
  paymentTerms: string;
}

export interface Project {
  id: string;
  userId: string;
  clientName: string;
  projectName: string;
  extraInfo: string;
  category: CategoryType;
  subPackageId: string;
  images: {url: string, type: 'logo' | 'referencia' | 'paleta'}[];
  status: 'pending' | 'processing' | 'completed';
  createdAt: number;
  result?: any; // Will hold the structured result from the API
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
