var checkParameters = require('./precondition')
var defaultEncoding = require('./default-encoding')
var sync = require('./sync')
var Buffer = require('safe-buffer').Buffer

var ZERO_BUF
var subtle = global.crypto && global.crypto.subtle
var toBrowser = {
  'sha': 'SHA-1',
  'sha-1': 'SHA-1',
  'sha1': 'SHA-1',
  'sha256': 'SHA-256',
  'sha-256': 'SHA-256',
  'sha384': 'SHA-384',
  'sha-384': 'SHA-384',
  'sha-512': 'SHA-512',
  'sha512': 'SHA-512'
}
var nextTick = typeof (process) !== 'undefined' && process.nextTick ? process.nextTick : setImmediate;
var checks = []
function checkNative (algo) {
  if (global.process && !global.process.browser) {
    return Promise.resolve(false)
  }
  if (!subtle || !subtle.importKey || !subtle.deriveBits) {
    return Promise.resolve(false)
  }
  if (checks[algo] !== undefined) {
    return checks[algo]
  }
  ZERO_BUF = ZERO_BUF || Buffer.alloc(8)
  var prom = browserPbkdf2(ZERO_BUF, ZERO_BUF, 10, 128, algo)
    .then(function () {
      return true
    }).catch(function () {
      return false
    })
  checks[algo] = prom
  return prom
}
function browserPbkdf2 (password, salt, iterations, length, algo) {
  return subtle.importKey(
    'raw', password, {name: 'PBKDF2'}, false, ['deriveBits']
  ).then(function (key) {
    return subtle.deriveBits({
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: {
        name: algo
      }
    }, key, length << 3)
  }).then(function (res) {
    return Buffer.from(res)
  })
}
function resolvePromise (promise, callback) {
  promise.then(function (out) {
    nextTick(function () {
      callback(null, out)
    })
  }, function (e) {
    nextTick(function () {
      callback(e)
    })
  })
}
module.exports = function (password, salt, iterations, keylen, digest, callback) {
  if (!Buffer.isBuffer(password)) password = Buffer.from(password, defaultEncoding)
  if (!Buffer.isBuffer(salt)) salt = Buffer.from(salt, defaultEncoding)

  checkParameters(iterations, keylen)
  if (typeof digest === 'function') {
    callback = digest
    digest = undefined
  }
  if (typeof callback !== 'function') throw new Error('No callback provided to pbkdf2')

  digest = digest || 'sha1'
  var algo = toBrowser[digest.toLowerCase()]
  if (!algo || typeof global.Promise !== 'function') {
    return nextTick(function () {
      var out
      try {
        out = sync(password, salt, iterations, keylen, digest)
      } catch (e) {
        return callback(e)
      }
      callback(null, out)
    })
  }
  resolvePromise(checkNative(algo).then(function (resp) {
    if (resp) {
      return browserPbkdf2(password, salt, iterations, keylen, algo)
    } else {
      return sync(password, salt, iterations, keylen, digest)
    }
  }), callback)
}
