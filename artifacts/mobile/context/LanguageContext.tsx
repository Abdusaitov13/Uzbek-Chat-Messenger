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
    searchUsers: 'Ism yoki email bo‘yicha qidiring',
    searchUsersHint: 'Kamida 2 ta harf kiriting',
    noContacts: 'Foydalanuvchi topilmadi',
    groupName: 'Guruh nomi (ixtiyoriy)',
    groupMembers: 'tanlangan',
    startGroup: 'Guruhni yaratish',
    groupChat: 'Guruh suhbati',
    profile: 'Profil',
    privacy: 'Maxfiylik',
    firstName: 'Ism',
    lastName: 'Familya',
    dateOfBirth: 'Tug‘ilgan sana',
    dateFormat: 'Yil-oy-kun (masalan, 2000-05-17)',
    username: 'Foydalanuvchi nomi',
    bio: 'Men haqimda',
    saveProfile: 'Profilni saqlash',
    profileHint: 'Yosh hisoblanadi, lekin yosh chegarasi yo‘q.',
    age: 'Yosh',
    years: 'yosh',
    profileSaved: 'Profil saqlandi.',
    completeProfile: 'Profilni to‘ldiring',
    profileRequired: 'Ism, familya va tug‘ilgan sanani kiriting.',
    invalidBirthDate: 'Tug‘ilgan sanani YYYY-MM-DD formatida kiriting.',
    futureBirthDate: 'Tug‘ilgan sana kelajakda bo‘lishi mumkin emas.',
    invalidEmail: 'Email manzilini to‘g‘ri kiriting.',
    authFailed: 'Kiritilgan ma’lumotlar bilan kirib bo‘lmadi. Tekshirib qayta urinib ko‘ring.',
    verificationError: 'Tasdiqlash kodi noto‘g‘ri yoki muddati tugagan.',
    passwordMinLength: 'Parol kamida 8 ta belgidan iborat bo‘lishi kerak.',
    usernameRule: 'Foydalanuvchi nomi 3–32 harf, raqam yoki pastki chiziqdan iborat bo‘lsin.',
    usernameTaken: 'Bu foydalanuvchi nomi band.',
    searchable: 'Qidiruvda ko‘rinish',
    searchableHint: 'Boshqalar sizni ism yoki foydalanuvchi nomi bilan topsin.',
    showLastSeen: 'Oxirgi faollikni ko‘rsatish',
    continueWithGoogle: 'Google orqali davom etish',
    socialLoginError: 'Google orqali kirib bo‘lmadi. Qayta urinib ko‘ring.',
    or: 'yoki',
    messagesTab: 'Chat',
    settings: 'Sozlamalar',
    noChats: 'Hozircha suhbat yo‘q',
    noChatsHint: 'Ism yoki email orqali yangi suhbat boshlang.',
    noSearchMatches: 'Mos suhbat topilmadi',
    startChat: 'Suhbatni boshlash',
    recipientEmail: 'Suhbatdoshingiz',
    recipientHint: 'Ism yoki email orqali foydalanuvchini toping.',
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
    searchUsers: 'Поиск по имени или почте',
    searchUsersHint: 'Введите не менее 2 символов',
    noContacts: 'Пользователи не найдены',
    groupName: 'Название группы (необязательно)',
    groupMembers: 'выбрано',
    startGroup: 'Создать группу',
    groupChat: 'Групповой чат',
    profile: 'Профиль',
    privacy: 'Конфиденциальность',
    firstName: 'Имя',
    lastName: 'Фамилия',
    dateOfBirth: 'Дата рождения',
    dateFormat: 'Год-месяц-день (например, 2000-05-17)',
    username: 'Имя пользователя',
    bio: 'О себе',
    saveProfile: 'Сохранить профиль',
    profileHint: 'Возраст будет рассчитан, ограничений по возрасту нет.',
    age: 'Возраст',
    years: 'лет',
    profileSaved: 'Профиль сохранён.',
    completeProfile: 'Заполните профиль',
    profileRequired: 'Введите имя, фамилию и дату рождения.',
    invalidBirthDate: 'Введите дату рождения в формате ГГГГ-ММ-ДД.',
    futureBirthDate: 'Дата рождения не может быть в будущем.',
    invalidEmail: 'Введите корректный адрес электронной почты.',
    authFailed: 'Не удалось войти с этими данными. Проверьте их и попробуйте ещё раз.',
    verificationError: 'Код подтверждения неверен или срок его действия истёк.',
    passwordMinLength: 'Пароль должен содержать не менее 8 символов.',
    usernameRule: 'Имя пользователя: 3–32 буквы, цифры или подчёркивания.',
    usernameTaken: 'Это имя пользователя уже занято.',
    searchable: 'Показывать в поиске',
    searchableHint: 'Другие смогут найти вас по имени или имени пользователя.',
    showLastSeen: 'Показывать время последней активности',
    continueWithGoogle: 'Продолжить через Google',
    socialLoginError: 'Не удалось войти через Google. Попробуйте ещё раз.',
    or: 'или',
    messagesTab: 'Чаты',
    settings: 'Настройки',
    noChats: 'Пока нет чатов',
    noChatsHint: 'Найдите собеседника по имени или почте.',
    noSearchMatches: 'Подходящих чатов нет',
    startChat: 'Начать чат',
    recipientEmail: 'Собеседник',
    recipientHint: 'Найдите пользователя по имени или электронной почте.',
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
