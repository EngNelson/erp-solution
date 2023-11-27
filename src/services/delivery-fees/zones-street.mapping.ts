const zone_dla_a = [
  'Akwa',
  'Bali',
  'Bonanjo',
  'Deido',
  'Bessengue',
  'Bonapriso',
  'Ngodi',
  'Bonakoumouang',
  'Marche congo',
  'Bonaberi',
  'Nkongmondo',
  'Koumassi',
  'Joss',
  'Hydrocarbures',
  'Ngangue',
  'Ancien 3e',
  'Kayo Elie',
  'Camp Bertaud',
  '2 eglises',
  'Kassa Lafam',
];

const zone_dla_b = [
  'New bell',
  'Nkololoun',
  'Mboppi',
  'Youpwe',
  'Ndjong mebi',
  'dernier poteau',
  'Nylon',
  'Brazaville',
  'Madagascar',
  'Barcelone',
  'Ndogbati',
  'Ancien abattoir',
  'cite de la paix',
  'Bilongue',
];

const zone_dla_c = [
  'Cite sic',
  'Bepanda',
  'Ndokoti',
  'Ndogbong',
  'Ndogsimbi',
  'PK8',
  'Logbaba',
  'Akwa Nord',
  'Sable',
  'Essengue',
  'Zone portuaire',
  'Base Navale',
  'Bois des singes',
  'New bell Aviation',
  'forrestiere',
  'Transformateur',
  'Ndogbassi',
  'Espoir',
  'dakar',
  'Saint thomas',
  'songkot',
  'Bonassama',
  'Makepe Missoke',
];

const zone_dla_d = [
  'Bonamoussadi',
  'Makepe',
  'Logpom',
  'Kotto',
  'Logbessou',
  'Mbangue',
  'PK9',
  'PK10',
  'PK11',
  'PK12',
  'PK13',
  'PK14',
  'Nyalla',
  'Village',
  'zone industrielle bassa',
  'Malangue',
  'Beedi',
];

const zone_dla_e = [
  'Grand baobab',
  'Centre Equestre',
  '4 etage',
  'Nouvelle route',
  'Mabanda',
];

const zone_dla_f = [
  'Yassa',
  'Japoma',
  'Lendi',
  'PK15',
  'PK16',
  'PK17',
  'Bonandale',
  'Bonamatoumbe',
  'Abattoir',
  'PK12 Mandjap',
  'PK3',
  'Bonamoutong',
  'Village saint nicolas',
  'Village chefferie',
  'Ngodi bakoko lycee',
];

const zone_dla_g = [
  'PK18',
  'PK19',
  'PK20',
  'PK21',
  'PK22',
  'PK23',
  'PK24',
  'PK25',
  'PK26',
  'PK27',
  'ndobo',
  'bodjongo',
  'mbanga pongo',
  'Jampouma Stade',
  'Dimbamba',
  'Apicam',
];

const zone_yde_a = [
  'Marche central',
  'Warda',
  'Poste centrale',
  'Etoa meki',
  'Djongolo Centre administratif',
  'Nkol eton',
  'Nlongkak',
];

const zone_yde_b = [
  'Tsinga',
  'Elig Essono',
  'Mvog Mbi',
  'Montee Zoe',
  'Coron',
  'Marche Mfoundi',
  'Rue CEPER',
  'Elig Edzoa',
  'Mballa 2',
  'Mokolo',
  'Centre administratif',
  'Briquetterie',
  'Ecole de police',
  'Olezoa',
  'Dragage',
];

const zone_yde_c = [
  'Bastos',
  'Anguissa',
  'Tongolo',
  'Cradat',
  'Bonass',
  'Dragage',
  'cite verte',
  'Madagascar',
  'Quartier Fouda',
  'Essos',
  'Titi Garage',
  'Mvolyie',
  'Obili',
  'Nsimeyong',
  'Etoudi',
  'Quatier Golf',
  'Melen',
  'Nsam',
  'Efoulan',
  'Mvan',
  'vogt',
];

const zone_yde_d = [
  'Mont Febe',
  'Emana',
  'Santa Barbara',
  'Manguier',
  'Omnisport',
  'Nfandena',
  'Ngousso',
  'Essomba',
  'Kondengui',
  'Ekounou',
  'Nkomo',
  'Mvog beti',
  'biyem assi',
  'Obobogo',
  'Nkolmesseng',
  'Messassi',
  'Okolo',
  'Olembe',
];

const zone_yde_e = [
  'Odza',
  'Messamendongo',
  'Happy',
  'Ekoumdoum',
  'Ekie',
  'Awae',
  'Ewankan',
  'Sous manguer',
  'Biteng',
  'Mimboman',
  'Nkozoa',
  'Nuom I',
  'Ahala',
  'Damas',
];

const zone_yde_f = [
  'Nkoametou',
  'Nkolbisson',
  'Etokos',
  'Simbock',
  'Nnom ayos',
  'Manassa',
  'Monti',
  'Nkoabang',
  'Nkolfoulou',
  'Nyom II',
  'Eleveur',
];

const zone_yde_g = ['Mbankomo', 'Soa', 'Nsimalen'];

export const zonesStreetMapping = [
  {
    city: 'Douala',
    zones: [
      { name: 'A', value: zone_dla_a },
      { name: 'B', value: zone_dla_b },
      { name: 'C', value: zone_dla_c },
      { name: 'D', value: zone_dla_d },
      { name: 'E', value: zone_dla_e },
      { name: 'F', value: zone_dla_f },
      { name: 'G', value: zone_dla_g },
    ],
  },
  {
    city: 'Yaoundé',
    zones: [
      { name: 'A', value: zone_yde_a },
      { name: 'B', value: zone_yde_b },
      { name: 'C', value: zone_yde_c },
      { name: 'D', value: zone_yde_d },
      { name: 'E', value: zone_yde_e },
      { name: 'F', value: zone_yde_f },
      { name: 'G', value: zone_yde_g },
    ],
  },
];

export const citiesServed = [
  'Mfou',
  'Mbalmayo',
  'Akono',
  'Nanga Eboko',
  'Bafia',
  'Oballa',
  'Ngoumou',
  'Monatele',
  'Ntui',
  'Akonolinga',
  'Eseka',
  'Nkongsamba',
  'Yabassi',
  'Edéa',
  'Dibombari',
  'Loum',
  'Djombe',
  'Penja',
  'Manjo',
  'Mbanga',
  'Melong',
  'Bafoussam',
  'Bafang',
  'Foumban',
  'Baham',
  'Dschang',
  'Bayangam',
  'Melong',
  'Bangante',
  'Mbouda',
  'Kumba',
  'Limbe',
  'Buea',
  'Manfe',
  'Mountengene',
  'Banguem',
  'Mundemba',
  'Tiko',
  'Fontem',
  'Bamenda',
  'Kumbo',
  'Wum',
  'Ndop',
  'Mbengwi',
  'Nkambe',
  'Nfundong',
  'Kribi',
  'Ebolowa',
  'Ambam',
  'Sangmelima',
  'Bertoua',
  'Dimako',
  'Belabo',
  'Abong Mbang',
  'Doume',
  'Batouri',
  'Yokadouma',
  'Garou Boulai',
  'Meiganga',
  'Ngaoundéré',
  'Garoua',
  'Garoua Boulai',
  'Tcholire',
  'Poli',
  'Guider',
  'Maroua',
  'Yagoua',
  'Mokolo',
  'Kaélé',
  'Kousseri',
  'Mora',
  'Waza',
  'Mindif',
];
