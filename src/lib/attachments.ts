const DB='idealmakoo-local-files';
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore('files',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function storeAttachment(file:File):Promise<string>{
 if(file.size>5*1024*1024)throw new Error('File exceeds 5 MB');
 const db=await openDb();const id=crypto.randomUUID();
 await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put({id,file,name:file.name,type:file.type,createdAt:new Date().toISOString()});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();return id;
}
export async function getAttachment(id:string):Promise<{id:string;file:Blob;name:string}|undefined>{const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('files');const q=tx.objectStore('files').get(id);q.onsuccess=()=>{resolve(q.result);db.close();};q.onerror=()=>{reject(q.error);db.close();};});}
