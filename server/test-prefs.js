import admin from './config/firebaseAdmin.js'

async function checkUsers() {
  const users = await admin.firestore().collection('users').get()
  users.forEach(doc => {
    console.log(`User: ${doc.id}`)
    console.log(doc.data().notificationPreferences || 'No preferences')
  })
  process.exit(0)
}

checkUsers()
