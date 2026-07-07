// server/services/notifications.js
import { db } from '../config/firebaseAdmin.js'
import { dispatchEmail } from './emailService.js'

/* Creates an in -app notification in Firestore.
*/
export async function createInAppNotification(userId, title, message, type = 'info') {
  try {
    await db.collection('users').doc(userId).collection('notifications').add({
      title,
      message,
      type,
      read: false,
      timestamp: new Date()
    })
  } catch (err) {
    console.error('Failed to create in-app notification:', err)
  }
}

/**
 * Sends an email using the central dispatch service.
 */
export async function sendEmailNotification(userEmail, subject, text) {
  await dispatchEmail(userEmail, subject, text)
}

/**
 * Processes a telemetry reading against crop threshold bounds and user preferences.
 */
export async function processTelemetryAlerts(deviceId, reading) {
  try {
    // 1. Get device owner and crop
    const deviceSnap = await db.collection('devices').doc(deviceId).get()
    if (!deviceSnap.exists) return
    const device = deviceSnap.data()
    const ownerId = device.owner
    const cropName = device.crop

    if (!ownerId) return

    // 2. Get user preferences
    const userSnap = await db.collection('users').doc(ownerId).get()
    if (!userSnap.exists) return
    const user = userSnap.data()
    const prefs = user.notificationPreferences || {}
    const userEmail = user.email

    // 3. Get crop thresholds (if device has a crop assigned)
    let cropProfile = null
    if (cropName) {
      const cropSnap = await db.collection('cropProfiles').where('name', '==', cropName).limit(1).get()
      if (!cropSnap.empty) {
        cropProfile = cropSnap.docs[0].data()
      }
    }

    const alerts = []

    // Helper to evaluate bounds
    const checkBound = (paramName, value, bounds, alertKey) => {
      if (!bounds || value === undefined || value === null) return
      if (value < bounds.min) {
        alerts.push({ key: alertKey, param: paramName, issue: 'LOW', value, bounds })
      } else if (value > bounds.max) {
        alerts.push({ key: alertKey, param: paramName, issue: 'HIGH', value, bounds })
      }
    }

    if (cropProfile) {
      checkBound('Moisture', reading.moisture, cropProfile.moisture, 'lowMoisture')
      checkBound('pH', reading.ph, cropProfile.ph, 'phAlert')
      checkBound('Nitrogen', reading.nitrogen, cropProfile.nitrogen, 'lowNutrient')
      checkBound('Phosphorus', reading.phosphorus, cropProfile.phosphorus, 'lowNutrient')
      checkBound('Potassium', reading.potassium, cropProfile.potassium, 'lowNutrient')
      // Note: temperature bounds can also be checked, but the prompt didn't explicitly request a toggle for it.
      // We will map it to a general alert if needed, or skip it.
    }

    // 4. Create notifications for each alert (always active)
    // TEMPORARILY DISABLED: The MCU uploads every 10 seconds, causing massive notification spam.
    // We should implement cooldowns (e.g., max 1 alert per hour) before re-enabling this.
    /*
    for (const alert of alerts) {
      const title = `${alert.param} Alert for ${device.label || deviceId}`
      const message = `Current ${alert.param.toLowerCase()} is ${alert.value}, which is ${alert.issue} the optimal range of ${alert.bounds.min} - ${alert.bounds.max}.`

      // In-app (compulsory)
      await createInAppNotification(ownerId, title, message, 'warning')

      // Email
      const wantsEmail = prefs.emailAlerts === true || prefs.deliveryMethod === 'email'
      if (wantsEmail && userEmail) {
        const emailText = `Hello,\n\nAn alert was triggered for your crop (${device.crop || 'Unknown'}).\nNode: ${device.label || deviceId}\n\nParameter: ${alert.param}\nCurrent Value: ${alert.value}\nOptimal Range: ${alert.bounds.min} to ${alert.bounds.max}\n\nPlease check your dashboard for more details.\n\n- AgroSense`
        await sendEmailNotification(userEmail, title, emailText)
      }
    }
    */

    // Check if node came back online
    // If the device's last status was offline, and now we got telemetry, it's back online!
    if (device.status === 'offline') {
      const title = `Node Online: ${device.label || deviceId}`
      const message = `Device has reconnected and sent new telemetry.`
      await createInAppNotification(ownerId, title, message, 'success')

      const wantsEmail = prefs.emailAlerts === true || prefs.deliveryMethod === 'email'
      if (wantsEmail && userEmail) {
        await sendEmailNotification(userEmail, title, `Your device ${device.label || deviceId} is back online.`)
      }
    }

  } catch (err) {
    console.error('Error processing telemetry alerts:', err)
  }
}

/**
 * Creates notifications for command events.
 */
export async function createCommandNotification(deviceId, action, status, errorMsg = '') {
  try {
    const deviceSnap = await db.collection('devices').doc(deviceId).get()
    if (!deviceSnap.exists) return
    const ownerId = deviceSnap.data().owner
    if (!ownerId) return

    let title = ''
    let message = ''
    let type = 'info'

    if (status === 'sent') {
      title = `Command Sent: ${action.toUpperCase()}`
      message = `Command queued for device ${deviceSnap.data().label || deviceId}.`
    } else if (status === 'acknowledged') {
      title = `Command Acknowledged`
      message = `Device ${deviceSnap.data().label || deviceId} executed the ${action.toUpperCase()} command.`
      type = 'success'
    } else if (status === 'failed') {
      title = `Command Failed`
      message = `Command ${action.toUpperCase()} failed for ${deviceSnap.data().label || deviceId}. ${errorMsg}`
      type = 'error'
    } else if (status === 'sms_fallback') {
      title = `Command Sent via SMS`
      message = `Device ${deviceSnap.data().label || deviceId} is offline. Sent via SMS fallback.`
      type = 'warning'
    } else {
      return
    }

    await createInAppNotification(ownerId, title, message, type)
  } catch (err) {
    console.error('Error creating command notification:', err)
  }
}
