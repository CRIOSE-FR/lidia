// Tests du moteur NGAP — toute modification du moteur doit les laisser verts.
const fs=require('fs');
let js=fs.readFileSync(__dirname+'/../lidia-cotation.html','utf8').split('<script>')[1].split('</script>')[0];
js=js.slice(0,js.indexOf('document.addEventListener("DOMContentLoaded"'))
  +'globalThis.__x={computeDay,byId,setDay:v=>{day=v}};';
global.localStorage={getItem:()=>null,setItem:()=>{}};
global.document={querySelector:()=>({value:'2026-08-22'})};
eval(js);
const X=globalThis.__x,c=id=>JSON.parse(JSON.stringify(X.byId(id)));
let fails=0;
function T(name,day,checks){
  X.setDay(day);const D=X.__lastD=X.computeDay();
  for(const [desc,fn] of checks){const ok=fn(D);if(!ok){console.log('✗',name,'—',desc);fails++;}else console.log('✓',name,'—',desc);}
}
const P=(label,heure,ids)=>({label,heure,acts:ids.map(c)});
const base={date:'2026-08-22',km:0,note:'',ctx:{domicile:true}};

T('11B simple',{...base,passages:[P('M','09:00',['pans4','inj','prelev'])]},[
 ['pansement 100%',D=>D.res[0].lines.find(l=>l.a.id==='pans4').taux===100],
 ['injection 50%',D=>D.res[0].lines.find(l=>l.a.id==='inj').taux===50],
 ['ponction veineuse hors cumul 100%',D=>D.res[0].lines.find(l=>l.a.id==='prelev').taux===100],
 ['MCI présente',D=>D.res[0].majs.some(m=>m.code==='MCI')]]);

T('perfusions dérogatoires',{...base,passages:[P('M','08:30',['perf14','perf9'])]},[
 ['AMI 14 100%',D=>D.res[0].lines.find(l=>l.a.id==='perf14').taux===100],
 ['AMI 9 100%',D=>D.res[0].lines.find(l=>l.a.id==='perf9').taux===100]]);

T('BSI journée liée',{...base,km:2,passages:[P('Kelloud','07:10',['bsc','insu','dextro']),P('Kelloud','18:30',['insu','dextro'])]},[
 ['pas de nuit sans case cochée',D=>!D.res[0].majs.some(m=>m.code==='N')],
 ['BSC 100% matin',D=>D.res[0].lines.find(l=>l.a.id==='bsc').taux===100],
 ['insulines AMX 50% matin',D=>D.res[0].lines.filter(l=>l.a.id==='insu'||l.a.id==='dextro').every(l=>l.taux===50&&l.code.startsWith('AMX'))],
 ['soir en AMX 50%, pas de MAU',D=>D.res[1].lines.every(l=>l.taux===50)&&!D.res[1].majs.some(m=>m.code==='MAU')],
 ['IFI et pas IFD',D=>D.res[0].majs.some(m=>m.code==='IFI')&&!D.res[0].majs.some(m=>m.code==='IFD')],
 ['IFI toujours là',D=>D.res[0].majs.some(m=>m.code==='IFI')]]);

T('nuit cochée sur le passage',{...base,passages:[Object.assign(P('M','07:10',['insu','dextro']),{nuit:true})]},[
 ['N appliquée',D=>D.res[0].majs.some(m=>m.code==='N')&&Math.abs(D.res[0].majs.find(m=>m.code==='N').amt-9.15)<0.005]]);

T('nuit cochée 23h30 = 18,30',{...base,passages:[Object.assign(P('N','23:30',['inj']),{nuit:true})]},[
 ['NUIT2',D=>Math.abs((D.res[0].majs.find(m=>m.code==='N')||{}).amt-18.30)<0.005]]);

T('pansement courant inclus BSI',{...base,passages:[P('M','09:00',['bsc','pans1'])]},[
 ['pansement 0%',D=>D.res[0].lines.find(l=>l.a.id==='pans1').taux===0]]);

T('MAU acte unique',{...base,passages:[P('M','09:00',['prelev'])]},[
 ['MAU présente',D=>D.res[0].majs.some(m=>m.code==='MAU')]]);

T('AMI 4 interdit jour de pose',{...base,passages:[P('M','09:00',['perf14']),P('S','18:00',['perf4'])]},[
 ['alerte stop',D=>D.alerts.some(a=>a.t==='stop'&&a.m.includes('AMI 4'))]]);

T('cancéreux art. 4',{...base,ctx:{domicile:true,cancer:true},passages:[P('M','09:00',['perf14'])]},[
 ['requalifié coef 15',D=>D.res[0].lines[0].code.includes('15')]]);

T('dimanche/férié',{...base,ctx:{domicile:true,ferie:true},passages:[P('M','10:00',['prelev'])]},[
 ['majoration F présente',D=>D.res[0].majs.some(m=>m.code==='F')],
 ['non cumulée avec nuit',D=>!D.res[0].majs.some(m=>m.code==='N')]]);

T('cabinet : pas de déplacement ni MAU',{...base,ctx:{domicile:false},passages:[P('M','10:00',['prelev'])]},[
 ['pas d IFD/IFI',D=>!D.res[0].majs.some(m=>m.code==='IFD'||m.code==='IFI')],
 ['MAU maintenue (art. 23.1 : cabinet ou domicile)',D=>D.res[0].majs.some(m=>m.code==='MAU')]]);

T('cas limite : AMI 5 avec AMI 9',{...base,passages:[P('M','10:00',['perf9','perf5'])]},[
 ['alerte stop incompatibilité',D=>D.res[0].alerts.some(a=>a.t==='stop')]]);

T('cas limite : 3 actes non dérogatoires',{...base,passages:[P('M','10:00',['pans1','fils','aero'])]},[
 ['un seul à 100%',D=>D.res[0].lines.filter(l=>l.taux===100).length===1],
 ['un à 50%',D=>D.res[0].lines.filter(l=>l.taux===50).length===1],
 ['un à 0%',D=>D.res[0].lines.filter(l=>l.taux===0).length===1]]);

T('enfant : MIE cumulable avec MAU',{...base,ctx:{domicile:true,enfant:true},passages:[P('M','10:00',['inj'])]},[
 ['MAU + MIE + IFD = 10,40',D=>Math.abs(D.res[0].total-10.40)<0.005]]);

T('nuit prime sur dimanche',{...base,date:'2026-08-23',ctx:{domicile:true,palliatif:true,nuit:true},passages:[P('S','21:00',['pans4'])]},[
 ['nuit retenue, pas F',D=>D.res[0].majs.some(m=>m.code==='N')&&!D.res[0].majs.some(m=>m.code==='F')],
 ['MCI une seule fois',D=>D.res[0].majs.filter(m=>m.code==='MCI').length===1]]);

T('bascule tarifaire 06/11/2026',{...base,date:'2026-11-07',passages:[P('M','10:00',['prelev'])]},[
 ['AMI 1,5 = 5,03 €',D=>Math.abs(D.res[0].lines[0].amt-5.03)<0.005]]);

T('IK montagne 10 km',{...base,km:10,ctx:{domicile:true,montagne:true},passages:[P('M','10:00',['inj'])]},[
 ['IKM = 9,00 € (20 AR − 2) × 0,50',D=>Math.abs((D.res[0].majs.find(m=>m.code==='IKM')||{}).amt-9)<0.005]]);

T('groupe art. 5 bis classé comme un acte',{...base,passages:[P('M','09:00',['insu','dextro','pans4'])]},[
 ['pansement principal 100%',D=>D.res[0].lines.find(l=>l.a.id==='pans4').taux===100],
 ['groupe diab entier à 50%',D=>D.res[0].lines.filter(l=>l.a.tags&&l.a.tags.diab).every(l=>l.taux===50)]]);

T('arrondi au centime par ligne',{...base,passages:[P('M','10:00',['perf9','perf41'])]},[
 ['AMI 4,1/2 = 6,46',D=>Math.abs(D.res[0].lines.find(l=>l.a.id==='perf41').amt-6.46)<0.001]]);

T('2e passage BSI couvert : IFI seule',{...base,km:2,passages:[P('M','07:30',['bsc']),Object.assign(P('S','18:30',[]),{forceDep:true})]},[
 ['soir : IFI présente',D=>D.res[1].majs.some(m=>m.code==='IFI')],
 ['soir : total = IFI',D=>Math.abs(D.res[1].total-2.75)<0.005]]);

if(fails){console.log(fails+' test(s) en échec');process.exit(1);}
console.log('Tous les tests moteur passent.');
