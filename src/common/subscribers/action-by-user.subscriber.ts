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
    const { metadata, manager, entity } = event;
    const target = metadata.target;

    if (metadata.relations.some((rel) => rel.propertyName === relation)) {
      manager
        .getRepository(target)
        .createQueryBuilder()
        .relation(target, relation)
        .of(entity)
        .set(currentUser);
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
