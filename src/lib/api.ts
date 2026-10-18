import type { FrontRequest } from '@/types/frontend';
import type { Rfc9457ProblemDetails } from '@/types/domain';
export class ApiError extends Error { constructor(public problem:Rfc9457ProblemDetails){super(problem.detail);this.name='ApiError';} }
export interface PageResult<T>{items:T[];total:number;page:number;pageSize:number}
/** The fetch boundary is intentionally separate from views; no provider secrets belong in this module. */
export class HttpClient{
 constructor(private baseUrl=process.env.NEXT_PUBLIC_API_BASE_URL||'/api/v1'){}
 async request<T>(path:string,options:RequestInit={}):Promise<T>{
  const response=await fetch(this.baseUrl+path,{...options,credentials:'include',headers:{'Content-Type':'application/json',...options.headers}});
  if(!response.ok){const problem=await response.json().catch(()=>({title:response.statusText,detail:response.statusText,status:response.status}));throw new ApiError(problem as Rfc9457ProblemDetails);}
  if(response.status===204)return undefined as T;return response.json() as Promise<T>;
 }
}
export interface RequestRepository{list():Promise<FrontRequest[]>;create(input:Omit<FrontRequest,'id'|'createdAt'>,idempotencyKey:string):Promise<FrontRequest>;update(id:string,patch:Partial<FrontRequest>,expectedVersion:number):Promise<FrontRequest>}
export class HttpRequestRepository implements RequestRepository{
 constructor(private client=new HttpClient()){}
 list(){return this.client.request<FrontRequest[]>('/requests');}
 create(input:Omit<FrontRequest,'id'|'createdAt'>,key:string){return this.client.request<FrontRequest>('/requests',{method:'POST',headers:{'Idempotency-Key':key},body:JSON.stringify(input)});}
 update(id:string,patch:Partial<FrontRequest>,version:number){return this.client.request<FrontRequest>(`/requests/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'If-Match':String(version)},body:JSON.stringify(patch)});}
}
export const apiClient=new HttpClient();
export const apiRequests=new HttpRequestRepository(apiClient);
export const dataMode=process.env.NEXT_PUBLIC_DATA_MODE==='api'?'api':'local';
