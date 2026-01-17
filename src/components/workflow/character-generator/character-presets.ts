import { User, Sparkles, Crown, Heart } from 'lucide-react';

export interface CharacterPreset {
  id: string;
  titleKey: string;
  name: string;
  personality: string;
  description: string;
  visualDescription: string;
  icon: any;
  iconBg: string;
  iconColor: string;
}

export const characterPresets: CharacterPreset[] = [
  {
    id: 'hero-boy',
    titleKey: 'characterPresets.heroBoy',
    name: 'The Boy',
    personality: 'Brave, curious, determined, kind-hearted',
    description: 'A young adventurous boy who embarks on an incredible journey to save his home. Despite being small, he possesses enormous courage and never gives up, even when faced with impossible odds.',
    visualDescription: 'A young boy around 10 years old with messy brown hair, bright expressive eyes, and a determined expression. Wears a comfortable blue t-shirt, cargo shorts, and well-worn sneakers. Carries a small backpack and has a band-aid on his knee from recent adventures.',
    icon: User,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-500',
  },
  {
    id: 'magical-creature',
    titleKey: 'characterPresets.magicalCreature',
    name: 'Fuzzy',
    personality: 'Playful, loyal, mischievous, innocent',
    description: 'A small magical creature with glowing fur and the ability to manipulate light. Born from ancient magic, Fuzzy has been alone for centuries until meeting The Boy. Though initially shy, Fuzzy becomes a loyal companion and friend.',
    visualDescription: 'A small round creature, about the size of a basketball, with incredibly soft teal and purple gradient fur that glows softly in the dark. Has large innocent eyes, tiny pointed ears, and a fluffy tail. The fur sparkles with tiny particles of light when happy or excited.',
    icon: Sparkles,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-500',
  },
  {
    id: 'wise-mentor',
    titleKey: 'characterPresets.wiseMentor',
    name: 'Elder Kael',
    personality: 'Wise, patient, mysterious, protective',
    description: 'An ancient guardian who has watched over the realm for centuries. Recognizing The Boy\'s pure heart, Kael becomes his guide and teacher, sharing wisdom and helping him unlock his hidden potential.',
    visualDescription: 'An elderly figure with a long silver beard and weathered face that tells stories of countless adventures. Wears flowing dark blue robes adorned with glowing runes. Has piercing gray eyes that seem to see into the soul. Carries a staff topped with a crystal that pulses with gentle light.',
    icon: Crown,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-500',
  },
  {
    id: 'brave-girl',
    titleKey: 'characterPresets.braveGirl',
    name: 'Luna',
    personality: 'Fearless, resourceful, optimistic, caring',
    description: 'A resourceful girl who joins The Boy\'s quest and becomes his closest friend. Growing up in the wilderness, she knows the secrets of nature and helps navigate the dangers they face.',
    visualDescription: 'A girl around 11 years old with wild red hair tied in a ponytail, freckles across her nose, and a confident smile. Wears practical forest-green clothing, sturdy boots, and carries a satchel of useful items. Has a small compass pendant around her neck.',
    icon: Heart,
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-500',
  },
];
