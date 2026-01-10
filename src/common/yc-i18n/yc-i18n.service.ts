import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { I18nPath, I18nTranslations } from 'src/generated/i18n.generated';

export type SupportedLang = 'en' | 'ar' | undefined;
export const defaultLang: SupportedLang = 'en';

@Injectable()
export class YcI18nService {
  constructor(private readonly i18n: I18nService<I18nTranslations>) {}

  t(key: I18nPath, options?: Record<string, any>) {
    const lang = I18nContext.current()?.lang;
    return this.i18n.translate(key, { lang, ...options });
  }

  lang(): SupportedLang {
    return I18nContext.current()?.lang as SupportedLang;
  }

  setLocale(_locale: string) {
    const i18nContext = I18nContext.current();
    if (i18nContext) {
      // i18nContext.lang = locale;
    }
  }
}
