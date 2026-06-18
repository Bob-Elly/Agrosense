import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'agrosens3@gmail.com',
    pass: 'jweiwfdrhtdedaoc'
  }
})

async function testEmail() {
  try {
    const info = await transporter.sendMail({
      from: `"AgroSense" <agrosens3@gmail.com>`,
      to: 'agrosens3@gmail.com', // sending to self just to test
      subject: 'Test Email',
      text: 'This is a test'
    })
    console.log('Email sent:', info.messageId)
  } catch (err) {
    console.error('Error:', err.message)
  }
}

testEmail()
