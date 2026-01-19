'use client';

import Link from 'next/link';
import {
    ArrowLeft,
    ChevronDown,
    CreditCard,
    Crown,
    Edit3,
    Eye,
    Film,
    Globe,
    Lock,
    LogOut,
    Settings,
    Shield,
    User,
    Users,
    BarChart3
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreditsDisplay } from '@/components/shared/CreditsDisplay';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { StepNavigation } from './StepNavigation';
import type { Project } from '@/types/project';
import type { ProjectRole, ProjectPermissions } from '@/types/collaboration';
import { User as AuthUser } from 'next-auth';

interface ProjectHeaderProps {
    project: Project;
    user: AuthUser | undefined;
    isAdmin: boolean;
    userRole: ProjectRole | null;
    permissions: ProjectPermissions | null;
    subscriptionPlan: string | undefined;
    visibility: 'private' | 'public';
    isUpdatingVisibility: boolean;
    onToggleVisibility: () => void;
    onOpenCollaboration: () => void;
    onStepClick: (step: number) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
}

export function ProjectHeader({
    project,
    user,
    isAdmin,
    userRole,
    permissions,
    subscriptionPlan,
    visibility,
    isUpdatingVisibility,
    onToggleVisibility,
    onOpenCollaboration,
    onStepClick,
    t
}: ProjectHeaderProps) {

    const getPlanBadge = () => {
        if (!subscriptionPlan || subscriptionPlan === 'free') {
            return { label: t('billing.plans.free'), className: 'bg-amber-500/20 text-amber-500 border-amber-500/30' };
        }
        if (subscriptionPlan === 'starter') {
            return { label: t('billing.plans.starter'), className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
        }
        if (subscriptionPlan === 'pro') {
            return { label: t('billing.plans.pro'), className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
        }
        if (subscriptionPlan === 'studio') {
            return { label: t('billing.plans.studio'), className: 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30' };
        }
        return { label: subscriptionPlan, className: 'bg-muted text-muted-foreground' };
    };

    const getRoleLabel = (role: ProjectRole) => t(`roles.${role}`);

    return (
        <div className="sticky top-0 z-40 glass-strong border-b border-white/5">
            <div className="max-w-[1920px] mx-auto px-2 md:px-4 lg:px-6 xl:px-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between py-2 md:py-0 md:h-14 gap-2 md:gap-4">
                    {/* Top Row on Mobile / Left Section on Desktop */}
                    <div className="flex items-center justify-between md:justify-start gap-2 md:gap-4 flex-shrink-0">
                        {/* Back button and title */}
                        <div className="flex items-center gap-2 md:gap-4">
                            <Link href="/">
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 md:h-10 md:w-10">
                                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                                </Button>
                            </Link>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 md:gap-2">
                                    <h1 className="font-semibold text-xs sm:text-sm md:text-base truncate">
                                        {project.story.title || t('common.untitledStory')}
                                    </h1>
                                    <span className="text-muted-foreground hidden sm:inline">•</span>
                                    <span className="text-xs md:text-sm text-muted-foreground truncate max-w-[120px] md:max-w-[200px] hidden sm:inline">
                                        {project.name}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Credits Display and Controls on Mobile */}
                        <div className="flex items-center gap-1 md:hidden">
                            {user && <CreditsDisplay className="scale-90" />}
                            <LanguageSwitcher />
                            <ThemeToggle />
                        </div>
                    </div>

                    {/* Center Section - Step Navigation */}
                    <div className="flex-1 flex justify-center md:px-4">
                        <StepNavigation
                            currentStep={project.currentStep}
                            onStepClick={onStepClick}
                            t={t}
                        />
                    </div>

                    {/* Actions - Right Section */}
                    <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                        {/* Credits Display */}
                        {user && <CreditsDisplay className="hidden sm:flex" />}

                        {/* Language Switcher */}
                        <LanguageSwitcher />

                        {/* Theme Toggle */}
                        <ThemeToggle />

                        {/* View Only Badge for readers */}
                        {!permissions?.canEdit && userRole && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
                                <Eye className="w-3 h-3" />
                                <span>{t('project.viewOnly')}</span>
                            </div>
                        )}

                        {/* Visibility Toggle (for admins) */}
                        {userRole === 'admin' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onToggleVisibility}
                                disabled={isUpdatingVisibility}
                                className={`gap-2 ${visibility === 'public'
                                    ? 'text-green-400 hover:text-green-300'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                title={visibility === 'public' ? t('project.publicProjectTooltip') : t('project.privateProjectTooltip')}
                            >
                                {visibility === 'public' ? (
                                    <Globe className="w-4 h-4" />
                                ) : (
                                    <Lock className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline">
                                    {visibility === 'public' ? t('project.public') : t('project.private')}
                                </span>
                            </Button>
                        )}

                        {/* Team/Collaboration button - hide for read-only viewers */}
                        {permissions?.canEdit && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onOpenCollaboration}
                                className="text-muted-foreground hover:text-foreground gap-2"
                            >
                                <Users className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('collaboration.team')}</span>
                                {userRole && (
                                    <span className={`hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${userRole === 'admin' ? 'bg-yellow-500/20 text-yellow-400' :
                                        userRole === 'collaborator' ? 'bg-purple-500/20 text-purple-400' :
                                            'bg-cyan-500/20 text-cyan-400'
                                        }`}>
                                        {getRoleLabel(userRole)}
                                    </span>
                                )}
                            </Button>
                        )}

                        {/* User Menu */}
                        {user && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="flex items-center gap-2 px-2 hover:bg-black/5 dark:hover:bg-white/5"
                                    >
                                        <Avatar className="w-8 h-8 border border-purple-500/30">
                                            <AvatarImage src={user.image || undefined} />
                                            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-sm">
                                                {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-56 glass-strong border-black/10 dark:border-white/10"
                                >
                                    <div className="px-3 py-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium">{user.name || 'User'}</p>
                                            {subscriptionPlan && (
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] px-1.5 py-0 ${getPlanBadge().className}`}
                                                >
                                                    {getPlanBadge().label}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                    </div>
                                    <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />

                                    {/* Navigation Items */}
                                    <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                                        <Link href="/projects">
                                            <Film className="w-4 h-4 mr-2" />
                                            {t('nav.projects')}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                                        <Link href="/discover">
                                            <Globe className="w-4 h-4 mr-2" />
                                            {t('nav.discover')}
                                        </Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />

                                    {/* User Options */}
                                    <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                                        <Link href="/profile">
                                            <User className="w-4 h-4 mr-2" />
                                            {t('nav.profile')}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                                        <Link href="/statistics">
                                            <BarChart3 className="w-4 h-4 mr-2" />
                                            {t('nav.statistics')}
                                        </Link>
                                    </DropdownMenuItem>
                                    {(isAdmin || (subscriptionPlan && subscriptionPlan !== 'free')) && (
                                        <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                                            <Link href="/settings">
                                                <Settings className="w-4 h-4 mr-2" />
                                                {t('nav.settings')}
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" asChild>
                                        <Link href="/billing">
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            {t('nav.billing')}
                                        </Link>
                                    </DropdownMenuItem>

                                    {/* Admin Options */}
                                    {isAdmin && (
                                        <>
                                            <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
                                            <DropdownMenuItem className="cursor-pointer hover:bg-amber-500/10 text-amber-600 dark:text-amber-400" asChild>
                                                <Link href="/admin">
                                                    <Shield className="w-4 h-4 mr-2" />
                                                    {t('nav.admin')}
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="cursor-pointer hover:bg-amber-500/10 text-amber-600 dark:text-amber-400" asChild>
                                                <Link href="/approvals">
                                                    <Shield className="w-4 h-4 mr-2" />
                                                    {t('nav.approvals')}
                                                </Link>
                                            </DropdownMenuItem>
                                        </>
                                    )}

                                    <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
                                    <DropdownMenuItem
                                        onClick={() => signOut({ callbackUrl: '/' })}
                                        className="cursor-pointer text-red-500 focus:text-red-500 hover:bg-red-500/10"
                                    >
                                        <LogOut className="w-4 h-4 mr-2" />
                                        {t('auth.signOut')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
