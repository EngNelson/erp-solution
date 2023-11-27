import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { EmailInputModel } from 'src/domain/interfaces';

@Injectable()
export class SendingEmailService {
  constructor(private readonly _mailService: MailerService) {}

  async sendEmail(emailInput: EmailInputModel): Promise<boolean> {
    try {
      await this._mailService.sendMail({
        to: emailInput.to,
        from: emailInput.from,
        subject: emailInput.subject,
        text: emailInput.text,
      });

      return true;
    } catch (error) {
      throw new InternalServerErrorException(`An error occured ${error}`);
    }
  }

  async sendEmailWithTemplate(
    emailInput: EmailInputModel,
    template: string,
    context: any,
  ): Promise<boolean> {
    try {
      await this._mailService.sendMail({
        to: emailInput.to,
        from: emailInput.from,
        subject: emailInput.subject,
        template: template,
        context: context,
      });

      return true;
    } catch (error) {
      throw new InternalServerErrorException(`An error occured ${error}`);
    }
  }
}
