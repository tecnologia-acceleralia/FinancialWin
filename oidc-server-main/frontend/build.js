const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get environment variables - fail if not set
const BACKEND_URL = process.env.BACKEND_URL;
const PROVIDER_URL = process.env.PROVIDER_URL;

if (!BACKEND_URL) {
  console.error('❌ Error: BACKEND_URL environment variable is not set');
  process.exit(1);
}

if (!PROVIDER_URL) {
  console.error('❌ Error: PROVIDER_URL environment variable is not set');
  process.exit(1);
}

console.log('🔨 Building frontend...');
console.log('📡 Backend URL:', BACKEND_URL);
console.log('🔐 Provider URL:', PROVIDER_URL);

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Read app.js and replace CONFIG values
const appJsPath = path.join(__dirname, 'src', 'app.js');
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Replace the CONFIG object
const configRegex = /const CONFIG = \{[\s\S]*?\};/;
const newConfig = `const CONFIG = {
    backendUrl: '${BACKEND_URL}',
    providerUrl: '${PROVIDER_URL}'
};`;

appJsContent = appJsContent.replace(configRegex, newConfig);

// Write modified app.js to dist
fs.writeFileSync(path.join(distDir, 'app.js'), appJsContent);

// Copy index.html to dist
const indexHtmlPath = path.join(__dirname, 'src', 'index.html');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
fs.writeFileSync(path.join(distDir, 'index.html'), indexHtmlContent);

console.log('✅ Build complete! Output in ./dist/');
console.log('📁 Files created:');
console.log('   - dist/app.js');
console.log('   - dist/index.html');

