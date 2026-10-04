const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function load(name){
  const candidatePaths=[path.join(__dirname,'../dist/'+name),path.join(__dirname,'../dist/client/'+name),path.join(__dirname,'../public/'+name)];
  const targetPath=candidatePaths.find(p=>fs.existsSync(p));
  const ctx={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(targetPath,'utf8'),ctx);return ctx.module.exports;
}
const N=load('engine.js'),C=load('command-engine.js');
const s=N.seed();s.incidents=s.reports.flatMap(r=>N.extract(r.text).map((f,i)=>({...f,id:r.id+i,report:r.id,well:r.well})));s.radius=10;s.same=false;
const stable=C.sample(0,s.depth,'normal'),loss=C.sample(0,s.depth,'loss'),influx=C.sample(0,s.depth,'influx');
assert.equal(C.alerts(s,stable,N).length,6);assert.equal(C.alerts(s,stable,N,50).length,0);
assert(C.alerts(s,loss,N)[0].probability>C.alerts(s,stable,N)[0].probability);
assert(C.alerts(s,influx,N)[1].probability>C.alerts(s,stable,N)[1].probability);
for(const a of C.alerts(s,stable,N)){assert(a.probability>=0&&a.probability<=100);assert(a.citations.length);assert(a.from>=50&&a.to<=500);assert(a.citations.every(f=>s.reports.some(r=>r.id===f.report)));}
s.incidents.forEach(f=>f.excluded=true);assert(C.alerts(s,loss,N).every(a=>a.citations.length===0&&a.confidence==='Insufficient'));
assert.equal(C.profile({...s.wells[0],demo:false}),null);
const score=C.similarity(s.wells[0],{...s.wells[1],demo:false},[],N,10);assert.equal(score.coverage,50);assert(score.score>=0&&score.score<=100);assert.equal(score.parts[2][2],null);
s.wells[1].depthType='TVD';s.incidents.forEach(f=>f.excluded=false);assert(!C.alerts(s,loss,N)[0].citations.some(f=>f.well===s.wells[1].id));
console.log('Command checks passed: scenario response, probability bounds, horizon, source linkage, exclusion, missing profiles, MD/TVD filtering.');
