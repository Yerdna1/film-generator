import { Film, Camera, Sparkles, Wand2 } from 'lucide-react';
import type { StoryConfig } from '@/types/project';

export interface StoryPreset {
  id: string;
  title: string;
  description: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  story: Partial<StoryConfig>;
}

export const storyPresets: StoryPreset[] = [
  {
    id: 'adventure',
    title: 'Epic Adventure',
    description: 'A hero embarks on a dangerous journey to save their world from an ancient evil',
    icon: Film,
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-500',
    story: {
      title: 'The Last Guardian',
      genre: 'adventure',
      tone: 'inspiring',
      setting: 'A mystical realm with floating islands and ancient temples',
      concept: 'Young protagonist discovers they are the last of an ancient order of guardians. They must master forgotten powers and unite divided kingdoms before an ancient darkness awakens to consume everything.',
    },
  },
  {
    id: 'mystery',
    title: 'Mystery Detective',
    description: 'A detective unravels a complex conspiracy in a noir-style thriller',
    icon: Camera,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-500',
    story: {
      title: 'Shadows of Deceit',
      genre: 'mystery',
      tone: 'suspenseful',
      setting: 'Rainy neon-lit city streets, 1940s noir atmosphere',
      concept: 'A hardened detective investigates a series of impossible murders. Each victim received a mysterious letter hours before death, predicting their demise. As the detective digs deeper, they uncover a conspiracy that reaches the highest levels of power.',
    },
  },
  {
    id: 'scifi',
    title: 'Space Opera',
    description: 'Interstellar conflict and exploration in a vast sci-fi universe',
    icon: Sparkles,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-500',
    story: {
      title: 'Beyond the Stars',
      genre: 'scifi',
      tone: 'dramatic',
      setting: 'Distant future, multiple star systems, massive space stations',
      concept: 'An alliance of planets faces extinction when an ancient alien weapon is discovered. A ragtag crew of misfits must journey across hostile space to find the only beings who might know how to stop it - a civilization that vanished 10,000 years ago.',
    },
  },
  {
    id: 'fantasy',
    title: 'Fantasy Quest',
    description: 'Magical creatures and epic quests in an enchanted medieval world',
    icon: Wand2,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    story: {
      title: 'The Crystal Kingdom',
      genre: 'fantasy',
      tone: 'heartfelt',
      setting: 'Enchanted forests, crystal castles, magical creatures',
      concept: 'A humble farmhand discovers they can communicate with magical creatures. When an evil sorcerer steals the Crystal of Life, threatening all magic in the realm, they must lead an unlikely group of companions on a quest to restore balance.',
    },
  },
  {
    id: 'romance',
    title: 'Love Story',
    description: 'Two souls find each other against all odds in this heartfelt romance',
    icon: Sparkles,
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-500',
    story: {
      title: 'Across Time',
      genre: 'romance',
      tone: 'heartfelt',
      setting: 'Present day and 1950s, interconnected through letters',
      concept: 'A modern woman discovers a box of love letters from the 1950s in her new apartment. As she reads them, she finds herself falling in love with the author through his words, somehow finding ways to communicate across time itself.',
    },
  },
  {
    id: 'comedy',
    title: 'Comedy Chaos',
    description: 'Hilarious misunderstandings and witty humor in this lighthearted adventure',
    icon: Sparkles,
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-500',
    story: {
      title: 'The Wedding Disaster',
      genre: 'comedy',
      tone: 'lighthearted',
      setting: 'Luxury hotel, wedding venue chaos',
      concept: 'Everything goes wrong at a high-society wedding. The caterer quits, the ring gets lost in a bizarre accident, and the officiant is arrested by mistake. The maid of honor and best man must save the day while accidentally falling in love.',
    },
  },
  {
    id: 'horror',
    title: 'Psychological Horror',
    description: 'Chilling suspense and mind-bending twists in this dark thriller',
    icon: Film,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-500',
    story: {
      title: 'Echoes in the Dark',
      genre: 'horror',
      tone: 'dark',
      setting: 'Isolated mansion, stormy night, psychological tension',
      concept: 'A psychologist arrives at a secluded mansion to treat a patient who claims to see things that haven\'t happened yet. As the storm rages outside, reality begins to blur, and the psychologist realizes they might be trapped in their own nightmare.',
    },
  },
  {
    id: 'family',
    title: 'Family Journey',
    description: 'Heartwarming tale of family bonds and personal growth',
    icon: Sparkles,
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-500',
    story: {
      title: 'Road to Redemption',
      genre: 'family',
      tone: 'inspiring',
      setting: 'Cross-country road trip, various American landscapes',
      concept: 'A estranged father and daughter embark on a cross-country road trip to fulfill a dying grandmother\'s final wish. Along the way, they confront old wounds, meet colorful characters, and slowly rebuild their relationship one mile at a time.',
    },
  },
];
