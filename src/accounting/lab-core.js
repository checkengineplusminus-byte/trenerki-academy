/** Dotychczasowy silnik plus wydruk historycznych danych stron. */
export * from './lab-core-base.js';
import {invoiceHTML as legacyInvoiceHTML} from './lab-core-base.js';
import {identityInvoiceHTML} from './identity-core.js';
export function invoiceHTML(invoice){return invoice.identity_version===1?identityInvoiceHTML(invoice):legacyInvoiceHTML(invoice);}
