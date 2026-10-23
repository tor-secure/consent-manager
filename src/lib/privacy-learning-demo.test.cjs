const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createLearningDemo,learningDemoReducer:reduce,currentDemoPurposes:current,inspectedDemoEvent:inspected}=require('../../.tmp/compiled/src/lib/privacy-learning-demo.js');
test('draft choices do not apply until recorded; snapshots survive withdrawal and inspection',()=>{
 let s=createLearningDemo();
 s=reduce(s,{type:'draft',purpose:'analytics',value:true});
 assert.deepEqual(current(s),{analytics:false,advertising:false});
 s=reduce(s,{type:'record',timestamp:'2026-10-02T00:00:00Z'});
 assert.deepEqual(current(s),{analytics:true,advertising:false});
 const before=s;
 s=reduce(s,{type:'withdraw',timestamp:'2026-10-02T00:01:00Z'});
 assert.equal(before.history.length,1); assert.equal(before.history[0].purposes.analytics,true);
 assert.deepEqual(current(s),{analytics:false,advertising:false});
 assert.equal(reduce(s,{type:'withdraw',timestamp:'later'}),s);
 s=reduce(s,{type:'inspect',sequence:1});
 assert.equal(inspected(s).purposes.analytics,true); assert.equal(s.status,'withdrawn');
 assert.equal(current(s).analytics,false);
 assert.equal(reduce(s,{type:'inspect',sequence:99}),s);
 assert.deepEqual(reduce(s,{type:'reset'}),createLearningDemo());
});
test('bounded history preserves monotonic identifiers and immutable purpose snapshots',()=>{
 let s=createLearningDemo();
 for(let i=0;i<20;i++) s=reduce(s,{type:'record',timestamp:String(i)});
 assert.equal(s.history.length,12); assert.equal(s.history[0].sequence,9); assert.equal(s.sequence,20);
 const old=s.history.at(-1);
 s=reduce(s,{type:'draft',purpose:'advertising',value:true});
 assert.equal(old.purposes.advertising,false); assert.equal(current(s).advertising,false);
});
