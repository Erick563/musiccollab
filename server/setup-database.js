const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  const envExample = fs.readFileSync(path.join(__dirname, 'config.example.env'), 'utf8');
  
  const envContent = envExample.replace(
    'DATABASE_URL="postgresql://username:password@localhost:5432/musiccollab?schema=public"',
    'DATABASE_URL="postgresql://postgres:password@localhost:5432/musiccollab?schema=public"'
  );
  
  fs.writeFileSync(envPath, envContent);
}

try {
  execSync('npm run db:generate', { stdio: 'inherit', cwd: __dirname });
  execSync('npm run db:migrate', { stdio: 'inherit', cwd: __dirname });
  execSync('npm run db:seed', { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  process.exit(4);
}
