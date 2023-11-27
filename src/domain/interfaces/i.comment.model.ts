import { MiniUserCon } from '@glosuite/shared';

export interface CommentModel {
  position: number;
  content: string;
  addBy: MiniUserCon;
  createdAt: Date;
}
