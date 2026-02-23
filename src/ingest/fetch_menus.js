const fs = require('fs');
const path = require('path');

async function generateStaticMenus(date) {
  return [
    {
      date,
      meal: 'Lunch',
      items: ['Apple Slices', 'Milk'],
    },
  ];
}

async function saveMenusToFile(menus, outputPath) {
  const absPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, JSON.stringify(menus, null, 2));
}

(async () => {
  const date = '2026-02-23';
  const outputPath = 'output/ingested_menus.json';

  try {
    console.log(`Generating static menus for ${date}...`);
    const menus = await generateStaticMenus(date);
    console.log(`Saving menus to ${outputPath}...`);
    await saveMenusToFile(menus, outputPath);
    console.log('Static menus successfully created.');
  } catch (error) {
    console.error('Error creating static menus:', error);
  }
})();