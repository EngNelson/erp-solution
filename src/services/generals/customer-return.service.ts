import { MiniUserCon, UserCon } from '@glosuite/shared';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CustomerReturn } from 'src/domain/entities/flows';
import { CommentModel } from 'src/domain/interfaces';

@Injectable()
export class CustomerReturnService {
  buildCustomerReturnComments(
    customerReturn: CustomerReturn,
    comment: string,
    user: UserCon,
  ): CommentModel[] {
    try {
      let comments: CommentModel[] = [];

      const addBy: MiniUserCon = {
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        sellerCode: user.sellerCode,
        workStation: user.workStation,
      };

      const commentItem = {
        position: comments.length,
        content: comment,
        addBy,
        createdAt: new Date(),
      };

      if (customerReturn.comments && customerReturn.comments.length > 0) {
        comments = customerReturn.comments;
        comments.push(commentItem);
      } else {
        comments = [commentItem];
      }

      return comments;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }
}
