// Tests v5 — freshness, déclencheurs, passage unifié, post-its, extraction, export.
// Même technique de chargement que moteur.test.js : tout le moteur v5 est défini avant DOMContentLoaded.
const fs=require('fs');
let js=fs.readFileSync(__dirname+'/../lidia-cotation.html','utf8').split('<script>')[1].split('</script>')[0];
js=js.slice(0,js.indexOf('document.addEventListener("DOMContentLoaded"'))
  +'globalThis.__x5={freshness,nbRetards,computeTriggers,buildPassageRecord,makePostit,relevesAVoir,alertesOuvertes,alertesEnRetard,validerExtraction,extraireLocal,buildExport,toCSV,byId,SOCLE_J,CONSTANTES_J,PHOTO_PLAIE_J,ICOPE_J};';
global.localStorage={getItem:()=>null,setItem:()=>{}};
global.document={querySelector:()=>({value:'2026-08-22'})};
eval(js);
const X=globalThis.__x5;
let fails=0;
function T(name,fn){try{fn(ok=>{if(!ok)throw new Error("assertion")});console.log('✓',name);}catch(e){console.log('✗',name,'—',e.message);fails++;}}
function eq(a,b,msg){if(JSON.stringify(a)!==JSON.stringify(b))throw new Error((msg||'')+' attendu '+JSON.stringify(b)+' obtenu '+JSON.stringify(a));}
const TODAY='2026-08-24';
const dMoins=n=>{const d=new Date(TODAY+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-n);return d.toISOString().slice(0,10)};
const pat=o=>Object.assign({id:'p1',name:'M. T.',active:true,actIds:[],annee:null,sexe:'',commune:'',vitSeul:false,aidant:false,institution:false,pathos:[],nbMed:null,autonomie:'',bsi:false,adresse_par:'',plaie:false,socleDate:null,transmissions:[],postits:[]},o);
const tr=(type,date,extra)=>Object.assign({id:'t'+Math.random(),date:date+'T08:00:00',auteur:'AA',type,texte:''},extra||{});

/* ---------- Module 2 : freshness ---------- */
T('freshness — patient vide : missing/missing/na/na',()=>{
  const f=X.freshness(pat({}),TODAY);
  eq(f.socle.etat,'missing');eq(f.constantes.etat,'missing');eq(f.photo.etat,'na');eq(f.icope.etat,'na');});
T('freshness — socle limite 365 j = ok, 366 j = late',()=>{
  eq(X.freshness(pat({socleDate:dMoins(365)}),TODAY).socle.etat,'ok');
  eq(X.freshness(pat({socleDate:dMoins(366)}),TODAY).socle.etat,'late');});
T('freshness — constantes 35 j = ok, 36 j = late',()=>{
  eq(X.freshness(pat({transmissions:[tr('CONSTANTES',dMoins(35))]}),TODAY).constantes.etat,'ok');
  eq(X.freshness(pat({transmissions:[tr('CONSTANTES',dMoins(36))]}),TODAY).constantes.etat,'late');});
T('freshness — photo : na sans plaie, missing avec plaie, 15/16 j',()=>{
  eq(X.freshness(pat({plaie:false,transmissions:[tr('PHOTO',dMoins(2))]}),TODAY).photo.etat,'na');
  eq(X.freshness(pat({plaie:true}),TODAY).photo.etat,'missing');
  eq(X.freshness(pat({plaie:true,transmissions:[tr('PHOTO',dMoins(15))]}),TODAY).photo.etat,'ok');
  eq(X.freshness(pat({plaie:true,transmissions:[tr('PHOTO',dMoins(16))]}),TODAY).photo.etat,'late');});
T('freshness — icope : < 60 ans na, ≥ 60 missing, 120/121 j',()=>{
  eq(X.freshness(pat({annee:1967}),TODAY).icope.etat,'na');   // 59 ans
  eq(X.freshness(pat({annee:1966}),TODAY).icope.etat,'missing'); // 60 ans
  eq(X.freshness(pat({annee:1950,transmissions:[tr('ICOPE',dMoins(120))]}),TODAY).icope.etat,'ok');
  eq(X.freshness(pat({annee:1950,transmissions:[tr('ICOPE',dMoins(121))]}),TODAY).icope.etat,'late');});
T('freshness — transmission archivée ignorée',()=>{
  const p=pat({transmissions:[Object.assign(tr('CONSTANTES',dMoins(2)),{archive:true})]});
  eq(X.freshness(p,TODAY).constantes.etat,'missing');});
T('freshness — dernière transmission retenue (tri par date)',()=>{
  const p=pat({transmissions:[tr('CONSTANTES',dMoins(60)),tr('CONSTANTES',dMoins(3))]});
  eq(X.freshness(p,TODAY).constantes.etat,'ok');eq(X.freshness(p,TODAY).constantes.jours,3);});
T('nbRetards — compte late + missing',()=>{
  eq(X.nbRetards(X.freshness(pat({annee:1950,plaie:true}),TODAY)),4);
  eq(X.nbRetards(X.freshness(pat({socleDate:TODAY,transmissions:[tr('CONSTANTES',TODAY)]}),TODAY)),0);});

/* ---------- Module 3 : déclencheurs ---------- */
T('trigger — pansement lourd sans photo → proposition photo',()=>{
  const r=X.computeTriggers(pat({}),['pans4'],null,TODAY);
  eq(r.props[0].type,'photo');});
T('trigger — AMI 2,02 (pans1) → photo + bascule plaie',()=>{
  const r=X.computeTriggers(pat({plaie:false}),['pans1'],null,TODAY);
  eq(r.props[0].type,'photo');eq(r.setPlaie,true);});
T('trigger — photo < 15 j : pas de proposition photo',()=>{
  const p=pat({plaie:true,transmissions:[tr('PHOTO',dMoins(3))]});
  const r=X.computeTriggers(p,['pans4'],null,TODAY);
  eq(r.props.some(x=>x.type==='photo'),false);});
T('trigger — bilan de plaie AMI 11 → photo avec champ surface',()=>{
  const r=X.computeTriggers(pat({}),['bilan_plaie'],null,TODAY);
  eq(r.props[0].type,'photo');eq(r.props[0].surface,true);});
T('trigger — BSI + socle non ok → revalidation socle ; socle ok → rien',()=>{
  const r1=X.computeTriggers(pat({}),['bsc'],null,TODAY);
  eq(r1.props.some(x=>x.type==='socle'),true);
  const r2=X.computeTriggers(pat({socleDate:dMoins(10)}),['bsc'],null,TODAY);
  eq(r2.props.some(x=>x.type==='socle'),false);});
T('trigger — acte chez ≥ 60 ans avec icope missing → ICOPE ; < 60 ans → rien',()=>{
  eq(X.computeTriggers(pat({annee:1950}),['inj'],null,TODAY).props.some(x=>x.type==='icope'),true);
  eq(X.computeTriggers(pat({annee:1990}),['inj'],null,TODAY).props.some(x=>x.type==='icope'),false);});
T('trigger — injection/perfusion + constantes late/missing → constantes',()=>{
  eq(X.computeTriggers(pat({}),['inj'],null,TODAY).props.some(x=>x.type==='constantes'),true);
  eq(X.computeTriggers(pat({}),['perf14'],null,TODAY).props.some(x=>x.type==='constantes'),true);
  const p=pat({transmissions:[tr('CONSTANTES',dMoins(2))]});
  eq(X.computeTriggers(p,['inj'],null,TODAY).props.some(x=>x.type==='constantes'),false);});
T('trigger — pansement seul : pas de proposition constantes',()=>{
  eq(X.computeTriggers(pat({}),['pans1'],null,TODAY).props.some(x=>x.type==='constantes'),false);});
T('trigger — jamais plus de 2 propositions, priorité photo > icope > constantes > socle',()=>{
  const r=X.computeTriggers(pat({annee:1940}),['pans4','inj','bsc'],null,TODAY);
  eq(r.props.length,2);eq(r.props[0].type,'photo');eq(r.props[1].type,'icope');});

/* ---------- Module 1 : validation du passage ---------- */
const draft=o=>Object.assign({acts:[],trans:{libre:'',evt:null,cst:null,obs:null,icope:null,photo:null},props:[],socle:null},o);
const act=id=>JSON.parse(JSON.stringify(X.byId(id)));
T('passage — cotation sans transmission → tracé transmission:none',()=>{
  const r=X.buildPassageRecord(pat({}),draft({acts:[act('inj')]}),TODAY+'T08:00:00','AL');
  eq(r.pass.transmission,'none');eq(r.transmissions.length,0);eq(r.pass.actes[0].id,'inj');});
T('passage — ICOPE incomplet rejeté (les 6 domaines requis)',()=>{
  const r=X.buildPassageRecord(pat({}),draft({trans:{libre:'',evt:null,cst:null,obs:null,photo:null,icope:{mobilite:'ok'}}}),TODAY+'T08:00:00','AL');
  eq(!!r.error,true);});
T('passage — ICOPE complet : nbAlerts compté',()=>{
  const ic={mobilite:'ok',cognition:'alerte',nutrition:'ok',humeur:'alerte',vision:'ok',audition:'ok'};
  const r=X.buildPassageRecord(pat({}),draft({trans:{libre:'',evt:null,cst:null,obs:null,photo:null,icope:ic}}),TODAY+'T08:00:00','AL');
  const t=r.transmissions.find(x=>x.type==='ICOPE');
  eq(t.nbAlerts,2);eq(t.passageId,r.pass.id);});
T('passage — constantes vides → aucune transmission CONSTANTES',()=>{
  const r=X.buildPassageRecord(pat({}),draft({trans:{libre:'',evt:null,obs:null,icope:null,photo:null,cst:{ta:'',fc:'',spo2:'',temp:'',gly:'',poids:''}}}),TODAY+'T08:00:00','AL');
  eq(r.transmissions.length,0);});
T('passage — événement, constantes, libre, photo avec surface',()=>{
  const d=draft({trans:{libre:'RAS sinon',evt:{mot:'HOSPIT',texte:'SAMU 15h'},cst:{ta:'13/8',fc:'',spo2:'',temp:'',gly:'',poids:''},obs:null,icope:null,photo:{surface:'12'}}});
  const r=X.buildPassageRecord(pat({}),d,TODAY+'T08:00:00','AL');
  const types=r.transmissions.map(t=>t.type).sort();
  eq(types,['CONSTANTES','EVENEMENT','LIBRE','PHOTO']);
  eq(r.transmissions.find(t=>t.type==='EVENEMENT').mot,'HOSPIT');
  eq(r.transmissions.find(t=>t.type==='PHOTO').texte.includes('12 cm²'),true);
  eq(r.transmissions.every(t=>t.passageId===r.pass.id),true);eq(r.pass.transmissionIds.length,4);});
T('passage — refus de proposition tracé declined:true',()=>{
  const r=X.buildPassageRecord(pat({}),draft({acts:[act('inj')],props:[{type:'photo',declined:true}]}),TODAY+'T08:00:00','AL');
  eq(r.pass.propositions,[{type:'photo',declined:true}]);});
T('passage — première cotation plaie → setPlaie',()=>{
  eq(X.buildPassageRecord(pat({plaie:false}),draft({acts:[act('pans1')]}),TODAY+'T08:00:00','AL').setPlaie,true);
  eq(X.buildPassageRecord(pat({plaie:true}),draft({acts:[act('pans1')]}),TODAY+'T08:00:00','AL').setPlaie,false);});

/* ---------- Module 4 : post-its ---------- */
T('postit — PERSO exclu de l export par construction',()=>{
  eq(X.makePostit('PERSO','code 1234','AL').exclureExport,true);
  eq(X.makePostit('RELEVE','x','AL').exclureExport,false);});
T('postit — RELEVE visible pour B, pas pour A, disparaît après Lu',()=>{
  const pi=X.makePostit('RELEVE','clé sous le pot','AA');
  const ps=[pat({postits:[pi]})];
  eq(X.relevesAVoir(ps,'BB').length,1);
  eq(X.relevesAVoir(ps,'AA').length,0);
  pi.luPar.push('BB');
  eq(X.relevesAVoir(ps,'BB').length,0);});
T('postit — alerte > 48 h détectée',()=>{
  const now=Date.parse('2026-08-24T12:00:00');
  const vieille=Object.assign(X.makePostit('ALERTE','vieille','AA'),{date:'2026-08-22T10:00:00'});
  const recente=Object.assign(X.makePostit('ALERTE','récente','AA'),{date:'2026-08-23T14:00:00'});
  const ps=[pat({postits:[vieille,recente]})];
  eq(X.alertesOuvertes(ps).length,2);
  eq(X.alertesEnRetard(ps,now).length,1);
  vieille.traite=true;
  eq(X.alertesEnRetard(ps,now).length,0);});

/* ---------- Module 5 : extraction ---------- */
T('extraction — schéma fermé : mot inconnu rejeté',()=>{
  const v=X.validerExtraction({mot:'FUGUE'});
  eq(v.ok,false);eq(v.data.mot,null);});
T('extraction — clé hors schéma rejetée, clés valides conservées',()=>{
  const v=X.validerExtraction({cst:{ta:'13/8',pouls:'72'},obs:{douleur:'5',humeur:'triste'}});
  eq(v.ok,false);eq(v.data.cst.ta,'13/8');eq(v.data.obs.douleur,'5');
  eq(Object.keys(v.data.cst).includes('pouls'),false);});
T('extraction — icope valeurs hors ok|alerte rejetées',()=>{
  eq(X.validerExtraction({icope:{mobilite:'moyen'}}).ok,false);
  eq(X.validerExtraction({icope:{mobilite:'alerte',cognition:'ok'}}).ok,true);});
T('extraireLocal — préfixes post-it (module 4)',()=>{
  eq(X.extraireLocal('Note pour la relève : sonner deux fois').postit.type,'RELEVE');
  eq(X.extraireLocal('Alerte : rougeur au talon').postit.type,'ALERTE');
  eq(X.extraireLocal('À signaler au médecin : douleur persistante').postit.type,'ALERTE');
  eq(X.extraireLocal('Mémo : code portail 4712').postit.type,'PERSO');});
T('extraireLocal — zéro invention sur texte neutre',()=>{
  const r=X.extraireLocal('RAS, passage sans particularité');
  eq(r.mot,null);eq(r.cst,null);eq(r.obs,null);eq(r.postit,null);});
T('extraireLocal — constantes et mot-clé',()=>{
  const r=X.extraireLocal('TA 13/8, pouls 72, saturation 96, hospitalisée ce matin');
  eq(r.cst.ta,'13/8');eq(r.cst.fc,'72');eq(r.cst.spo2,'96');eq(r.mot,'HOSPIT');});

/* ---------- Module 6 : export ---------- */
T('export — pseudonymisé : aucun nom, PERSO jamais exporté, compteurs post-its',()=>{
  const p1=pat({id:'pa',name:'Mme Kelloud',annee:1941,sexe:'F',commune:'Cugnaux',pathos:['Diabète'],plaie:true,
    transmissions:[Object.assign(tr('EVENEMENT',dMoins(3)),{mot:'CHUTE',texte:'chute nocturne'}),Object.assign(tr('CONSTANTES',dMoins(2)),{cst:{ta:'14/8',fc:'80',spo2:'',temp:'',gly:'',poids:''}})],
    postits:[X.makePostit('PERSO','code portail 4712','AL'),X.makePostit('ALERTE','médecin à rappeler','AL'),X.makePostit('RELEVE','clé sous le pot','AL')]});
  const pass=[{id:'x1',patientId:'pa',date:TODAY+'T08:00:00',auteur:'AL',actes:[],transmissionIds:[],propositions:[{type:'icope',declined:true}]}];
  const E=X.buildExport([p1],pass,TODAY);
  const csv=X.toCSV(E.head,E.rows);
  eq(csv.includes('Kelloud'),false,'nom dans le CSV');
  eq(csv.includes('code portail'),false,'PERSO dans le CSV');
  eq(csv.includes('clé sous le pot'),false,'texte RELEVE dans le CSV');
  eq(csv.includes('chute nocturne'),false,'texte événement dans le CSV patients');
  eq(E.rows[0].code,'P001');eq(E.rows[0].postits_releve,1);eq(E.rows[0].postits_alerte,1);
  eq(E.rows[0].der_ta,'14/8');eq(E.rows[0].refus_propositions,1);eq(E.rows[0].pathos,'Diabète');
  eq(E.events,[{code:'P001',date:dMoins(3),mot:'CHUTE'}]);
  eq(E.mapping[0].nom,'Mme Kelloud');
  const evCsv=X.toCSV(['code','date','mot'],E.events);
  eq(evCsv.includes('chute nocturne'),false,'texte libre dans CSV événements');});
T('export — échappement CSV (point-virgule, guillemets)',()=>{
  const p1=pat({id:'pa',name:'X',commune:'Foo;Bar "Z"'});
  const E=X.buildExport([p1],[],TODAY);
  eq(X.toCSV(E.head,E.rows).includes('"Foo;Bar ""Z"""'),true);});
T('export — injection de formule tableur neutralisée',()=>{
  const p1=pat({id:'pa',name:'X',commune:'=HYPERLINK("http://evil")'});
  const E=X.buildExport([p1],[],TODAY);
  const csv=X.toCSV(E.head,E.rows);
  eq(csv.includes(";=HYPERLINK"),false,'formule non neutralisée');
  eq(csv.includes("'=HYPERLINK"),true,'apostrophe absente');});
T('export — codes pseudonymes stables malgré suppression/insertion',()=>{
  const pa=pat({id:'pa',name:'A'}),pb=pat({id:'pb',name:'B'}),pc=pat({id:'pc',name:'C'});
  const E1=X.buildExport([pa,pb,pc],[],TODAY,{});
  eq(E1.rows.map(r=>r.code),['P001','P002','P003']);
  const E2=X.buildExport([pb,pc],[],TODAY,E1.codeMap); // pa supprimé
  eq(E2.rows.map(r=>r.code),['P002','P003'],'codes décalés après suppression');
  const E3=X.buildExport([pb,pat({id:'pd',name:'D'}),pc],[],TODAY,E2.codeMap); // pd inséré au milieu
  eq(E3.rows.find(r=>r.code==='P004')!==undefined,true,'nouveau patient sans nouveau code');
  eq(E3.rows[2].code,'P003','code de pc changé');});
T('export — lignes dupliquées (même id, « Passage soir ») exportées une seule fois',()=>{
  const matin=pat({id:'px',name:'M. X',transmissions:[tr('CONSTANTES',dMoins(2))]});
  const soir=pat({id:'px',name:'M. X',transmissions:[]});
  const E=X.buildExport([matin,soir],[{id:'q1',patientId:'px',date:TODAY+'T08:00:00',auteur:'AL',actes:[],transmissionIds:[],propositions:[]}],TODAY,{});
  eq(E.rows.length,1);eq(E.rows[0].nbPassages,1);eq(E.rows[0].nbConstantes,1);});
T('extraction — valeur d observation hors liste fermée rejetée',()=>{
  const v=X.validerExtraction({obs:{douleur:'insupportable',chute:'oui'}});
  eq(v.ok,false);eq(v.data.obs.douleur,'');eq(v.data.obs.chute,'oui');});

if(fails){console.log(fails+' test(s) v5 en échec');process.exit(1);}
console.log('Tous les tests v5 passent.');
