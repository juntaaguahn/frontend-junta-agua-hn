export const environment = {
  production: false,
  // TODO (Allan): Esta URL apuntaba al túnel del FRONTEND (puerto 4200).
  // Debes reemplazarla por la URL del túnel del BACKEND (puerto 4000).
  // Para crear el túnel del backend ejecuta: devtunnel host -p 4000
  // y coloca la URL que te dé aquí:
  //apiUrl: 'https://4r430trl-4000.use2.devtunnels.ms/api', // ✅ Túnel del backend
  apiUrl : 'https://4r430trl-4000.use2.devtunnels.ms/api', // ✅ Túnel del backend
  currencySymbol: 'L ',
};

// apiUrl local (para desarrollo sin túnel):
// apiUrl: 'http://localhost:4000/api',
