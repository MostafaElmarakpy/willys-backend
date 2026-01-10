import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { DataSource, Not } from 'typeorm';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async validate(value: any, args: ValidationArguments) {
    const [entityClass, column] = args.constraints;

    try {
      const repository = this.dataSource.getRepository(entityClass);

      const whereClause: Record<string, any> = { [column]: value };

      const objectId = (args.object as any)?.id;

      if (objectId) {
        whereClause.id = Not(objectId);
      }
      const count = await repository.count({ where: whereClause });
      return count === 0;
    } catch (_error) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const [_entityClass, column] = args.constraints;
    return `${column} must be unique`;
  }
}
