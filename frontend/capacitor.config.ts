// Etiqueta: Configuracion Capacitor permitiendo trafico HTTP local para pruebas de APK
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.perufibra.tecnico',
  appName: 'PeruFibra Tecnico',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;