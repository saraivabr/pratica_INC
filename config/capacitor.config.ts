import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pratica.app',
  appName: 'Pratica',
  webDir: 'out',

  // Carrega o app do servidor próprio (modo híbrido)
  server: {
    url: 'http://185.182.184.122:3000',
    cleartext: true,
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
