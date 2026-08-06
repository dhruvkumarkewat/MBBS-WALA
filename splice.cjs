const fs = require('fs');
const file = 'src/pages/dashboard/DashboardPages.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
content = content.replace(
  "import { NotificationPanel } from '../../components/dashboard/NotificationPanel';",
  "import { NotificationPanel } from '../../components/dashboard/NotificationPanel';\nimport { PredictorResults } from './PredictorResults';"
);

const lines = content.split('\n');

// Find the start of the block
const startIdx = lines.findIndex(l => l.includes(') : (') && lines[lines.indexOf(l) + 1].includes('<>'));
// Find the end of the block
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('</>') && lines[i + 1].includes(')}'));

if (startIdx !== -1 && endIdx !== -1) {
  const newLines = [
    '          ) : (',
    '            <PredictorResults ',
    '              aiResponse={aiResponse} ',
    '              s={s} ',
    '              isPremium={isPremium} ',
    '              domicileState={domicileState} ',
    '            />',
    '          )}'
  ];
  
  lines.splice(startIdx, endIdx - startIdx + 2, ...newLines);
  fs.writeFileSync(file, lines.join('\n'));
  console.log('Successfully replaced huge block in DashboardPages.tsx');
} else {
  console.log('Could not find block boundaries', startIdx, endIdx);
}
