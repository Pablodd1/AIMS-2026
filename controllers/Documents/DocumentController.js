const { uploadPDF } = require('./Upload')
const { getDocuments } = require('./GetDocuments')
const { deleteDocument } = require('./DeleteDocument')
const { updateDocumentDate } = require('./UpdateDocument')
module.exports = {
    uploadPDF,
    getDocuments,
    deleteDocument,
    updateDocumentDate
};
