import { CategoryType, SubPackage } from './types';

export const PACKAGES_DATA: Record<CategoryType, SubPackage[]> = {
  'Desarrollo Web': [
    {
      id: 'web-1',
      name: 'Web Básica Emprendedor',
      price: 'RD$ 8,500',
      description: 'Hasta 3 páginas (Inicio, Servicios y Contacto)',
      features: [
        'Diseño responsivo para móvil y computadora',
        'Formulario de contacto con WhatsApp',
        'Botones a redes sociales',
        'Instalación en hosting y dominio'
      ],
      deliveryTime: '7-10 días hábiles',
      revisions: 'Hasta 2 rondas',
      paymentTerms: '50% adelantado, 50% al entregar'
    },
    {
      id: 'web-2',
      name: 'Web Emprendedor Plus',
      price: 'RD$ 12,500',
      description: 'Hasta 5 páginas (Inicio, Servicios, Nosotros, Portafolio y Contacto)',
      features: [
        'Diseño personalizado según la marca',
        'Formulario de contacto avanzado con WhatsApp',
        'Integración básica con Google Analytics',
        'SEO on-page básico'
      ],
      deliveryTime: '10-15 días hábiles',
      revisions: 'Hasta 3 rondas',
      paymentTerms: '50% adelantado, 50% al aprobar'
    },
    {
      id: 'web-3',
      name: 'Landing Page Básica',
      price: 'RD$ 15,000',
      description: 'Diseño responsivo y enfocado a conversión',
      features: [
        'Formulario de contacto',
        'SEO básico',
        '1 página'
      ],
      deliveryTime: '7-10 días hábiles',
      revisions: 'Hasta 2 rondas',
      paymentTerms: '50% adelantado, 50% al entregar'
    },
    {
      id: 'web-4',
      name: 'Web Profesional Premium',
      price: 'RD$ 18,000',
      description: 'Hasta 8 páginas o landing page completa',
      features: [
        'Diseño avanzado y trabajado visualmente',
        'Sección de portafolio o catálogo',
        'Optimización de velocidad y performance',
        'SEO on-page mejorado + Google Analytics + Search Console',
        '1 sesión de asesoría online'
      ],
      deliveryTime: '15-20 días hábiles',
      revisions: 'Hasta 4 rondas',
      paymentTerms: '50% adelantado, 50% al publicar'
    }
  ],
  'Aplicaciones Web': [
    {
      id: 'app-1',
      name: 'App Básica MVP',
      price: 'RD$ 18,000',
      description: 'Aplicación web básica para validar tu idea',
      features: [
        'Hasta 4 módulos o funcionalidades',
        'Diseño responsivo',
        'Base de datos básica',
        'Panel de administración simple'
      ],
      deliveryTime: '15-20 días hábiles',
      revisions: '2 rondas',
      paymentTerms: '50% adelantado, 50% final'
    },
    {
      id: 'app-2',
      name: 'App Emprendedor Pro',
      price: 'RD$ 28,000',
      description: 'Aplicación web profesional y escalable',
      features: [
        'Hasta 8 módulos o funcionalidades',
        'Diseño personalizado',
        'Base de datos funcional',
        'Panel admin avanzado'
      ],
      deliveryTime: '20-30 días hábiles',
      revisions: '3 rondas',
      paymentTerms: '50% adelantado, 50% final'
    },
    {
      id: 'app-3',
      name: 'App Premium Empresarial',
      price: 'RD$ 45,000',
      description: 'Aplicación empresarial robusta',
      features: [
        'Hasta 12 módulos o funcionalidades',
        'Base de datos compleja y optimizada',
        'Integraciones múltiples (pagos, APIs)',
        'Sistema de reportes avanzado'
      ],
      deliveryTime: '30-45 días hábiles',
      revisions: '5 rondas',
      paymentTerms: '50% adelantado, 30% a mitad, 20% final'
    },
    {
      id: 'app-4',
      name: 'App Premium Express',
      price: 'RD$ 54,000',
      description: 'App avanzada con roles de usuario en tiempo récord',
      features: [
        'Hasta 8 módulos o funcionalidades',
        'Diseño personalizado según marca',
        'Hosting, dominio y SSL x 1 año',
        'Base de datos funcional',
        'Panel admin básico',
        'Integraciones estándar',
        'Diseño UX/UI profesional'
      ],
      deliveryTime: '7 a 10 días hábiles',
      revisions: '3 rondas',
      paymentTerms: '50% adelantado, 50% final'
    },
    {
      id: 'app-5',
      name: 'E-commerce Completo',
      price: 'RD$ 85,000',
      description: 'Tienda online completa y automatizada',
      features: [
        'Catálogo de productos ilimitado',
        'Pasarelas de pago integradas',
        'Gestión de inventario y envíos',
        'Panel de administración completo',
        'Optimización SEO e-commerce'
      ],
      deliveryTime: '45-60 días hábiles',
      revisions: 'Ilimitadas',
      paymentTerms: '40% adelantado, 30% a mitad, 30% final'
    }
  ],
  'Social Media': [
    {
      id: 'sm-1',
      name: 'Redes Starter Mensual',
      price: 'RD$ 6,000',
      description: 'Gestión básica para emprendedores',
      features: [
        '8 publicaciones mensuales',
        '2 redes sociales',
        'Diseño de posts y stories',
        'Copywriting estratégico'
      ],
      deliveryTime: 'Mensual',
      revisions: 'N/A',
      paymentTerms: 'Pago mensual por adelantado'
    },
    {
      id: 'sm-2',
      name: 'Redes Emprendedor Mensual',
      price: 'RD$ 9,500',
      description: 'Gestión profesional con mayor alcance',
      features: [
        '15 publicaciones mensuales',
        '3 redes sociales',
        'Diseño avanzado y personalizado',
        'Gestión de comunidad básica'
      ],
      deliveryTime: 'Mensual',
      revisions: 'N/A',
      paymentTerms: 'Pago mensual por adelantado'
    },
    {
      id: 'sm-3',
      name: 'Gestión Redes Sociales',
      price: 'RD$ 12,000',
      description: 'Gestión integral para empresas',
      features: [
        '20 publicaciones mensuales',
        'Todas las redes sociales relevantes',
        'Producción de contenido audiovisual (Reels)',
        'Gestión total de comunidad'
      ],
      deliveryTime: 'Mensual',
      revisions: 'N/A',
      paymentTerms: 'Pago mensual por adelantado'
    },
    {
      id: 'sm-4',
      name: 'Redes Premium Estratégico',
      price: 'RD$ 14,000',
      description: 'Estrategia avanzada y Ads',
      features: [
        '25 publicaciones mensuales',
        'Campañas de Ads (gestión)',
        'Reporte ejecutivo quincenal',
        'Estrategia de crecimiento'
      ],
      deliveryTime: 'Mensual',
      revisions: 'N/A',
      paymentTerms: 'Pago mensual por adelantado'
    }
  ],
  'Branding': [
    {
      id: 'branding-1',
      name: 'Identidad Visual',
      price: 'RD$ 3,000',
      description: 'Esencia visual de tu marca',
      features: [
        'Logo principal y variantes',
        'Paleta de colores corporativa',
        'Tipografías seleccionadas',
        'Formatos para web e impresión'
      ],
      deliveryTime: '5-7 días hábiles',
      revisions: '2 rondas',
      paymentTerms: '100% adelantado'
    },
    {
      id: 'branding-2',
      name: 'Branding Emprendedor Plus',
      price: 'RD$ 12,500',
      description: 'Identidad corporativa completa',
      features: [
        'Todo lo del paquete Identidad Visual',
        'Diseño de papelería (tarjetas, hojas)',
        '5 plantillas para redes sociales',
        'Manual de marca básico'
      ],
      deliveryTime: '10-15 días hábiles',
      revisions: '3 rondas',
      paymentTerms: '50% adelantado, 50% al aprobar'
    },
    {
      id: 'branding-3',
      name: 'Branding Completo Premium',
      price: 'RD$ 18,000',
      description: 'Sistema de marca integral',
      features: [
        'Todo lo del paquete Emprendedor Plus',
        'Manual de marca extendido',
        'Aplicaciones en mockups reales',
        'Estrategia de marca'
      ],
      deliveryTime: '15-20 días hábiles',
      revisions: '4 rondas',
      paymentTerms: '50% adelantado, 50% al finalizar'
    },
    {
      id: 'branding-4',
      name: 'Branding Empresarial',
      price: 'RD$ 25,000',
      description: 'Sistema de marca integral y estratégico',
      features: [
        'Todo lo del paquete Premium',
        'Estrategia de marca y posicionamiento',
        'Naming (si es necesario)',
        'Diseño de empaques o uniformes',
        'Asesoría de implementación'
      ],
      deliveryTime: '25-30 días hábiles',
      revisions: 'Ilimitadas (hasta satisfacción)',
      paymentTerms: '50% adelantado, 50% al finalizar'
    }
  ]
};
