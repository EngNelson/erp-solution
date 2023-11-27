import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Counter } from 'src/domain/entities/finance';
import { CounterRepository } from 'src/repositories/finance';
import { GetCounterByIdInput } from './dto';
import { AgentRoles, UserCon } from '@glosuite/shared';
import { CounterItemOutput } from 'src/domain/dto/finance/counter';

@Injectable()
export class GetCounterByIdService {
  constructor(
    @InjectRepository(Counter)
    private readonly _counterRepository: CounterRepository,
  ) {}

  async getCounterById(
    input: GetCounterByIdInput,
    user: UserCon,
  ): Promise<CounterItemOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return result;
  }

  private async _tryExecution(
    input: GetCounterByIdInput,
    user: UserCon,
  ): Promise<CounterItemOutput> {
    try {
      const counter = await this._counterRepository.findOne({
        where: { id: input.counterId },
        relations: ['storagePoint'],
      });

      if (!counter) {
        throw new NotFoundException(
          `Counter with id '${input.counterId}' not found`,
        );
      }

      if (
        user.roles.some((role) => role === AgentRoles.TREASURY) &&
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.ADMIN ||
            role === AgentRoles.ACCOUNTING ||
            role === AgentRoles.DAF ||
            role === AgentRoles.DG,
        ) &&
        input.counterId !== counter.id
      ) {
        throw new UnauthorizedException(
          `You are not allowed to view ${counter.reference} details`,
        );
      }

      return new CounterItemOutput(counter);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetCounterByIdService.name} - ${this._tryExecution.name} - `,
        error.message ? error.message : error,
      );
    }
  }
}
