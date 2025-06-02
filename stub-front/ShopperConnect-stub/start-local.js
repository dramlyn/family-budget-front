#!/usr/bin/env node

// Простой скрипт для локального запуска фронтенда
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Запуск фронтенда для работы с микросервисами...\n');

// Устанавливаем переменные окружения для локальной разработки
process.env.NODE_ENV = 'development';
process.env.VITE_API_URL = 'http://localhost:5000/api';

// Запускаем сервер
const serverProcess = spawn('node', ['--loader', 'tsx/esm', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: '5000'
  }
});

serverProcess.on('error', (err) => {
  console.error('❌ Ошибка запуска сервера:', err);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  console.log(`🔄 Сервер завершен с кодом ${code}`);
  process.exit(code);
});

console.log('✅ Фронтенд запущен на http://localhost:5000');
console.log('🔗 Готов к подключению к вашим микросервисам:');
console.log('   - Keycloak: http://localhost:1111');
console.log('   - User Service: http://127.0.0.1:8081');
console.log('   - Transaction Service: http://127.0.0.1:8082');
console.log('   - Family Budget Service: http://127.0.0.1:8083');
console.log('\n⏹️  Для остановки используйте Ctrl+C\n');