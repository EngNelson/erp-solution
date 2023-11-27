import { ShippingClass } from 'src/domain/enums/orders';

export const DoorDeliveryRules = {
  door_delivery: [
    {
      city: 'Douala',
      zones: [
        {
          name: 'A',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 500 },
            { shipping_class: ShippingClass.SMALL, value: 500 },
            { shipping_class: ShippingClass.MEDIUM, value: 1000 },
            { shipping_class: ShippingClass.LARGE, value: 2000 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 2500 },
          ],
        },
        {
          name: 'B',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 500 },
            { shipping_class: ShippingClass.SMALL, value: 600 },
            { shipping_class: ShippingClass.MEDIUM, value: 1000 },
            { shipping_class: ShippingClass.LARGE, value: 2500 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 3000 },
          ],
        },
        {
          name: 'C',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 500 },
            { shipping_class: ShippingClass.SMALL, value: 600 },
            { shipping_class: ShippingClass.MEDIUM, value: 1000 },
            { shipping_class: ShippingClass.LARGE, value: 2500 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 3000 },
          ],
        },
        {
          name: 'D',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 1000 },
            { shipping_class: ShippingClass.SMALL, value: 1000 },
            { shipping_class: ShippingClass.MEDIUM, value: 1500 },
            { shipping_class: ShippingClass.LARGE, value: 3000 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 3500 },
          ],
        },
        {
          name: 'E',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 1000 },
            { shipping_class: ShippingClass.SMALL, value: 1000 },
            { shipping_class: ShippingClass.MEDIUM, value: 1500 },
            { shipping_class: ShippingClass.LARGE, value: 3000 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 3500 },
          ],
        },
        {
          name: 'F',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 1000 },
            { shipping_class: ShippingClass.SMALL, value: 1500 },
            { shipping_class: ShippingClass.MEDIUM, value: 2000 },
            { shipping_class: ShippingClass.LARGE, value: 3000 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 4000 },
          ],
        },
        {
          name: 'G',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 3000 },
            { shipping_class: ShippingClass.SMALL, value: 3000 },
            { shipping_class: ShippingClass.MEDIUM, value: 3000 },
            { shipping_class: ShippingClass.LARGE, value: 4500 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 5000 },
          ],
        },
      ],
    },
    {
      city: 'Yaounde',
      zones: [
        {
          name: 'A',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 200 },
            { shipping_class: ShippingClass.SMALL, value: 200 },
            { shipping_class: ShippingClass.MEDIUM, value: 300 },
            { shipping_class: ShippingClass.LARGE, value: 1000 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 1500 },
          ],
        },
        {
          name: 'B',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 400 },
            { shipping_class: ShippingClass.SMALL, value: 400 },
            { shipping_class: ShippingClass.MEDIUM, value: 500 },
            { shipping_class: ShippingClass.LARGE, value: 1500 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 2000 },
          ],
        },
        {
          name: 'C',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 500 },
            { shipping_class: ShippingClass.SMALL, value: 500 },
            { shipping_class: ShippingClass.MEDIUM, value: 1000 },
            { shipping_class: ShippingClass.LARGE, value: 2000 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 2500 },
          ],
        },
        {
          name: 'D',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 500 },
            { shipping_class: ShippingClass.SMALL, value: 600 },
            { shipping_class: ShippingClass.MEDIUM, value: 1000 },
            { shipping_class: ShippingClass.LARGE, value: 2500 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 3000 },
          ],
        },
        {
          name: 'E',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 1000 },
            { shipping_class: ShippingClass.SMALL, value: 1000 },
            { shipping_class: ShippingClass.MEDIUM, value: 1200 },
            { shipping_class: ShippingClass.LARGE, value: 3000 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 3500 },
          ],
        },
        {
          name: 'F',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 1000 },
            { shipping_class: ShippingClass.SMALL, value: 1000 },
            { shipping_class: ShippingClass.MEDIUM, value: 1500 },
            { shipping_class: ShippingClass.LARGE, value: 3000 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 4000 },
          ],
        },
        {
          name: 'G',
          shippings: [
            { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
            { shipping_class: ShippingClass.SMALL, value: 2000 },
            { shipping_class: ShippingClass.MEDIUM, value: 2000 },
            { shipping_class: ShippingClass.LARGE, value: 4000 },
            { shipping_class: ShippingClass.SUPER_LARGE, value: 5000 },
          ],
        },
      ],
    },
    {
      city: 'Autres',
      types: [
        {
          value: 'desservies',
          regions: [
            {
              name: 'Centre',
              cities: [
                {
                  name: 'Mfou',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
                    { shipping_class: ShippingClass.SMALL, value: 2000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 4000 },
                    { shipping_class: ShippingClass.LARGE, value: 6000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 8500 },
                  ],
                },
                {
                  name: 'Mbalmayo',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
                    { shipping_class: ShippingClass.SMALL, value: 2000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 4000 },
                    { shipping_class: ShippingClass.LARGE, value: 6000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 8500 },
                  ],
                },
                {
                  name: 'Akono',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
                    { shipping_class: ShippingClass.SMALL, value: 2000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 4000 },
                    { shipping_class: ShippingClass.LARGE, value: 6000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 8500 },
                  ],
                },
                {
                  name: 'Nanga Eboko',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
                    { shipping_class: ShippingClass.SMALL, value: 2000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 4000 },
                    { shipping_class: ShippingClass.LARGE, value: 6000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 8500 },
                  ],
                },
                {
                  name: 'Bafia',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
                    { shipping_class: ShippingClass.SMALL, value: 2000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 4000 },
                    { shipping_class: ShippingClass.LARGE, value: 6000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 8500 },
                  ],
                },
                {
                  name: 'Obala',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
                    { shipping_class: ShippingClass.SMALL, value: 2000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 4000 },
                    { shipping_class: ShippingClass.LARGE, value: 6000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 8500 },
                  ],
                },
                {
                  name: 'Ngoumou',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
                    { shipping_class: ShippingClass.SMALL, value: 2000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 4000 },
                    { shipping_class: ShippingClass.LARGE, value: 6000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 8500 },
                  ],
                },
                {
                  name: 'Monatele',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
                    { shipping_class: ShippingClass.SMALL, value: 2000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 4000 },
                    { shipping_class: ShippingClass.LARGE, value: 6000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 8500 },
                  ],
                },
                {
                  name: 'Ntui',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
                    { shipping_class: ShippingClass.SMALL, value: 2000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 4000 },
                    { shipping_class: ShippingClass.LARGE, value: 6000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 8500 },
                  ],
                },
                {
                  name: 'Akonolinga',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
                    { shipping_class: ShippingClass.SMALL, value: 2000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 4000 },
                    { shipping_class: ShippingClass.LARGE, value: 6000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 8500 },
                  ],
                },
                {
                  name: 'Eseka',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
                    { shipping_class: ShippingClass.SMALL, value: 2000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 4000 },
                    { shipping_class: ShippingClass.LARGE, value: 6000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 8500 },
                  ],
                },
              ],
            },
            {
              name: 'Littoral',
              cities: [
                {
                  name: 'Nkongsamba',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Yabassi',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Edea',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Dibombari',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Loum',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Djombe',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Penja',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Manjo',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Mbanga',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Melong',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
              ],
            },
            {
              name: 'Ouest',
              cities: [
                {
                  name: 'Bafoussam',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Bafang',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Foumban',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Baham',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Dschang',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Bayangam',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Melong',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Bangante',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Mbouda',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
              ],
            },
            {
              name: 'Sud Ouest',
              cities: [
                {
                  name: 'Kumba',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Limbe',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Buea',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Manfe',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Mountengene',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Banguem',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Mundemba',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Tiko',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Fontem',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
              ],
            },
            {
              name: 'Nord-Ouest',
              cities: [
                {
                  name: 'Bamenda',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Kumbo',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Wum',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Ndop',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Mbengwi',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Nkambe',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Nfundong',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2500 },
                    { shipping_class: ShippingClass.SMALL, value: 2500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
              ],
            },
            {
              name: 'Sud',
              cities: [
                {
                  name: 'Kribi',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 8000 },
                    { shipping_class: ShippingClass.LARGE, value: 11000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 19500 },
                  ],
                },
                {
                  name: 'Ebolowa',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 8000 },
                    { shipping_class: ShippingClass.LARGE, value: 11000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 19500 },
                  ],
                },
                {
                  name: 'Ambam',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 8000 },
                    { shipping_class: ShippingClass.LARGE, value: 11000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 19500 },
                  ],
                },
                {
                  name: 'Sangmelima',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 8000 },
                    { shipping_class: ShippingClass.LARGE, value: 11000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 19500 },
                  ],
                },
              ],
            },
            {
              name: 'Est',
              cities: [
                {
                  name: 'Bertoua',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 8000 },
                    { shipping_class: ShippingClass.LARGE, value: 11000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Dimako',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 8000 },
                    { shipping_class: ShippingClass.LARGE, value: 11000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Belabo',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 8000 },
                    { shipping_class: ShippingClass.LARGE, value: 11000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Abong Mbang',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 8000 },
                    { shipping_class: ShippingClass.LARGE, value: 11000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Doume',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 8000 },
                    { shipping_class: ShippingClass.LARGE, value: 11000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Batouri',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 8000 },
                    { shipping_class: ShippingClass.LARGE, value: 11000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Yokadouma',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 8000 },
                    { shipping_class: ShippingClass.LARGE, value: 11000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
                {
                  name: 'Garoua Boulai',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 8000 },
                    { shipping_class: ShippingClass.LARGE, value: 11000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 16500 },
                  ],
                },
              ],
            },
            {
              name: 'Adamaoua',
              cities: [
                {
                  name: 'Meiganga',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6500 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 19500 },
                  ],
                },
                {
                  name: 'Ngaoundere',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3500 },
                    { shipping_class: ShippingClass.SMALL, value: 3500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6500 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 19500 },
                  ],
                },
              ],
            },
            {
              name: 'Nord',
              cities: [
                {
                  name: 'Garoua',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 4500 },
                    { shipping_class: ShippingClass.SMALL, value: 4500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 9000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 21500 },
                  ],
                },
                {
                  name: 'Tcholire',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 4500 },
                    { shipping_class: ShippingClass.SMALL, value: 4500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 9000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 21500 },
                  ],
                },
                {
                  name: 'Poli',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 4500 },
                    { shipping_class: ShippingClass.SMALL, value: 4500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 9000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 21500 },
                  ],
                },
                {
                  name: 'Guider',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 4500 },
                    { shipping_class: ShippingClass.SMALL, value: 4500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 9000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 21500 },
                  ],
                },
              ],
            },
            {
              name: 'Extreme Nord',
              cities: [
                {
                  name: 'Maroua',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 5500 },
                    { shipping_class: ShippingClass.SMALL, value: 5500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 7000 },
                    { shipping_class: ShippingClass.LARGE, value: 16000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 26500 },
                  ],
                },
                {
                  name: 'Yagoua',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 5500 },
                    { shipping_class: ShippingClass.SMALL, value: 5500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 7000 },
                    { shipping_class: ShippingClass.LARGE, value: 16000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 26500 },
                  ],
                },
                {
                  name: 'Mokolo',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 5500 },
                    { shipping_class: ShippingClass.SMALL, value: 5500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 7000 },
                    { shipping_class: ShippingClass.LARGE, value: 16000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 26500 },
                  ],
                },
                {
                  name: 'Kaele',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 5500 },
                    { shipping_class: ShippingClass.SMALL, value: 5500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 7000 },
                    { shipping_class: ShippingClass.LARGE, value: 16000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 26500 },
                  ],
                },
                {
                  name: 'Kousserie',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 5500 },
                    { shipping_class: ShippingClass.SMALL, value: 5500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 7000 },
                    { shipping_class: ShippingClass.LARGE, value: 16000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 26500 },
                  ],
                },
                {
                  name: 'Mora',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 5500 },
                    { shipping_class: ShippingClass.SMALL, value: 5500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 7000 },
                    { shipping_class: ShippingClass.LARGE, value: 16000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 26500 },
                  ],
                },
                {
                  name: 'Waza',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 5500 },
                    { shipping_class: ShippingClass.SMALL, value: 5500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 7000 },
                    { shipping_class: ShippingClass.LARGE, value: 16000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 26500 },
                  ],
                },
                {
                  name: 'Mindif',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 5500 },
                    { shipping_class: ShippingClass.SMALL, value: 5500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 7000 },
                    { shipping_class: ShippingClass.LARGE, value: 16000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 26500 },
                  ],
                },
              ],
            },
          ],
        },
        {
          value: 'non desservies',
          regions: [
            {
              name: 'Ouest',
              cities: [
                {
                  name: '',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 2000 },
                    { shipping_class: ShippingClass.SMALL, value: 2000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 5000 },
                    { shipping_class: ShippingClass.LARGE, value: 7000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 15000 },
                  ],
                },
              ],
            },
            {
              name: 'Centre',
              cities: [
                {
                  name: '',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 1500 },
                    { shipping_class: ShippingClass.SMALL, value: 1500 },
                    { shipping_class: ShippingClass.MEDIUM, value: 3000 },
                    { shipping_class: ShippingClass.LARGE, value: 5000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 7000 },
                  ],
                },
              ],
            },
            {
              name: 'Est',
              cities: [
                {
                  name: '',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3000 },
                    { shipping_class: ShippingClass.SMALL, value: 3000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 7000 },
                    { shipping_class: ShippingClass.LARGE, value: 10000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 15000 },
                  ],
                },
              ],
            },
            {
              name: 'Sud',
              cities: [
                {
                  name: '',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3000 },
                    { shipping_class: ShippingClass.SMALL, value: 3000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 7000 },
                    { shipping_class: ShippingClass.LARGE, value: 10000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 18000 },
                  ],
                },
              ],
            },
            {
              name: 'Nord',
              cities: [
                {
                  name: '',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 4000 },
                    { shipping_class: ShippingClass.SMALL, value: 4000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 5000 },
                    { shipping_class: ShippingClass.LARGE, value: 8000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 20000 },
                  ],
                },
              ],
            },
            {
              name: 'Adamaoua',
              cities: [
                {
                  name: '',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 3000 },
                    { shipping_class: ShippingClass.SMALL, value: 3000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 5500 },
                    { shipping_class: ShippingClass.LARGE, value: 7000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 18000 },
                  ],
                },
              ],
            },
            {
              name: 'Extreme Nord',
              cities: [
                {
                  name: '',
                  shippings: [
                    { shipping_class: ShippingClass.EXTRA_SMALL, value: 5000 },
                    { shipping_class: ShippingClass.SMALL, value: 5000 },
                    { shipping_class: ShippingClass.MEDIUM, value: 6000 },
                    { shipping_class: ShippingClass.LARGE, value: 15000 },
                    { shipping_class: ShippingClass.SUPER_LARGE, value: 25000 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
