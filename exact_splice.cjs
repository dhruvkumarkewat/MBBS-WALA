const fs = require('fs');
const file = 'src/pages/dashboard/DashboardPages.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('PredictorResults')) {
  content = content.replace(
    "import { NotificationPanel } from '../../components/dashboard/NotificationPanel';",
    "import { NotificationPanel } from '../../components/dashboard/NotificationPanel';\nimport { PredictorResults } from './PredictorResults';"
  );
}

const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('{/* ── Summary Strip ── */}'));
if (startIdx === -1) throw new Error('Could not find Summary Strip');

const disclaimersIdx = lines.findIndex((l, i) => i > startIdx && l.includes('{/* ── Disclaimers ── */}'));
if (disclaimersIdx === -1) throw new Error('Could not find Disclaimers');

let endIdx = -1;
for (let i = disclaimersIdx; i < lines.length; i++) {
  if (lines[i].includes('</>') && lines[i+1].includes(')}')) {
    endIdx = i; // This is the line `            </>`
    break;
  }
}

if (endIdx === -1) throw new Error('Could not find end of block');

const newLines = [
  '            <PredictorResults ',
  '              aiResponse={aiResponse} ',
  '              s={s} ',
  '              isPremium={isPremium} ',
  '              domicileState={domicileState} ',
  '            />'
];

// We replace from `            <>` (which is startIdx - 1) up to `            </>` (which is endIdx)
lines.splice(startIdx - 1, endIdx - (startIdx - 1) + 1, ...newLines);

fs.writeFileSync(file, lines.join('\n'));
console.log('Successfully spliced from line ' + (startIdx - 1) + ' to ' + endIdx);
