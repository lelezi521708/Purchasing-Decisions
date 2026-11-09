const fs = require('fs');
(async () => {
 const target=db.getSiblingDB('comp7503');
 const batches=fs.readFileSync('/tmp/pw-c-update/pricewatch_batches.json','utf8').trim().split('\n').map(x=>EJSON.parse(x));
 const lines=fs.readFileSync('/tmp/pw-c-update/pricewatch_history.json','utf8').trim().split('\n');
 await target.pricewatch_history.createIndex({batchId:1,productCode:1,merchantCode:1},{unique:true});
 for(let i=0;i<lines.length;i+=500){
  const docs=lines.slice(i,i+500).map(x=>EJSON.parse(x));
  await target.pricewatch_history.bulkWrite(docs.map(r=>({updateOne:{filter:{batchId:r.batchId,productCode:r.productCode,merchantCode:r.merchantCode},update:{$setOnInsert:r},upsert:true}})),{ordered:true});
 }
 for(const b of batches){
  const count=await target.pricewatch_history.countDocuments({batchId:b.batchId});
  const quoted=await target.pricewatch_history.countDocuments({batchId:b.batchId,price:{$gt:0}});
  if(count!==b.recordCount || quoted!==b.quotedRecordCount) throw Error('Batch count mismatch: '+b.batchId);
  await target.pricewatch_batches.updateOne({_id:b._id},{$setOnInsert:b},{upsert:true});
 }
 print('PASS: imported/retained '+batches.length+' complete batches; existing records preserved.');
})().catch(e=>{print(e.stack);quit(1);});
