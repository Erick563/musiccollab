const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando banco de dados PostgreSQL...\n');

// Verificar se o arquivo .env existe
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Criando arquivo .env...');
  const envExample = fs.readFileSync(path.join(__dirname, 'config.example.env'), 'utf8');
  
  // Substituir valores padrão
  const envContent = envExample.replace(
    'DATABASE_URL="postgresql://username:password@localhost:5432/musiccollab?schema=public"',
    'DATABASE_URL="postgresql://postgres:password@localhost:5432/musiccollab?schema=public"'
  );
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Arquivo .env criado com configurações padrão');
} else {
  console.log('✅ Arquivo .env já existe');
}

try {
  console.log('\n🔄 Gerando cliente Prisma...');
  execSync('npm run db:generate', { stdio: 'inherit', cwd: __dirname });
  
  console.log('\n🔄 Executando migrations...');
  execSync('npm run db:migrate', { stdio: 'inherit', cwd: __dirname });
  
  console.log('\n🌱 Populando banco com dados iniciais...');
  execSync('npm run db:seed', { stdio: 'inherit', cwd: __dirname });
  
  console.log('\n✅ Configuração do banco de dados concluída com sucesso!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Certifique-se de que o PostgreSQL está rodando na porta 5432');
  console.log('2. Verifique as configurações no arquivo .env');
  console.log('3. Execute "npm run dev" para iniciar o servidor');
  console.log('4. Acesse "npm run db:studio" para visualizar os dados');
  
} catch (error) {
  console.error('\n❌ Erro durante a configuração:', error.message);
  console.log('\n🔧 Possíveis soluções:');
  console.log('1. Verifique se o PostgreSQL está instalado e rodando');
  console.log('2. Confirme as credenciais no arquivo .env');
  console.log('3. Certifique-se de que o banco "musiccollab" existe');
  process.exit(1);
}
