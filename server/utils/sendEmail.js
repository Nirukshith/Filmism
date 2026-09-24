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

const sendBanNotificationEmail = async (to, firstName, reason) => {
  try {
    if (!emailUser || !emailPass) {
      console.log(`[Email Simulation] Ban notification email to ${to} for reason: ${reason}`)
      return
    }
    await transporter.sendMail({
      from: `"Filmism Trust & Safety" <${emailUser}>`,
      to,
      subject: 'Account Suspension Notice - Filmism',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px; background-color: #0d0d0f; color: #f0f0f4; border-radius: 12px; max-width: 560px; margin: 0 auto; border: 1px solid #22222a;">
          <h2 style="color: #ff751f; margin-top: 0; font-family: serif; letter-spacing: 1px;">FILMISM</h2>
          <h3 style="color: #ff6b6b; margin-top: 0;">Account Suspension Notice</h3>
          <p>Hello ${firstName || 'Cinephile'},</p>
          <p>Your Filmism account associated with this email address has been suspended due to violations of our community safety guidelines and terms of service.</p>
          <div style="background: #181820; border-left: 4px solid #ff751f; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #d0d0dc;"><strong>Reason for Action:</strong></p>
            <p style="margin: 6px 0 0 0; color: #fff; font-size: 15px;">${reason || 'Violation of community safety standards'}</p>
          </div>
          <p style="color: #a0a0b0; font-size: 14px; line-height: 1.6;">
            As a result of this suspension:
            <ul style="color: #a0a0b0; font-size: 14px; padding-left: 20px;">
              <li>Your account access and login capabilities have been revoked immediately.</li>
              <li>You have been removed from the Cinephile Twin matching network.</li>
              <li>Active chat conversations and connection requests have been closed.</li>
            </ul>
          </p>
          <p style="color: #777; font-size: 12px; margin-top: 28px; border-top: 1px solid #22222a; padding-top: 16px;">
            If you believe this suspension was made in error, please reply directly to this email for appeal review.
          </p>
        </div>
      `,
    })
    console.log(`✉️ Ban notification email dispatched to ${to}`)
  } catch (err) {
    console.error(`⚠️ Failed to send ban notification email to ${to}:`, err.message)
  }
}

const sendWarningNotificationEmail = async (to, firstName, reason, adminNotes) => {
  try {
    if (!emailUser || !emailPass) {
      console.log(`[Email Simulation] Warning notification email to ${to} for reason: ${reason}`)
      return
    }
    await transporter.sendMail({
      from: `"Filmism Trust & Safety" <${emailUser}>`,
      to,
      subject: 'Community Conduct Warning - Filmism',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px; background-color: #0d0d0f; color: #f0f0f4; border-radius: 12px; max-width: 560px; margin: 0 auto; border: 1px solid #22222a;">
          <h2 style="color: #ff751f; margin-top: 0; font-family: serif; letter-spacing: 1px;">FILMISM</h2>
          <h3 style="color: #e67e22; margin-top: 0;">Official Community Conduct Warning</h3>
          <p>Hello ${firstName || 'Cinephile'},</p>
          <p>We are reaching out to inform you that our Trust & Safety moderation team has reviewed a safety report regarding your recent interaction on Filmism.</p>
          <div style="background: #181820; border-left: 4px solid #e67e22; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #d0d0dc;"><strong>Report Category:</strong></p>
            <p style="margin: 4px 0 10px 0; color: #fff; font-size: 15px; text-transform: capitalize;">${reason?.replace('_', ' ') || 'Conduct violation'}</p>
            ${adminNotes ? `
            <p style="margin: 0; font-size: 13px; color: #d0d0dc;"><strong>Moderator Note:</strong></p>
            <p style="margin: 4px 0 0 0; color: #f0f0f4; font-size: 14px; font-style: italic;">"${adminNotes}"</p>
            ` : ''}
          </div>
          <p style="color: #a0a0b0; font-size: 14px; line-height: 1.6;">
            Filmism is committed to maintaining a welcoming, safe, and respectful environment for all film lovers. Please adhere strictly to our Community Safety Guidelines in future chats and matching interactions.
          </p>
          <p style="color: #e74c3c; font-size: 13px; font-weight: 600; margin-top: 18px;">
            ⚠️ Please note that repeated violations or inappropriate behavior will result in immediate and permanent account suspension.
          </p>
          <p style="color: #777; font-size: 12px; margin-top: 28px; border-top: 1px solid #22222a; padding-top: 16px;">
            If you have questions regarding this warning notice, you may reply to this email.
          </p>
        </div>
      `,
    })
    console.log(`✉️ Warning notification email dispatched to ${to}`)
  } catch (err) {
    console.error(`⚠️ Failed to send warning notification email to ${to}:`, err.message)
  }
}

sendOtpEmail.sendOtpEmail = sendOtpEmail
sendOtpEmail.sendBanNotificationEmail = sendBanNotificationEmail
sendOtpEmail.sendWarningNotificationEmail = sendWarningNotificationEmail

module.exports = sendOtpEmail
module.exports.sendOtpEmail = sendOtpEmail
module.exports.sendBanNotificationEmail = sendBanNotificationEmail
module.exports.sendWarningNotificationEmail = sendWarningNotificationEmail