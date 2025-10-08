// scheduler.js
// Sistema d'actualització automàtica amb horaris personalitzats

import cron from 'node-cron';
import { scrapeAllTeams, hasNewMatches } from './scraper.js';
import { saveConfig, getConfig, updateLastCheck } from './database.js';

let isRunning = false;
let lastResult = null;
let activeTasks = [];

// Funció per actualitzar dades
export async function updateData() {
  if (isRunning) {
    console.log('⚠️ Actualització ja en curs, esperant...');
    return { success: false, message: 'Actualització ja en curs' };
  }
  
  isRunning = true;
  console.log('\n🔄 Iniciant actualització automàtica...');
  
  try {
    const currentConfig = await getConfig();
    const result = await scrapeAllTeams();
    
    if (!result) {
      throw new Error('No s\'han pogut obtenir dades');
    }
    
    const changes = hasNewMatches(currentConfig, result.config);
    
    if (changes.hasChanges) {
      console.log('🆕 Nous partits detectats!');
      changes.changes.forEach(change => {
        if (change.type === 'new_team') {
          console.log(`  ➕ Nou equip: ${change.team} (${change.count} partits)`);
        } else {
          console.log(`  🔄 ${change.team}: ${change.count} partits nous`);
        }
      });
      
      await saveConfig(result.config, result.metadata);
      
      lastResult = {
        success: true,
        hasChanges: true,
        changes: changes.changes,
        timestamp: new Date().toISOString()
      };
    } else {
      console.log('✓ No hi ha canvis, configuració actual està al dia');
      await updateLastCheck();
      
      lastResult = {
        success: true,
        hasChanges: false,
        timestamp: new Date().toISOString()
      };
    }
    
    return lastResult;
    
  } catch (error) {
    console.error('❌ Error durant l\'actualització:', error.message);
    
    lastResult = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    return lastResult;
    
  } finally {
    isRunning = false;
  }
}

export function getLastResult() {
  return lastResult;
}

// Programar actualitzacions amb horaris personalitzats
export function startScheduler() {
  console.log('⏰ Configurant horaris d\'actualització...\n');
  
  // DISSABTE: Cada 30 minuts de 14:00 a 23:00
  const saturdayTask = cron.schedule('0,30 14-23 * * 6', async () => {
    console.log('\n⏰ [DISSABTE] Actualització programada activada');
    await updateData();
  }, {
    timezone: "Europe/Madrid"
  });
  
  activeTasks.push({ name: 'Dissabte', task: saturdayTask });
  console.log('✅ Dissabte: 14:00-23:00 cada 30 minuts');
  
  // DIUMENGE: Cada 30 minuts de 11:00 a 23:30
  const sundayTask = cron.schedule('0,30 11-23 * * 0', async () => {
    console.log('\n⏰ [DIUMENGE] Actualització programada activada');
    await updateData();
  }, {
    timezone: "Europe/Madrid"
  });
  
  activeTasks.push({ name: 'Diumenge', task: sundayTask });
  console.log('✅ Diumenge: 11:00-23:30 cada 30 minuts');
  
  // DILLUNS A DIVENDRES: 1 cop al dia a les 10:00
  const weekdayTask = cron.schedule('0 10 * * 1-5', async () => {
    console.log('\n⏰ [ENTRE SETMANA] Actualització programada activada');
    await updateData();
  }, {
    timezone: "Europe/Madrid"
  });
  
  activeTasks.push({ name: 'Entre setmana', task: weekdayTask });
  console.log('✅ Dilluns-Divendres: 10:00\n');
  
  console.log('📊 Resum horaris:');
  console.log('   🏀 Dissabte: ~19 execucions');
  console.log('   🏀 Diumenge: ~26 execucions');
  console.log('   📚 Entre setmana: 5 execucions');
  console.log('   📊 Total setmanal: ~50 execucions\n');
  
  console.log('✅ Scheduler inicialitzat correctament!');
  
  return activeTasks;
}

// Detenir tots els schedulers
export function stopScheduler() {
  activeTasks.forEach(({ name, task }) => {
    task.stop();
    console.log(`⏸️ ${name} aturat`);
  });
  activeTasks = [];
  console.log('✅ Tots els schedulers aturats');
}

// Obtenir info dels schedulers actius
export function getSchedulerInfo() {
  return {
    active: activeTasks.length > 0,
    tasks: activeTasks.map(({ name }) => name),
    lastResult
  };
}