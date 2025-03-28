console.log('Module test started');
import('node:fs').then(fs => {
  console.log('FS module imported successfully');
  console.log('Test file content:', fs.readFileSync('package.json', 'utf-8').slice(0, 100));
});
