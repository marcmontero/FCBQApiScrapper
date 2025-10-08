// server.js
// Servidor principal amb API REST

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB, getConfig, getMetadata, getHistory } from './database.js';
import { startScheduler, updateData, getLastResult, getSchedulerInfo } from './scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ========== ENDPOINTS API ==========

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend funcionant correctament',
    timestamp: new Date().toISOString()
  });
});

// Obtener configuración de equipos (para el frontend)
app.get('/api/teams-config', async (req, res) => {
  try {
    const config = await getConfig();
    const metadata = await getMetadata();
    
    res.json({
      success: true,
      config,
      metadata
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtenir configuració'
    });
  }
});

// Obtener solo la configuración (formato para React)
app.get('/api/config', async (req, res) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtenir configuració'
    });
  }
});

// Obtener metadata (última actualización, etc)
app.get('/api/metadata', async (req, res) => {
  try {
    const metadata = await getMetadata();
    const lastResult = getLastResult();
    
    res.json({
      success: true,
      metadata,
      lastUpdate: lastResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtenir metadata'
    });
  }
});

// Obtener historial de actualizaciones
app.get('/api/history', async (req, res) => {
  try {
    const history = await getHistory();
    res.json({
      success: true,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtenir historial'
    });
  }
});

// Forzar actualización manual
app.post('/api/update', async (req, res) => {
  try {
    console.log('🔄 Actualització manual sol·licitada via API');
    const result = await updateData();
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Estado del sistema
app.get('/api/status', async (req, res) => {
  try {
    const metadata = await getMetadata();
    const lastResult = getLastResult();
    const schedulerInfo = getSchedulerInfo();
    
    res.json({
      success: true,
      status: {
        server: 'running',
        database: 'ok',
        scheduler: schedulerInfo.active ? 'active' : 'inactive',
        scheduledTasks: schedulerInfo.tasks,
        lastUpdate: metadata.lastUpdate,
        lastCheck: metadata.lastCheck,
        totalTeams: metadata.totalTeams,
        totalMatches: metadata.totalMatches,
        season: metadata.season,
        lastResult
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== INICIO DEL SERVIDOR ==========

async function startServer() {
  try {
    console.log('🚀 Iniciant servidor AE Badalonès Stats...\n');
    
    // 1. Inicializar base de datos
    await initDB();
    
    // 2. Verificar si hay configuración guardada
    const config = await getConfig();
    
    if (!config || Object.keys(config).length === 0) {
      console.log('⚠️ No hi ha configuració guardada, executant primera actualització...');
      await updateData();
    } else {
      console.log('✅ Configuració carregada des de la base de dades');
      const metadata = await getMetadata();
      console.log(`📊 Equips: ${metadata.totalTeams} | Partits: ${metadata.totalMatches} | Temporada: ${metadata.season}`);
    }
    
    // 3. Iniciar scheduler (actualización automática)
    startScheduler();
    
    // 4. Iniciar servidor Express
    app.listen(PORT, () => {
      console.log(`\n✅ Servidor escoltant al port ${PORT}`);
      console.log(`\n📡 Endpoints disponibles:`);
      console.log(`   - GET  /health                    - Health check`);
      console.log(`   - GET  /api/teams-config          - Configuració completa`);
      console.log(`   - GET  /api/config                - Només configuració d'equips`);
      console.log(`   - GET  /api/metadata              - Metadata i última actualització`);
      console.log(`   - GET  /api/history               - Historial d'actualitzacions`);
      console.log(`   - GET  /api/status                - Estat del sistema`);
      console.log(`   - POST /api/update                - Forçar actualització manual`);
      console.log(`\n🌐 URL base: http://localhost:${PORT}`);
      console.log(`\n🏀 AE Badalonès - Temporada 2025-2026`);
      console.log(`📅 Horaris actualització:`);
      console.log(`   🏀 Dissabte: 14:00-23:00 cada 30'`);
      console.log(`   🏀 Diumenge: 11:00-23:30 cada 30'`);
      console.log(`   📚 Dilluns-Divendres: 10:00\n`);
    });
    
  } catch (error) {
    console.error('💥 Error fatal al iniciar servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('\n⏸️ Tancant servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⏸️ Tancant servidor...');
  process.exit(0);
});

// Iniciar servidor
startServer();

export default app;