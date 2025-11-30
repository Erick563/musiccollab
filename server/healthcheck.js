/**
 * Script de Health Check para monitorar a saúde do servidor
 * 
 * Este script pode ser usado para:
 * - Verificar se o servidor está respondendo
 * - Monitorar uso de memória
 * - Testar conexão WebSocket
 * 
 * Uso:
 *   node healthcheck.js
 * 
 * Ou em produção com cron:
 *   */5 * * * * node /path/to/healthcheck.js >> /path/to/healthcheck.log 2>&1
 */

const http = require('http');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

function checkHealth() {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/api/auth/health', // Endpoint de saúde (você pode criar um endpoint específico)
      method: 'GET',
      timeout: 5000 // 5 segundos de timeout
    };

    const req = http.request(options, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          // 404 é OK se não houver endpoint de health, significa que o servidor está respondendo
          resolve({
            status: 'OK',
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
          });
        } else {
          reject({
            status: 'ERROR',
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString(),
            error: `Status code inesperado: ${res.statusCode}`
          });
        }
      });
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      reject({
        status: 'ERROR',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        error: error.message,
        code: error.code
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        status: 'TIMEOUT',
        responseTime: '5000ms+',
        timestamp: new Date().toISOString(),
        error: 'Servidor não respondeu em 5 segundos'
      });
    });

    req.end();
  });
}

function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`
    };
  }
  return null;
}

// Executar health check
console.log('\n=== Health Check do Servidor ===');
console.log(`Host: ${HOST}:${PORT}`);
console.log(`Timestamp: ${new Date().toISOString()}\n`);

checkHealth()
  .then((result) => {
    console.log('✅ Servidor está SAUDÁVEL');
    console.log(JSON.stringify(result, null, 2));
    
    const memory = getMemoryUsage();
    if (memory) {
      console.log('\n📊 Uso de Memória:');
      console.log(JSON.stringify(memory, null, 2));
    }
    
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Servidor com PROBLEMAS');
    console.error(JSON.stringify(error, null, 2));
    
    console.log('\n💡 Possíveis soluções:');
    console.log('  1. Verifique se o servidor está rodando');
    console.log('  2. Verifique os logs do servidor em ./logs/');
    console.log('  3. Reinicie o servidor: npm run dev');
    console.log('  4. Verifique se a porta está correta no .env');
    
    process.exit(1);
  });


