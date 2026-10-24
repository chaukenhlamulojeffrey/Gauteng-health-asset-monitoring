import { GAUTENG_SUB_DISTRICTS } from './types';

const localityRegions: Record<string, readonly (readonly string[])[]> = {
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
    [
      'Roodepoort', 'Florida', 'Weltevredenpark', 'Zandspruit',
      'Florida Clinic', 'Florida Park', 'Weltevreden Park',
      'Davidsonville Clinic', 'Discoverers CHC',
      'Flora and Wilgeheuwel Clinic', 'Florida Park EMS Station',
      'Hodgsonstreet EMS Station', 'Hunters Hill EMS Station',
      'Princess Clinic', 'Rahima Moosa Hospital',
      'Rahima Moosa Nursing College', 'Rex Street Clinic',
      'Sol Plaatjies Clinic', 'Tshepisong Clinic',
      'Helderkruin Clinic',
      'Roodepoort Mortuary', 'Westbury Clinic',
      'Zandspruit Clinic',
    ],
    [
      'Soweto', 'Diepkloof', 'Dobsonville', 'Doornkop',
      'Meadowlands', 'Orlando', 'Protea Glen', 'Zola', 'Jabulani',
      'Power Park', 'Meadowlands East Zone 3', 'Dobsonville Gardens',
      'Thulani Park',
      'Bara Nursing College', 'Bheki Mlangeni District Hospital',
      'Bophelong (Region 6) Clinic', 'Braamfischer Clinic', 'Chiawelo CHC',
      'Chris Hani Baragwanath Hospital', 'Diepkloof EMS Station',
      'Diepkloof LA Clinic', 'Diepkloof Mortuary', 'Diepkloof Prov Clinic',
      'Dobsonville EMS Station', 'Elias Motsoaledi Clinic', 'Freedom Park',
      'Devland Mobile', 'Green Village Porta Cabin Clinic', 'Itlirileng CHC',
      'Jabavu/Vusabantu Clinic', 'Jabulani EMS Station',
      'Klipspruit West Clinic', 'Lillian Ngoyi CHC', 'Mandela Sisulu Clinic',
      'Meadowlands Zone 2 Prov Clinic', 'Michael Maponya Prov Clinic',
      'Mofolo CHC', 'Mofolo South Clinic', 'Moroka Clinic', 'Naledi Clinic',
      'Nokuphila Clinic', 'Noordgesig Prov Clinic', 'Orlando Prov Clinic',
      'Protea Glen Clinic', 'Senaoane Clinic', 'Shanty Clinic',
      'Singqobile Clinic', 'Siphumelele Clinic', 'Slovoville Mobile 1',
      'Test Lucidview', 'Tladi LA Clinic', 'Tladi Prov Clinic', 'Zola CHC',
      'Zola Gateway Clinic', 'Zondi Clinic',
      'Itereleng Clinic',
    ],
    [
      'Alexandra', 'Sandton', 'Orchards',
      'Eastbank Clinic',
      '4th Avenue Clinic', 'Alex EMS Station', 'Alexandra 18th Avenue Clinic',
      'Alexandra 8th Avenue Clinic', 'Alexandra CHC',
      'Alexandra Clinical Forensic', 'Alexandra East Bank Clinic',
      'Cosmo City Clinic', 'Diepsloot Clinic',
      'Ebony Park Kaalfontein Clinic', 'Eyethu Yarona Clinic',
      'Modderfontein EMS Station', 'Nizamiye Clinic',
      'Northview EMS Station', 'OR Tambo Clinic', 'Orchards Clinic',
      'Petervale Clinic', 'Sandown Clinic', 'Sandton EMS Station',
      'Sizwe Tropical Diseases Hospital', 'Thoko Mngoma Clinic',
      'Wendywood Clinic',
    ],
    [
      '17 Esselen Street Clinic', '6 Plein St Mortuary', '78 Fox / HIM',
      '80 Albert Street Clinic', 'Ann Latsky Nursing College',
      'Bellavista Clinic', 'Berea EMS Station', 'Bezvalley Clinic',
      'Brixton EMS Station', 'Central EMS Station',
      'Charlotte Maxeke Hospital', 'City Deep', 'Crown Gardens Clinic',
      'Denver Mobile 1', 'Diagonal Building', 'Fairview EMS Station',
      'Forensic Pathology Service', 'Gcon', 'Glenanda Clinic',
      'Goodwill Industries Satellite Clinic', 'Greater JHB EMS',
      'Head Office', 'Helen Joseph Hospital', 'Hillbrow CHC',
      'HPC FNB Building', 'ICTI-Systems', 'JCDI Oral Health Service',
      'Jeppe Clinic', 'JHB Hillbrow Mortuary',
      'Johannesburg Correctional Centre', 'Joubert Park Clinic',
      'Kibler Park Clinic', 'Kibler Park EMS Station',
      'Lanseria Port Health', 'Malvern Clinic', 'Mayfair Clinic',
      'Medical Supplies Depot', 'Penmore Tower', 'Reserve Bank',
      'Rosettenville Clinic', 'South Hills Clinic', 'South Rand Hospital',
      'Tara Hospital', 'TMI Oral Health Service',
      'Turffontein EMS Station', 'Urban Health Clinic',
      'Wits Oral and Dental', 'Wits Oral Health Centre', 'Yeoville Clinic',
    ],
    [
      'Ennerdale', 'Orange Farm', 'Lenasia', 'Lenasia South', 'Lawley',
      'Finetown', 'Unaville AH', 'Barney Molokoane Clinic',
      'Eikenhof Prov Clinic', 'Eldorado Park EMS Station',
      'Eldorado Park Ext 2 Clinic', 'Eldorado Park Ext 9 Clinic',
      'Ennerdale Ext 8 Clinic', 'Ennerdale Ext 9 Clinic', 'Finetown Clinic',
      'Imbalenhle Clinic', 'Kliptown Clinic', 'Lawley 2 Clinic',
      'Lawley Clinic', 'Lawley EMS Station', 'Lenasia Clinic',
      'Lenasia Ext 10 Clinic', 'Lenasia Ext 2 Clinic', 'Lenasia South CHC',
      'Lenasia South Civic Centre Clinic', 'Mid Ennerdale Clinic',
      'Mountain View Clinic', 'Orange Farm EMS Station',
      'Orange Farm Ext 7 Clinic', 'Protea South Clinic',
      'Rietfontein EMS Station', 'Sinethemba Clinic', 'Stretford CHC',
      'Thembelihle Clinic', 'Thula Mntwana Clinic', 'Vlakfontein Clinic',
      'Weilers Farm Clinic', 'Wildebeesfontein Clinic',
    ],
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

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function inferFacilitySubDistrict(
  district: string,
  ...locationValues: Array<string | null | undefined>
): string | null {
  const regions = localityRegions[district];
  const subDistricts = GAUTENG_SUB_DISTRICTS[district] ?? [];
  if (!regions) return null;

  let matchedRegion = -1;
  let matchedLength = 0;
  let matchedPlace: string | null = null;

  for (const value of locationValues) {
    if (!value?.trim()) continue;
    const locationText = ` ${normalize(value)} `;

    for (let index = 0; index < regions.length; index += 1) {
      for (const place of regions[index]) {
        const normalizedPlace = normalize(place);
        if (
          normalizedPlace.length > matchedLength &&
          locationText.includes(` ${normalizedPlace} `)
        ) {
          matchedRegion = index;
          matchedLength = normalizedPlace.length;
          matchedPlace = place;
        }
      }
    }
  }

  if (matchedRegion < 0) return null;
  if (
    district === 'Johannesburg' ||
    district === 'Tshwane' ||
    district === 'Sedibeng' ||
    district === 'West Rand' ||
    district === 'Ekurhuleni'
  ) {
    return subDistricts[matchedRegion] ?? null;
  }
  return (
    subDistricts.find(
      (subDistrict) => normalize(subDistrict) === normalize(matchedPlace ?? '')
    ) ?? matchedPlace ?? null
  );
}
