-- Applied to TRENERKI production 2026-11-18.
-- References to invoices issued in Saldeo/KSeF. This does NOT issue invoices.
create table if not exists public.ta_accounting_documents (
 id uuid primary key default gen_random_uuid(),
 stripe_source text not null unique check (stripe_source ~ '^(ch|py|pi|cs)_[A-Za-z0-9_]+$'),
 document_type text not null default 'pending' check (document_type in ('pending','b2c_register','b2c_invoice','b2b_invoice','refund_correction','not_applicable')),
 document_status text not null default 'pending' check (document_status in ('pending','prepared','issued','reconciled','review')),
 document_number text,
 ksef_number text,
 tax_treatment text not null default 'review' check (tax_treatment in ('review','pl_23','exempt','reverse_charge','oss','outside_scope')),
 notes text,
 processed_by uuid references auth.users(id),
 processed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint document_issued_requires_reference check (document_status not in ('issued','reconciled') or (document_number is not null and length(trim(document_number)) > 0) or document_type='b2c_register')
);
create unique index if not exists ta_accounting_documents_unique_document_number on public.ta_accounting_documents (document_number) where document_number is not null and document_type in ('b2b_invoice','b2c_invoice');
alter table public.ta_accounting_documents enable row level security;
revoke all on public.ta_accounting_documents from anon, authenticated;
comment on table public.ta_accounting_documents is 'Owner-only reconciliation references to invoices issued externally in Saldeo/KSeF; this table never issues an invoice or calculates tax.';
