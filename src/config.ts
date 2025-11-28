interface Config {
  gemini: {
    apiKey: string;
  };
  langchain: {
    apiKey: string;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  port: number;
}

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

function getOptionalEnvVar(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config: Config = {
  gemini: {
    apiKey: getEnvVar('GEMINI_API_KEY'),
  },
  langchain: {
    apiKey: getEnvVar('LANGCHAIN_API_KEY'),
  },
  supabase: {
    url: getEnvVar('SUPABASE_URL'),
    anonKey: getEnvVar('SUPABASE_ANON_KEY'),
  },
  port: parseInt(getOptionalEnvVar('PORT', '3000'), 10),
};

// Validate configuration on startup
function validateConfig(): void {
  const errors: string[] = [];

  // Validate Gemini API Key
  if (!config.gemini.apiKey || config.gemini.apiKey.trim() === '') {
    errors.push('GEMINI_API_KEY is empty');
  }

  // Validate LangChain API Key
  if (!config.langchain.apiKey || config.langchain.apiKey.trim() === '') {
    errors.push('LANGCHAIN_API_KEY is empty');
  }

  // Validate Supabase URL
  if (!config.supabase.url || config.supabase.url.trim() === '') {
    errors.push('SUPABASE_URL is empty');
  }
  if (!config.supabase.url.startsWith('https://')) {
    errors.push('SUPABASE_URL must start with https://');
  }

  // Validate Supabase Anon Key
  if (!config.supabase.anonKey || config.supabase.anonKey.trim() === '') {
    errors.push('SUPABASE_ANON_KEY is empty');
  }

  // Validate port
  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    errors.push('PORT must be a valid port number (1-65535)');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}

// Run validation
validateConfig();

console.log('Configuration loaded and validated successfully');
