import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Default YouTube videos for showcase (can be overridden by DB settings)
const DEFAULT_YOUTUBE_VIDEOS = [
    {
        id: 'yt-lena',
        title: 'LENA - Full AI Movie',
        thumbnail: 'https://img.youtube.com/vi/sYx898wGBDI/maxresdefault.jpg',
        youtubeId: 'sYx898wGBDI',
    },
    {
        id: 'yt-fairy-tale',
        title: 'AI Generated Fairy Tale (Slovak)',
        thumbnail: 'https://img.youtube.com/vi/2mFYNUffMdc/maxresdefault.jpg',
        youtubeId: '2mFYNUffMdc',
    },
];

// GET - Fetch showcase content for landing page
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        // If only requesting YouTube videos
        if (type === 'youtube') {
            // Try to get YouTube videos from settings, fallback to defaults
            let youtubeVideos = DEFAULT_YOUTUBE_VIDEOS;

            try {
                const setting = await prisma.setting.findUnique({
                    where: { key: 'showcase_youtube_videos' },
                });

                if (setting?.value) {
                    const parsed = JSON.parse(setting.value as string);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        youtubeVideos = parsed;
                    }
                }
            } catch {
                // Use defaults if settings don't exist or fail
            }

            return NextResponse.json({ youtubeVideos });
        }

        // Fetch scenes with videos/images from admin user's projects (for showcase)
        const showcaseScenes = await prisma.scene.findMany({
            where: {
                OR: [
                    // Scenes from admin user
                    {
                        project: {
                            is: {
                                user: {
                                    is: {
                                        email: 'andrej.galad@gmail.com',
                                    },
                                },
                            },
                        },
                    },
                    // Or from public projects
                    {
                        project: {
                            is: {
                                visibility: 'public',
                            },
                        },
                    },
                ],
            },
            select: {
                id: true,
                order: true,
                imageUrl: true,
                videoUrl: true,
                prompt: true,
                project: {
                    select: {
                        id: true,
                        name: true,
                        style: true,
                        story: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: 24,
        });

        // Filter for scenes that have content
        const filteredScenes = showcaseScenes.filter(
            (scene: typeof showcaseScenes[number]) => scene.imageUrl || scene.videoUrl
        );

        // Get YouTube videos too
        let youtubeVideos = DEFAULT_YOUTUBE_VIDEOS;
        try {
            const setting = await prisma.setting.findUnique({
                where: { key: 'showcase_youtube_videos' },
            });

            if (setting?.value) {
                const parsed = JSON.parse(setting.value as string);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    youtubeVideos = parsed;
                }
            }
        } catch {
            // Use defaults
        }

        return NextResponse.json({
            scenes: filteredScenes.map((scene: typeof showcaseScenes[number]) => ({
                id: scene.id,
                imageUrl: scene.imageUrl,
                videoUrl: scene.videoUrl,
                prompt: scene.prompt,
                projectName: scene.project.name,
                projectStyle: scene.project.style,
            })),
            youtubeVideos,
        });
    } catch (error) {
        console.error('Error fetching showcase content:', error);
        return NextResponse.json(
            { error: 'Failed to fetch showcase content', scenes: [], youtubeVideos: DEFAULT_YOUTUBE_VIDEOS },
            { status: 500 }
        );
    }
}

// POST - Update showcase YouTube videos (admin only)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { youtubeVideos } = body;

        if (!Array.isArray(youtubeVideos)) {
            return NextResponse.json(
                { error: 'youtubeVideos must be an array' },
                { status: 400 }
            );
        }

        // Validate video structure
        for (const video of youtubeVideos) {
            if (!video.id || !video.title || !video.youtubeId) {
                return NextResponse.json(
                    { error: 'Each video must have id, title, and youtubeId' },
                    { status: 400 }
                );
            }
            // Auto-generate thumbnail if not provided
            if (!video.thumbnail) {
                video.thumbnail = `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`;
            }
        }

        // Save to settings
        await prisma.setting.upsert({
            where: { key: 'showcase_youtube_videos' },
            update: { value: JSON.stringify(youtubeVideos) },
            create: { key: 'showcase_youtube_videos', value: JSON.stringify(youtubeVideos) },
        });

        return NextResponse.json({ success: true, youtubeVideos });
    } catch (error) {
        console.error('Error updating showcase videos:', error);
        return NextResponse.json(
            { error: 'Failed to update showcase videos' },
            { status: 500 }
        );
    }
}
