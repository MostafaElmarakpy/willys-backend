import { Injectable } from "@nestjs/common";
import { I18nContext } from "nestjs-i18n";
import { EntitySubscriberInterface, EventSubscriber } from "typeorm";

@Injectable()
@EventSubscriber()
export class LocaleSubscriber implements EntitySubscriberInterface {
  listenTo() {
    return Object;
  }

  // Triggered after the entity has been loaded, regardless of relations
  afterLoad(entity: any) {
    const i18nContext = I18nContext.current();
    const locale = i18nContext ? i18nContext.lang : null;

    if (entity && locale) {
      this.extractLocaleFromEntity(entity, locale);
    }
  }

  // Transform JSON columns based on locale
  private extractLocaleFromEntity(entity: any, locale: string): any {
    for (const key in entity) {
      if (
        Object.hasOwn(entity, key) &&
        typeof entity[key] === "object" &&
        entity[key] !== null
      ) {
        if (Object.hasOwn(entity[key], locale)) {
          entity[key] = entity[key][locale];
        }
      }
    }
    return entity;
  }
}
