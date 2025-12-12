import { ClsServiceManager } from 'nestjs-cls';
import { User } from 'src/database/entities/user.entity';
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { CURRENT_USER } from '../constants/context';

@EventSubscriber()
export class ActionByUserSubscriber implements EntitySubscriberInterface {
  listenTo() {
    return Object;
  }

  private getCurrentUser(): User | undefined {
    const clsService = ClsServiceManager.getClsService();
    if (!clsService) return undefined;
    return clsService.get(CURRENT_USER);
  }

  private updateRelation(
    event: InsertEvent<any> | UpdateEvent<any>,
    relation: string,
    currentUser: User,
  ) {
    const { metadata, entity } = event;

    // Check if the entity has the relation property
    if (metadata.relations.some((rel) => rel.propertyName === relation)) {
      // Set the foreign key ID directly
      const foreignKeyProperty = relation + 'Id';

      if (entity && typeof entity === 'object') {
        entity[foreignKeyProperty] = currentUser.id;
        entity[relation] = currentUser;
      }
    }
  }

  beforeInsert(event: InsertEvent<any>) {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !event.entity) return;
    this.updateRelation(event, 'createdBy', currentUser);
  }

  beforeUpdate(event: UpdateEvent<any>) {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !event.entity) return;
    if (event.entity.createdAt) {
      this.updateRelation(event, 'updatedBy', currentUser);
    }
  }
}
