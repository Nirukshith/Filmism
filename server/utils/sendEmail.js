const nodemailer = require('nodemailer')

const emailUser = process.env.EMAIL_USER
const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, '')

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
})

const sendOtpEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `"Filmism" <${emailUser}>`,
    to,
    subject: 'verify your filmism account',
    html: `
      <div style="font-family: sans-serif; padding: 24px; color: #1a1a1a;">
        <h2 style="font-family: serif;">welcome to filmism</h2>
        <p>your verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff751f;">${otp}</p>
        <p style="color: #666;">this code expires in 5 minutes.</p>
      </div>
    `,
  })
}

module.exports = sendOtpEmail