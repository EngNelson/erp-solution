import { Order } from 'src/domain/entities/orders';
import { ArticlesOrderedModel } from './articles-ordered.model';
import {
  ChangesToApplyOutputModel,
  MiniChangesToApplyOutputModel,
} from 'src/domain/interfaces/orders';

export type OrderModel = {
  order: Order;
  articlesOrdered: ArticlesOrderedModel[];
  sourceVersion?: Order;
  changesToApply?:
    | ChangesToApplyOutputModel[]
    | MiniChangesToApplyOutputModel[];
};
