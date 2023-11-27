import { Packages } from "src/domain/entities/logistics";
import { EntityRepository,Repository } from 'typeorm';

@EntityRepository(Packages)
export class PackagesRepository extends Repository<Packages>{}
