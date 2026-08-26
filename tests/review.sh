#!/bin/bash
# Revue pré-déploiement LIDIA Cotation
set -e
cd "$(dirname "$0")/.."
bash tests/run.sh
echo "--- secrets"
! grep -nE "sk-ant-[A-Za-z0-9]" lidia-cotation.html || { echo "✗ clé API dans le bundle"; exit 1; }
echo "✓ aucun secret"
echo "--- stockage local"
for k in lidia.cot.ref lidia.cot.day lidia.cot.ai lidia.cot.patients lidia.cot.cabinet lidia.cot.stats lidia.cot.rmin lidia.cot.settings lidia.cot.passages lidia.cot.drafts lidia.cot.codes; do
  grep -q "$k" lidia-cotation.html || { echo "✗ clé $k disparue"; exit 1; }
done
echo "✓ clés localStorage présentes"
echo "--- réseau"
grep -q "lidiaplan.app.n8n.cloud/webhook/lidia-cotation" lidia-cotation.html || { echo "✗ webhook par défaut absent"; exit 1; }
grep -q "AbortController" lidia-cotation.html || { echo "✗ timeout webhook absent"; exit 1; }
echo "✓ webhook + timeout"
echo "--- évaluation du bundle"
node -e "const s=require('fs').readFileSync('lidia-cotation.html','utf8');new Function(s.split('<script>')[1].split('</script>')[0]);console.log('✓ bundle évaluable')"
echo "REVUE AUTOMATIQUE : OK"
