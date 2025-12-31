'use client';

import { motion } from 'framer-motion';
import {
  DollarSign,
  Loader2,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
  Users,
  Wand2,
  Music,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CostCategoryCard } from './CostCategoryCard';
import type { ActionCosts } from '../types';

interface PricingTabProps {
  actionCosts: ActionCosts | null;
  costsLoading: boolean;
}

export function PricingTab({ actionCosts, costsLoading }: PricingTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Action Costs
          </CardTitle>
          <CardDescription>
            Real API costs per action. These costs are set by the administrator and cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {costsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : actionCosts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CostCategoryCard
                title="Image Generation"
                description="Cost per generated image"
                icon={ImageIcon}
                iconColor="text-blue-400"
                bgColor="bg-blue-500/20"
                costs={actionCosts.image}
              />

              <CostCategoryCard
                title="Video Generation"
                description="Cost per 6-second video clip"
                icon={Video}
                iconColor="text-orange-400"
                bgColor="bg-orange-500/20"
                costs={actionCosts.video}
              />

              <CostCategoryCard
                title="Voice Generation"
                description="Cost per dialogue line (~100 chars)"
                icon={Mic}
                iconColor="text-violet-400"
                bgColor="bg-violet-500/20"
                costs={actionCosts.voiceover}
              />

              <CostCategoryCard
                title="Scene Generation"
                description="Cost per scene description"
                icon={FileText}
                iconColor="text-cyan-400"
                bgColor="bg-cyan-500/20"
                costs={actionCosts.scene}
              />

              <CostCategoryCard
                title="Character Generation"
                description="Cost per character description"
                icon={Users}
                iconColor="text-pink-400"
                bgColor="bg-pink-500/20"
                costs={actionCosts.character}
              />

              <CostCategoryCard
                title="Master Prompt"
                description="Cost per master prompt generation"
                icon={Wand2}
                iconColor="text-amber-400"
                bgColor="bg-amber-500/20"
                costs={actionCosts.prompt}
              />

              <CostCategoryCard
                title="Music Generation"
                description="Cost per background music track"
                icon={Music}
                iconColor="text-pink-400"
                bgColor="bg-pink-500/20"
                costs={actionCosts.music}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Click the Pricing tab to load costs</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="glass border-white/10 border-l-4 border-l-green-500">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            These costs reflect the actual API pricing from providers. Costs are managed by the system administrator and stored in the database.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
