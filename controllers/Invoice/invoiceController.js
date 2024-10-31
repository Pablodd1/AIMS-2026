const { makeInvoice } = require('./createInvoice')
const { getAllInvoices } = require('./getAlIInvoices')
const { getInvoiceById } = require('./getInvoiceById')
const { getInvoiceAnalyitcs } = require('./getInvoiceAnalytics')
const { updateInvoice } = require('./updateInvoice')
const { deleteInvoice } = require('./deleteInvoice')
module.exports={
    makeInvoice,
    getAllInvoices,
    getInvoiceById,
    getInvoiceAnalyitcs,
    updateInvoice,
    deleteInvoice
}