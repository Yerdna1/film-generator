import {
    Wand2,
    Users,
    Image as ImageIcon,
    Clapperboard,
    Volume2,
    Download,
    Film,
    Palette,
    MessageSquare,
    Zap,
    Globe,
    Play,
} from 'lucide-react';

export const features = [
    {
        icon: Wand2,
        id: 'storyGeneration',
        gradient: 'from-violet-500 to-purple-600',
    },
    {
        icon: Users,
        id: 'characterDesign',
        gradient: 'from-cyan-500 to-blue-600',
    },
    {
        icon: ImageIcon,
        id: 'sceneGeneration',
        gradient: 'from-pink-500 to-rose-600',
    },
    {
        icon: Clapperboard,
        id: 'videoAnimation',
        gradient: 'from-orange-500 to-amber-600',
    },
    {
        icon: Volume2,
        id: 'voiceovers',
        gradient: 'from-emerald-500 to-teal-600',
    },
    {
        icon: Download,
        id: 'export',
        gradient: 'from-indigo-500 to-violet-600',
    },
];

export const useCases = [
    { icon: Film, id: 'animatedShorts', color: 'text-purple-400' },
    { icon: MessageSquare, id: 'kidsStories', color: 'text-cyan-400' },
    { icon: Palette, id: 'artFilms', color: 'text-pink-400' },
    { icon: Globe, id: 'explainers', color: 'text-orange-400' },
    { icon: Zap, id: 'musicVideos', color: 'text-yellow-400' },
    { icon: Play, id: 'socialContent', color: 'text-green-400' },
];

export const stats = [
    { value: 590, suffix: '+', id: 'videosGenerated' },
    { value: 7400, suffix: '+', id: 'scenesCreated' },
    { value: 160, suffix: '+', id: 'happyCreators' },
];
