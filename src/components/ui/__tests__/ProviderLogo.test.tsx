import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderLogo, getProviderName, getProviderColor, getProviderBgColor } from '../ProviderLogo';

describe('ProviderLogo', () => {
  describe('Component Rendering', () => {
    it('renders provider icon correctly', () => {
      const { container } = render(<ProviderLogo provider="openrouter" />);
      // Check if SVG element exists
      const icon = container.querySelector('svg');
      expect(icon).toBeTruthy();
      expect(icon?.className).toContain('lucide');
      expect(icon?.className).toContain('text-emerald-400');
    });

    it('renders provider name when showName is true', () => {
      render(<ProviderLogo provider="openrouter" showName />);
      expect(screen.getByText('OpenRouter')).toBeTruthy();
    });

    it('renders badge variant correctly', () => {
      render(<ProviderLogo provider="kie" variant="badge" />);
      expect(screen.getByText('KIE.ai')).toBeTruthy();
      // Check for badge styling
      const badge = screen.getByText('KIE.ai').parentElement;
      expect(badge?.className).toContain('rounded-full');
      expect(badge?.className).toContain('bg-orange-500/20');
    });

    it('renders full variant correctly', () => {
      render(<ProviderLogo provider="gemini" variant="full" />);
      expect(screen.getByText('Google Gemini')).toBeTruthy();
    });

    it('applies correct size classes', () => {
      const { container, rerender } = render(<ProviderLogo provider="openai" size="sm" />);
      let icon = container.querySelector('svg');
      expect(icon?.className).toContain('w-4 h-4');

      rerender(<ProviderLogo provider="openai" size="xl" />);
      icon = container.querySelector('svg');
      expect(icon?.className).toContain('w-8 h-8');
    });

    it('applies custom className', () => {
      const { container } = render(<ProviderLogo provider="claude" className="custom-class" />);
      const icon = container.querySelector('svg');
      expect(icon?.className).toContain('custom-class');
    });

    it('handles unknown provider with fallback', () => {
      const { container } = render(<ProviderLogo provider="unknown-provider" showName />);
      expect(screen.getByText('unknown-provider')).toBeTruthy();
      // Should render default Sparkles icon
      const icon = container.querySelector('svg');
      expect(icon).toBeTruthy();
      expect(icon?.className).toContain('lucide-sparkles');
    });

    it('normalizes provider names with different cases', () => {
      render(<ProviderLogo provider="OpenRouter" showName />);
      expect(screen.getByText('OpenRouter')).toBeTruthy();
    });

    it('handles provider names with hyphens and underscores', () => {
      render(<ProviderLogo provider="openai-tts" showName />);
      expect(screen.getByText('OpenAI TTS')).toBeTruthy();
    });
  });

  describe('Helper Functions', () => {
    it('getProviderName returns correct display names', () => {
      expect(getProviderName('openrouter')).toBe('OpenRouter');
      expect(getProviderName('kie')).toBe('KIE.ai');
      expect(getProviderName('gemini')).toBe('Google Gemini');
      expect(getProviderName('unknown')).toBe('unknown');
    });

    it('getProviderColor returns correct colors', () => {
      expect(getProviderColor('openrouter')).toBe('text-emerald-400');
      expect(getProviderColor('kie')).toBe('text-orange-400');
      expect(getProviderColor('gemini')).toBe('text-blue-400');
      expect(getProviderColor('unknown')).toBe('text-gray-400');
    });

    it('getProviderBgColor returns correct background colors', () => {
      expect(getProviderBgColor('openrouter')).toBe('bg-emerald-500/20');
      expect(getProviderBgColor('kie')).toBe('bg-orange-500/20');
      expect(getProviderBgColor('gemini')).toBe('bg-blue-500/20');
      expect(getProviderBgColor('unknown')).toBe('bg-gray-500/20');
    });
  });

  describe('Provider Coverage', () => {
    const providers = [
      'openrouter', 'gemini', 'openai', 'claude', 'claude-sdk',
      'kie', 'modal', 'elevenlabs', 'piapi', 'suno', 'resend'
    ];

    it.each(providers)('renders %s provider correctly', (provider) => {
      render(<ProviderLogo provider={provider} showName />);
      expect(screen.getByText(getProviderName(provider))).toBeTruthy();
    });
  });
});