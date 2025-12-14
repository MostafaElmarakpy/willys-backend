import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../../database/entities/branch.entity';

@ValidatorConstraint({ name: 'BranchExists', async: true })
@Injectable()
export class BranchExistsRule implements ValidatorConstraintInterface {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
  ) {}

  async validate(branchId: string) {
    if (!branchId) {
      return false;
    }

    try {
      const branch = await this.branchRepository.findOne({
        where: { id: branchId },
      });
      return !!branch;
    } catch (error) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'Branch with ID $value does not exist';
  }
}

export function BranchExists(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'BranchExists',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: BranchExistsRule,
    });
  };
}
