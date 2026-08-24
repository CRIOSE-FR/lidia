// Scoring du jeu d'évaluation dictées (module 5).
// Usage :
//   node eval/score.js                          → extracteur hors-ligne (règles), déterministe, utilisé en CI
//   LIDIA_WEBHOOK=https://… node eval/score.js  → extracteur distant (n8n/Claude), même schéma, même scoring
// Critères bloquants (spec v5) : 0 invention ; ≥ 90 % d'exactitude sur constantes et mot-clé.
const fs=require('fs');
let js=fs.readFileSync(__dirname+'/../lidia-cotation.html','utf8').split('<script>')[1].split('</script>')[0];
js=js.slice(0,js.indexOf('document.addEventListener("DOMContentLoaded"'))
  +'globalThis.__x5={extraireLocal,validerExtraction,DICTEE_SYS,CST_KEYS,OBS_KEYS,ICOPE_DOMS};';
global.localStorage={getItem:()=>null,setItem:()=>{}};
global.document={querySelector:()=>({value:'2026-08-22'})};
eval(js);
const X=globalThis.__x5;
const JEU=JSON.parse(fs.readFileSync(__dirname+'/dictees.json','utf8')).dictees;
const WEBHOOK=process.env.LIDIA_WEBHOOK||null;

async function extraire(texte){
  if(!WEBHOOK)return X.extraireLocal(texte);
  const r=await fetch(WEBHOOK,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:texte,system:X.DICTEE_SYS})});
  if(!r.ok)throw new Error("webhook HTTP "+r.status);
  return JSON.parse(await r.text());
}
const normv=v=>String(v??"").trim().toLowerCase().replace(".",",");

(async()=>{
  const stats={mot:{ok:0,tot:0},cst:{ok:0,tot:0},obs:{ok:0,tot:0},icope:{ok:0,tot:0},postit:{ok:0,tot:0}};
  let inventions=0;const detailsInv=[],detailsMiss=[];
  for(const d of JEU){
    const brut=await extraire(d.texte);
    const got=X.validerExtraction(brut).data;
    const att=d.attendu;
    // mot-clé
    if(att.mot!=null){stats.mot.tot++;if(got.mot===att.mot)stats.mot.ok++;else detailsMiss.push(`#${d.id} mot : attendu ${att.mot}, obtenu ${got.mot}`);}
    else if(got.mot){inventions++;detailsInv.push(`#${d.id} mot inventé : ${got.mot}`);}
    // constantes
    for(const k of X.CST_KEYS){
      const a=(att.cst&&att.cst[k])||"",g=(got.cst&&got.cst[k])||"";
      if(a){stats.cst.tot++;if(normv(g)===normv(a))stats.cst.ok++;else detailsMiss.push(`#${d.id} cst.${k} : attendu "${a}", obtenu "${g}"`);}
      else if(g){inventions++;detailsInv.push(`#${d.id} cst.${k} inventé : "${g}"`);}
    }
    // observations
    for(const k of X.OBS_KEYS){
      const a=(att.obs&&att.obs[k])||"",g=(got.obs&&got.obs[k])||"";
      if(a){stats.obs.tot++;if(normv(g)===normv(a))stats.obs.ok++;else detailsMiss.push(`#${d.id} obs.${k} : attendu "${a}", obtenu "${g}"`);}
      else if(g){inventions++;detailsInv.push(`#${d.id} obs.${k} inventé : "${g}"`);}
    }
    // icope (le texte reformulé n'est pas scoré : c'est une réécriture, pas une extraction)
    for(const k of X.ICOPE_DOMS){
      const a=(att.icope&&att.icope[k])||"",g=(got.icope&&got.icope[k])||"";
      if(a){stats.icope.tot++;if(g===a)stats.icope.ok++;else detailsMiss.push(`#${d.id} icope.${k} : attendu "${a}", obtenu "${g}"`);}
      else if(g){inventions++;detailsInv.push(`#${d.id} icope.${k} inventé : "${g}"`);}
    }
    // post-it (type)
    if(att.postit){stats.postit.tot++;if(got.postit&&got.postit.type===att.postit.type)stats.postit.ok++;else detailsMiss.push(`#${d.id} postit : attendu ${att.postit.type}, obtenu ${got.postit?got.postit.type:"aucun"}`);}
    else if(got.postit){inventions++;detailsInv.push(`#${d.id} postit inventé : ${got.postit.type}`);}
  }
  const pct=s=>s.tot?Math.round(s.ok/s.tot*100):100;
  console.log(`Éval dictées (${JEU.length} dictées, extracteur ${WEBHOOK?"webhook":"hors-ligne"}) :`);
  console.log(`  mot-clé     ${stats.mot.ok}/${stats.mot.tot}  (${pct(stats.mot)} %)`);
  console.log(`  constantes  ${stats.cst.ok}/${stats.cst.tot}  (${pct(stats.cst)} %)`);
  console.log(`  observations ${stats.obs.ok}/${stats.obs.tot}  (${pct(stats.obs)} %)`);
  console.log(`  icope       ${stats.icope.ok}/${stats.icope.tot}  (${pct(stats.icope)} %)`);
  console.log(`  post-its    ${stats.postit.ok}/${stats.postit.tot}  (${pct(stats.postit)} %)`);
  console.log(`  inventions  ${inventions}`);
  detailsInv.forEach(x=>console.log('  ⚠ INVENTION',x));
  detailsMiss.forEach(x=>console.log('  ✗',x));
  if(inventions>0){console.log('ÉCHEC : invention détectée (critère bloquant : 0 tolérée).');process.exit(1);}
  if(pct(stats.cst)<90||pct(stats.mot)<90){console.log('ÉCHEC : exactitude < 90 % sur constantes ou mot-clé.');process.exit(1);}
  console.log('Éval dictées : OK.');
})().catch(e=>{console.error('Erreur éval :',e.message);process.exit(1);});
