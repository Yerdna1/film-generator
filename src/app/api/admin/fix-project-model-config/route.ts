import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { DEFAULT_MODEL_CONFIG } from '@/lib/constants/model-config-defaults';

/**
 * Admin API endpoint to fix projects with incorrect modelConfig
 * POST /api/admin/fix-project-model-config
 *
 * This will update projects that have 'gemini' as image provider to use 'kie'
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, dryRun = false } = body;

    // Find projects that need fixing (image provider is 'gemini' but should be 'kie')
    const whereClause: any = {
      userId: session.user.id,
    };

    if (projectId) {
      whereClause.id = projectId;
    } else {
      // Only fix projects with gemini as image provider
      whereClause.modelConfig = {
        path: ['image', 'provider'],
        equals: 'gemini',
      };
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        modelConfig: true,
      },
    });

    if (projects.length === 0) {
      return NextResponse.json({
        message: 'No projects found that need fixing',
        fixed: [],
      });
    }

    const fixed: Array<{ id: string; name: string; oldProvider: string; newProvider: string }> = [];

    if (!dryRun) {
      // Update each project's modelConfig
      for (const project of projects) {
        const modelConfig = project.modelConfig as any;
        if (modelConfig?.image?.provider === 'gemini') {
          await prisma.project.update({
            where: { id: project.id },
            data: {
              modelConfig: {
                ...modelConfig,
                image: {
                  ...modelConfig.image,
                  provider: 'kie',
                  model: modelConfig.image.model || DEFAULT_MODEL_CONFIG.image.model,
                },
              },
            },
          });

          fixed.push({
            id: project.id,
            name: project.name,
            oldProvider: 'gemini',
            newProvider: 'kie',
          });
        }
      }
    } else {
      // Dry run - just report what would be fixed
      for (const project of projects) {
        const modelConfig = project.modelConfig as any;
        if (modelConfig?.image?.provider === 'gemini') {
          fixed.push({
            id: project.id,
            name: project.name,
            oldProvider: 'gemini',
            newProvider: 'kie',
          });
        }
      }
    }

    return NextResponse.json({
      message: dryRun
        ? `Found ${fixed.length} project(s) that would be fixed`
        : `Fixed ${fixed.length} project(s)`,
      fixed,
    });
  } catch (error) {
    console.error('Error fixing project modelConfig:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fix projects: ${errorMessage}` },
      { status: 500 }
    );
  }
}
