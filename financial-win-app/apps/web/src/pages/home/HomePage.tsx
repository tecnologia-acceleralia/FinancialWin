import { useAuth } from '../../contexts/AuthContext';

/**
 * HomePage - Página de ejemplo financial-win
 * 
 * Esta es una página de ejemplo que muestra cómo crear páginas protegidas
 * usando el sistema de autenticación OIDC integrado.
 * 
 * Características:
 * - Usa useAuth() para acceder a información del usuario
 * - Muestra información básica del usuario autenticado
 * - Ejemplo de estructura de página protegida
 */
export function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Bienvenido al financial-win
        </h1>
        
        <p className="text-gray-600 mb-6">
          Este es un financial-win base para desarrollar nuevas aplicaciones.
          Incluye autenticación OIDC, estructura de backend con NestJS y frontend con React.
        </p>

        {user && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Información del Usuario
            </h2>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-500">Email:</span>
                <span className="ml-2 text-gray-900">{user.email}</span>
              </div>
              {user.name && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Nombre:</span>
                  <span className="ml-2 text-gray-900">{user.name}</span>
                </div>
              )}
              {user.company_id && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Company ID:</span>
                  <span className="ml-2 text-gray-900">{user.company_id}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Próximos Pasos
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Crear tus propios módulos en el backend (apps/api/src/modules/)</li>
            <li>Crear componentes React en el frontend (apps/web/src/components/)</li>
            <li>Definir rutas en App.tsx</li>
            <li>Crear migraciones de base de datos según necesites</li>
            <li>Personalizar el Layout según tu diseño</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

