import { EmailTemplateName } from '../enums/email';

export interface EmailInputModel {
  to: string | string[];
  from: string;
  subject: string;
  text?: string;
}

export interface EmailInputModelWithTemplate {
  to: string | string[];
  from: string;
  subject: string;
  template: EmailTemplateName;
  context: any;
}
