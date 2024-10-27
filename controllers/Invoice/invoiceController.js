const { makeInvoice } = require('./createInvoice')
const { getAllInvoices } = require('./getAlIInvoices')
const { getInvoiceById } = require('./getInvoiceById')
const { getInvoiceAnalyitcs } = require('./getInvoiceAnalytics')

module.exports={
    makeInvoice,
    getAllInvoices,
    getInvoiceById,
    getInvoiceAnalyitcs
}