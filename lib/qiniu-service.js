let qiniu = require('qiniu')
const Busboy = require('busboy')
const axios = require('axios')

function QiniuService (options) {
  let self = this

  if (!(self instanceof QiniuService)) {
    return new QiniuService(options)
  }

  self.options = options

  qiniu.conf.ACCESS_KEY = options.accessKey
  qiniu.conf.SECRET_KEY = options.secretKey
}

QiniuService.prototype.getToken = function (bucket, key) {
  let putPolicy = new qiniu.rs.PutPolicy(`${bucket}:${key}`)

  return putPolicy.token()
}

QiniuService.prototype.getContainers = function (cb) {
  const self = this

  if (self.options.bucket) {
    return cb(new Error('Qiniu not support list fake folder for bucket' +
      '(exist specify bucket)'))
  }
  const url = 'http://rs.qbox.me/buckets'

  const token = qiniu.util.generateAccessToken(url, null)

  qiniu.rpc.postWithoutForm(url, token, function (err, result) {
    if (err) return cb(err)
    cb(null, result)
  })
}

QiniuService.prototype.getContainer = function (container, cb) {
  const self = this

  if (self.options.bucket) {
    return cb(new Error('Qiniu not support fake folder info for bucket' +
      '(exist specify bucket)'))
  }
  const url = `http://api.qiniu.com/v6/domain/list?tbl=${container}`
  const token = qiniu.util.generateAccessToken(url, null)

  axios.get(url, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': token
    }
  })
  .then(function (res) {
    cb(null, res.data)
  })
  .catch(function (err) {
    cb(err)
  })
}

QiniuService.prototype.createContainer = function (options, cb) {
  const self = this

  if (self.options.bucket) {
    return cb(new Error('Qiniu not support create fake folder info for bucket' +
      '(exist specify bucket)'))
  }
  const container = options && options.name
  let url = `http://rs.qiniu.com/mkbucketv2/${new Buffer(container).toString('base64')}`

  if (options.region) {
    url += `/region/${options.region}`
  }

  if (options.global) {
    url += `/global/${options.global}`
  }

  const token = qiniu.util.generateAccessToken(url, null)

  qiniu.rpc.postWithoutForm(url, token, function (err, result) {
    if (err) {
      cb(err)
    }
    cb(null, result)
  })
}

QiniuService.prototype.destroyContainer = function (container, cb) {
  const self = this

  if (self.options.bucket) {
    return cb(new Error('Qiniu not support destroy fake folder info for bucket' +
      '(exist specify bucket)'))
  }
  const url = `http://rs.qiniu.com/drop/${container}`
  const token = qiniu.util.generateAccessToken(url, null)

  qiniu.rpc.postWithoutForm(url, token, function (err, result) {
    if (err) {
      cb(err)
    }
    cb(null, result)
  })
}

QiniuService.prototype.getFiles = function (container, options, cb) {
  const self = this

  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  let url = `http://rsf.qbox.me/list?bucket=${self.options.bucket || container}`

  if (options.marker) {
    url += `&marker=${options.marker}`
  }

  if (options.Limit) {
    url += `&Limit=${options.Limit || 50}`
  }

  if (self.options.bucket || options.prefix) {
    url += `&prefix=${self.options.bucket ? container : options.prefix}`
  }

  const token = qiniu.util.generateAccessToken(url, null)

  qiniu.rpc.postWithoutForm(url, token, function (err, result) {
    if (err) {
      return cb(err)
    }
    cb(null, result)
  })
}

QiniuService.prototype.getFile = function (container, file, cb) {
  const self = this
  const entry = self.options.bucket
    ? `${self.options.bucket}:${container + '/' + file}`
    : `${container}:${file}`
  const url = `http://rs.qiniu.com/stat/${qiniu.util.urlsafeBase64Encode(entry)}`

  const token = qiniu.util.generateAccessToken(url, null)

  axios.get(url, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': token
    }
  })
  .then(function (res) {
    cb(null, res.data)
  })
  .catch(function (err) {
    cb(err)
  })
}

QiniuService.prototype.removeFile = function (container, file, cb) {
  const self = this
  const entry = self.options.bucket
    ? `${self.options.bucket}:${container}/${file}`
    : `${container}:${file}`
  const url = `http://rs.qiniu.com/delete/${qiniu.util.urlsafeBase64Encode(entry)}`

  const token = qiniu.util.generateAccessToken(url, null)

  qiniu.rpc.postWithoutForm(url, token, function (err, result) {
    if (err) {
      return cb(err)
    }
    cb(null, result)
  })
}

QiniuService.prototype.upload = function (container, req, res, options, cb) {
  if (!cb && typeof options === 'function') {
    cb = options
    options = {}
  }

  const self = this
  const busboy = new Busboy({
    headers: req.headers
  })

  busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
    let bucket, key

    if (self.options.bucket) {
      bucket = self.options.bucket
      key = `${(options.container || container)}/${filename}`
    } else {
      bucket = options.container || container
      key = filename
    }

    qiniu.io.putReadable(self.getToken(bucket, key), key, file, null, function (err, ret, response) {
      if (err) {
        return cb(err)
      }
      cb(null, ret)
    })
  })

  req.pipe(busboy)
}

QiniuService.prototype.download = function (container, filename, req, res, cb) {
  const self = this
  let bucket, key, domain

  function getFile (domain, key) {
    const baseUrl = qiniu.rs.makeBaseUrl(domain, key)

    const policy = new qiniu.rs.GetPolicy()
    res.redirect(policy.makeRequest(baseUrl))
  }

  if (self.options.bucket) {
    bucket = self.options.bucket
    key = `${container}/${filename}`
    domain = self.options.domain ? self.options.domain : null
  } else {
    bucket = container
    key = key
  }

  if (domain) {
    getFile(domain, key)
  } else {
    const url = `http://api.qiniu.com/v6/domain/list?tbl=${bucket}`
    const token = qiniu.util.generateAccessToken(url, null)

    axios.get(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': token
      }
    })
    .then(function (response) {
      domain = response.data[0]
      if (domain) {
        getFile(domain, key)
      } else {
        cb(new Error('No specify bucket/domain found'))
      }
    })
    .catch(function (err) {
      cb(err)
    })
  }
}

QiniuService.modelName = 'storage'

QiniuService.prototype.getContainers.shared = true
QiniuService.prototype.getContainers.accepts = []
QiniuService.prototype.getContainers.returns = {
  arg: 'containers',
  type: 'array',
  root: true
}
QiniuService.prototype.getContainers.http = {
  verb: 'get',
  path: '/'
}
QiniuService.prototype.getContainer.shared = true
QiniuService.prototype.getContainer.accepts = [
  {
    arg: 'container',
    type: 'string',
    required: true
  }]
QiniuService.prototype.getContainer.returns = {
  arg: 'container',
  type: 'object',
  root: true
}
QiniuService.prototype.getContainer.http = {
  verb: 'get',
  path: '/:container'
}

QiniuService.prototype.createContainer.shared = true
QiniuService.prototype.createContainer.accepts = [
  {
    arg: 'options',
    type: 'object',
    http: {
      source: 'body'
    }
  }]
QiniuService.prototype.createContainer.returns = {
  arg: 'container',
  type: 'object',
  root: true
}
QiniuService.prototype.createContainer.http = {
  verb: 'post',
  path: '/'
}

QiniuService.prototype.destroyContainer.shared = true
QiniuService.prototype.destroyContainer.accepts = [
  {
    arg: 'container',
    type: 'string',
    required: true
  }]
QiniuService.prototype.destroyContainer.returns = {}
QiniuService.prototype.destroyContainer.http = {
  verb: 'delete',
  path: '/:container'
}

QiniuService.prototype.getFiles.shared = true
QiniuService.prototype.getFiles.accepts = [
  {
    arg: 'container',
    type: 'string',
    required: true
  }]
QiniuService.prototype.getFiles.returns = {
  arg: 'files',
  type: 'array',
  root: true
}
QiniuService.prototype.getFiles.http = {
  verb: 'get',
  path: '/:container/files'
}

QiniuService.prototype.getFile.shared = true
QiniuService.prototype.getFile.accepts = [
  {
    arg: 'container',
    type: 'string',
    required: true
  },
  {
    arg: 'file',
    type: 'string',
    required: true
  }]
QiniuService.prototype.getFile.returns = {
  arg: 'file',
  type: 'object',
  root: true
}
QiniuService.prototype.getFile.http = {
  verb: 'get',
  path: '/:container/files/:file'
}

QiniuService.prototype.removeFile.shared = true
QiniuService.prototype.removeFile.accepts = [
  {
    arg: 'container',
    type: 'string',
    required: true
  },
  {
    arg: 'file',
    type: 'string',
    required: true
  }]
QiniuService.prototype.removeFile.returns = {}
QiniuService.prototype.removeFile.http = {
  verb: 'delete',
  path: '/:container/files/:file'
}

QiniuService.prototype.upload.shared = true
QiniuService.prototype.upload.accepts = [
  {
    arg: 'container',
    type: 'string',
    required: true
  },
  {
    arg: 'req',
    type: 'object',
    'http': {
      source: 'req'
    }
  },
  {
    arg: 'res',
    type: 'object',
    'http': {
      source: 'res'
    }
  }]
QiniuService.prototype.upload.returns = {
  arg: 'result',
  type: 'object'
}
QiniuService.prototype.upload.http = {
  verb: 'post',
  path: '/:container/upload'
}

QiniuService.prototype.download.shared = true
QiniuService.prototype.download.accepts = [
  {
    arg: 'container',
    type: 'string',
    http: {
      source: 'path'
    },
    required: true
  },
  {
    arg: 'file',
    type: 'string',
    http: {
      source: 'path'
    },
    required: true
  },
  {
    arg: 'req',
    type: 'object',
    'http': {
      source: 'req'
    }
  },
  {
    arg: 'res',
    type: 'object',
    'http': {
      source: 'res'
    }
  }]
QiniuService.prototype.download.http = {
  verb: 'get',
  path: '/:container/download/:file'
}

module.exports = QiniuService
