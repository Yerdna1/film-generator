import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import type { Character } from '@/types/project';

interface CharacterHeaderProps {
  characters: Character[];
  maxCharacters: number;
  isGeneratingAll: boolean;
  generatedCount: number;
  isReadOnly: boolean;
  onAddCharacter: () => void;
  onGenerateAll: () => void;
  onStopGenerating: () => void;
}

export function CharacterHeader({
  characters,
  maxCharacters,
  isGeneratingAll,
  generatedCount,
  isReadOnly,
  onAddCharacter,
  onGenerateAll,
  onStopGenerating,
}: CharacterHeaderProps) {
  const t = useTranslations();
  const canAddMore = characters.length < maxCharacters;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-violet-500" />
        <h2 className="text-xl font-semibold">{t('steps.character.title')}</h2>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        {/* Character count display */}
        <span className="text-sm text-muted-foreground">
          {generatedCount} / {characters.length} {t('steps.character.generated')}
        </span>

        {!isReadOnly && (
          <>
            {generatedCount < characters.length && generatedCount > 0 && (
              <Button
                onClick={isGeneratingAll ? onStopGenerating : onGenerateAll}
                size="sm"
                variant={isGeneratingAll ? 'destructive' : 'outline'}
                className={isGeneratingAll ? '' : 'border-violet-500/30 hover:bg-violet-500/10'}
              >
                {isGeneratingAll
                  ? t('steps.character.stopGenerating')
                  : t('steps.character.generateAll')}
              </Button>
            )}

            {canAddMore && (
              <Button
                onClick={onAddCharacter}
                size="sm"
                className="bg-violet-500 hover:bg-violet-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('steps.character.addCharacter')}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}