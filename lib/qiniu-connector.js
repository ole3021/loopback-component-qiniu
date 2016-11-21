const QiniuService = require('./qiniu-service')

exports.initialize = function (dataSource, callback) {
  const settings = dataSource.settings || {}

  const connector = new QiniuService(settings)
  dataSource.connector = connector
  dataSource.connector.dataSource = dataSource

  connector.DataAccessObject = function () {}
  for (var m in QiniuService.prototype) {
    var method = QiniuService.prototype[m]
    if (typeof method === 'function') {
      connector.DataAccessObject[m] = method.bind(connector)
      for (var k in method) {
        connector.DataAccessObject[m][k] = method[k]
      }
    }
  }
}
