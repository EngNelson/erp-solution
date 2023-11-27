import { AttributeType, MediaType } from '@glosuite/shared';
import { StepStatus } from 'src/domain/enums/flows';
import { DeliveryMode, ShippingClass } from 'src/domain/enums/orders';

export const CRAWL_DEFAULT_PAGE_SIZE_FOR_ARTICLES = 100;
export const CRAWL_DEFAULT_CURRENT_PAGE_FOR_ARTICLES = 1;
export const CRAWL_DEFAULT_PAGE_SIZE_FOR_EAV = 310;
export const CRAWL_DEFAULT_CURRENT_PAGE_FOR_EAV = 1;
export const CRAWL_DEFAULT_PAGE_SIZE_FOR_CATALOG = 500;
export const CRAWL_DEFAULT_CURRENT_PAGE_FOR_CATALOG = 1;
export const CRAWL_DEFAULT_PAGE_SIZE_FOR_ATTRIBUTE_SET = 100;
export const MAGENTO_USER_TOKEN = 'pzdhrimdtyoojkyk4aw23bwvv25vvaq7';
export const MAGENTO_BASE_API_URL = 'https://glotelho.cm/rest/fr/V1/';
export const GET_MAGENTO_STREETS_URL =
  'https://glotelho.cm/cmtowns/checkout/listquarters';
export const DEFAULT_CATEGORY_PATH = '1/2/';
export const GET_PRODUCTS = 'products';
export const PUT_PRODUCTS = 'products';
export const GET_CATEGORIES_FLAT = 'categories/list';
export const GET_CATEGORIES_TREE = 'categories';
export const GET_CATEGORIES = 'categories';
export const GET_ATTRIBUTES = 'products/attributes';
export const GET_ATTRIBUTE_SETS = 'eav/attribute-sets/list';
export const GET_ATTRIBUTE_SET_ATTRIBUTES = 'products/attribute-sets';
export const GET_ORDERS = 'orders';
export const ORDERS_SYNC_TIMEOUT = parseInt(process.env.ORDERS_SYNC_TIMEOUT);
export const CATALOG_SYNC_TIMEOUT = parseInt(process.env.CATALOG_SYNC_TIMEOUT);
export const SYNC_DEFAULT_MARGE = parseInt(process.env.SYNC_DEFAULT_MARGE);
export const SYNC_MAGENTO_ORDERS = process.env.SYNC_MAGENTO_ORDERS;
export const SYNC_MAGENTO_CATALOG = process.env.SYNC_MAGENTO_CATALOG;
export const MAGENTO_STOCK_SYNC = process.env.SYNC_MAGENTO_STOCK;
export const UPDATE_MAGENTO_ORDER_STATUS =
  process.env.UPDATE_MAGENTO_ORDER_STATUS;
export const IMPORT_ARTICLES_NUMBERS_OF_TRIALS = parseInt(
  process.env.IMPORT_ARTICLES_NUMBERS_OF_TRIALS,
);
export const REQUEST_TRANSFER_FOR_ORDERS =
  process.env.REQUEST_TRANSFER_FOR_ORDERS;
export const MAGENTO_CATEGORY_DESCRIPTION_ATTRIVUTE_CODE = 'meta_description';
export const MAGENTO_PRODUCT_CUSTOM_ATTRIBUTE_CODE = 'chipping_class';
export const MAGENTO_THUMBNAIL_ATTRIBUTE_CODE = 'thumbnail';
export const MAGENTO_THUMBNAIL_IMAGE_LABEL_ATTRIBUTE_CODE = 'image_label';
export const MAGENTO_PRODUCT_SHORT_DESCRIPTION_ATTRIBUTE_CODE =
  'short_description';
export const MAGENTO_PRODUCT_DESCRIPTION_ATTRIBUTE_CODE = 'description';
export const MAGENTO_PRODUCT_SPECIAL_PRICE_ATTRIBUTE_CODE = 'special_price';
export const MAGENTO_PRODUCT_PRICE_ATTRIBUTE_CODE = 'price';
export const MAGENTO_PRODUCT_SUPPLIER_ATTRIBUTE_CODE = 'fournisseur';
export const MAGENTO_PRODUCT_SPECIAL_PRICE_START_DATE_ATTRIBUTE_CODE =
  'special_from_date';
export const MAGENTO_PRODUCT_SPECIAL_PRICE_END_DATE_ATTRIBUTE_CODE =
  'special_to_date';
export const MAGENTO_PRODUCT_IMAGE_BASE_URL =
  'https://glotelho.cm/media/catalog/product';
export const DISCOVERY_ATTRIBUTE_CODE = 'decouvert';
export const WORDS_TO_EXCLUDE = [
  'blanc',
  'Blanc',
  'mois',
  'noir',
  'or',
  '"',
  'blue',
  'bleue',
  'bleu',
  'bleu ciel',
  'rose',
  'gris',
  'argent',
  'rouge',
  'jaune',
  '2 sim',
  '1 sim',
  '2 Sim',
  '1 Sim',
  'dual nanosim',
  'dual nano sim',
  'dualnano sim',
  'dual sim',
  'dual SIM',
  'mono sim',
  'nanosim',
  'carte SIM',
  '2sim',
  'fm radio',
  'fm Radio',
  'vert',
  'ugreen',
  'dual caméra',
  'dualsim',
  'nano sim',
  'beige',
  'marron',
  'violet aubergine',
  'vert sombre',
  "''",
  'ram',
  'rom',
  'windows',
  'pose gratuite',
  'clip',
  'tri nanosim',
  'ports',
  'garantie',
  'intel',
  'hd',
  'litres',
  'Core',
  'Tera',
  'i3',
  'i5',
  'i7',
  'Pouces',
  'poucess',
  'pentium',
  'Ssd',
];
export const COLORS_VALUES = [
  {
    value: 'blanc',
    match: '#FFFFFF',
  },
  {
    value: 'noir',
    match: '#000000',
  },
  {
    value: 'or',
    match: '#FFD700',
  },
  {
    value: 'blue',
    match: '#0000FF',
  },
  {
    value: 'rose',
    match: '#FFC0CB',
  },
  {
    value: 'gris',
    match: '#808080',
  },
  {
    value: 'argent',
    match: '#C0C0C0',
  },
  {
    value: 'jaune',
    match: '#FFFF00',
  },
  {
    value: 'vert',
    match: '#008000',
  },
  {
    value: 'rouge',
    match: '#FF0000',
  },
  {
    value: 'Marron',
    match: '#582900',
  },
  {
    value: 'Lavande',
    match: '#E6E6FA',
  },
  {
    value: 'Violet',
    match: '#EE82EE',
  },
  {
    value: 'Orange',
    match: '#ff8000',
  },
  {
    value: 'Marron chocolat',
    match: '#5A3A22',
  },
  {
    value: 'Beige',
    match: '#F5F5DC',
  },
  {
    value: 'Bleu clair',
    match: '#ADD8E6',
  },
  {
    value: 'Bleu nuit',
    match: '#191970',
  },
  {
    value: 'Bordeaux',
    match: '#800000',
  },
  {
    value: 'Bleu ciel',
    match: '#87CEEB',
  },
  {
    value: 'Bleu Neptune',
    match: '#0B3B5A',
  },
  {
    value: 'Gris sombre',
    match: '#696969',
  },
  {
    value: 'Marron clair',
    match: '#bf8013',
  },
  {
    value: 'Marron foncé',
    match: '#562b05',
  },
  {
    value: 'Noir Espace',
    match: '#000000',
  },
  {
    value: 'Bronzé dégradé',
    match: '#a87000',
  },
  {
    value: 'Gris fer',
    match: '#7F7F7F',
  },
  {
    value: 'Gris platine',
    match: '#99a0a2',
  },
  {
    value: 'Noir Marine',
    match: '#050426',
  },
  {
    value: 'Néon',
    match: '#260656',
  },
  {
    value: 'Menthe',
    match: '#3EB489',
  },
  {
    value: 'Noir de Jais',
    match: '#2a303d',
  },
  {
    value: 'Céramique',
    match: '#e89e5d',
  },
  {
    value: 'Vert militaire',
    match: '#4455112',
  },
  {
    value: 'vert citron',
    match: '#257d4c',
  },
  {
    value: 'Vert Pâle',
    match: '#82BF44',
  },
  {
    value: 'Gris météorite',
    match: '#cecec6',
  },
  {
    value: 'Starlight',
    match: '#F8F9EC',
  },
  {
    value: 'Vert corail',
    match: '#202550',
  },
  {
    value: 'Vert émeraude',
    match: '#257d4c',
  },
  {
    value: 'Vert olive',
    match: '#708d23',
  },
  {
    value: 'Rose fuchsia',
    match: '#C74375',
  },
  {
    value: 'Deep Sea',
    match: '#263373',
  },
  {
    value: 'Orange clair',
    match: '#FFA500',
  },
  {
    value: 'Nude',
    match: '#e3bc9a',
  },
  {
    value: 'Brume du matin',
    match: '#D5DADF',
  },
  {
    value: 'Graphite',
    match: '#383428',
  },
  {
    value: 'Olive',
    match: '#808000',
  },
  {
    value: 'Turquoise',
    match: '#30D5C8',
  },
  {
    value: 'Pêche',
    match: '#ecbd90',
  },
  {
    value: 'Kinda Coral',
    match: '#FF7F50',
  },
  {
    value: 'Sorta Seafoam',
    match: '#A3C1AD',
  },
  {
    value: 'Stormy Black',
    match: '#1c2329',
  },
  {
    value: 'Sorta Sunny',
    match: '#f2f27a',
  },
  {
    value: 'Cloudy White',
    match: '#F2F1E6',
  },
  {
    value: 'Mirage Blue',
    match: '#5c6d7c',
  },
  {
    value: 'Cyan',
    match: '#00FFFF',
  },
  {
    value: 'Mauve',
    match: '#E0B0FF',
  },
  {
    value: 'Vert Sauge',
    match: '#689d71',
  },
  {
    value: 'Blanc crème',
    match: '#F2E9CF',
  },
  {
    value: 'Vert eau',
    match: '#54bebb',
  },
  {
    value: 'Lime',
    match: '#BFFF00',
  },
];
export const ATTRIBUTES_SYMBOLS = [
  {
    value: '"',
    match: 'pouces',
  },
  {
    value: 'pouce',
    match: 'pouces',
  },
  {
    value: 'inch',
    match: 'pouces',
  },
];
export const ATTRIBUTES_SEARCH = [
  {
    value: 'mois',
    match: 'garantie',
  },
];
export const PARTS_TO_REPLACE = [
  {
    sources: [
      '6é génération',
      '6th génération',
      '6th generation',
      '6e génération -  6e génération',
    ],
    replaceBy: '6e génération',
  },
  {
    sources: ['G - tab'],
    replaceBy: 'G-tab',
  },
  {
    sources: ["d'urgence"],
    replaceBy: "D'urgence",
  },
  {
    sources: ['Ordinateur portable'],
    replaceBy: 'Laptop',
  },
  {
    sources: ['KX - '],
    replaceBy: 'KX-',
  },
  {
    sources: ['2200 - 44600 - 019'],
    replaceBy: '2200-44600-019',
  },
  {
    sources: [' -  ', '  -  '],
    replaceBy: ' - ',
  },
  {
    sources: ['(S)'],
    replaceBy: '(W)(S)',
  },
  {
    sources: ['ESS - RP1R - XP'],
    replaceBy: 'ESS-RP1R-XP',
  },
  {
    sources: ['LC - 32LB480U'],
    replaceBy: 'LC-32LB480U',
  },
  {
    sources: ['INSPIRON - 113000'],
    replaceBy: 'INSPIRON-113000',
  },
  {
    sources: ['2 en - 1'],
    replaceBy: '2 en 1',
  },
  {
    sources: ['Liane médicinale'],
    replaceBy: '- Liane médicinale',
  },
  {
    sources: ["diabète,l'hypertension"],
    replaceBy: "diabète, l'hypertension",
  },
  {
    sources: ['dartre,bouton'],
    replaceBy: 'dartre, bouton',
  },
  {
    sources: ['ZY - 3S'],
    replaceBy: 'ZY-3S',
  },
  {
    sources: ['NT - 25SP'],
    replaceBy: 'NT-25SP',
  },
  {
    sources: ['( Dankongo )'],
    replaceBy: '(Dankongo)',
  },
  {
    sources: ['BL - 500'],
    replaceBy: 'BL-500',
  },
  {
    sources: ['SMX - 111'],
    replaceBy: 'SMX-111',
  },
  {
    sources: ['FJ - 888'],
    replaceBy: 'FJ-888',
  },
  {
    sources: ['GC - 1910'],
    replaceBy: 'GC-1910',
  },
  {
    sources: ['GL 2910'],
    replaceBy: 'GL-2910',
  },
  {
    sources: ['GSI - 7768'],
    replaceBy: 'GSI-7768',
  },
  {
    sources: ['SF - 46'],
    replaceBy: 'SF-46-SANFORD',
  },
  {
    sources: ['R - 20'],
    replaceBy: 'R-20',
  },
  {
    sources: ['MMO 17MO'],
    replaceBy: 'MMO-17MO',
  },
  {
    sources: ['Micro - onde'],
    replaceBy: 'Micro-onde',
  },
  {
    sources: ['MST - IST'],
    replaceBy: 'MST-IST',
  },
  {
    sources: ['Longué Longué'],
    replaceBy: 'Longué-Longué',
  },
  {
    sources: ['A4001PLUS'],
    replaceBy: 'A4001 PLUS',
  },
  {
    sources: ['LED/LCD/TFT/'],
    replaceBy: 'LED/LCD/TFT',
  },
  {
    sources: ['951Ui - 2HnD', '951Ui 2HnD'],
    replaceBy: '951Ui-2HnD',
  },
  {
    sources: ['RouterBOARD'],
    replaceBy: 'Router BOARD',
  },
  {
    sources: ['    +'],
    replaceBy: ' +',
  },
  {
    sources: [' -   - '],
    replaceBy: ' - ',
  },
  {
    sources: ['( Uniquement sur cotation)'],
    replaceBy: '(Uniquement sur cotation)',
  },
  {
    sources: ['DS - K1F820 - F'],
    replaceBy: 'DS-K1F820-F',
  },
  {
    sources: ['DS - K1F100 - D8E'],
    replaceBy: 'DS-K1F100-D8E',
  },
  {
    sources: ['DS PWA32 - NG'],
    replaceBy: 'DS-PWA32-NG',
  },
  {
    sources: ['DS - K1T201MF'],
    replaceBy: 'DS-K1T201MF',
  },
  {
    sources: ['en1'],
    replaceBy: 'en 1',
  },
  {
    sources: ['LG XBOOM'],
    replaceBy: 'LG-XBOOM',
  },
  {
    sources: ['Apple iPod Touch lecteur -', 'Apple ipod touch'],
    replaceBy: 'Lecteur Apple ipod touch',
  },
  {
    sources: ['Ipod touch Apple 6e génération - Lecteur'],
    replaceBy: 'Lecteur Apple ipod touch - 6e génération',
  },
];
export const NAMES_TO_REPLACE_BEFORE_TREATMENT = [
  {
    name: "Robinet-Purificateur-d'eaux-ceramica-stefani-flex-filter-blanc",
    replaceBy: "Robinet Purificateur d'eaux ceramica stefani flex filter",
  },
  {
    name: "Robinet Purificateur D'eaux -Ceramica Stefani Flex -Filter-Bleu",
    replaceBy: "Robinet Purificateur d'eaux ceramica stefani flex filter",
  },
  {
    name: 'POLYCOM VVX201 - Téléphone filaire VoIP, 2 comptes SIP, PoE, 2 ports Ethernet;',
    replaceBy: 'POLYCOM VVX201 - Téléphone filaire VoIP',
  },
  {
    name: 'bleu',
    replaceBy: 'Bleu',
  },
  {
    name: 'noir',
    replaceBy: 'Noir',
  },
  {
    name: 'blanc',
    replaceBy: 'Blanc',
  },
  {
    name: 'jaune',
    replaceBy: 'Jaune',
  },
  {
    name: 'Gris/Argent/or',
    replaceBy: 'Gris Or Argent',
  },
  {
    name: 'gris',
    replaceBy: 'Gris',
  },
  {
    name: 'pouce',
    replaceBy: 'pouces',
  },
  {
    name: 'DE 7 POUCES',
    replaceBy: '7pouces',
  },
  {
    name: '2 .5CV',
    replaceBy: '2.5CV',
  },
  {
    name: 'poucess',
    replaceBy: 'pouces',
  },
];
export const BRAKETS_TO_SKIP = [
  '(porte savon)',
  '(crochet ventouse)',
  '(Faux St. Michel)',
  '(Balai)',
  '(Huile De Noix De Palmistes)',
  '(hémorroïdes)',
  '(CASSIMANGO)',
  '(goyave/papaye/fruit de la passion)',
  '(Bissap ou Foléré)',
  '(Graines)',
  '( Dankongo )',
  '(Longué-Longué)',
  '(Lum)',
  '(2019)',
  '( Uniquement sur cotation)',
];
export const WORDS_TO_SKIP = [
  'AF-P DX 18',
  'TP-Link',
  'ER-115',
  'MMO-17MO',
  'X-TiGi',
  'G-tab',
];
export const WORDS_TO_CHANGE_POSITION = [
  {
    word: 'Laptop',
    newPosition: 0,
  },
];
export const UNIT_SYMBOLS = ['GB', 'MO', 'G', 'MP', 'TB', 'MAH'];
export const SPECIAL_WORDS = [
  {
    word: 'jaune',
    values: ['fièvre', 'ecorce', 'cameroun'],
  },
  {
    word: 'blanc',
    values: ['ecorce'],
  },
  {
    word: 'or',
    values: ['ecorce'],
  },
  {
    word: 'rouge',
    values: ['nkoundjock'],
  },
];
export const CARACTARS_TO_AVOID = ['c', '/'];
export const LAST_WORDS_TO_REMOVE = [
  'et',
  '-',
  '–',
  'de',
  'plante',
  'botte',
  '4k',
  ',',
  'en',
  ':',
  '/',
];
export const SIGNS_TO_REMOVE = ['+', ' – ', '–', '-'];
export const SHIPPING_CLASS_MAPPING = [
  {
    input: '6539',
    output: ShippingClass.EXTRA_SMALL,
  },
  {
    input: '6540',
    output: ShippingClass.SMALL,
  },
  {
    input: '6541',
    output: ShippingClass.MEDIUM,
  },
  {
    input: '6542',
    output: ShippingClass.LARGE,
  },
  {
    input: '7860',
    output: ShippingClass.SUPER_LARGE,
  },
  {
    input: '6543',
    output: ShippingClass.EXTRA_LARGE,
  },
];
export const MEDIA_TYPE_MAPPING = [
  {
    input: 'image',
    output: MediaType.IMAGE,
  },
  {
    input: 'video',
    output: MediaType.VIDEO,
  },
];
export const ATTRIBUTE_CODES_TO_SKIP = [
  'chipping_class',
  'image',
  'url_key',
  'description',
  'special_price',
  'gift_message_available',
  'googleshopping_exclude',
  'fournisseur',
  'short_description',
  'small_image',
  'meta_title',
  'special_from_date',
  'special_to_date',
  'options_container',
  'thumbnail',
  'meta_keyword',
  'swatch_image',
  'meta_description',
  'msrp_display_actual_price_type',
  'has_options',
  'image_label',
  'small_image_label',
  'thumbnail_label',
  'tax_class_id',
  'ts_packaging_type',
  'category_ids',
  'hide_in_jm360',
  'hide_quote_buy_button',
  'amtoolkit_robots',
  'garantievalue',
  'is_featured',
  'merchant_center_category',
  'product_custom_tab',
  'contre_indication',
  'cost',
  'facebook_megapixels',
  'translated',
  'am_hide_price_mode',
  'am_hide_price_customer_gr',
  'required_options',
  'hover',
];
export const ATTRIBUTE_CODES_TO_GET = [
  'description',
  'short_description',
  'special_price',
  'special_from_date',
  'special_to_date',
];
export const LABELS_NOT_USED = ['nombre de battants', 'Faire un choix'];
export const CHARACTERS_TO_REMOVED = [
  '(W)',
  'en CV',
  '(G /MN)',
  '_',
  '(en mAh)',
  'en BTU',
  'en Tours/minute',
  'en Tours/Minute',
];
export const ATTRIBUTE_TYPE_MAPPING = [
  {
    magento: 'varchar',
    erp: AttributeType.STRING,
  },
  {
    magento: 'text',
    erp: AttributeType.STRING,
  },
  {
    magento: 'decimal',
    erp: AttributeType.NUMBER,
  },
  {
    magento: 'int',
    erp: AttributeType.NUMBER,
  },
];
export const DEFINED_UNITS = [
  { title: 'Centimètre', symbol: 'cm' },
  { title: 'Mega octet', symbol: 'Mo' },
  { title: 'Giga octet', symbol: 'Go' },
  { title: 'Tera octet', symbol: 'To' },
  { title: 'Gigahertz', symbol: 'Ghz' },
  { title: 'Mégahertz', symbol: 'MHz' },
  { title: 'Mega Pixel', symbol: 'MP' },
  { title: 'Tour/minute', symbol: 'tr/min' },
  { title: 'British Thermal Unit', symbol: 'BTU' },
  { title: 'Pourcentage', symbol: '%' },
  { title: 'Tours/Minute', symbol: 'Tr/min' },
  { title: 'Cheval-vapeur', symbol: 'CV' },
  { title: 'Gramme', symbol: 'g' },
  { title: 'Litre', symbol: 'L' },
  { title: 'Watt', symbol: 'W' },
  { title: 'Centilitre', symbol: 'Cl' },
  { title: 'Millilitre', symbol: 'ml' },
  { title: 'Pouce', symbol: '"' },
  { title: 'Kilogramme', symbol: 'Kg' },
  { title: 'Heure', symbol: 'h' },
  { title: 'Semaine', symbol: 'semaine' },
  { title: 'Mois', symbol: 'mois' },
  { title: 'Jour', symbol: 'jour' },
  { title: 'Milliampè-heure', symbol: 'mAh' },
  { title: 'Watt heure', symbol: 'Wh' },
];
export const GRAMME_SYMBOL = 'g';
export const FRONTEND_INPUTS = {
  textarea: 'textarea',
  text: 'text',
  boolean: 'boolean',
  select: 'select',
  multiselect: 'multiselect',
};
export const BACKEND_TYPE = {
  varchar: 'varchar',
  int: 'int',
};
export const PLUS_SIGN = '+';
export const LABEL_FAIRE_UN_CHOIX = 'Faire un choix';
export const SPECIAL_ATTRIBUTE_CODES = {
  batterie_en_mah: 'batterie_en_mah',
  processeur: 'processeur',
  bonnet_taille: 'bonnet_taille',
  reseau: 'reseau',
  color: 'color',
  colours: 'colours',
};
export const CHARACTERS_TO_SPLIT_ON_UNIT = ['(', ')'];
export const HARD_ATTRIBUTES = {
  typeDeBatterie: 'Type de batterie',
  frequenceProcesseur: 'Frequence du Processeur',
  modeleProcesseur: 'Modele du Processeur',
  gpu: 'GPU',
  soc: 'Soc',
  versionAndroid: 'Version Android',
};
export const HARD_ATTRIBUTES_DEFINED_VALUES = [
  {
    attribute: HARD_ATTRIBUTES.typeDeBatterie,
    values: ['Lithium‑ion', '3-cell'],
  },
  {
    attribute: HARD_ATTRIBUTES.modeleProcesseur,
    values: [
      'Cortex-A7',
      'Cortex A53',
      'MediaTek MT6737M',
      'Qualcomm Kryo',
      'HiSilicon Kirin 650',
      'Hisilicon Kirin 970',
      'Intel(R) Celeron(R) CPU N3060',
      'MediaTek Helio P23 (MT6763)',
      'Mediatek Helio X20',
      'MediaTek Helio X23 MT6797D',
      'MediaTek Helio X23 MT6797D',
      'Mediatek MT6735',
      'MediaTek MT6735P',
      'Mediatek MT6737T',
      'Mediatek MT6753',
      'Mediatek MT6762',
      'Exynos 9820',
      'Snapdragon 855',
      'Kirin 650',
      'Mongoose M3',
      'Kryo 260',
      'Kryo 385 Gold',
      'Qualcomm Adreno 308',
      'Qualcomm Adreno 505',
      'Qualcomm Snapdragon 410',
      'Qualcomm Snapdragon 435',
      'Qualcomm Snapdragon 625',
      'Qualcomm Snapdragon 636',
      'Qualcomm Snapdragon 810',
      'Qualcomm Snapdragon 835',
      'Qualcomm Snapdragon 845',
      'Samsung Exynos 7570',
      'Samsung Exynos 7885',
      'Snapdragon 625',
      'Snapdragon 660',
    ],
  },
  {
    attribute: HARD_ATTRIBUTES.gpu,
    values: ['Mali 400'],
  },
  {
    attribute: HARD_ATTRIBUTES.soc,
    values: ['ARM', 'Apple A12 Bionic', 'Apple A9'],
  },
];

/**
 * For tests purposes only
 */
export const TESTS_PURPOSE = [225, 226, 227, 228, 229, 230, 231, 232, 234, 235];
export const STR_TO_SEARCH = 'JETTOM J1';
export const UNITS_TO_SEARCH = '5MP/2MP';
export const EXCLUDED_WORD_TO_SEARCH = ' carte SIM ';
// TODO: Create a CRUD to manage thoses logistic descriptions or add it directly to the storagePoint CRUD
export const FLEET_SYNC_MAPPING = [
  'Nous livrons chez vous - Livraison à Domicille',
  'We deliver to your doorstep - Home delivery',
];
export const PUS_SOUDANAISE_DOUALA = [
  'Au dessus de la Pharmarcie du Centre - Retrait à Akwa, Showroom Soudanaisse',
  'Above the "Pharmarcie du Centre" - Collection in Akwa, Showroom Soudanaise',
];
export const PUS_DRUOUT_DOUALA = [
  'À côté de la Direction Générale MTN - Retrait à Akwa, Showroom Rue Druout',
  'Swifts Delivery Serivices, Mile 17 Buea - Glotelho Pickup Station Partner',
  'Next to the MTN Headquarters - Collection in Akwa, Showroom Rue Druout',
];
export const PUS_CALAFATAS_YAOUNDE = [
  'Après Boulangerie Calafatas - Point de Retrait Yaoundé',
  'After Calafatas Bakery - Withdrawal point Yaoundé',
];
export const PUS_KATIOS_YAOUNDE = [
  'Point de Retrait Yaoundé (Katios) - À côté de KATIOS',
  'À côté de KATIOS - Point de Retrait Yaoundé (Katios)',
];
export const SHIPPING_MAPPING = [
  {
    value: PUS_DRUOUT_DOUALA,
    keywords: ['druout'],
  },
  {
    value: PUS_SOUDANAISE_DOUALA,
    keywords: ['soudanaise'],
  },
  {
    value: PUS_CALAFATAS_YAOUNDE,
    keywords: ['yaounde', 'calafatas'],
  },
  {
    value: PUS_KATIOS_YAOUNDE,
    keywords: ['yaounde', 'katios'],
  },
];
export const WAREHOUSE_PRIMARY_CITY = 'Douala';
export const SHIPPING_DESCRIPTION_MAPPING = [
  {
    value: 'Retrait en magasin (Douala ou Yaoundé)',
    mode: DeliveryMode.IN_AGENCY,
    keywords: [],
    wh_refs: {
      pick_pack_dla: ['rue druout', 'direction générale mtn'],
      commande_confirmer_soundanaise: ['soudanaise', 'pharmarcie du centre'],
      reportee_yde_fleet: ['calafatas', 'yaoundé'],
      yaounde_fleet: ['calafatas', 'yaoundé'],
      planned_yde: ['calafatas', 'yaoundé'],
      shipped_yde: ['calafatas', 'yaoundé'],
      pick_pack_yde: ['calafatas', 'yaoundé'],
      en_cours_traitement_yaounde_flee: ['calafatas', 'yaoundé'],
    },
  },
  {
    value: 'Shipping',
    mode: DeliveryMode.AT_HOME,
    keywords: [],
    wh_refs: {
      pick_pack_dla: ['rue druout', 'direction générale mtn'],
      commande_confirmer_soundanaise: ['soudanaise', 'pharmarcie du centre'],
      reportee_yde_fleet: ['calafatas', 'yaoundé'],
      yaounde_fleet: ['calafatas', 'yaoundé'],
      planned_yde: ['calafatas', 'yaoundé'],
      shipped_yde: ['calafatas', 'yaoundé'],
      pick_pack_yde: ['calafatas', 'yaoundé'],
      en_cours_traitement_yaounde_flee: ['calafatas', 'yaoundé'],
    },
  },
  {
    value: 'Point de livraison',
    mode: DeliveryMode.IN_AGENCY,
    keywords: [],
    wh_refs: {
      pick_pack_dla: ['rue druout', 'direction générale mtn'],
      commande_confirmer_soundanaise: ['soudanaise', 'pharmarcie du centre'],
      reportee_yde_fleet: ['calafatas', 'yaoundé'],
      yaounde_fleet: ['calafatas', 'yaoundé'],
      planned_yde: ['calafatas', 'yaoundé'],
      shipped_yde: ['calafatas', 'yaoundé'],
      pick_pack_yde: ['calafatas', 'yaoundé'],
      en_cours_traitement_yaounde_flee: ['calafatas', 'yaoundé'],
    },
  },
  {
    value:
      'Au dessus de la Pharmarcie du Centre - Retrait à Akwa, Showroom Soudanaisse',
    mode: DeliveryMode.IN_AGENCY,
    keywords: ['soudanaise', 'pharmarcie du centre'],
  },
  {
    value:
      'Above the "Pharmarcie du Centre" - Collection in Akwa, Showroom Soudanaise',
    mode: DeliveryMode.IN_AGENCY,
    keywords: ['soudanaise', 'pharmarcie du centre'],
  },
  {
    value: 'Après Boulangerie Calafatas - Point de Retrait Yaoundé',
    mode: DeliveryMode.IN_AGENCY,
    keywords: ['calafatas', 'yaoundé'],
  },
  {
    value: 'After Calafatas Bakery - Withdrawal point Yaoundé',
    mode: DeliveryMode.IN_AGENCY,
    keywords: ['calafatas', 'yaoundé'],
  },
  {
    value:
      'À côté de la Direction Générale MTN - Retrait à Akwa, Showroom Rue Druout',
    mode: DeliveryMode.IN_AGENCY,
    keywords: ['rue druout', 'direction générale mtn'],
  },
  {
    value:
      'Swifts Delivery Serivices, Mile 17 Buea - Glotelho Pickup Station Partner',
    mode: DeliveryMode.IN_AGENCY,
    keywords: ['rue druout', 'direction générale mtn'],
  },
  {
    value: 'Nous livrons chez vous - Livraison à Domicille',
    mode: DeliveryMode.AT_HOME,
    keywords: [],
    wh_refs: {
      pick_pack_dla: ['rue druout', 'direction générale mtn'],
      commande_confirmer_soundanaise: ['soudanaise', 'pharmarcie du centre'],
      reportee_yde_fleet: ['calafatas', 'yaoundé'],
      yaounde_fleet: ['calafatas', 'yaoundé'],
      planned_yde: ['calafatas', 'yaoundé'],
      shipped_yde: ['calafatas', 'yaoundé'],
      pick_pack_yde: ['calafatas', 'yaoundé'],
      en_cours_traitement_yaounde_flee: ['calafatas', 'yaoundé'],
    },
  },
  {
    value: 'We deliver to your doorstep - Home delivery',
    mode: DeliveryMode.AT_HOME,
    keywords: [],
    wh_refs: {
      pick_pack_dla: ['rue druout', 'direction générale mtn'],
      commande_confirmer_soundanaise: ['soudanaise', 'pharmarcie du centre'],
      reportee_yde_fleet: ['calafatas', 'yaoundé'],
      yaounde_fleet: ['calafatas', 'yaoundé'],
      planned_yde: ['calafatas', 'yaoundé'],
      shipped_yde: ['calafatas', 'yaoundé'],
      pick_pack_yde: ['calafatas', 'yaoundé'],
      en_cours_traitement_yaounde_flee: ['calafatas', 'yaoundé'],
    },
  },
  {
    value:
      'Next to the MTN Headquarters - Collection in Akwa, Showroom Rue Druout',
    mode: DeliveryMode.IN_AGENCY,
    keywords: ['rue druout', 'direction générale mtn'],
  },
];
export const ORDER_STATUS_MAPPING = [
  {
    status: StepStatus.TO_TREAT,
    values: ['pending', 'to_be_imported', 'en_cours_traitement_yaounde_flee'],
  },
  {
    status: StepStatus.TO_BUY,
    values: [
      'appro_yaounde',
      'en_cours_d_achat',
      'approvisionnement',
      'appro_forward',
      'en_cours_d_achat_yaounde',
    ],
  },
  {
    status: StepStatus.TO_RECEIVED,
    values: ['delivery_forwarded_dla', 'shipped_yde', 'delivery_forwarde'],
  },
  {
    status: StepStatus.TO_PICK_PACK,
    values: ['processing', 'commande_confirmer_soundanaise'],
  },
  {
    status: StepStatus.READY,
    values: ['pick_pack_yde', 'pick_pack_dla'],
  },
  {
    status: StepStatus.TO_DELIVER,
    values: [
      'yaounde_fleet',
      'livraison_en_cours_dla_fleet_rue',
      'planning',
      'fleet_to_collect',
      'shipped_other_tow',
    ],
  },
  {
    status: StepStatus.PICKED_UP,
    values: ['planning', 'hub_telephonie', 'pus_soudannaise'],
  },
  {
    status: StepStatus.COMPLETE,
    values: ['complete'],
  },
  {
    status: StepStatus.INFO_CLIENT,
    values: [
      'awaiting_customer_confirmation_d',
      'awaiting_customer_update_dla',
      'to_modify',
      'substitut_telephonie',
      'awaiting_customer_confirmation_y',
    ],
  },
  {
    status: StepStatus.CANCELED,
    values: ['canceled', 'to_cancel'],
  },
  {
    status: StepStatus.REFUNDED,
    values: [],
  },
  {
    status: StepStatus.REPORTED,
    values: [
      'reporte_kalafatas',
      'reportee_yde_fleet',
      'reporte_kalafatas',
      'reporte_pus_soudanaise',
    ],
  },
  {
    status: StepStatus.ASSIGNED,
    values: ['planned_yde', 'planned_pus', 'order_planned'],
  },
  {
    status: StepStatus.DELIVERED,
    values: ['livre_yaounde'],
  },
];
export const YAOUNDE_CITY = 'Yaoundé';
export const DOUALA_CITY = 'Douala';
