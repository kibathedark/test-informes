// Numeración exclusiva por cuenta. Los bloques quedan disponibles sin conexión.
(()=>{
 const open=()=>new Promise((resolve,reject)=>{const req=indexedDB.open('genset-training-numbering-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('accounts');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(Error('No se pudo abrir la numeración local.'));req.onblocked=()=>reject(Error('Cierra las otras ventanas de Genset y vuelve a intentar.'));});
 function change(db,email,fn){return new Promise((resolve,reject)=>{const tx=db.transaction('accounts','readwrite'),store=tx.objectStore('accounts');let result;tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('No se pudo conservar la numeración en este equipo.'));const req=store.get(email);req.onsuccess=()=>{try{const row=req.result||{};result=fn(row);store.put(row,email)}catch(e){tx.abort();reject(e)}};});}
 window.GensetNumbers={create(email,api){
  const account=email.toLowerCase();let opened;const database=()=>opened||(opened=open());
  async function reserve(db,pending){let block;try{block=await api('number-block',{method:'POST',body:JSON.stringify({requestId:pending})})}catch(e){throw Error(e.message+' Si no tienes números reservados, conecta el equipo a Internet para continuar.')}if(!/^[A-T]$/.test(block.letter)||!Number.isInteger(block.start)||!Number.isInteger(block.end)||block.start<1||block.end<block.start||block.end>99999)throw Error('La reserva de numeración no es válida.');await change(db,account,row=>{if(row.pending===pending){row.letter=block.letter;row.next=block.start;row.end=block.end;delete row.pending}});}
  return {
   async prepare(){const db=await database();const pending=await change(db,account,row=>{if(Number.isInteger(row.next)&&row.next<=row.end)return null;row.pending=row.pending||crypto.randomUUID();return row.pending});if(pending)await reserve(db,pending);},
   async next(type){const prefix={levantamiento:'L',inspectiva:'I',filtros:'C'}[type];if(!prefix)throw Error('Selecciona el tipo de informe.');const db=await database();for(let i=0;i<6;i++){const claim=await change(db,account,row=>{if(Number.isInteger(row.next)&&row.next<=row.end){const n=row.next++;return {number:prefix+row.letter+'9'+String(n).padStart(5,'0')}}row.pending=row.pending||crypto.randomUUID();return {pending:row.pending}});if(claim.number)return claim.number;await reserve(db,claim.pending);}throw Error('La numeración está ocupada. Vuelve a intentar.');}
  };
 }};
})();
