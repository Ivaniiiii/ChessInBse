import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setParams: (params: {
      text?: string;
      color?: string;
      text_color?: string;
      is_active?: boolean;
      is_visible?: boolean;
    }) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  sendData: (data: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string, callback?: (status: string) => void) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text: string;
    }>;
  }, callback?: (id: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showScanQrPopup: (params: {
    text?: string;
  }, callback?: (data: string) => void) => void;
  closeScanQrPopup: () => void;
  readTextFromClipboard: (callback?: (text: string) => void) => void;
  requestWriteAccess: (callback?: (granted: boolean) => void) => void;
  requestContact: (callback?: (granted: boolean) => void) => void;
}

export function useTelegramWebApp() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if we're in Telegram Web App
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = WebApp;
      tg.ready();
      tg.expand();

      setWebApp(tg as any);
      setUser(tg.initDataUnsafe?.user || null);
      setIsReady(true);

      // Apply theme
      if (tg.themeParams.bg_color) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
      }
      if (tg.themeParams.text_color) {
        document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
      }
    } else {
      // Development mode - create mock
      console.warn('Telegram Web App not detected, using mock');
      setIsReady(true);
    }
  }, []);

  return {
    webApp,
    user,
    isReady,
    isTelegram: !!webApp,
  };
}

