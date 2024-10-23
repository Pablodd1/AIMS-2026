const { makeInvoice } = require('./createInvoice')
const { getAllInvoices } = require('./getAlIInvoices')
const { getInvoiceById } = require('./getInvoiceById')

module.exports={
    makeInvoice,
    getAllInvoices,
    getInvoiceById
}