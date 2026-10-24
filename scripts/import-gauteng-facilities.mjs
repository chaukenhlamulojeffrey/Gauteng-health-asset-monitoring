import nextEnv from '@next/env';
import mysql from 'mysql2/promise';

nextEnv.loadEnvConfig(process.cwd());

const districts = [
  { name: 'Johannesburg', relation: 594508 },
  { name: 'Tshwane', relation: 594484 },
  { name: 'Ekurhuleni', relation: 594475 },
  { name: 'Sedibeng', relation: 594496 },
  { name: 'West Rand', relation: 594516 },
];

const administrativeRegions = {
  Tshwane: [
    'Region 1 (Akasia, Rosslyn, Pretoria North, Ga-Rankuwa, Mabopane, Winterveldt, Soshanguve)',
    'Region 2 (Hammanskraal, Kudube, Stinkwater, Suurman, Babelegi, Montana, Annlin, Sinoville, Doornpoort, Wonderboom)',
    'Region 3 (Pretoria CBD, Brooklyn, Hatfield, Pretoria West, Silverton, East Lynne, Sunnyside, Arcadia)',
    'Region 4 (Centurion, Irene, Olievenhoutbosch, Laudium, Erasmia, Atteridgeville, Eersterust, Sunderland Ridge)',
    'Region 5 (Rayton, Cullinan, Refilwe, Sable Hills, Roodeplaat, Onverwacht)',
    'Region 6 (Mamelodi, Nellmapius, Jan Niemand Park, Mahube Valley, Moreleta Park, Silver Lakes, Mooikloof, Garsfontein, Woodlands)',
    'Region 7 (Bronkhorstspruit, Ekangala, Zithobeni, Rethabiseng, Zithobeni Heights, Vaalbank, Vlakfontein)',
  ],
  Johannesburg: [
    'Johannesburg A Health Sub-District',
    'Johannesburg B Health Sub-District',
    'Johannesburg C Health Sub-District',
    'Johannesburg D Health Sub-District',
    'Johannesburg E Health Sub-District',
    'Johannesburg F Health Sub-District',
    'Johannesburg G Health Sub-District',
  ],
  Ekurhuleni: [
    'Ekurhuleni East 1 Health Sub-District',
    'Ekurhuleni East 2 Health Sub-District',
    'Ekurhuleni North 1 Health Sub-District',
    'Ekurhuleni North 2 Health Sub-District',
    'Ekurhuleni South 1 Health Sub-District',
    'Ekurhuleni South 2 Health Sub-District',
  ],
  'West Rand': [
    'Merafong City Local Municipality',
    'Mogale City Local Municipality',
    'Randfontein Local Municipality',
    'Westonaria Local Municipality',
  ],
};

const localityRegions = {
  Tshwane: [
    ['Akasia', 'Rosslyn', 'Pretoria North', 'Ga-Rankuwa', 'Mabopane', 'Winterveldt', 'Soshanguve', 'Karenpark', 'Wonderpark', 'Hartebeesthoek', 'Boikhutsong Clinic', 'Dr George Mukhari Hospital', 'Dr George Mukhari Nursing College', 'Medunsa Oral Health', 'Odi Hospital'],
    ['Hammanskraal', 'Kudube', 'Stinkwater', 'Suurman', 'Babelegi', 'Montana', 'Annlin', 'Sinoville', 'Doornpoort', 'Wonderboom', 'Themba', 'Jubilee EMS Station', 'Jubilee Hospital', 'Magalies EMS Station', 'Temba EMS Station'],
    ['Pretoria CBD', 'Pretoria Central', 'Brooklyn', 'Hatfield', 'Pretoria West', 'Silverton', 'East Lynne', 'Sunnyside', 'Arcadia', 'Hermanstad', 'Pretoria Tuine', 'Eloffsdal', 'Salvokop', 'Trevenna', 'Hillcrest', 'Lukasrand', 'Muckleneuk', 'Baileys Muckleneuk', 'Capital Park', 'Colbyn', 'New Muckleneuk', 'Riviera', 'Mayville', 'West Park', 'Bosman Street', 'Francis Baard Street', 'Belvedere Street', 'Sisulu Street', 'Schoeman Street', 'Madiba Street', 'Margareta Street', 'Doctor Savage Road', 'Tshwane Health District', 'Tshwane Regional Pharmacy', 'Tshwane District Hospital', 'Tshwane District Health Services', 'Tshwane EMS', 'Tshwane 3 EMS Station', 'Tshwane Rehabilitation Hospital', 'Weskoppies Hospital', 'Hatfield EMS Station', 'Innesdale EMS Station', 'Lebone Ambulance Training College', 'Phillip Nel Park EMS Station', 'Pretoria Central Correctional Centre', 'Pretoria CTB Bldg. Health', 'Pretoria Mortuary', 'S.G. Lourens Nursing Campus', 'Steve Biko Academic Hospital', 'The DTI Clinic (Pretoria)'],
    ['Centurion', 'Irene', 'Olievenhoutbosch', 'Laudium', 'Erasmia', 'Atteridgeville', 'Eersterust', 'Sunderland Ridge', 'Heuweloord', 'Saulsville', 'Raslouw', 'Voortrekkerhoogte', 'Kalafong', 'Moshongo Section', 'Centurion EMS Station', 'Kalafong Hospital', 'Zodwa Special School Clinic', 'Gazankulu Clinic'],
    ['Rayton', 'Cullinan', 'Refilwe', 'Sable Hills', 'Roodeplaat', 'Onverwacht', 'Kameelfontein', 'Dewagensdrift', 'Baviaanspoort Correctional Centre', 'Cullinan EMS Station', 'Cullinan Rehabilitation Hospital', 'Sablemed Medical Practice'],
    ['Mamelodi', 'Nellmapius', 'Jan Niemand Park', 'Mahube Valley', 'Moreleta Park', 'Silver Lakes', 'Mooikloof', 'Garsfontein', 'Woodlands', 'Faerie Glen', 'Wapadrand', 'Wapadrand Security Village', 'De Beers', 'Lynnwood Manor', 'Menlyn', 'Erasmuskloof', 'Elarduspark', 'Lindopark', 'Erasmuskloof EMS Station', 'Mamelodi EMS Station'],
    ['Bronkhorstspruit', 'Ekangala', 'Zithobeni', 'Rethabiseng', 'Vaalbank', 'Vlakfontein', 'Bronkhorstspruit EMS Station'],
  ],
  Johannesburg: [
    [],
    [],
    ['Roodepoort', 'Florida', 'Weltevredenpark', 'Zandspruit', 'Florida Clinic', 'Florida Park', 'Weltevreden Park', 'Davidsonville Clinic', 'Discoverers CHC', 'Flora and Wilgeheuwel Clinic', 'Florida Park EMS Station', 'Hodgsonstreet EMS Station', 'Hunters Hill EMS Station', 'Princess Clinic', 'Rahima Moosa Hospital', 'Rahima Moosa Nursing College', 'Rex Street Clinic', 'Sol Plaatjies Clinic', 'Tshepisong Clinic', 'Helderkruin Clinic', 'Roodepoort Mortuary', 'Westbury Clinic', 'Zandspruit Clinic'],
    ['Soweto', 'Diepkloof', 'Dobsonville', 'Doornkop', 'Meadowlands', 'Orlando', 'Protea Glen', 'Zola', 'Jabulani', 'Power Park', 'Meadowlands East Zone 3', 'Dobsonville Gardens', 'Thulani Park', 'Bara Nursing College', 'Bheki Mlangeni District Hospital', 'Bophelong (Region 6) Clinic', 'Braamfischer Clinic', 'Chiawelo CHC', 'Chris Hani Baragwanath Hospital', 'Diepkloof EMS Station', 'Diepkloof LA Clinic', 'Diepkloof Mortuary', 'Diepkloof Prov Clinic', 'Dobsonville EMS Station', 'Elias Motsoaledi Clinic', 'Freedom Park', 'Devland Mobile', 'Green Village Porta Cabin Clinic', 'Itlirileng CHC', 'Jabavu/Vusabantu Clinic', 'Jabulani EMS Station', 'Klipspruit West Clinic', 'Lillian Ngoyi CHC', 'Mandela Sisulu Clinic', 'Meadowlands Zone 2 Prov Clinic', 'Michael Maponya Prov Clinic', 'Mofolo CHC', 'Mofolo South Clinic', 'Moroka Clinic', 'Naledi Clinic', 'Nokuphila Clinic', 'Noordgesig Prov Clinic', 'Orlando Prov Clinic', 'Protea Glen Clinic', 'Senaoane Clinic', 'Shanty Clinic', 'Singqobile Clinic', 'Siphumelele Clinic', 'Slovoville Mobile 1', 'Test Lucidview', 'Tladi LA Clinic', 'Tladi Prov Clinic', 'Zola CHC', 'Zola Gateway Clinic', 'Zondi Clinic', 'Itereleng Clinic'],
    ['Alexandra', 'Sandton', 'Orchards', 'Eastbank Clinic', '4th Avenue Clinic', 'Alex EMS Station', 'Alexandra 18th Avenue Clinic', 'Alexandra 8th Avenue Clinic', 'Alexandra CHC', 'Alexandra Clinical Forensic', 'Alexandra East Bank Clinic', 'Cosmo City Clinic', 'Diepsloot Clinic', 'Ebony Park Kaalfontein Clinic', 'Eyethu Yarona Clinic', 'Modderfontein EMS Station', 'Nizamiye Clinic', 'Northview EMS Station', 'OR Tambo Clinic', 'Orchards Clinic', 'Petervale Clinic', 'Sandown Clinic', 'Sandton EMS Station', 'Sizwe Tropical Diseases Hospital', 'Thoko Mngoma Clinic', 'Wendywood Clinic'],
    ['17 Esselen Street Clinic', '6 Plein St Mortuary', '78 Fox / HIM', '80 Albert Street Clinic', 'Ann Latsky Nursing College', 'Bellavista Clinic', 'Berea EMS Station', 'Bezvalley Clinic', 'Brixton EMS Station', 'Central EMS Station', 'Charlotte Maxeke Hospital', 'City Deep', 'Crown Gardens Clinic', 'Denver Mobile 1', 'Diagonal Building', 'Fairview EMS Station', 'Forensic Pathology Service', 'Gcon', 'Glenanda Clinic', 'Goodwill Industries Satellite Clinic', 'Greater JHB EMS', 'Head Office', 'Helen Joseph Hospital', 'Hillbrow CHC', 'HPC FNB Building', 'ICTI-Systems', 'JCDI Oral Health Service', 'Jeppe Clinic', 'JHB Hillbrow Mortuary', 'Johannesburg Correctional Centre', 'Joubert Park Clinic', 'Kibler Park Clinic', 'Kibler Park EMS Station', 'Lanseria Port Health', 'Malvern Clinic', 'Mayfair Clinic', 'Medical Supplies Depot', 'Penmore Tower', 'Reserve Bank', 'Rosettenville Clinic', 'South Hills Clinic', 'South Rand Hospital', 'Tara Hospital', 'TMI Oral Health Service', 'Turffontein EMS Station', 'Urban Health Clinic', 'Wits Oral and Dental', 'Wits Oral Health Centre', 'Yeoville Clinic'],
    ['Ennerdale', 'Orange Farm', 'Lenasia', 'Lenasia South', 'Lawley', 'Finetown', 'Unaville AH', 'Barney Molokoane Clinic', 'Eikenhof Prov Clinic', 'Eldorado Park EMS Station', 'Eldorado Park Ext 2 Clinic', 'Eldorado Park Ext 9 Clinic', 'Ennerdale Ext 8 Clinic', 'Ennerdale Ext 9 Clinic', 'Finetown Clinic', 'Imbalenhle Clinic', 'Kliptown Clinic', 'Lawley 2 Clinic', 'Lawley Clinic', 'Lawley EMS Station', 'Lenasia Clinic', 'Lenasia Ext 10 Clinic', 'Lenasia Ext 2 Clinic', 'Lenasia South CHC', 'Lenasia South Civic Centre Clinic', 'Mid Ennerdale Clinic', 'Mountain View Clinic', 'Orange Farm EMS Station', 'Orange Farm Ext 7 Clinic', 'Protea South Clinic', 'Rietfontein EMS Station', 'Sinethemba Clinic', 'Stretford CHC', 'Thembelihle Clinic', 'Thula Mntwana Clinic', 'Vlakfontein Clinic', 'Weilers Farm Clinic', 'Wildebeesfontein Clinic'],
  ],
  Ekurhuleni: [
    [
      'Brakpan', 'Daveyton', 'Etwatwa', 'Tsakane',
      'Pholosong Hospital',
    ],
    ['Kwa-Thema', 'Springs', 'Nigel', 'Dunnottar', 'Geduld', 'Mackenzieville', 'Vorsterkroon'],
    [
      'Kempton Park', 'Birchleigh', 'Tembisa', 'Clayville',
      'Olifantsfontein', 'Motsu', 'Midstream Estate', 'Midstream',
      'Midstream Hill Medical Park', 'Ampath Laboratory',
      'Dr Oupa Chuene Surgery',
    ],
    [
      'Bedfordview', 'Benoni', 'Boksburg', 'Edenvale', 'Croydon',
      'Senderwood', 'Oriel', 'Symhurst', 'Airfield', 'Crystal Park',
      'Parkdene', 'Reiger Park', 'Actonville', 'Wattville', 'Northmead',
      'Surgery Ngaka',
    ],
    [
      'Germiston', 'Germinston', 'Alberton', 'Vosloorus', 'Oranjehof',
      'Raceview', 'New Redruth', 'Meyersdal', 'Ekurhuleni Ward 44',
      'Bedford Gardens', 'COVID Testing Drive Through',
      'Clinic Botshelong Empilweni Private Hospital',
      'Clinix Botshelong Empilweni Private Hospital',
      'Jabulani Dumani Health', "Life St Mary's Women's Clinic",
      'Tswelopelo Primary Health Care Clinic',
    ],
    [
      'Thokoza', 'Katlehong', 'Palm Ridge', 'Spruitview', 'Khumalo Valley',
      'Masetjhaba View', 'Khumalo Clinic', 'extension 10 clinic',
    ],
  ],
  Sedibeng: [
    [
      'Vereeniging', 'Vanderbijlpark', 'Sebokeng', 'Evaton', 'Sharpeville',
      'Boipatong', 'Bophelong', 'Tshepiso', 'CE1', 'Mediclinic Emfuleni',
      'Dr Helga Kuhn Clinic',
      'Driehoek Clinic', 'Emfuleni East LA Mobile 1',
      'Emfuleni South Provincial Mobile 1', 'Emfuleni South Provincial Mobile 2',
      'Emfuleni Special Clinic', 'Emfuleni Sub District Office',
      'Emfuleni West Provincial Mobile 1', 'Empilisweni CDC',
      'Eureka Health Post', 'Evaton Main Clinic', 'Evaton West Mobile 1',
      'Johan Deo Clinic', 'Johan Heyns EMS Station', 'Levali Mbatha CHC',
      'Market Avenue Clinic', 'Mpumulelo Evaton North Clinic', 'Osiweni Clinic',
      'Quickshop Mobile 1', 'Retswelapele Clinic', 'Rietspruit',
      'Rus ter vaal Clinic', 'Sebei Motseneng Clinic', 'Sebokeng EMS Station',
      'Sebokeng Mortuary', 'Sebokeng Oral Health Service', 'Sedibeng EMS',
      'Sedibeng Oral Mobile 1', 'Sharpeville CHC', 'Tabita Oord Health Post',
      'Tholokgomeng Clinic', 'Tshepiso Clinic', 'Vaal Regional Pharmacy',
      'Vereeniging EMS Station', 'Zone 13 Clinic', 'Zone 14 Clinic',
      'Zone 17 Clinic', 'Zone 3 Clinic',
    ],
    [
      'Heidelberg', 'Ratanda', 'Devon', 'Vischkuil', 'Endicott',
      'Impumelelo', 'Jameson Park', 'Devon EMS Station', 'Heidelberg Clinic',
      'Heidelberg EMS Station', 'Heidelberg Mortuary', 'Jameson Park Clinic',
      'Lesedi Sub District Office', 'Ratanda CDC', 'Ratanda Ext 23 Clinic',
      'Ratanda Ext 7 Clinic', 'Rensburg Clinic', 'Usizolwethu Clinic',
      'Vischkuil Clinic',
    ],
    [
      'Meyerton', 'De Deur', 'Walkerville', 'Vaal Marina', 'Vaal Oewer',
      'Eikenhof', 'Henley on Klip', 'Bantu Bonke Clinic', 'Family Medicine',
      'Groendene Mobile 1', 'Kookrus Clinic', 'Lakeside Clinic',
      'Mamello Clinic', 'Meyerton CDC', 'Meyerton EMS Station',
      'Midvaal East Provincial Mobile 1', 'Midvaal Sub District Office',
      'Pontshong Walkerville Clinic', 'Randvaal Clinic', 'Sicelo Clinic',
      'Thuthuzela Clinic',
    ],
  ],
  'West Rand': [
    [
      'Carletonville', 'Khutsong', 'Fochville', 'Kokosi', 'Greenspark',
      'Welverdiend', 'Wedela', 'Blybank', 'Oberholzer',
      'Anglogold Health Services', 'Carletonville Hospital', 'Fochville Hospital',
      'Leslie Williams Memorial Hospital',
    ],
    [
      'Krugersdorp', 'Magaliesburg', 'Muldersdrift', 'Kagiso', 'Rietvallei',
      'Munsieville', 'Azaadville', 'Tudor', 'Lewisham', 'Kenmare',
      'Pinehaven Estate', 'Sterkfontein', 'Mogale City (Other)',
      'Ampath Krugersdorp', 'Azaadville Clinic', 'Itumeleng',
      'Netcare Bell Street Hospital',
    ],
    [
      'Randfontein', 'Toekomsrus', 'Mohlakeng', 'Kocksoord', 'Randgate',
      'Elandsfontein',
    ],
    [
      'Westonaria', 'Bekkersdal', 'Simunye', 'Venterspos', 'Hillshaven',
      'Glenharvie', 'Zuurbekom',
    ],
  ],
};

const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function inferSubDistrict(district, tags, facilityName) {
  const locationValues = [
    tags['addr:suburb'],
    tags['addr:place'],
    tags['addr:city'],
    tags['addr:town'],
    tags['addr:village'],
    tags['addr:hamlet'],
    tags['addr:street'],
    tags['is_in:city'],
    facilityName,
  ].filter(Boolean);

  const regions = localityRegions[district] ?? [];
  let matchedRegion = -1;
  let matchedPlace = '';

  for (const value of locationValues) {
    const locationText = ` ${normalize(value)} `;
    for (let index = 0; index < regions.length; index += 1) {
      for (const place of regions[index]) {
        const normalizedPlace = normalize(place);
        if (
          normalizedPlace.length > normalize(matchedPlace).length &&
          locationText.includes(` ${normalizedPlace} `)
        ) {
          matchedRegion = index;
          matchedPlace = place;
        }
      }
    }
  }
  if (matchedRegion < 0) return null;
  return administrativeRegions[district]?.[matchedRegion] ?? matchedPlace;
}

function facilityRecords(data, district) {
  return data.elements.flatMap((element) => {
    const tags = element.tags ?? {};
    const name = tags.name?.trim().slice(0, 255);
    if (!name || tags.disused || tags.abandoned) return [];

    const rawType = [tags.healthcare, tags.amenity]
      .filter(Boolean)
      .join(';')
      .toLocaleLowerCase();
    const facilityType = rawType.includes('hospital')
      ? 'Hospital'
      : rawType.includes('clinic')
        ? 'Clinic'
        : rawType.includes('health_post')
          ? 'Health post'
          : 'Health centre';
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    const streetAddress = [
      [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
      tags['addr:suburb'],
      tags['addr:city'] ?? tags['addr:town'],
      tags['addr:postcode'],
    ]
      .filter(Boolean)
      .join(', ');

    return [
      {
        source_key: `osm:${element.type}/${element.id}`,
        facility_name: name,
        facility_type: facilityType,
        district,
        sub_district: inferSubDistrict(district, tags, name),
        locality:
          tags['addr:suburb'] ??
          tags['addr:city'] ??
          tags['addr:town'] ??
          tags['addr:village'] ??
          null,
        street_address: streetAddress.slice(0, 500) || null,
        operator_name: tags.operator?.slice(0, 255) ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
    ];
  });
}

async function getDistrictFacilities(district) {
  const query = `[out:json][timeout:60];relation(${district.relation});map_to_area;(nwr["name"]["amenity"~"hospital|clinic|health_post"](area);nwr["name"]["healthcare"~"hospital|clinic|health_centre|community_health_centre|health_post"](area););out center tags;`;
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ];
  let lastError;

  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'GautengHealthAssets facility-directory-import',
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(75000),
        });
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`HTTP ${response.status}`);
          await new Promise((resolve) => setTimeout(resolve, 15000 * (attempt + 1)));
          continue;
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return {
          records: facilityRecords(data, district.name),
          timestamp: data.osm3s?.timestamp_osm_base,
        };
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 5000 * (attempt + 1)));
        }
      }
    }
  }

  throw new Error(
    `OpenStreetMap Overpass request failed for ${district.name}: ${lastError?.message ?? 'unknown error'}`
  );
}

async function main() {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing database environment variables: ${missing.join(', ')}`);
  }

  const port = Number(process.env.DB_PORT ?? 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be a valid TCP port.');
  }

  const facilities = new Map();
  let sourceTimestamp;
  for (const [index, district] of districts.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 5000));
    const result = await getDistrictFacilities(district);
    sourceTimestamp = result.timestamp ?? sourceTimestamp;
    for (const facility of result.records) {
      facilities.set(facility.source_key, facility);
    }
  }

  const values = Array.from(facilities.values());
  if (values.length === 0) {
    throw new Error('The OpenStreetMap query returned no named facilities; no data was imported.');
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 3,
  });

  try {
    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const parameters = values.flatMap((facility) => [
      facility.source_key,
      facility.facility_name,
      facility.facility_type,
      facility.district,
      facility.sub_district,
      facility.locality,
      facility.street_address,
      facility.operator_name,
      facility.latitude,
      facility.longitude,
      'OpenStreetMap',
      sourceTimestamp?.replace('T', ' ').replace('Z', '') ?? null,
    ]);

    const [result] = await pool.execute(
      `INSERT INTO health_facilities (
        source_key, facility_name, facility_type, district, sub_district,
        locality, street_address, operator_name, latitude, longitude,
        source_name, source_updated_at
      ) VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        facility_name = VALUES(facility_name),
        facility_type = VALUES(facility_type),
        district = VALUES(district),
        sub_district = COALESCE(VALUES(sub_district), sub_district),
        locality = VALUES(locality),
        street_address = VALUES(street_address),
        operator_name = VALUES(operator_name),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        source_updated_at = VALUES(source_updated_at)`,
      parameters
    );

    console.log(
      `Imported ${values.length} mapped facilities from OpenStreetMap (${sourceTimestamp ?? 'source date unavailable'}). A missing locality means the directory record could not be assigned to a sub-district.`
    );
    console.log(`Database rows affected: ${result.affectedRows}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
