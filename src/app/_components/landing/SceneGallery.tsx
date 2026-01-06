'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, Clapperboard, Image as ImageIcon } from 'lucide-react';

export interface ShowcaseScene {
    id: string;
    imageUrl: string | null;
    videoUrl: string | null;
    prompt: string | null;
    projectName: string;
    projectStyle: string;
}

export function SceneGallery() {
    const [scenes, setScenes] = useState<ShowcaseScene[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [playingVideo, setPlayingVideo] = useState<string | null>(null);

    useEffect(() => {
        const fetchScenes = async () => {
            try {
                const response = await fetch('/api/showcase');
                if (response.ok) {
                    const data = await response.json();
                    setScenes(data.scenes || []);
                }
            } catch (error) {
                console.error('Failed to fetch showcase scenes:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchScenes();
    }, []);

    if (isLoading || scenes.length === 0) {
        return null;
    }

    // Split scenes into videos and images
    const videoScenes = scenes.filter((s) => s.videoUrl);
    const imageScenes = scenes.filter((s) => s.imageUrl && !s.videoUrl);

    return (
        <div className="space-y-8">
            {/* Video scenes */}
            {videoScenes.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Clapperboard className="w-5 h-5 text-violet-400" />
                        Latest AI Videos
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {videoScenes.slice(0, 8).map((scene) => (
                            <motion.div
                                key={scene.id}
                                whileHover={{ scale: 1.02 }}
                                className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/50 group cursor-pointer"
                                onClick={() => setPlayingVideo(playingVideo === scene.id ? null : scene.id)}
                            >
                                {playingVideo === scene.id ? (
                                    <video
                                        src={scene.videoUrl!}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                ) : (
                                    <>
                                        {scene.imageUrl ? (
                                            <Image
                                                src={scene.imageUrl}
                                                alt={scene.prompt || 'AI Scene'}
                                                fill
                                                className="object-cover"
                                                sizes="(max-width: 768px) 50vw, 25vw"
                                            />
                                        ) : (
                                            <video
                                                src={scene.videoUrl!}
                                                className="absolute inset-0 w-full h-full object-cover"
                                                muted
                                                playsInline
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                <Play className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-xs text-white/80 truncate">{scene.projectName}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Image scenes */}
            {imageScenes.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-cyan-400" />
                        AI Generated Scenes
                    </h3>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {imageScenes.slice(0, 12).map((scene) => (
                            <motion.div
                                key={scene.id}
                                whileHover={{ scale: 1.05 }}
                                className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/50"
                            >
                                <Image
                                    src={scene.imageUrl!}
                                    alt={scene.prompt || 'AI Scene'}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 33vw, 16vw"
                                />
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
