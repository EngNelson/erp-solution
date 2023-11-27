import { MailerService } from '@nestjs-modules/mailer';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { SENDING_EMAIL_QUEUE } from 'src/domain/constants';
import { JobProcess } from 'src/domain/enums/email';
import {
  EmailInputModel,
  EmailInputModelWithTemplate,
} from 'src/domain/interfaces';

@Processor('emailSending')
export class EmailSendingProcessor {
  constructor(private readonly _mailService: MailerService) {}

  @Process(JobProcess.SEND_SIMPLE_EMAIL)
  async sendEmail(job: Job<EmailInputModel>) {
    const { data } = job;

    await this._mailService.sendMail({
      to: data.to,
      from: data.from,
      subject: data.subject,
      text: data.text,
    });
  }

  @Process('email-with-template')
  async sendEmailWithTemplate(job: Job<EmailInputModelWithTemplate>) {
    console.log('Sending email with template');

    const { data } = job;

    await this._mailService.sendMail({
      to: data.to,
      from: data.from,
      subject: data.subject,
      template: data.template,
      context: data.context,
    });
  }
}
