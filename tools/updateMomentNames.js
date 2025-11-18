// updateMomentNames.js
// Batch-renames legacy moment names in mydata.json to canonical names from moments_list.json

const fs = require('fs');
const path = require('path');

const mydataPath = path.resolve(__dirname, '..', 'mydata.json');
const momentsListPath = path.resolve(__dirname, '..', 'moments_list.json');

const LEGACY_KEYS = [
  '1_entrance_antiphon',
  '2_responsorial_psalm',
  '3_gospel_acclamation',
  '4_offertory',
  '5_communion_antiphon',
  '6_communion',
  '7_meditation',
  '8_recessional',
  'Lord_Have_Mercy',
  'Glory_to_God',
  'Holy',
  'When_We_Eat_This_Bread',
  'Amen',
  'Lamb_of_God'
];

function run() {
  if (!fs.existsSync(mydataPath) || !fs.existsSync(momentsListPath)) {
    console.error('Required files not found.');
    return;
  }
  const mydata = JSON.parse(fs.readFileSync(mydataPath, 'utf8'));
  const momentsList = JSON.parse(fs.readFileSync(momentsListPath, 'utf8'));
  let changed = false;
  if (Array.isArray(mydata.sections)) {
    for (let i = 0; i < LEGACY_KEYS.length; i++) {
      const legacy = LEGACY_KEYS[i];
      const canonical = momentsList[i];
      for (const section of mydata.sections) {
        if ((section.moment || '').toLowerCase() === legacy.toLowerCase()) {
          section.moment = canonical;
          changed = true;
          console.log(`Renamed moment '${legacy}' to '${canonical}'`);
        }
      }
    }
    if (changed) {
      fs.writeFileSync(mydataPath, JSON.stringify(mydata, null, 2), 'utf8');
      console.log('mydata.json updated with canonical moment names.');
    } else {
      console.log('No legacy moment names found to update.');
    }
  } else {
    console.error('No sections found in mydata.json');
  }
}

run();
