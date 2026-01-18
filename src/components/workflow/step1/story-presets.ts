import { Film, Camera, Sparkles, Wand2 } from 'lucide-react';
import type { StoryConfig, StylePreset } from '@/types/project';

export interface StoryPreset {
  id: string;
  title: string;
  labelKey: string;
  descriptionKey: string;
  description: string;
  storyTitleKey: string;
  settingKey: string;
  conceptKey: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  gradient: string; // Gradient for image card
  imageUrl: string; // Image URL for preset card
  style: StylePreset;
  story: Partial<StoryConfig>;
}

export const storyPresets: StoryPreset[] = [
  // ===== DISNEY/PIXAR STYLE =====
  {
    id: 'disney-magical-creatures',
    title: 'Magical Creatures',
    labelKey: 'presets.magicalCreatures.title',
    descriptionKey: 'presets.magicalCreatures.description',
    description: 'Heartwarming Disney/Pixar adventure with cute magical creatures',
    storyTitleKey: 'presets.magicalCreatures.storyTitle',
    settingKey: 'presets.magicalCreatures.setting',
    conceptKey: 'presets.magicalCreatures.concept',
    icon: Sparkles,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-500',
    gradient: 'from-blue-400 via-purple-400 to-pink-400',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=400&fit=crop', // Magical forest with glowing elements
    style: 'disney-pixar',
    story: {
      title: 'The Lost Spirit',
      genre: 'family',
      tone: 'heartfelt',
      setting: 'Enchanted forest with glowing creatures, magical waterfalls, floating lanterns',
      concept: 'A lonely young girl discovers a tiny lost spirit who has fallen from the spirit realm. Together they embark on a journey through a magical forest filled with friendly creatures to return the spirit home before the portal closes forever, learning about friendship and courage along the way.',
    },
  },
  {
    id: 'disney-underdog-hero',
    title: 'Underdog Hero',
    labelKey: 'presets.underdogHero.title',
    descriptionKey: 'presets.underdogHero.description',
    description: 'Inspiring Disney/Pixar story about following your dreams',
    storyTitleKey: 'presets.underdogHero.storyTitle',
    settingKey: 'presets.underdogHero.setting',
    conceptKey: 'presets.underdogHero.concept',
    icon: Wand2,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-500',
    gradient: 'from-purple-400 via-pink-400 to-amber-400',
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop', // Inspiring cityscape
    style: 'disney-pixar',
    story: {
      title: 'Dream Big',
      genre: 'family',
      tone: 'inspiring',
      setting: 'Modern city with vibrant neighborhoods, a small family restaurant, sports arena',
      concept: 'A young dreamer from a struggling immigrant family wants to compete in a prestigious talent show but faces rejection and doubt. With the help of quirky friends and unexpected mentors, they prove that passion and heart matter more than background or appearance.',
    },
  },

  // ===== ANIME/JAPAN STYLE =====
  {
    id: 'anime-spirit-world',
    title: 'Spirit World',
    labelKey: 'presets.spiritWorld.title',
    descriptionKey: 'presets.spiritWorld.description',
    description: 'Anime fantasy adventure in mystical Japan',
    storyTitleKey: 'presets.spiritWorld.storyTitle',
    settingKey: 'presets.spiritWorld.setting',
    conceptKey: 'presets.spiritWorld.concept',
    icon: Film,
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-500',
    gradient: 'from-pink-500 via-rose-400 to-red-400',
    imageUrl: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=400&h=400&fit=crop', // Japanese temple/spiritual scene
    style: 'anime',
    story: {
      title: 'Spirit Hunter',
      genre: 'fantasy',
      tone: 'dramatic',
      setting: 'Modern Tokyo with hidden spirit shrines, ancient Japanese temples, mystical forest realm',
      concept: 'A reluctant teenager inherits the ability to see spirits and must protect the human world from vengeful Yokai seeking revenge. Trained by a mysterious shrine maiden, they uncover a conspiracy that threatens to merge the spirit and human worlds, leading to an epic battle in downtown Tokyo.',
    },
  },
  {
    id: 'anime-mecha-academy',
    title: 'Mecha Academy',
    labelKey: 'presets.mechaAcademy.title',
    descriptionKey: 'presets.mechaAcademy.description',
    description: 'Anime sci-fi action with giant robots and school rivalry',
    storyTitleKey: 'presets.mechaAcademy.storyTitle',
    settingKey: 'presets.mechaAcademy.setting',
    conceptKey: 'presets.mechaAcademy.concept',
    icon: Sparkles,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-500',
    gradient: 'from-cyan-400 via-blue-400 to-indigo-500',
    imageUrl: 'https://images.unsplash.com/photo-1614726365723-49cfae92782f?w=400&h=400&fit=crop', // Futuristic sci-fi scene
    style: 'anime',
    story: {
      title: 'Iron Academy',
      genre: 'scifi',
      tone: 'dramatic',
      setting: 'Futuristic military academy in space, massive mecha training grounds, orbital stations',
      concept: 'At an elite space academy where students pilot giant mechs to defend against alien threats, a talented but reckless cadet must lead a team of misfits against an invading alien fleet. As secrets about the academy\'s true purpose unravel, they must choose between duty and the truth.',
    },
  },

  // ===== REALISTIC STYLE =====
  {
    id: 'realistic-noir-thriller',
    title: 'Noir Thriller',
    labelKey: 'presets.noirThriller.title',
    descriptionKey: 'presets.noirThriller.description',
    description: 'Gritty detective story in noir style',
    storyTitleKey: 'presets.noirThriller.storyTitle',
    settingKey: 'presets.noirThriller.setting',
    conceptKey: 'presets.noirThriller.concept',
    icon: Camera,
    iconBg: 'bg-gray-500/20',
    iconColor: 'text-gray-500',
    gradient: 'from-gray-600 via-gray-700 to-gray-900',
    imageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=400&fit=crop', // Rainy city night noir
    style: 'realistic',
    story: {
      title: 'Shadows in the Rain',
      genre: 'mystery',
      tone: 'suspenseful',
      setting: 'Rain-soaked city streets, neon signs, 1940s detective office, smoky jazz clubs',
      concept: 'A disillusioned detective investigates the murder of a mysterious woman who visited them the night before, claiming her life was in danger. As they peel back layers of corruption in the city\'s underworld, they realize the killer is someone from their own past, forcing a confrontation with buried secrets.',
    },
  },
  {
    id: 'realistic-drama-redemption',
    title: 'Redemption Story',
    labelKey: 'presets.redemptionStory.title',
    descriptionKey: 'presets.redemptionStory.description',
    description: 'Character-driven drama about second chances',
    storyTitleKey: 'presets.redemptionStory.storyTitle',
    settingKey: 'presets.redemptionStory.setting',
    conceptKey: 'presets.redemptionStory.concept',
    icon: Film,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-500',
    gradient: 'from-amber-500 via-orange-500 to-yellow-600',
    imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&h=400&fit=crop', // Coastal town sunset
    style: 'realistic',
    story: {
      title: 'The Long Way Home',
      genre: 'drama',
      tone: 'heartfelt',
      setting: 'Small coastal town, weathered fishing boat, local diner, autumn landscapes',
      concept: 'A former convict returns to their hometown after 15 years in prison, seeking redemption and reconnection with a daughter who doesn\'t know them. Working as a fisherman alongside their estranged father, they must confront the mistakes of their past while the community struggles to forgive.',
    },
  },
];
