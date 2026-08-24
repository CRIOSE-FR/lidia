#!/bin/bash
# Tests LIDIA Cotation : syntaxe + moteur NGAP
set -e
cd "$(dirname "$0")/.."
sed -n '/<script>/,/<\/script>/p' lidia-cotation.html | sed '1d;$d' > /tmp/lidia.js
node --check /tmp/lidia.js && echo "✓ syntaxe JS"
for id in $(grep -o '\$("#[A-Za-z0-9_]*")' lidia-cotation.html | sed 's/\$("#\(.*\)")/\1/' | sort -u); do
  grep -q "id=\"$id\"" lidia-cotation.html || { echo "✗ id manquant: $id"; exit 1; }
done
echo "✓ ids DOM"
node tests/moteur.test.js
node tests/v5.test.js
node eval/score.js
