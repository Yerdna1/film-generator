import { motion } from 'framer-motion';
import { CharacterCard } from '../../character-generator/components';
import type { Character, Project } from '@/types/project';
import type { ItemGenerationState } from '@/lib/constants/workflow';
import type { AspectRatio } from '@/lib/services/real-costs';

interface CharacterListProps {
  project: Project;
  characters: Character[];
  imageStates: Record<string, ItemGenerationState>;
  isReadOnly: boolean;
  characterAspectRatio: AspectRatio;
  onEdit: (character: Character) => void;
  onDelete: (characterId: string) => void;
  onPreviewImage: (imageUrl: string) => void;
  onGenerateImage: (character: Character) => void;
  onRegeneratePrompt: (character: Character) => void;
  onUploadImage: (character: Character, file: File) => void;
}

export function CharacterList({
  project,
  characters,
  imageStates,
  isReadOnly,
  characterAspectRatio,
  onEdit,
  onDelete,
  onPreviewImage,
  onGenerateImage,
  onRegeneratePrompt,
  onUploadImage,
}: CharacterListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {characters.map((character, index) => (
        <motion.div
          key={character.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <CharacterCard
            character={character}
            project={project}
            imageState={imageStates[character.id]}
            isReadOnly={isReadOnly}
            onEdit={onEdit}
            onDelete={onDelete}
            onGenerateImage={onGenerateImage}
            onRegeneratePrompt={onRegeneratePrompt}
            onPreviewImage={onPreviewImage}
            onUploadImage={onUploadImage}
            characterAspectRatio={characterAspectRatio}
          />
        </motion.div>
      ))}
    </div>
  );
}