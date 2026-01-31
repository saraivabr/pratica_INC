import { z } from 'zod';

const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().refine(
    (s) => s.startsWith('postgresql://') || s.startsWith('postgres://'),
    { message: 'Must start with postgresql:// or postgres://' },
  ),

  // CV CRM
  CVCRM_BASE_URL: z.string().url(),
  CVCRM_EMAIL: z.string().email(),
  CVCRM_TOKEN_EMPREENDIMENTO: z.string().min(1),
  CVCRM_TOKEN_CORRETOR: z.string().min(1),
  CVCRM_TOKEN_UNIDADE: z.string().min(1),
  CVCRM_TOKEN_SERIE: z.string().min(1),
  CVCRM_TOKEN_LEAD: z.string().min(1),
  CVCRM_TOKEN_IMOBILIARIA: z.string().min(1),

  // Evolution API (WhatsApp)
  EVOLUTION_BASE_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-'),

  // Optional
  REDIS_URL: z.string().url().optional(),
  WEBHOOK_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  ADMIN_SECRET_KEY: z.string().optional(),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

let _env: ServerEnv | null = null;

export function validateEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  _env = result.data;
  return _env;
}

export function env(): ServerEnv {
  if (!_env) return validateEnv();
  return _env;
}
