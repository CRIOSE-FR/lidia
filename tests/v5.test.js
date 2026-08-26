// Tests v5 — freshness, déclencheurs, passage unifié, post-its, extraction, export.
// Même technique de chargement que moteur.test.js : tout le moteur v5 est défini avant DOMContentLoaded.
const fs=require('fs');
let js=fs.readFileSync(__dirname+'/../lidia-cotation.html','utf8').split('<script>')[1].split('</script>')[0];
js=js.slice(0,js.indexOf('document.addEventListener("DOMContentLoaded"'))
  +'globalThis.__x5={freshness,nbRetards,computeTriggers,buildPassageRecord,makePostit,relevesAVoir,alertesOuvertes,alertesEnRetard,validerExtraction,extraireLocal,anonymiserDictee,buildExport,toCSV,byId,SOCLE_J,CONSTANTES_J,PHOTO_PLAIE_J,ICOPE_J,'
  +'SURFACE_J,BILAN_CHIR_J,PLAIE_LOC,PLAIE_LAT,PLAIE_ETIO,PLAIE_STADES,PLAIE_INTERV,PLAIE_ADR,PLAIE_IPS,PLAIE_SUIVI,REF_LIT,REF_EXSUDAT,REF_ISO,REF_PERI,REF_PANS,REF_ORIENT,CLOTURE_ISSUES,'
  +'plaiesActives,validerPlaie,validerRefection,validerCloture,plaieFraicheur,delaiCicatrisation,dernRefection,refDelaiLbl,refectionsOrphelines,appliquerPlaiesActions,ciblerPlaie,'
  +'DOULEUR_EN,ALGOPLUS_ITEMS,ALGOPLUS_LBL,evaTranche,algoplusScore,migrerDouleur,douleurRenseignee,normaliserDouleur,proposerAlgoplus,dernierIcopeDate};';
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
T('passage — dictée jamais analysée → transmission LIBRE automatique',()=>{
  const r=X.buildPassageRecord(pat({}),draft({acts:[act('inj')],dictee:'TA 13/8, tout va bien'}),TODAY+'T08:00:00','AL');
  eq(r.transmissions.length,1);eq(r.transmissions[0].type,'LIBRE');
  eq(r.transmissions[0].texte.includes('TA 13/8'),true);
  eq(r.pass.transmission,undefined,'transmission:none malgré la dictée');});
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
  const v=X.validerExtraction({cst:{ta:'13/8',pouls:'72'},obs:{douleur:'4-6',humeur:'triste'}});
  eq(v.ok,false);eq(v.data.cst.ta,'13/8');eq(v.data.obs.douleur,'4-6');
  eq(Object.keys(v.data.cst).includes('pouls'),false);});
T('extraction — icope valeurs hors ok|alerte rejetées',()=>{
  eq(X.validerExtraction({icope:{mobilite:'moyen'}}).ok,false);
  eq(X.validerExtraction({icope:{mobilite:'alerte',cognition:'ok'}}).ok,true);});
T('extraireLocal — préfixes post-it (module 4)',()=>{
  eq(X.extraireLocal('Note pour la relève : sonner deux fois').postit.type,'RELEVE');
  eq(X.extraireLocal('Alerte : rougeur au talon').postit.type,'ALERTE');
  eq(X.extraireLocal('À signaler au médecin : douleur persistante').postit.type,'ALERTE');
  eq(X.extraireLocal('Mémo : code portail 4712').postit.type,'PERSO');});
T('anonymiserDictee — nom du patient retiré avant envoi IA',()=>{
  eq(X.anonymiserDictee('Mme Kelloud va mieux, TA 13/8, mme kelloud reste fatiguée','Mme Kelloud'),'le patient va mieux, TA 13/8, le patient reste fatiguée');
  eq(X.anonymiserDictee('M. D. a chuté','M. D.'),'le patient a chuté');
  eq(X.anonymiserDictee('RAS',''),'RAS');});
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
  eq(E.events,[{code:'P001',date:dMoins(3),mot:'CHUTE',liee_plaie:''}]);
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

/* ---------- Module 7 : plaies (spec Module Plaies v5.0) ---------- */
const PL=o=>Object.assign({id:'pl1',patientId:'pa',date_debut:dMoins(40),localisation:'Jambe',lateralite:'D',etiologie:'Traumatique',suivi_specialise:'Non',refections:[],cloture:null},o);
const RF=o=>Object.assign({lit:'Fibrineux',exsudat:'Modéré',iso:'Aucun signe'},o);
T('plaies — listes fermées conformes à la spec (tailles exactes)',()=>{
  eq(X.PLAIE_LOC.length,11);eq(X.PLAIE_ETIO.length,10);eq(X.PLAIE_LAT,['D','G','Médian','NA']);
  eq(X.PLAIE_STADES,['1','2','3','4','Non stadable']);eq(X.PLAIE_INTERV.length,7);eq(X.PLAIE_ADR.length,5);
  eq(X.PLAIE_SUIVI.length,4);eq(X.REF_LIT,['Épidermisé','Bourgeonnant','Fibrineux','Nécrotique']);
  eq(X.REF_EXSUDAT,['Absent','Modéré','Abondant']);eq(X.REF_ISO.length,4);eq(X.REF_PERI.length,3);
  eq(X.REF_PANS.length,10);eq(X.REF_ORIENT.length,3);eq(X.CLOTURE_ISSUES.length,7);
  eq(X.SURFACE_J,15);eq(X.BILAN_CHIR_J,30);});
T('validerPlaie — minimal valide, champs hors schéma ignorés',()=>{
  const v=X.validerPlaie({date_debut:dMoins(10),localisation:'Sacrum',lateralite:'NA',etiologie:'Traumatique',suivi_specialise:'Non',douleur:'8',invente:'x'});
  eq(v.ok,true);eq(v.data.localisation,'Sacrum');eq(v.data.douleur,undefined,'champ interdit capté');eq(v.data.invente,undefined);});
T('validerPlaie — requis manquants et valeurs hors liste rejetés',()=>{
  eq(X.validerPlaie({}).ok,false);
  eq(X.validerPlaie({date_debut:dMoins(1),localisation:'Nez',lateralite:'D',etiologie:'Traumatique',suivi_specialise:'Non'}).ok,false);});
T('validerPlaie — escarre : stade initial requis (1|2|3|4|Non stadable)',()=>{
  const base={date_debut:dMoins(5),localisation:'Sacrum',lateralite:'NA',etiologie:'Escarre',suivi_specialise:'Non'};
  eq(X.validerPlaie(base).ok,false);
  const v=X.validerPlaie(Object.assign({stade_initial:'3'},base));eq(v.ok,true);eq(v.data.stade_initial,'3');});
T('validerPlaie — chirurgicale : intervention + date opératoire + adresseur requis',()=>{
  const base={date_debut:dMoins(5),localisation:'Abdomen',lateralite:'NA',etiologie:'Plaie chirurgicale',suivi_specialise:'Non'};
  eq(X.validerPlaie(base).ok,false);
  const v=X.validerPlaie(Object.assign({type_intervention:'Digestif',date_operatoire:dMoins(6),adresseur:'CHU'},base));
  eq(v.ok,true);eq(v.data.date_operatoire,dMoins(6));});
T('validerPlaie — ulcères : ips_connu requis, ips_valeur "0,75" parsée, invalide rejetée',()=>{
  const base={date_debut:dMoins(90),localisation:'Jambe',lateralite:'G',etiologie:'Ulcère veineux',suivi_specialise:'Consultation plaies'};
  eq(X.validerPlaie(base).ok,false);
  const v=X.validerPlaie(Object.assign({ips_connu:'Oui mesuré',ips_valeur:'0,75'},base));
  eq(v.ok,true);eq(v.data.ips_valeur,0.75);
  eq(X.validerPlaie(Object.assign({ips_connu:'Oui mesuré',ips_valeur:'haut'},base)).ok,false);
  eq(X.validerPlaie(Object.assign({ips_connu:'Non'},base)).ok,true);});
T('validerRefection — chemin 3 taps (lit, exsudat, Aucun signe) ; pansement absent = non renseigné',()=>{
  const v=X.validerRefection(RF({}));
  eq(v.ok,true);eq(v.data.iso,'Aucun signe');eq('pansement' in v.data,false,'pansement pré-rempli');});
T('validerRefection — lit/exsudat requis, valeurs hors liste rejetées',()=>{
  eq(X.validerRefection({exsudat:'Modéré',iso:'Aucun signe'}).ok,false);
  eq(X.validerRefection(RF({lit:'Sale'})).ok,false);
  eq(X.validerRefection(RF({exsudat:'Énorme'})).ok,false);});
T('validerRefection — ISO : détail avec ≥ 1 signe ok, aucun signe coché rejeté',()=>{
  const v=X.validerRefection(RF({iso:{ecoulement_purulent:true}}));
  eq(v.ok,true);eq(v.data.iso.ecoulement_purulent,true);eq(v.data.iso.dehiscence,false);
  eq(X.validerRefection(RF({iso:{}})).ok,false);
  eq(X.validerRefection(RF({iso:null})).ok,false);});
T('validerRefection — surface "12,5" → 12.5, texte rejeté ; pansement/orientation listes fermées',()=>{
  eq(X.validerRefection(RF({surface_cm2:'12,5'})).data.surface_cm2,12.5);
  eq(X.validerRefection(RF({surface_cm2:'grande'})).ok,false);
  eq(X.validerRefection(RF({pansement:'Inchangé'})).data.pansement,'Inchangé');
  eq(X.validerRefection(RF({pansement:'Sparadrap'})).ok,false);
  eq(X.validerRefection(RF({orientation:'Urgences'})).data.orientation,'Urgences');
  eq(X.validerRefection(RF({orientation:'Pharmacie'})).ok,false);});
T('validerCloture — issue liste fermée',()=>{
  eq(X.validerCloture({issue:'Cicatrisée'}).ok,true);
  eq(X.validerCloture({issue:'Guérie'}).ok,false);eq(X.validerCloture({}).ok,false);});
T('plaieFraicheur — surface : missing sans réfection, ok 15 j, late 16 j, na si clôturée',()=>{
  eq(X.plaieFraicheur(PL({}),TODAY).surface.etat,'missing');
  eq(X.plaieFraicheur(PL({refections:[{passageId:'x',date:dMoins(15),lit:'Fibrineux',exsudat:'Modéré',iso:'Aucun signe',surface_cm2:8}]}),TODAY).surface.etat,'ok');
  eq(X.plaieFraicheur(PL({refections:[{passageId:'x',date:dMoins(16),lit:'Fibrineux',exsudat:'Modéré',iso:'Aucun signe',surface_cm2:8}]}),TODAY).surface.etat,'late');
  eq(X.plaieFraicheur(PL({refections:[{passageId:'x',date:dMoins(2),lit:'Fibrineux',exsudat:'Modéré',iso:'Aucun signe'}]}),TODAY).surface.etat,'missing','réfection sans surface comptée');
  eq(X.plaieFraicheur(PL({cloture:{date:dMoins(1),issue:'Cicatrisée'}}),TODAY).surface.etat,'na');});
T('plaieFraicheur — bilan J30 chirurgical : ≥ 30 j sans clôture ni réfection avec surface',()=>{
  const chir=o=>PL(Object.assign({etiologie:'Plaie chirurgicale',type_intervention:'Orthopédie',date_operatoire:dMoins(30),adresseur:'Clinique',date_debut:dMoins(28)},o));
  eq(X.plaieFraicheur(chir({}),TODAY).bilanJ30,true);
  eq(X.plaieFraicheur(chir({date_operatoire:dMoins(29)}),TODAY).bilanJ30,false);
  eq(X.plaieFraicheur(chir({refections:[{passageId:'x',date:dMoins(3),lit:'Épidermisé',exsudat:'Absent',iso:'Aucun signe',surface_cm2:2}]}),TODAY).bilanJ30,false);
  eq(X.plaieFraicheur(chir({cloture:{date:dMoins(1),issue:'Cicatrisée'}}),TODAY).bilanJ30,false);
  eq(X.plaieFraicheur(PL({date_debut:dMoins(60)}),TODAY).bilanJ30,false,'non chirurgicale');});
T('delaiCicatrisation — chronique depuis date_debut, chirurgicale depuis date opératoire, null si ouverte',()=>{
  eq(X.delaiCicatrisation(PL({date_debut:dMoins(50),cloture:{date:dMoins(5),issue:'Cicatrisée'}})),45);
  eq(X.delaiCicatrisation(PL({etiologie:'Plaie chirurgicale',date_debut:dMoins(20),date_operatoire:dMoins(25),cloture:{date:dMoins(5),issue:'Cicatrisée'}})),20);
  eq(X.delaiCicatrisation(PL({})),null);});
T('appliquerPlaiesActions — ouverture + réfection liée au passage + clôture, entrée non mutée',()=>{
  const avant=[];
  const r1=X.appliquerPlaiesActions(avant,[{mode:'ouverture',id:'plN',data:{date_debut:TODAY,localisation:'Talon',lateralite:'G',etiologie:'Escarre',stade_initial:'2',suivi_specialise:'Non'}},
    {mode:'refection',plaieId:'plN',data:RF({})}],'pass9',TODAY,'pa');
  eq(r1.ok,true);eq(avant.length,0,'entrée mutée');eq(r1.plaies.length,1);
  eq(r1.plaies[0].patientId,'pa');eq(r1.plaies[0].refections[0].passageId,'pass9');eq(r1.plaies[0].refections[0].date,TODAY);
  const r2=X.appliquerPlaiesActions(r1.plaies,[{mode:'cloture',plaieId:'plN',data:{issue:'Cicatrisée'}}],'pass10',TODAY,'pa');
  eq(r2.ok,true);eq(r2.plaies[0].cloture.issue,'Cicatrisée');eq(r2.plaies[0].cloture.date,TODAY);
  eq(X.plaiesActives({plaies:r2.plaies}).length,0);
  const r3=X.appliquerPlaiesActions(r2.plaies,[{mode:'cloture',plaieId:'plN',data:{issue:'Décès'}}],'p11',TODAY,'pa');
  eq(r3.ok,false,'double clôture acceptée');});
T('appliquerPlaiesActions — action invalide : ok:false, erreurs remontées',()=>{
  const r=X.appliquerPlaiesActions([],[{mode:'ouverture',data:{localisation:'Jambe'}}],'p1',TODAY,'pa');
  eq(r.ok,false);eq(r.erreurs.length>0,true);
  eq(X.appliquerPlaiesActions([],[{mode:'refection',plaieId:'inconnu',data:RF({})}],'p1',TODAY,'pa').ok,false);});
T('refectionsOrphelines — pansement coté sans réfection alors qu\'une plaie était ouverte',()=>{
  const p=pat({id:'pa',plaies:[PL({id:'plA',date_debut:dMoins(10)})]});
  const passe=(id,d,acte,refDone)=>{if(refDone)p.plaies[0].refections.push({passageId:id,date:d,lit:'Fibrineux',exsudat:'Modéré',iso:'Aucun signe'});
    return {id,patientId:'pa',date:d+'T08:00:00',actes:[{id:acte,k:'AMI',c:2,l:''}],transmissionIds:[],propositions:[]};};
  const passes=[passe('g1',dMoins(3),'pans1',false),passe('g2',dMoins(2),'pans1',true),passe('g3',dMoins(1),'inj',false),passe('g4',dMoins(20),'pans1',false)];
  const o=X.refectionsOrphelines([p],passes);
  eq(o.map(x=>x.passageId),['g1'],'g2 a sa réfection, g3 pas un pansement, g4 avant l\'ouverture');
  eq(X.refectionsOrphelines([pat({id:'pb'})],[passe('g5',dMoins(1),'pans1',false)]).length,0,'patient sans plaie enregistrée compté');});
T('export — plaies et réfections pseudonymisées (P001-1), délai calculé, aucun nom',()=>{
  const p1=pat({id:'pat_secret_77',name:'Mme Kelloud',plaies:[
    PL({id:'plA',date_debut:dMoins(50),etiologie:'Ulcère veineux',ips_connu:'Oui mesuré',ips_valeur:0.8,
      refections:[{passageId:'x1',date:dMoins(4),lit:'Bourgeonnant',exsudat:'Modéré',iso:{rougeur_extensive:true,ecoulement_purulent:false,dehiscence:false,fievre_rapportee:false},surface_cm2:6.5,orientation:'Médecin traitant'}],
      cloture:{date:dMoins(1),issue:'Cicatrisée'}}),
    PL({id:'plB',date_debut:dMoins(3),localisation:'Talon',etiologie:'Escarre',stade_initial:'2'})]});
  const E=X.buildExport([p1],[],TODAY,{});
  eq(E.plaiesRows.length,2);eq(E.plaiesRows[0].plaie,'P001-1');eq(E.plaiesRows[1].plaie,'P001-2');
  eq(E.plaiesRows[0].delai_cicatrisation,49);eq(E.plaiesRows[0].issue,'Cicatrisée');eq(E.plaiesRows[0].ips_valeur,0.8);
  eq(E.plaiesRows[1].delai_cicatrisation,'');eq(E.plaiesRows[1].stade_initial,'2');
  eq(E.refRows.length,1);eq(E.refRows[0].plaie,'P001-1');eq(E.refRows[0].iso_rougeur,1);eq(E.refRows[0].iso_aucun,0);eq(E.refRows[0].surface_cm2,6.5);
  eq(E.rows[0].nb_plaies_actives,1);
  const csv=X.toCSV(E.plaiesHead,E.plaiesRows)+X.toCSV(E.refHead,E.refRows);
  eq(csv.includes('Kelloud'),false,'nom dans les CSV plaies');eq(csv.includes('pat_secret'),false,'patientId brut dans le CSV');});
T('export — dossiers dupliqués : plaies exportées une seule fois',()=>{
  const matin=pat({id:'px',name:'M. X',plaies:[PL({id:'plZ'})]});
  const soir=pat({id:'px',name:'M. X'});
  eq(X.buildExport([matin,soir],[],TODAY,{}).plaiesRows.length,1);});
T('appliquerPlaiesActions — ouverture_date posée (borne des orphelines), distincte de date_debut estimée',()=>{
  const r=X.appliquerPlaiesActions([],[{mode:'ouverture',id:'plO',data:{date_debut:dMoins(90),localisation:'Jambe',lateralite:'G',etiologie:'Traumatique',suivi_specialise:'Non'}}],'p1',TODAY,'pa');
  eq(r.ok,true);eq(r.plaies[0].ouverture_date,TODAY);eq(r.plaies[0].date_debut,dMoins(90));});
T('refectionsOrphelines — les passages antérieurs à l\'enregistrement de la plaie ne sont pas des oublis',()=>{
  const p=pat({id:'pa',plaies:[PL({id:'plA',date_debut:dMoins(90),ouverture_date:dMoins(5)})]});
  const mk=(id,d)=>({id,patientId:'pa',date:d+'T08:00:00',actes:[{id:'pans1',k:'AMI',c:2,l:''}],transmissionIds:[],propositions:[]});
  const o=X.refectionsOrphelines([p],[mk('h1',dMoins(50)),mk('h2',dMoins(20)),mk('n1',dMoins(2))]);
  eq(o.map(x=>x.passageId),['n1'],'historique antérieur à l\'ouverture compté comme orphelin');});
T('appliquerPlaiesActions — réouverture : clôture annulée et tracée, refusée sur plaie ouverte',()=>{
  const base=[PL({id:'plC',cloture:{date:dMoins(2),issue:'Cicatrisée'}})];
  const r=X.appliquerPlaiesActions(base,[{mode:'reouverture',plaieId:'plC',data:{}}],'p9',TODAY,'pa');
  eq(r.ok,true);eq(r.plaies[0].cloture,null);
  eq(r.plaies[0].reouvertures.length,1);eq(r.plaies[0].reouvertures[0].annulee.issue,'Cicatrisée');eq(r.plaies[0].reouvertures[0].passageId,'p9');
  eq(X.plaiesActives({plaies:r.plaies}).length,1);
  eq(X.appliquerPlaiesActions(r.plaies,[{mode:'reouverture',plaieId:'plC',data:{}}],'p10',TODAY,'pa').ok,false,'réouverture d\'une plaie ouverte acceptée');});
T('export — événement HOSPIT lié à une plaie : pseudonyme Pnnn-k, jamais l\'id brut',()=>{
  const p1=pat({id:'pat_secret_88',name:'M. Y',plaies:[PL({id:'plX_secret',date_debut:dMoins(30)})],
    transmissions:[Object.assign(tr('EVENEMENT',dMoins(1)),{mot:'HOSPIT',liee_plaie:'plX_secret'}),Object.assign(tr('EVENEMENT',dMoins(8)),{mot:'CHUTE'})]});
  const E=X.buildExport([p1],[],TODAY,{});
  const ev=E.events.find(x=>x.mot==='HOSPIT');
  eq(ev.liee_plaie,'P001-1');eq(E.events.find(x=>x.mot==='CHUTE').liee_plaie,'');
  const csv=X.toCSV(['code','date','mot','liee_plaie'],E.events);
  eq(csv.includes('plX_secret'),false,'id de plaie brut dans le CSV');});
T('refDelaiLbl — délai positif en jours, réfection future (rattrapage antidaté) datée explicitement',()=>{
  eq(X.refDelaiLbl({date:dMoins(6)},TODAY),'il y a 6 j');
  eq(X.refDelaiLbl({date:TODAY},dMoins(3)),'réfection du '+TODAY);});
T('extraction — réfection dictée : listes fermées acceptées, hors-liste rejeté, partiel permis',()=>{
  const v=X.validerExtraction({refection:{lit:'Fibrineux',exsudat:'Abondant',iso:'Aucun signe',pansement:'Hydrofibre',surface_cm2:'6,5',localisation:'Jambe',lateralite:'D'}});
  eq(v.ok,true);eq(v.data.refection.lit,'Fibrineux');eq(v.data.refection.surface_cm2,6.5);
  const v2=X.validerExtraction({refection:{lit:'Propre',pansement:'Sparadrap',douleur:'8'}});
  eq(v2.ok,false);eq(v2.data.refection,null,'valeurs hors liste conservées');
  const v3=X.validerExtraction({refection:{exsudat:'Modéré'}});
  eq(v3.ok,true);eq(v3.data.refection,{exsudat:'Modéré'},'réfection partielle');
  const v4=X.validerExtraction({refection:{iso:{ecoulement_purulent:true,invente:true}}});
  eq(v4.ok,false);eq(v4.data.refection.iso,{ecoulement_purulent:true},'signe hors schéma filtré');});
T('ciblerPlaie — 1 plaie = cible ; plusieurs = localisation/latéralité dictées, sinon null',()=>{
  const j_d=PL({id:'a',localisation:'Jambe',lateralite:'D'}),j_g=PL({id:'b',localisation:'Jambe',lateralite:'G'}),tal=PL({id:'c',localisation:'Talon',lateralite:'G'});
  eq(X.ciblerPlaie([j_d],null).id,'a','plaie unique sans indice');
  eq(X.ciblerPlaie([j_d,tal],{localisation:'Talon'}).id,'c');
  eq(X.ciblerPlaie([j_d,j_g],{localisation:'Jambe',lateralite:'G'}).id,'b');
  eq(X.ciblerPlaie([j_d,j_g],{localisation:'Jambe'}),null,'ambigu deviné');
  eq(X.ciblerPlaie([j_d,tal],null),null,'plusieurs sans indice deviné');
  eq(X.ciblerPlaie([],{localisation:'Jambe'}),null);});
T('extraireLocal — réfection : mots-clés stricts, zéro invention sur texte neutre',()=>{
  const r=X.extraireLocal('Réfection de la plaie du talon gauche, lit bourgeonnant, exsudat modéré, aucun signe infectieux, pansement inchangé');
  eq(r.refection.lit,'Bourgeonnant');eq(r.refection.exsudat,'Modéré');eq(r.refection.iso,'Aucun signe');
  eq(r.refection.pansement,'Inchangé');eq(r.refection.localisation,'Talon');eq(r.refection.lateralite,'G');
  eq(X.extraireLocal('Pansement refait ce matin, rien de particulier').refection,null,'réfection inventée');
  eq(X.extraireLocal('TA 13/8, tout va bien').refection,null);});

/* ---------- v5.4 : douleur double mode EN / ALGOPLUS (dictionnaire v1.4) ---------- */
T('evaTranche — bornes des tranches EN',()=>{
  eq(X.evaTranche(0),'0');eq(X.evaTranche(1),'1-3');eq(X.evaTranche(3),'1-3');
  eq(X.evaTranche(4),'4-6');eq(X.evaTranche(6),'4-6');eq(X.evaTranche(7),'7-10');eq(X.evaTranche(10),'7-10');
  eq(X.evaTranche(11),null);eq(X.evaTranche(-1),null);eq(X.evaTranche('x'),null);});
T('algoplusScore — score /5, seuil présente ≥ 2, complétude',()=>{
  eq(X.algoplusScore({}),{score:0,repondu:0,complet:false,presente:false});
  const tous=k=>{const o={};X.ALGOPLUS_ITEMS.forEach(i=>o[i]=false);o[k]=true;return o};
  eq(X.algoplusScore(tous('visage')).score,1);eq(X.algoplusScore(tous('visage')).presente,false);
  const deux={visage:true,corps:true,regard:false,plaintes:false,comportements:false};
  eq(X.algoplusScore(deux),{score:2,repondu:5,complet:true,presente:true});
  const cinq={};X.ALGOPLUS_ITEMS.forEach(i=>cinq[i]=true);
  eq(X.algoplusScore(cinq).score,5);eq(X.algoplusScore({visage:true}).complet,false);});
T('migrerDouleur — anciennes valeurs EVA/"oui" → mode EN',()=>{
  eq(X.migrerDouleur('5'),{mode:'EN',en:'4-6',presente:true});
  eq(X.migrerDouleur('0'),{mode:'EN',en:'0',presente:false});
  eq(X.migrerDouleur('oui'),{mode:'EN',presente:true});
  eq(X.migrerDouleur('7-10'),{mode:'EN',en:'7-10',presente:true});
  eq(X.migrerDouleur(''),'');eq(X.migrerDouleur('insupportable'),'');});
T('normaliserDouleur — ALGOPLUS incomplet bloqué, complet scoré par le moteur',()=>{
  eq(!!X.normaliserDouleur({mode:'ALGOPLUS',alg:{visage:true}}).error,true);
  const n=X.normaliserDouleur({mode:'ALGOPLUS',alg:{visage:true,regard:false,plaintes:false,corps:true,comportements:false}});
  eq(n.douleur,{mode:'ALGOPLUS',algoplus:[true,false,false,true,false],score:2,presente:true});
  eq(X.normaliserDouleur({mode:'EN',en:'1-3'}).douleur,{mode:'EN',en:'1-3',presente:true});
  eq(X.normaliserDouleur('oui').douleur,{mode:'EN',en:'',presente:true});
  eq(X.normaliserDouleur('').douleur,'');});
T('passage — douleur ALGOPLUS complète enregistrée, incomplète rejetée',()=>{
  const obs=d=>({libre:'',evt:null,cst:null,icope:null,photo:null,obs:{douleur:d,chute:'',confusion:'',peau:'',surcharge:'',observance:''}});
  const ok=X.buildPassageRecord(pat({}),draft({trans:obs({mode:'ALGOPLUS',alg:{visage:true,regard:false,plaintes:true,corps:false,comportements:false}})}),TODAY+'T08:00:00','AL');
  const t=ok.transmissions.find(x=>x.type==='OBS');
  eq(t.obs.douleur.score,2);eq(t.obs.douleur.presente,true);eq(t.obs.douleur.mode,'ALGOPLUS');
  const ko=X.buildPassageRecord(pat({}),draft({trans:obs({mode:'ALGOPLUS',alg:{visage:true}})}),TODAY+'T08:00:00','AL');
  eq(!!ko.error,true,'ALGOPLUS incomplet accepté');
  const en=X.buildPassageRecord(pat({}),draft({trans:obs({mode:'EN',en:'4-6'})}),TODAY+'T08:00:00','AL');
  eq(en.transmissions.find(x=>x.type==='OBS').obs.douleur,{mode:'EN',en:'4-6',presente:true});});
T('extraction — douleur : tranche EN acceptée, EVA brute rejetée, ALGOPLUS subset validé',()=>{
  eq(X.validerExtraction({obs:{douleur:'4-6'}}).data.obs.douleur,'4-6');
  eq(X.validerExtraction({obs:{douleur:'5'}}).ok,false,'EVA brute acceptée');
  const v=X.validerExtraction({obs:{douleur:{algoplus:{visage:true,corps:true}}}});
  eq(v.ok,true);eq(v.data.obs.douleur,{algoplus:{visage:true,corps:true}});
  const v2=X.validerExtraction({obs:{douleur:{algoplus:{visage:true,humeur:true}}}});
  eq(v2.ok,false);eq(v2.data.obs.douleur,{algoplus:{visage:true}},'clé hors schéma conservée');
  eq(X.validerExtraction({obs:{douleur:{algoplus:{}}}}).data.obs,null,'algoplus vide compté comme observation');
  eq(X.validerExtraction({obs:{douleur:{mode:'ALGOPLUS',algoplus:{visage:true}}}}).ok,false,'clé mode hors schéma acceptée');});
T('extraireLocal — signes ALGOPLUS stricts, dictée-piège sans invention',()=>{
  eq(X.extraireLocal('Il grimace au toucher et protège sa jambe droite').obs.douleur,{algoplus:{visage:true,corps:true}});
  eq(X.extraireLocal('Patient non communicant, gémit pendant le soin, agrippe le drap').obs.douleur,{algoplus:{plaintes:true,comportements:true}});
  eq(X.extraireLocal('Regard fixe, mâchoires serrées pendant la toilette').obs.douleur,{algoplus:{visage:true,regard:true}});
  eq(X.extraireLocal('EVA 5 ce matin').obs.douleur,'4-6');
  eq(X.extraireLocal('douleur à 8 malgré le traitement').obs.douleur,'7-10');
  eq(X.extraireLocal('Patient souriant pendant le soin, détendu, aucune plainte').obs,null,'invention sur dictée-piège');});
T('proposerAlgoplus — cognition alerte au dernier ICOPE, une seule fois, jamais si déjà en ALGOPLUS',()=>{
  const ic=c=>Object.assign(tr('ICOPE',dMoins(3)),{icope:{mobilite:'ok',cognition:c,nutrition:'ok',humeur:'ok',vision:'ok',audition:'ok'}});
  eq(X.proposerAlgoplus(pat({transmissions:[ic('alerte')]})),true);
  eq(X.proposerAlgoplus(pat({transmissions:[ic('ok')]})),false);
  eq(X.proposerAlgoplus(pat({transmissions:[]})),false);
  eq(X.proposerAlgoplus(pat({mode_douleur:'ALGOPLUS',transmissions:[ic('alerte')]})),false);
  eq(X.proposerAlgoplus(pat({algoplus_prop:{icope_date:dMoins(3),declined:true},transmissions:[ic('alerte')]})),false,'re-proposé malgré le refus tracé');
  eq(X.proposerAlgoplus(pat({algoplus_prop:{icope_date:dMoins(40),declined:true},transmissions:[ic('alerte')]})),true,'nouvel ICOPE sans nouvelle proposition');});
T('export — colonnes douleur_mode / douleur_en / douleur_algoplus_score (dernier relevé)',()=>{
  const oA={douleur:{mode:'ALGOPLUS',algoplus:[true,false,false,true,false],score:2,presente:true},chute:'',confusion:'',peau:'',surcharge:'',observance:''};
  const oE={douleur:{mode:'EN',en:'1-3',presente:true},chute:'',confusion:'',peau:'',surcharge:'',observance:''};
  const p1=pat({id:'pa',name:'A',transmissions:[Object.assign(tr('OBS',dMoins(9)),{obs:oE}),Object.assign(tr('OBS',dMoins(2)),{obs:oA})]});
  const E=X.buildExport([p1],[],TODAY,{});
  eq(E.rows[0].douleur_mode,'ALGOPLUS');eq(E.rows[0].douleur_en,'');eq(E.rows[0].douleur_algoplus_score,2);
  const p2=pat({id:'pb',name:'B',transmissions:[Object.assign(tr('OBS',dMoins(2)),{obs:oE})]});
  eq(X.buildExport([p2],[],TODAY,{}).rows[0].douleur_en,'1-3');
  const p3=pat({id:'pc',name:'C',transmissions:[Object.assign(tr('OBS',dMoins(2)),{obs:{douleur:'7',chute:'',confusion:'',peau:'',surcharge:'',observance:''}})]});
  eq(X.buildExport([p3],[],TODAY,{}).rows[0].douleur_en,'7-10','legacy non migrée à la volée');});

if(fails){console.log(fails+' test(s) v5 en échec');process.exit(1);}
console.log('Tous les tests v5 passent.');
