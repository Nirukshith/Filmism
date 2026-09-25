const mongoose = require('mongoose')
const dns = require('dns')

// Ensure SRV records can be resolved even on personal hotspot or restrictive networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4'])
} catch (_) {}

const customLookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (err) {
      return dns.lookup(hostname, options, callback)
    }
    if (options && options.all) {
      return callback(null, addresses.map((a) => ({ address: a, family: 4 })))
    }
    return callback(null, addresses[0], 4)
  })
}

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing. Add it to server/.env')
    }
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      lookup: customLookup,
    })
    console.log(`MongoDB connected: ${conn.connection.host}`)
    return conn
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`)
    throw error
  }
}

module.exports = connectDB