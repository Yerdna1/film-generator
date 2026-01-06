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
        title: 'AI Story Generation',
        description: 'Transform your ideas into complete film scripts with AI-powered storytelling.',
        gradient: 'from-violet-500 to-purple-600',
    },
    {
        icon: Users,
        title: 'Character Design',
        description: 'Create consistent, expressive characters that maintain their look across scenes.',
        gradient: 'from-cyan-500 to-blue-600',
    },
    {
        icon: ImageIcon,
        title: 'Scene Generation',
        description: 'Generate stunning visuals for every scene with state-of-the-art AI models.',
        gradient: 'from-pink-500 to-rose-600',
    },
    {
        icon: Clapperboard,
        title: 'Video Animation',
        description: 'Bring your scenes to life with smooth, cinematic video generation.',
        gradient: 'from-orange-500 to-amber-600',
    },
    {
        icon: Volume2,
        title: 'AI Voiceovers',
        description: 'Add professional narration and character voices with neural TTS.',
        gradient: 'from-emerald-500 to-teal-600',
    },
    {
        icon: Download,
        title: 'Export & Share',
        description: 'Download your complete film or share directly to social platforms.',
        gradient: 'from-indigo-500 to-violet-600',
    },
];

export const useCases = [
    { icon: Film, label: 'Animated Shorts', color: 'text-purple-400' },
    { icon: MessageSquare, label: 'Kids Stories', color: 'text-cyan-400' },
    { icon: Palette, label: 'Art Films', color: 'text-pink-400' },
    { icon: Globe, label: 'Explainers', color: 'text-orange-400' },
    { icon: Zap, label: 'Music Videos', color: 'text-yellow-400' },
    { icon: Play, label: 'Social Content', color: 'text-green-400' },
];

export const stats = [
    { value: 590, suffix: '+', label: 'Videos Generated' },
    { value: 7400, suffix: '+', label: 'Scenes Created' },
    { value: 160, suffix: '+', label: 'Happy Creators' },
];
