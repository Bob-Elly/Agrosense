/**
 * Utility script to clear all historical telemetry data for a specific device.
 * 
 * Usage:
 *   node clearTelemetry.js <deviceId>
 * 
 * Example:
 *   node clearTelemetry.js ESP32-1234
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Initialize Firebase Admin (assuming you have service-account.json in config)
const serviceAccountPath = resolve(process.cwd(), '../config/service-account.json');
try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({
    credential: cert(serviceAccount)
  });
} catch (err) {
  console.error("Failed to load service-account.json. Please ensure it exists in server/config/");
  process.exit(1);
}

const db = getFirestore();

async function clearTelemetry(deviceId) {
  if (!deviceId) {
    console.error('Error: Please provide a device ID.');
    console.error('Usage: node clearTelemetry.js <deviceId>');
    process.exit(1);
  }

  console.log(`Locating telemetry data for device: ${deviceId}...`);
  
  const readingsRef = db.collection('telemetry').doc(deviceId).collection('readings');
  const snapshot = await readingsRef.get();

  if (snapshot.empty) {
    console.log(`No telemetry data found for device: ${deviceId}`);
    process.exit(0);
  }

  console.log(`Found ${snapshot.size} readings. Deleting...`);

  // Firestore allows a max of 500 writes per batch
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let operationCounter = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    operationCounter++;

    if (operationCounter === BATCH_SIZE) {
      await batch.commit();
      console.log(`Deleted ${operationCounter} readings...`);
      batch = db.batch();
      operationCounter = 0;
    }
  }

  if (operationCounter > 0) {
    await batch.commit();
  }

  console.log(`✅ Successfully deleted all ${snapshot.size} readings for ${deviceId}.`);
  process.exit(0);
}

const deviceId = process.argv[2];
clearTelemetry(deviceId);
