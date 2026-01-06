'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ShowcaseVideo {
    id: string;
    title: string;
    thumbnail: string;
    youtubeId: string;
}

interface VideoShowcaseProps {
    videos?: ShowcaseVideo[];
}

export function VideoShowcase({ videos }: VideoShowcaseProps) {
    const [showcaseVideos, setShowcaseVideos] = useState<ShowcaseVideo[]>(videos || []);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(!videos);

    // Fetch videos from API if not provided as props
    useEffect(() => {
        if (!videos) {
            const fetchVideos = async () => {
                try {
                    const response = await fetch('/api/showcase?type=youtube');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.youtubeVideos && data.youtubeVideos.length > 0) {
                            setShowcaseVideos(data.youtubeVideos);
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch showcase videos:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchVideos();
        }
    }, [videos]);

    if (isLoading || showcaseVideos.length === 0) {
        return (
            <div className="aspect-video rounded-2xl bg-white/5 animate-pulse flex items-center justify-center">
                <span className="text-white/30">Loading showcase...</span>
            </div>
        );
    }

    const handlePrev = () => {
        setActiveIndex((prev) => (prev === 0 ? showcaseVideos.length - 1 : prev - 1));
        setIsPlaying(false);
    };

    const handleNext = () => {
        setActiveIndex((prev) => (prev === showcaseVideos.length - 1 ? 0 : prev + 1));
        setIsPlaying(false);
    };

    const activeVideo = showcaseVideos[activeIndex];

    return (
        <div className="relative">
            {/* Main video display */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video">
                {isPlaying ? (
                    <iframe
                        src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0`}
                        title={activeVideo.title}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : (
                    <>
                        <Image
                            src={activeVideo.thumbnail}
                            alt={activeVideo.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 80vw"
                            priority
                        />
                        {/* Play button overlay */}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsPlaying(true)}
                                className="w-20 h-20 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 flex items-center justify-center shadow-[0_0_60px_rgba(139,92,246,0.5)] hover:shadow-[0_0_80px_rgba(139,92,246,0.7)] transition-shadow"
                            >
                                <Play className="w-8 h-8 text-white ml-1" />
                            </motion.button>
                        </div>
                        {/* Video title */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                            <h3 className="text-xl font-semibold text-white">{activeVideo.title}</h3>
                            <p className="text-white/60 text-sm">Created with AI Story</p>
                        </div>
                    </>
                )}
            </div>

            {/* Navigation arrows */}
            {showcaseVideos.length > 1 && (
                <>
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}

            {/* Thumbnail strip */}
            {showcaseVideos.length > 1 && (
                <div className="flex gap-3 mt-4 justify-center">
                    {showcaseVideos.map((video, index) => (
                        <button
                            key={video.id}
                            onClick={() => {
                                setActiveIndex(index);
                                setIsPlaying(false);
                            }}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all ${index === activeIndex
                                    ? 'border-violet-500 scale-105'
                                    : 'border-white/10 opacity-60 hover:opacity-100'
                                }`}
                        >
                            <div className="w-24 md:w-32 aspect-video relative">
                                <Image
                                    src={video.thumbnail}
                                    alt={video.title}
                                    fill
                                    className="object-cover"
                                    sizes="128px"
                                />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
