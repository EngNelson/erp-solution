import { StepStatus } from '../enums/flows';

// export const AUTH_API_BASE_URL = `${process.env.AUTH_API_HOST}:${process.env.AUTH_API_PORT}`;
export const STORAGE_POINT_RESOURCE = 'storage-points';
export const USERS_RESOURCE = 'users';
export const USER_AUTH_RESOURCE = 'users/auth';
export const ONE_DAY_IN_MILLISECONDS = 86400000;
export const THIRTY_DAYS = 30;
export const SENDING_EMAIL_QUEUE = 'emailSending';
export const RECEPTION_MAXIMUM_QUANTITY = parseInt(
  process.env.RECEPTION_MAXIMUM_QUANTITY,
);
export const KNOWN_CODES = [
  {
    code: 'CM',
    name: {
      en: 'Cameroon',
      fr: 'Cameroun',
    },
  },
];
export const CANCEL_REASON_DATA = [
  {
    code: 'IP',
    label: 'Problème interne/Internal problem',
    children: [
      {
        code: 'IP01',
        label:
          'Adresse non desservie par le hub / Address not served by the hub',
      },
      {
        code: 'IP02',
        label:
          'Echec de livraison, charge de travail du livreur trop importante / Failure to deliver, too much work for the delivery person',
      },
      {
        code: 'IP03',
        label:
          'Echec de livraison due à la pluie, contraintes climatiques ou naturelles / Failed delivery due to rain, climate or natural constraints',
      },
      {
        code: 'IP04',
        label:
          'Echec de livraison, problème d’équipement (accident, panne...) / Failure to deliver, equipement issue (accident,breakdown...)',
      },
      {
        code: 'IP05',
        label: 'Erreur sur les documents / Mistake on delivery documents',
      },
      {
        code: 'IP06',
        label:
          'Colis perdu ou volé durant la livraison / Order misplaced or stolen during delivery',
      },
    ],
    requiredStatus: [
      StepStatus.TO_TREAT,
      StepStatus.TO_BUY,
      StepStatus.TO_RECEIVED,
      StepStatus.TO_PICK_PACK,
      StepStatus.TO_DELIVER,
      StepStatus.PICKED_UP,
      StepStatus.READY,
    ],
  },
  {
    code: 'RS',
    label: 'Service client/Customer service',
    children: [
      {
        code: 'RS01',
        label:
          'Client injoignable / Ne décroche pas - Customer unreachable / Not picking',
      },
      {
        code: 'RS02',
        label: 'Client incapable de payer / Customer not able to pay',
      },
      {
        code: 'RS03',
        label:
          'Client occupé, reporte la commande à une date ultérieure / Customer busy, postponed the delivery',
      },
      {
        code: 'RS04',
        label:
          'Le client réclame la consolidation de ses commandes / Customer requests for order consolidation',
      },
      {
        code: 'RS05',
        label:
          'Comportement du client suspect / Customer has doubtful behaviour',
      },
      {
        code: 'RS06',
        label: "Le client n'est pas dans ville / Customer out of town",
      },
      {
        code: 'RS07',
        label:
          'Le client a déjà reçu sa commande / Customer already received the order',
      },
    ],
    requiredStatus: [
      StepStatus.TO_TREAT,
      StepStatus.TO_BUY,
      StepStatus.TO_RECEIVED,
      StepStatus.TO_PICK_PACK,
    ],
  },
  {
    code: 'RJ',
    label: 'Rejet livraison/Rejection delivery',
    children: [
      {
        code: 'RJ01',
        label: 'Article de mauvaise qualité / Poor quality item',
      },
      {
        code: 'RJ02',
        label:
          'Le client n’aime pas la couleur, le style, le matériau - Customer dislikes item color, style, material',
      },
      {
        code: 'RJ03',
        label:
          'Mauvais article (non conforme à ce que le client à commandé) / Wrong item delivered',
      },
      {
        code: 'RJ04',
        label: 'Taille trop petite / Size too small',
      },
      {
        code: 'RJ05',
        label: 'Taille trop grande / Size too big',
      },
      {
        code: 'RJ06',
        label:
          'Article incomplet et le client ne souhaite pas qu’il soit remplacé / Incomplete item and the customer does not want replacement',
      },
      {
        code: 'RJ07',
        label:
          'Article incomplet mais le client souhaite qu’il soit remplacé / Incomplete item and the customer wants replacement',
      },
      {
        code: 'RJ08',
        label: 'Article défectueux / Defective item',
      },
      {
        code: 'RJ09',
        label: 'Article contrefait / Item conterfeit',
      },
    ],
    requiredStatus: [StepStatus.TO_DELIVER, StepStatus.PICKED_UP],
  },
  {
    code: 'CA',
    label: 'Annulation livraison/Delivery cancellation',
    children: [
      {
        code: 'CA01',
        label: 'Le client en deplacement',
      },
      {
        code: 'CA02',
        label: 'Refus du substitut',
      },
      {
        code: 'CA03',
        label: 'Substitut proposé est au dessus du budget du client',
      },
      {
        code: 'CA04',
        label:
          'Le client réclame la consolidation de ses colis/commandes / Customer requests for orders/items consolid',
      },
      {
        code: 'CA05',
        label:
          'Comportement du client suspicieux /  Customer with doubtful behaviour',
      },
      {
        code: 'CA06',
        label: 'Doublon / Duplicate',
      },
      {
        code: 'CA07',
        label:
          "Client n'est pas à l’adresse indiquée / Customer not at indicated address",
      },
      {
        code: 'CA08',
        label: 'Livraison hors délai / Order out of shipping deadlines',
      },
      {
        code: 'CA09',
        label: 'Frais de livraison trop élevés / High shipping fees',
      },
      {
        code: 'CA10',
        label:
          'Le client souhaite bénéficier de l’offre promotionnelle / Customer wishes to benefit from the promotionnal offer',
      },
      {
        code: 'CA11',
        label:
          'Numéro du téléphone du client invalide / Invalid customer phone number',
      },
    ],
    requiredStatus: [
      StepStatus.TO_DELIVER,
      StepStatus.PICKED_UP,
      StepStatus.INFO_CLIENT,
    ],
  },
];
export const DRUOUT_WAREHOUSE_REFERENCE =
  process.env.DRUOUT_WAREHOUSE_REFERENCE;
export const SOUDANAISE_WAREHOUSE_REFERENCE =
  process.env.SOUDANAISE_WAREHOUSE_REFERENCE;
export const CALAFATAS_WAREHOUSE_REFERENCE =
  process.env.CALAFATAS_WAREHOUSE_REFERENCE;
export const KATIOS_WAREHOUSE_REFERENCE =
  process.env.KATIOS_WAREHOUSE_REFERENCE;
export const SMS_SENDER = 'Glotelho';
export const MTARGET_USERNAME = process.env.MTARGET_USERNAME;
export const MTARGET_PASSWORD = process.env.MTARGET_PASSWORD;
export const MTARGET_API_URL = process.env.MTARGET_API_URL;
export const SEND_SMS_TO_ALL_READY_ORDERS =
  process.env.SEND_SMS_TO_ALL_READY_ORDERS;
