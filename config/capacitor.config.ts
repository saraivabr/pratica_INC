import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pratica.app',
  appName: 'Pratica',
  webDir: 'out',

  // Carrega o app do servidor Scalingo (modo híbrido)
  server: {
    url: 'https://pratica-app.osc-fr1.scalingo.io',
    cleartext: false, // HTTPS only
  },

  // Configurações Android
  android: {
    allowMixedContent: false,
    backgroundColor: '#ffffff',
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      signingType: 'apksigner',
    }
  },

  // Plugins nativos
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#10b981', // emerald-500
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#10b981',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
    }
  }
};

export default config;
