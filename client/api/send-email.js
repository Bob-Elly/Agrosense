import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  // CORS configuration (allow requests from the Render backend)
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*') // Allow the Render API to hit this
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, text, user, pass } = req.body

  if (!to || !subject || !text || !user || !pass) {
    return res.status(400).json({ error: 'Missing required email parameters' })
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  })

  try {
    const info = await transporter.sendMail({
      from: `"AgroSense" <${user}>`,
      to,
      subject,
      text
    })
    res.status(200).json({ success: true, messageId: info.messageId })
  } catch (err) {
    console.error('Email proxy error:', err)
    res.status(500).json({ error: err.message })
  }
}
