import { MiniUserCon } from '@glosuite/shared';
import { CommentModel } from '../interfaces';

export class CommentItemOutput {
  constructor(comment: CommentModel) {
    this.position = comment.position;
    this.content = comment.content;
    this.addBy = comment.addBy;
    this.createdAt = comment.createdAt;
  }

  position: number;
  content: string;
  addBy: MiniUserCon;
  createdAt: Date;
}
