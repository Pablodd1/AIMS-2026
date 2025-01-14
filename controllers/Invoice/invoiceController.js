const { makeInvoice } = require('./createInvoice')
const { getAllInvoices } = require('./getAlIInvoices')
const { getInvoiceById } = require('./getInvoiceById')
const { getInvoiceAnalyitcs } = require('./getInvoiceAnalytics')
const { updateInvoice } = require('./updateInvoice')
const { deleteInvoice } = require('./deleteInvoice')
const { invoiceStatus} = require('./invoiceStatus')
const { getAllByStatus} = require('./getAllByStatus')


module.exports={
    makeInvoice,
    getAllInvoices,
    getInvoiceById,
    getInvoiceAnalyitcs,
    updateInvoice,
    deleteInvoice,
    invoiceStatus,
    getAllByStatus
}