export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  /**
   * Telegram bot the phone-verification flow links to. The user taps
   * Start in the bot, shares their phone, and the bot DMs them an OTP
   * to type back on /auth/verify-phone. Override per-deployment via
   * VITE_TELEGRAM_BOT_URL; the production bot is the default so the
   * page works even when the env var is missing.
   */
  telegramBotUrl:
    import.meta.env.VITE_TELEGRAM_BOT_URL ??
    'https://t.me/satzone_verification_bot',
} as const;
