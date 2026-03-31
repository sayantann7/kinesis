const fs = require('fs');
const paths = [
  'c:\\Users\\Sayantan Nandi\\Desktop\\spec-engine\\mobile-app\\app\\(tabs)\\opportunities',
  'c:\\Users\\Sayantan Nandi\\Desktop\\spec-engine\\mobile-app\\app\\workspace'
];
paths.forEach(p => {
  fs.mkdirSync(p, { recursive: true });
  console.log('Created:', p);
});
