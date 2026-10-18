import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedAsset, cacheableResponse } from '../public/sw-policy.js';
const origin = 'https://factory.example';
test('offline cache excludes private routes, API, cross origin, query strings and non-GET requests', () => {
  for (const path of ['/admin','/api/v1/requests','/fa/account/requests','/en/auth/login','/media/resumes/cv.pdf','/media/official/catalog.jpg?token=private','https://other.example/media/official/image.jpg','/media/official/%2e%2e/private.jpg']) assert.equal(allowedAsset(path,origin),false,path);
  assert.equal(allowedAsset('/media/official/product.jpg',origin,'POST'),false);
  assert.equal(allowedAsset('/media/official/product.jpg',origin),true);
  assert.equal(allowedAsset('/fonts/Vazirmatn.woff2',origin),true);
});
test('explicit public cache header is required and cannot override private or no-store responses', () => {
  const response = headers => ({ok:true,type:'basic',redirected:false,headers:new Headers(headers)});
  assert.equal(cacheableResponse(response({})),false);
  assert.equal(cacheableResponse(response({'X-Public-Cache':'1'})),true);
  assert.equal(cacheableResponse(response({'X-Public-Cache':'1','Cache-Control':'private'})),false);
  assert.equal(cacheableResponse(response({'X-Public-Cache':'1','Cache-Control':'no-store'})),false);
  assert.equal(cacheableResponse({...response({'X-Public-Cache':'1'}),redirected:true}),false);
});
