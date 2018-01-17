var native = require('crypto')

function nativePBKDF2 (password, salt, iterations, keylen, digest, callback) {
  return native.pbkdf2(password, salt, iterations, keylen, digest || 'sha1', callback)
}

function nativePBKDF2Sync (password, salt, iterations, keylen, digest) {
  return native.pbkdf2Sync(password, salt, iterations, keylen, digest || 'sha1')
}

/* istanbul ignore next */
if (!native.pbkdf2Sync || native.pbkdf2Sync.toString().indexOf('keylen, digest') === -1) {
  module.exports.pbkdf2Sync = require('./lib/sync')
  module.exports.pbkdf2 = require('./lib/async')

// native
} else {
  module.exports.pbkdf2Sync = nativePBKDF2Sync
  module.exports.pbkdf2 = nativePBKDF2
}
