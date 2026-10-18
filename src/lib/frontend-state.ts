import { products,type Product } from '@/data/catalog';
import type { FrontRequest, InquiryLine, RequestMessage, SharedQuote, SharedQuoteLine } from '@/types/frontend';

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const optionalString = (value: unknown) => typeof value === 'string' ? value : undefined;
export const inquiryIdentity = (line: InquiryLine) => JSON.stringify([line.productId,line.shade||'',line.mould||'',line.variantId||'',line.sku||'',line.unit||'']);

/** Validate persisted/browser-loaded data at the boundary, before any view uses it. */
export function parseInquiryLines(value: unknown, catalog: Product[] = products): InquiryLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter(object).flatMap(item => {
    const product = catalog.find(product => product.id === item.productId);
    if (!product || typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100000) return [];
    return [{
      productId: product.id,
      quantity: item.quantity,
      ...(product.family === 'teeth' ? {
        shade: string(item.shade).trim().slice(0, 40) || undefined,
        mould: string(item.mould).trim().slice(0, 40) || undefined,
      } : {}),
      note: string(item.note).slice(0, 1000) || undefined,
      ...(string(item.variantId).trim()?{variantId:string(item.variantId).trim().slice(0,240)}:{}),
      ...(string(item.sku).trim()?{sku:string(item.sku).trim().slice(0,240)}:{}),
      ...(string(item.unit).trim()?{unit:string(item.unit).trim().slice(0,240)}:{}),
    }];
  });
}

export function parseRequestMessages(value: unknown): RequestMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter(object).filter(item =>
    ['id', 'body', 'sender', 'createdAt'].every(key => typeof item[key] === 'string') &&
    (item.visibility === 'public' || item.visibility === 'internal'),
  ).map(item => ({
    id: item.id as string,
    body: item.body as string,
    sender: item.sender as string,
    createdAt: item.createdAt as string,
    visibility: item.visibility as RequestMessage['visibility'],
  }));
}

export function parseSharedQuoteLines(value: unknown): SharedQuoteLine[] {
  if (!Array.isArray(value)) return [];
  const decimal = (value:unknown): value is string => typeof value === 'string' && /^\d+(\.\d+)?$/.test(value);
  return value.filter(object).filter(line => ['id','productId','titleSnapshot','unit','currency'].every(key => typeof line[key] === 'string') && decimal(line.quantityDecimal) && decimal(line.discountPercentDecimal) && (line.unitPriceDecimal === null || decimal(line.unitPriceDecimal))).slice(0,100).map(line => ({id:line.id as string,productId:line.productId as string,titleSnapshot:line.titleSnapshot as string,unit:line.unit as string,currency:line.currency as string,quantityDecimal:line.quantityDecimal as string,discountPercentDecimal:line.discountPercentDecimal as string,unitPriceDecimal:line.unitPriceDecimal as string|null,netDecimal:decimal(line.netDecimal)?line.netDecimal:null}));
}
export function commercialQuoteLines(value: unknown): SharedQuoteLine[] {
  if (!object(value) || !Array.isArray(value.lines)) return [];
  const estimates = object(value.estimate) && Array.isArray(value.estimate.lines) ? value.estimate.lines.filter(object) : [];
  return parseSharedQuoteLines(value.lines.filter(object).map(line => ({...line,netDecimal:estimates.find(estimate => estimate.lineId === line.id)?.netDecimal ?? null})));
}

export function parseSharedQuotes(value: unknown): SharedQuote[] {
  if (!Array.isArray(value)) return [];
  return value.filter(object).filter(item =>
    ['id', 'number', 'title', 'amount', 'currency', 'issuedAt', 'snapshotHash'].every(key => typeof item[key] === 'string') &&
    ['issued', 'accepted_interest', 'declined', 'revision_requested'].includes(string(item.status)),
  ).map(item => ({
    id: item.id as string, number: item.number as string, title: item.title as string,
    amount: item.amount as string, currency: item.currency as string,
    status: item.status as SharedQuote['status'], issuedAt: item.issuedAt as string,
    snapshotHash: item.snapshotHash as string, validUntil: optionalString(item.validUntil),
    customerResponse: optionalString(item.customerResponse), respondedAt: optionalString(item.respondedAt),
    lines:parseSharedQuoteLines(item.lines),terms:optionalString(item.terms),
  }));
}

export function parseFrontRequests(value: unknown, catalog: Product[] = products): FrontRequest[] {
  if (!Array.isArray(value)) return [];
  return value.filter(object).filter(item =>
    ['id', 'kind', 'name', 'email', 'createdAt'].every(key => typeof item[key] === 'string'),
  ).map(item => ({
    ...item,
    id: item.id as string, kind: item.kind as string, name: item.name as string,
    email: item.email as string, createdAt: item.createdAt as string,
    organization: string(item.organization), message: string(item.message),
    status: string(item.status, 'received') || 'received',
    productIds: Array.isArray(item.productIds) ? item.productIds.filter((id): id is string => typeof id === 'string') : [],
    messages: parseRequestMessages(item.messages), sharedQuotes: parseSharedQuotes(item.sharedQuotes),
    items: parseInquiryLines(item.items,catalog),
    ownerId: optionalString(item.ownerId), phone: optionalString(item.phone), country: optionalString(item.country),
    batch: optionalString(item.batch), idempotencyKey: optionalString(item.idempotencyKey),
    formId: optionalString(item.formId), formVersion: typeof item.formVersion === 'number' && Number.isInteger(item.formVersion) && item.formVersion > 0 ? item.formVersion : undefined,
    formValues: object(item.formValues) ? Object.fromEntries(Object.entries(item.formValues).filter(([key,value]) => !['__proto__','constructor','prototype'].includes(key) && typeof value === 'string').slice(0,50)) as Record<string,string> : undefined,
    consent: object(item.consent) && item.consent.purpose === 'request_processing' && typeof item.consent.acceptedAt === 'string' ? {purpose:'request_processing' as const,acceptedAt:item.consent.acceptedAt} : undefined,
    locale: ['fa', 'en', 'tr', 'ar', 'ru'].includes(string(item.locale)) ? item.locale as FrontRequest['locale'] : undefined,
    attachmentIds: Array.isArray(item.attachmentIds) ? item.attachmentIds.filter((id): id is string => typeof id === 'string') : [],
    version: typeof item.version === 'number' && Number.isInteger(item.version) && item.version > 0 ? item.version : 1,
  }));
}
