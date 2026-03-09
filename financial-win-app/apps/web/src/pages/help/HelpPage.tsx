import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export const HelpPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);

  // Fallbacks por defecto en caso de que falle la traducción
  const defaultFAQs: FAQ[] = [
    {
      id: 'upload-invoice',
      question: '¿Cómo puedo subir mis facturas y gastos?',
      answer: 'Puedes arrastrar tus archivos directamente a la zona de "Documentos" o hacer clic en el botón de subida. Una vez subidos, nuestra IA (Gemini) analizará el documento automáticamente para extraer los datos.',
    },
    {
      id: 'ai-formats',
      question: '¿Qué formatos de archivo acepta la plataforma?',
      answer: 'Actualmente puedes subir documentos en formato PDF, imágenes JPG y PNG. Recomendamos que las imágenes tengan buena iluminación para una extracción de datos óptima.',
    },
    {
      id: 'data-validation',
      question: '¿Por qué debo validar los documentos después de subirlos?',
      answer: 'La validación permite asegurar que los datos extraídos por la IA (NIF, importes, fechas) son correctos antes de archivarlos definitivamente en tu contabilidad de Gastos o Ingresos.',
    },
  ];

  // Función helper para obtener traducción con fallback
  const getTranslation = (key: string, fallback: string): string => {
    const translation = t(key);
    // Si la traducción devuelve la misma clave, significa que no se encontró
    return translation === key || translation.startsWith('help.') ? fallback : translation;
  };

  // Obtener FAQs desde traducciones - se recalcula cuando cambia el idioma
  const faqs: FAQ[] = useMemo(() => [
    {
      id: 'upload-invoice',
      question: getTranslation('help.faqs.uploadInvoice.question', defaultFAQs[0].question),
      answer: getTranslation('help.faqs.uploadInvoice.answer', defaultFAQs[0].answer),
    },
    {
      id: 'ai-formats',
      question: getTranslation('help.faqs.aiFormats.question', defaultFAQs[1].question),
      answer: getTranslation('help.faqs.aiFormats.answer', defaultFAQs[1].answer),
    },
    {
      id: 'data-validation',
      question: getTranslation('help.faqs.dataValidation.question', defaultFAQs[2].question),
      answer: getTranslation('help.faqs.dataValidation.answer', defaultFAQs[2].answer),
    },
  ], [t, language]);

  // Filtrar FAQs según búsqueda
  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const query = searchQuery.toLowerCase().trim();
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );
  }, [faqs, searchQuery]);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleDownloadGuide = async (): Promise<void> => {
    try {
      setIsLoadingGuide(true);

      // Mostrar toast de inicio
      showToast('Descargando guía de usuario...', 'success');

      // Obtener el archivo PDF desde la carpeta public
      const response = await fetch('/guia-usuario.pdf');
      
      if (!response.ok) {
        throw new Error('No se pudo cargar el archivo PDF');
      }

      // Convertir la respuesta a Blob
      const blob = await response.blob();
      
      // Crear URL temporal
      const url = URL.createObjectURL(blob);
      
      // Abrir en nueva pestaña
      window.open(url, '_blank');
      
      // Crear elemento <a> temporal para descarga automática
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Guia_Usuario_FinancialWin.pdf';
      document.body.appendChild(link);
      
      // Disparar descarga
      link.click();
      
      // Remover elemento temporal
      document.body.removeChild(link);
      
      // Esperar un momento antes de limpiar y resetear estado
      setTimeout(() => {
        // Limpiar URL para evitar fugas de memoria
        URL.revokeObjectURL(url);
        setIsLoadingGuide(false);
      }, 500);
    } catch (error) {
      console.error('Error al descargar la guía:', error);
      showToast('Error al descargar la guía. Por favor, intenta nuevamente.', 'error');
      setIsLoadingGuide(false);
    }
  };

  return (
    <div className="help-page-container">
      {/* Encabezado */}
      <div className="help-header animate-slide-in-up">
        <h1 className="help-title">{getTranslation('help.title', 'Centro de Ayuda')}</h1>
        <div className="help-search-container">
          <span className="material-symbols-outlined help-search-icon">search</span>
          <input
            type="text"
            className="help-search-input"
            placeholder={getTranslation('help.searchPlaceholder', 'Buscar en las preguntas frecuentes...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Sección de FAQs */}
      <div className="help-faqs-section animate-slide-in-up">
        <h2 className="help-section-title">{getTranslation('help.faqs.title', 'Preguntas Frecuentes')}</h2>
        <div className="help-faqs-list">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq, index) => (
              <div
                key={faq.id}
                className="help-faq-item"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <button
                  className={`help-faq-button ${expandedFAQ === faq.id ? 'help-faq-button-expanded' : ''}`}
                  onClick={() => toggleFAQ(faq.id)}
                  aria-expanded={expandedFAQ === faq.id}
                >
                  <span className="help-faq-question">{faq.question}</span>
                  <span
                    className={`material-symbols-outlined help-faq-icon ${expandedFAQ === faq.id ? 'help-faq-icon-expanded' : ''}`}
                  >
                    expand_more
                  </span>
                </button>
                <div
                  className={`help-faq-answer-container ${expandedFAQ === faq.id ? 'help-faq-answer-expanded' : 'help-faq-answer-collapsed'}`}
                >
                  <div className="help-faq-answer">{faq.answer}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="help-no-results">
              <span className="material-symbols-outlined help-no-results-icon">search_off</span>
              <p>{getTranslation('help.noResults', 'No se encontraron resultados para tu búsqueda.')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sección de Documentación */}
      <div className="help-documentation-section animate-slide-in-up">
        <div className="help-documentation-card">
          <div className="help-documentation-icon-wrapper">
            {isLoadingGuide ? (
              <span className="material-symbols-outlined help-documentation-icon help-documentation-icon-spinner">sync</span>
            ) : (
              <span className="material-symbols-outlined help-documentation-icon">menu_book</span>
            )}
          </div>
          <h3 className="help-documentation-title">{getTranslation('help.support.documentation.title', 'Documentación')}</h3>
          <p className="help-documentation-description">
            {getTranslation('help.support.documentation.description', 'Consulta nuestra guía completa para aprender a usar todas las funcionalidades de FinancialWin.')}
          </p>
          <button 
            className="help-documentation-button" 
            onClick={handleDownloadGuide}
            disabled={isLoadingGuide}
          >
            {getTranslation('help.support.documentation.button', 'Ver Guía Completa')}
          </button>
        </div>
      </div>
    </div>
  );
};
