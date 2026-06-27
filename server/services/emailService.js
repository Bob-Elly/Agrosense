import nodemailer from 'nodemailer'
import https from 'https'
import { URL } from 'url'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

/**
 * Sends an email natively if running locally, or proxies it through Vercel 
 * if running on Render Free Tier (which blocks outbound SMTP ports 465/587).
 */
export async function dispatchEmail(to, subject, text) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('\n⚠️  EMAIL_USER or EMAIL_PASS not set in .env! Skipping real email dispatch.')
    console.warn(`📩  DEV MODE EMAIL TO [${to}]: ${subject}\n`)
    return false
  }

  // Detect if we are running in production (Render sets RENDER=true by default)
  const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true'
  
  if (isProd) {
    // Ensure we don't accidentally try to hit localhost from the Render container
    let proxyOrigin = process.env.CLIENT_ORIGIN || 'https://agrosense-jet.vercel.app'
    if (proxyOrigin.includes('localhost') || proxyOrigin.includes('127.0.0.1')) {
      proxyOrigin = 'https://agrosense-jet.vercel.app'
    }
    const vercelProxyUrl = `${proxyOrigin}/api/send-email`
    
    return new Promise((resolve) => {
      const payload = JSON.stringify({
        to,
        subject,
        text,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      })

      const parsedUrl = new URL(vercelProxyUrl)
      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }

      const req = https.request(options, (res) => {
        let body = ''
        res.on('data', (chunk) => body += chunk)
        res.on('end', () => {
          try {
            const result = JSON.parse(body)
            if (!result.success) throw new Error(result.error || 'Unknown proxy error')
            console.log(`✅ Email proxy successful to ${to}. Message ID: ${result.messageId}`)
            resolve(true)
          } catch (err) {
            console.error('Failed to parse proxy response:', err)
            resolve(false)
          }
        })
      })

      req.on('error', (err) => {
        console.error('Failed to send email via Vercel proxy:', err)
        resolve(false)
      })

      req.write(payload)
      req.end()
    })
  } else {
    // Local development - standard Nodemailer (no port blocking)
    try {
      const info = await transporter.sendMail({
        from: `"AgroSense" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text
      })
      console.log(`✅ Email successfully handed off to SMTP server for ${to}. Message ID: ${info.messageId}`)
      return true
    } catch (err) {
      console.error('Failed to send email locally:', err)
      return false
    }
  }
}
