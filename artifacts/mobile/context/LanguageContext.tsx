import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Language = 'uz' | 'ru';

const copy = {
  uz: {
    appName: 'Suhbat',
    welcome: 'Yaqinlaringiz bilan bir joyda',
    authIntro: 'Sodda, tez va o‘zbekcha suhbatlar.',
    signIn: 'Kirish',
    signUp: 'Ro‘yxatdan o‘tish',
    createAccount: 'Hisob yaratish',
    email: 'Elektron pochta',
    password: 'Parol',
    emailPlaceholder: 'name@example.com',
    passwordPlaceholder: 'Parolingizni kiriting',
    verifyEmail: 'Pochtangizni tasdiqlang',
    codeSent: 'Tasdiqlash kodi elektron pochtangizga yuborildi.',
    verificationCode: 'Tasdiqlash kodi',
    verify: 'Tasdiqlash',
    resendCode: 'Kodni qayta yuborish',
    noAccount: 'Hisobingiz yo‘qmi?',
    hasAccount: 'Hisobingiz bormi?',
    messages: 'Xabarlar',
    searchChats: 'Suhbatlarni qidirish',
    newChat: 'Yangi suhbat',
    settings: 'Sozlamalar',
    noChats: 'Hozircha suhbat yo‘q',
    noChatsHint: 'Elektron pochta orqali yangi suhbat boshlang.',
    noSearchMatches: 'Mos suhbat topilmadi',
    startChat: 'Suhbatni boshlash',
    recipientEmail: 'Suhbatdoshingiz elektron pochtasi',
    recipientHint: 'Suhbat boshlash uchun Suhbat hisobiga ulangan emailni kiriting.',
    continue: 'Davom etish',
    language: 'Til',
    signOut: 'Hisobdan chiqish',
    signOutConfirm: 'Hisobdan chiqishni xohlaysizmi?',
    cancel: 'Bekor qilish',
    youPrefix: 'Siz: ',
    messagePlaceholder: 'Xabar yozing…',
    send: 'Yuborish',
    noMessages: 'Birinchi xabarni yuboring',
    accountNeedsAction: 'Hisobni sozlashni yakunlang va qayta urinib ko‘ring.',
    unsupportedVerification: 'Bu hisob uchun email orqali tasdiqlash mavjud emas.',
    retry: 'Qayta urinish',
    loading: 'Yuklanmoqda…',
  },
  ru: {
    appName: 'Suhbat',
    welcome: 'Будьте ближе к своим',
    authIntro: 'Простые и быстрые разговоры на русском и узбекском.',
    signIn: 'Войти',
    signUp: 'Регистрация',
    createAccount: 'Создать аккаунт',
    email: 'Электронная почта',
    password: 'Пароль',
    emailPlaceholder: 'name@example.com',
    passwordPlaceholder: 'Введите пароль',
    verifyEmail: 'Подтвердите почту',
    codeSent: 'Код подтверждения отправлен на вашу почту.',
    verificationCode: 'Код подтверждения',
    verify: 'Подтвердить',
    resendCode: 'Отправить код ещё раз',
    noAccount: 'Нет аккаунта?',
    hasAccount: 'Уже есть аккаунт?',
    messages: 'Сообщения',
    searchChats: 'Поиск по чатам',
    newChat: 'Новый чат',
    settings: 'Настройки',
    noChats: 'Пока нет чатов',
    noChatsHint: 'Начните разговор по электронной почте.',
    noSearchMatches: 'Подходящих чатов нет',
    startChat: 'Начать чат',
    recipientEmail: 'Электронная почта собеседника',
    recipientHint: 'Введите email, привязанный к аккаунту Suhbat.',
    continue: 'Продолжить',
    language: 'Язык',
    signOut: 'Выйти из аккаунта',
    signOutConfirm: 'Вы действительно хотите выйти?',
    cancel: 'Отмена',
    youPrefix: 'Вы: ',
    messagePlaceholder: 'Напишите сообщение…',
    send: 'Отправить',
    noMessages: 'Отправьте первое сообщение',
    accountNeedsAction: 'Завершите настройку аккаунта и попробуйте снова.',
    unsupportedVerification: 'Для этого аккаунта недоступно подтверждение по email.',
    retry: 'Повторить',
    loading: 'Загрузка…',
  },
} as const;

export type TranslationKey = keyof typeof copy.uz;

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const storageKey = 'suhbat-language';
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('uz');

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (saved === 'uz' || saved === 'ru') setLanguageState(saved);
      })
      .catch((error: unknown) => {
        console.warn('Could not load the saved language preference.', error);
      });
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    AsyncStorage.setItem(storageKey, nextLanguage).catch((error: unknown) => {
      console.warn('Could not save the language preference.', error);
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey) => copy[language][key],
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider.');
  }
  return context;
}
