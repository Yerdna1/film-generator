// App Configuration Service
// Admin-controlled settings for the application

import { prisma } from '@/lib/db/prisma';

const CONFIG_ID = 'app-config';

export interface AppConfigSettings {
  startingCredits: number;
}

/**
 * Get or create app configuration
 */
export async function getAppConfig(): Promise<AppConfigSettings> {
  let config = await prisma.appConfig.findUnique({
    where: { id: CONFIG_ID },
  });

  if (!config) {
    config = await prisma.appConfig.create({
      data: {
        id: CONFIG_ID,
        startingCredits: 0, // Default: no starting credits
      },
    });
  }

  return {
    startingCredits: config.startingCredits,
  };
}

/**
 * Get starting credits for new users
 */
export async function getStartingCredits(): Promise<number> {
  const config = await getAppConfig();
  return config.startingCredits;
}

/**
 * Update starting credits (admin only)
 */
export async function updateStartingCredits(credits: number): Promise<AppConfigSettings> {
  const config = await prisma.appConfig.upsert({
    where: { id: CONFIG_ID },
    update: { startingCredits: credits },
    create: {
      id: CONFIG_ID,
      startingCredits: credits,
    },
  });

  return {
    startingCredits: config.startingCredits,
  };
}

/**
 * Update app configuration (admin only)
 */
export async function updateAppConfig(settings: Partial<AppConfigSettings>): Promise<AppConfigSettings> {
  const config = await prisma.appConfig.upsert({
    where: { id: CONFIG_ID },
    update: settings,
    create: {
      id: CONFIG_ID,
      ...settings,
    },
  });

  return {
    startingCredits: config.startingCredits,
  };
}
