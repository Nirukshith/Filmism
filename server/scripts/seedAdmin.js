require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../models/userModel')
const connectDB = require('../config/db')

async function seedAdmin() {
  try {
    await connectDB()
    console.log('Connected to database...')

    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@filmism.com'
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPassword123!'

    let admin = await User.findOne({ email: adminEmail.toLowerCase() })

    if (admin) {
      admin.role = 'admin'
      admin.isVerified = true
      admin.password = adminPassword // Will be hashed by pre-save hook
      await admin.save()
      console.log(`✅ Existing user updated to ADMIN: ${adminEmail}`)
    } else {
      admin = await User.create({
        firstName: 'Admin',
        lastName: 'Moderator',
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        isVerified: true,
        role: 'admin',
        tasteProfileComplete: false,
      })
      console.log(`✅ Default ADMIN created successfully: ${adminEmail}`)
    }

    console.log('────────────────────────────────────────────')
    console.log('Admin Credentials:')
    console.log(`Email:    ${adminEmail}`)
    console.log(`Password: ${adminPassword}`)
    console.log(`Role:     ${admin.role}`)
    console.log('────────────────────────────────────────────')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding admin user:', error)
    process.exit(1)
  }
}

seedAdmin()
