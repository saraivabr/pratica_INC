export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env');
    try {
      validateEnv();
      console.log('✅ Environment variables validated');
    } catch (e) {
      console.error('⚠️ Environment validation failed - check your .env.local');
      // Don't throw in dev to allow partial startup
      if (process.env.NODE_ENV === 'production') {
        throw e;
      }
    }
  }
}
