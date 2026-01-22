import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedGenerateConfirmationDialog } from '../UnifiedGenerateConfirmationDialog';
import type { UnifiedGenerateConfirmationDialogProps } from '../UnifiedGenerateConfirmationDialog';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock ProviderLogo component
vi.mock('@/components/ui/ProviderLogo', () => ({
  ProviderLogo: ({ provider, size }: any) => (
    <div data-testid="provider-logo" data-provider={provider} data-size={size}>
      {provider}
    </div>
  ),
}));

describe('UnifiedGenerateConfirmationDialog', () => {
  const defaultProps: UnifiedGenerateConfirmationDialogProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    operation: 'image',
    provider: 'kie',
    model: 'seedream/4-5-text-to-image',
    details: [
      { label: 'Resolution', value: '1024x1024' },
      { label: 'Count', value: 5 },
    ],
    estimatedCost: 0.5,
    title: 'Generate Images',
    description: 'This will generate 5 images using KIE.ai',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Generate Images')).toBeFalsy();
    });

    it('renders dialog when isOpen is true', () => {
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Generate Images')).toBeTruthy();
      expect(screen.getByText('This will generate 5 images using KIE.ai')).toBeTruthy();
    });

    it('displays provider information', () => {
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} />);
      expect(screen.getByTestId('provider-logo')).toBeTruthy();
      expect(screen.getByText('Provider')).toBeTruthy();
      expect(screen.getByText('kie')).toBeTruthy();
    });

    it('displays model information', () => {
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Model')).toBeTruthy();
      expect(screen.getByText('Text To Image')).toBeTruthy(); // Formatted model name
    });

    it('displays additional details', () => {
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Resolution')).toBeTruthy();
      expect(screen.getByText('1024x1024')).toBeTruthy();
      expect(screen.getByText('Count')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('displays estimated cost', () => {
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Estimated Cost')).toBeTruthy();
      expect(screen.getByText('50.0 credits')).toBeTruthy();
    });

    it('shows fallback indicator when isUsingFallback is true', () => {
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} isUsingFallback />);
      expect(screen.getByText('(fallback)')).toBeTruthy();
    });

    it('renders correct operation icon', () => {
      const operations = ['llm', 'image', 'video', 'tts', 'music'] as const;

      operations.forEach((operation) => {
        const { unmount } = render(
          <UnifiedGenerateConfirmationDialog {...defaultProps} operation={operation} />
        );

        // Operation icons should be visible
        expect(screen.getByRole('button', { name: /generate/i })).toBeTruthy();

        unmount();
      });
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('cancel'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when confirm button is clicked', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('generate'));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('disables buttons during loading state', async () => {
      const onConfirm = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('generate'));

      await vi.waitFor(() => {
        expect(screen.getByText('generating')).toBeTruthy();
        expect(screen.queryByText('cancel')).toBeFalsy();
      });
    });

    it('does not allow cancel during loading', async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(
        <UnifiedGenerateConfirmationDialog
          {...defaultProps}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      );

      fireEvent.click(screen.getByText('generate'));

      await vi.waitFor(() => {
        expect(screen.getByText('generating')).toBeTruthy();
      });

      // Try to close - should not work
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Success State', () => {
    it('shows success message after successful confirmation', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('generate'));

      await vi.waitFor(() => {
        expect(screen.getByText('Operation completed successfully!')).toBeTruthy();
      });
    });

    it('auto-closes after success with default delay', async () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      const onConfirm = vi.fn().mockResolvedValue(undefined);

      render(
        <UnifiedGenerateConfirmationDialog
          {...defaultProps}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      );

      fireEvent.click(screen.getByText('generate'));

      await vi.waitFor(() => {
        expect(screen.getByText('Operation completed successfully!')).toBeTruthy();
      });

      expect(onClose).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1500);

      expect(onClose).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('does not auto-close when autoCloseDelay is 0', async () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      const onConfirm = vi.fn().mockResolvedValue(undefined);

      render(
        <UnifiedGenerateConfirmationDialog
          {...defaultProps}
          onClose={onClose}
          onConfirm={onConfirm}
          autoCloseDelay={0}
        />
      );

      fireEvent.click(screen.getByText('generate'));

      await vi.waitFor(() => {
        expect(screen.getByText('Operation completed successfully!')).toBeTruthy();
        expect(screen.getByText('close')).toBeTruthy();
      });

      await vi.advanceTimersByTimeAsync(5000);

      expect(onClose).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Error State', () => {
    it('shows error message on confirmation failure', async () => {
      const onConfirm = vi.fn().mockRejectedValue(new Error('API Error'));
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('generate'));

      await vi.waitFor(() => {
        expect(screen.getByText('error')).toBeTruthy();
        expect(screen.getByText('API Error')).toBeTruthy();
      });
    });

    it('shows retry button on error', async () => {
      const onConfirm = vi.fn().mockRejectedValue(new Error('API Error'));
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('generate'));

      await vi.waitFor(() => {
        expect(screen.getByText('retry')).toBeTruthy();
        expect(screen.getByText('close')).toBeTruthy();
      });
    });

    it('retries on retry button click', async () => {
      const onConfirm = vi.fn()
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(undefined);

      render(<UnifiedGenerateConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('generate'));

      await vi.waitFor(() => {
        expect(screen.getByText('retry')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('retry'));

      await vi.waitFor(() => {
        expect(screen.getByText('Operation completed successfully!')).toBeTruthy();
      });

      expect(onConfirm).toHaveBeenCalledTimes(2);
    });
  });

  describe('Custom Labels', () => {
    it('uses custom confirm label', () => {
      render(
        <UnifiedGenerateConfirmationDialog
          {...defaultProps}
          confirmLabel="Start Generation"
        />
      );
      expect(screen.getByText('Start Generation')).toBeTruthy();
    });

    it('uses custom cancel label', () => {
      render(
        <UnifiedGenerateConfirmationDialog
          {...defaultProps}
          cancelLabel="Go Back"
        />
      );
      expect(screen.getByText('Go Back')).toBeTruthy();
    });
  });

  describe('Cost Display', () => {
    it('shows credits for costs less than 1', () => {
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} estimatedCost={0.123} />);
      expect(screen.getByText('12.3 credits')).toBeTruthy();
    });

    it('shows formatted cost for costs >= 1', () => {
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} estimatedCost={10.567} />);
      expect(screen.getByText('10.57 credits')).toBeTruthy();
    });

    it('does not show cost section when cost is 0', () => {
      render(<UnifiedGenerateConfirmationDialog {...defaultProps} estimatedCost={0} />);
      expect(screen.queryByText('Estimated Cost')).toBeFalsy();
    });

    it('does not show cost section when cost is undefined', () => {
      const props = { ...defaultProps };
      delete props.estimatedCost;
      render(<UnifiedGenerateConfirmationDialog {...props} />);
      expect(screen.queryByText('Estimated Cost')).toBeFalsy();
    });
  });
});