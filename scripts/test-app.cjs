const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname, '../js/app.js'),'utf8');
new vm.Script(source);
assert(!/^(<<<<<<<|=======|>>>>>>>)/m.test(source));
assert.equal((source.match(/form\.addEventListener\("submit"/g)||[]).length,1);
assert.equal((source.match(/entry\.id = editingId/g)||[]).length,1);
const helpers=source.slice(source.indexOf('function questionScale'),source.indexOf('let records = []'));
const qs=[{name:'zero',min:0,max:10,labels:'Good,,,,,Neutral,,,,,Poor'},
 {name:'sleepHours',min:[0,5,6,7,9],values:[4.5,5.5,6.5,8,9.5],labels:'Under 5,5 to 6,6 to 7,7 to 9,Over 9'},
 {name:'meals',values:[0,1,2,3,4],labels:'None,One,Two,Three,Four+'},
 {name:'caffeineTime',values:['none','morning'],labels:'No caffeine,Morning'},
 {name:'old',labels:'Very low,Low,Neutral,Good,Very good'}];
const ctx={QUESTIONS:qs};vm.createContext(ctx);vm.runInContext(helpers,ctx);
assert.equal(ctx.answerLabel('zero',0),'Good');assert.equal(ctx.answerLabel('zero',10),'Poor');
assert.equal(ctx.answerLabel('zero',1),null);assert.equal(ctx.answerLabel('sleepHours',8),'7 to 9');
assert.equal(ctx.answerLabel('meals',0),'None');assert.equal(ctx.answerLabel('caffeineTime','none'),'No caffeine');
assert.equal(ctx.answerLabel('old',1),'Very low');assert.equal(ctx.questionScale(qs[1]).min,1);
function node(tag){return {tag,children:[],append(...children){this.children.push(...children)}};}
const groups=[{dataset:{name:'zero',min:'0',max:'10',labels:qs[0].labels}},
 {dataset:{name:'meals',labels:qs[2].labels,values:JSON.stringify(qs[2].values)}},
 {dataset:{name:'symptomSeverity',labels:qs[4].labels}},
 {dataset:{name:'caffeineTime',labels:qs[3].labels,values:JSON.stringify(qs[3].values)}}].map(g=>Object.assign(node('div'),g));
groups[3].dataset.optional = 'true';
const render=source.slice(source.indexOf('document.querySelectorAll(".rating")'),source.indexOf('const contextFactors'));
vm.runInNewContext(render,{document:{querySelectorAll:()=>groups,createElement:node,createTextNode:text=>({text})}});
assert.equal(groups[0].children.length,11);assert.equal(groups[0].children[0].children[0].value,0);
assert.equal(groups[0].children[10].children[0].value,10);
assert.equal(groups[1].children[0].children[0].value,0);
assert.equal(groups[2].children.length,5);assert.equal(groups[2].children[0].children[0].value,1);
assert.equal(groups[3].children[0].children[0].value,'none');
assert.equal(groups[3].children[0].children[0].required,false);
assert.equal(groups[2].children[0].children[0].required,true);
const score=source.slice(source.indexOf('  const mental = QUESTIONS.filter'),source.indexOf('  entry.id = editingId'));
function scoring(questions,entry){const c={QUESTIONS:questions,entry};vm.createContext(c);vm.runInContext(helpers+score,c);return c.entry;}
assert.equal(scoring([{name:'mood',labels:qs[4].labels},{name:'sleepHours',mind:false,values:[4.5,8]}],{mood:4,sleepHours:8}).mind,4);
assert.equal(scoring([{name:'mood',labels:qs[4].labels},qs[0]],{mood:4,zero:0}).mind,null);
assert.equal(scoring([{name:'stressAMS',min:0,max:10,labels:qs[0].labels}],{stressAMS:0}).mind,null);
const validate=source.slice(source.indexOf('function validateStep('),source.indexOf('document.querySelector("#next-button").addEventListener'));
function sleepValid(questions,value,hours){const c={QUESTIONS:questions,panels:[{querySelectorAll:()=>[],querySelector:()=>null}],form:{elements:{date:{value:'2026-11-14',checkValidity:()=>true},sleepHours:{value}}},localDate:()=> '2026-11-14',sleepWindowHours:()=>hours,showError:()=>false};vm.createContext(c);vm.runInContext(validate,c);return c.validateStep(0);}
assert.equal(sleepValid([], '8',6),false);assert.equal(sleepValid([], '5',6),true);
assert.equal(sleepValid([qs[1]],'8',6),false);assert.equal(sleepValid([qs[1]],'5.5',6),true);
const history=source.slice(source.indexOf('    const answers = QUESTIONS.filter'),source.indexOf('    if (record.caffeineTime)'));
const card=node('card');
vm.runInNewContext(helpers+history,{QUESTIONS:qs,record:{zero:1,meals:0},card,element:(tag,text)=>({tag,text})});
assert(card.children[0].text.includes('zero: 1/10'));assert(card.children[0].text.includes('meals: None'));
console.log('PASS: 7 conflict blocks removed; syntax; single submit/save; 0-10 options and endpoint labels; explicit numeric/text choices; 1-5 symptom scale; no mixed-scale aggregate.');

// Exercise the real check-in submit handler, including its early duplicate guard.
const submitSource = source.slice(source.indexOf('form.addEventListener("submit"'), source.indexOf('function updateCount()'));
function submitDaily(existing, incoming, editingId = null, crew = 'c1') {
  let handler, saved, error;
  const form = { elements: {date: {value: incoming.date}}, addEventListener(_, fn) { handler = fn; } };
  const c = {form, currentStep: 0, lastStep: 0, panels: [], storageReady: true, editingId,
    records: existing, QUESTIONS: [], AMIGOS: {crewId: () => crew, crew: () => ({name: 'Rana'})},
    FormData: class { entries() {return Object.entries(incoming);} getAll() {return [];} },
    mine: () => existing.filter(r => r.crew === crew), localDate: () => incoming.date,
    showError: message => {error = message;}, persist: entries => {saved = entries; return true;},
    resetForm() {}, updateCount() {}, setView() {}, showToast() {}, crypto: require('node:crypto').webcrypto};
  vm.createContext(c); vm.runInContext(submitSource, c); handler({preventDefault() {}});
  return {saved, error};
}
const existingDaily = [{id: 'one', crew: 'c1', date: '2026-11-14', phase: 'pre'}];
assert(submitDaily(existingDaily, {date:'2026-11-14', phase:'during'}).error);
const editedDaily = submitDaily(existingDaily, {date:'2026-11-14', phase:'during'}, 'one');
assert.equal(editedDaily.saved.length, 1); assert.equal(editedDaily.saved[0].id, 'one');
assert.equal(editedDaily.saved[0].phase, 'during');
assert.equal(submitDaily(existingDaily, {date:'2026-11-14', phase:'during'}, null, 'c2').saved.length, 2);
console.log('PASS daily submit: one per date across phases, journal edit replaces entry, different crew may log same date.');
