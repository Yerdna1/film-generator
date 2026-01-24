import { toast as sonnerToast, type ExternalToast } from 'sonner';

// Define custom toast styles
const baseToastStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.95) !important',
  backdropFilter: 'blur(16px) !important',
  border: '1px solid rgba(255, 255, 255, 0.1) !important',
  borderRadius: '12px !important',
  fontSize: '14px !important',
  fontWeight: '500 !important',
  maxWidth: '400px !important',
  padding: '16px !important',
};

// Custom toast wrapper functions
export const toast = {
  // Success toast with green glow
  success: (message: string, options?: ExternalToast) => {
    return sonnerToast.success(message, {
      ...options,
      style: {
        ...baseToastStyle,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(34, 197, 94, 0.4) !important',
        borderColor: 'rgba(34, 197, 94, 0.3) !important',
        color: '#4ade80 !important',
      } as React.CSSProperties,
    });
  },

  // Error toast with red glow
  error: (message: string, options?: ExternalToast) => {
    return sonnerToast.error(message, {
      ...options,
      style: {
        ...baseToastStyle,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(239, 68, 68, 0.4) !important',
        borderColor: 'rgba(239, 68, 68, 0.3) !important',
        color: '#f87171 !important',
      } as React.CSSProperties,
    });
  },

  // Info toast with blue glow
  info: (message: string, options?: ExternalToast) => {
    return sonnerToast.info(message, {
      ...options,
      style: {
        ...baseToastStyle,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(59, 130, 246, 0.4) !important',
        borderColor: 'rgba(59, 130, 246, 0.3) !important',
        color: '#60a5fa !important',
      } as React.CSSProperties,
    });
  },

  // Warning toast with yellow glow
  warning: (message: string, options?: ExternalToast) => {
    return sonnerToast.warning(message, {
      ...options,
      style: {
        ...baseToastStyle,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(245, 158, 11, 0.4) !important',
        borderColor: 'rgba(245, 158, 11, 0.3) !important',
        color: '#fbbf24 !important',
      } as React.CSSProperties,
    });
  },

  // Loading toast with purple glow
  loading: (message: string, options?: ExternalToast) => {
    return sonnerToast.loading(message, {
      ...options,
      style: {
        ...baseToastStyle,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(147, 51, 234, 0.4) !important',
        borderColor: 'rgba(147, 51, 234, 0.3) !important',
        color: '#c084fc !important',
      } as React.CSSProperties,
    });
  },

  // Generic toast
  message: (message: string, options?: ExternalToast) => {
    return sonnerToast(message, {
      ...options,
      style: {
        ...baseToastStyle,
        color: '#e5e7eb !important',
      } as React.CSSProperties,
    });
  },

  // Promise toast for async operations
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error,
      style: baseToastStyle as React.CSSProperties,
    });
  },

  // Dismiss toast
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },
};