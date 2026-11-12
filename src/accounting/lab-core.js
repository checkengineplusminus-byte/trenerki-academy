/** Wspólny silnik: dokumenty z danymi stron oraz kartoteka majątku. */
export * from './lab-core-base.js';
export {ACCOUNTS,balanceReport,inspect} from './asset-ledger.js';
import {invoiceHTML as legacyInvoiceHTML} from './lab-core-base.js';
import {identityInvoiceHTML} from './identity-core.js';
export function invoiceHTML(invoice){return invoice.identity_version===1?identityInvoiceHTML(invoice):legacyInvoiceHTML(invoice);}
