const { getSignedUrlForUpload } = require('./PutObject')
const { deleteObject , deleteDocumentObject } = require('./DeleteObject')
const { getObject } = require('./GetObject')
module.exports={
    getSignedUrlForUpload,
    deleteObject,
    getObject,
    deleteDocumentObject
}