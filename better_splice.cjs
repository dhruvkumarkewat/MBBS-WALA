const fs = require('fs');
const file = 'src/pages/dashboard/DashboardPages.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('PredictorResults')) {
  content = content.replace(
    "import { NotificationPanel } from '../../components/dashboard/NotificationPanel';",
    "import { NotificationPanel } from '../../components/dashboard/NotificationPanel';\nimport { PredictorResults } from './PredictorResults';"
  );
}

const lines = content.split('\n');

// Find the exact line that starts the legacy block we want to delete:
// It's after: `          ) : (`
// And the line immediately after should be `            <>`
// And the next line should be `              {/* ── Summary Strip ── */}`

let startIdx = -1;
for (let i = 0; i < lines.length - 2; i++) {
  if (lines[i].includes(') : (') && lines[i+1].includes('<>') && lines[i+2].includes('Summary Strip')) {
    startIdx = i;
    break;
  }
}

let endIdx = -1;
if (startIdx !== -1) {
  // Find the exact end of the block
  // It ends with `                  </ul>`
  // `                </div>`
  // `              )}`
  // `            </>`
  // `          )}`
  for (let i = startIdx; i < lines.length - 4; i++) {
    if (lines[i].includes('</>') && lines[i+1].includes(')}')) {
      endIdx = i + 1; // Index of `          )}`
      break;
    }
  }
}

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
  
  lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
  fs.writeFileSync(file, lines.join('\n'));
  console.log('Successfully replaced huge block in DashboardPages.tsx from line ' + startIdx + ' to ' + endIdx);
} else {
  console.log('Could not find block boundaries', startIdx, endIdx);
}
