#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Export MongoDB "areti" database to a portable dump folder
#  Usage: ./export-db.sh [mongodb_uri]
# ═══════════════════════════════════════════════════════════════

URI="${1:-mongodb://127.0.0.1:27017/areti}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="areti-dump-${TIMESTAMP}"

echo ""
echo "══ Експорт на база данни Арети ══"
echo "  URI: ${URI}"
echo "  Папка: ${OUTPUT_DIR}"
echo ""

# mongodump — exports all collections as BSON
mongodump --uri="${URI}" --out="${OUTPUT_DIR}" 2>&1

if [ $? -eq 0 ]; then
  # Also export as JSON for readability
  mkdir -p "${OUTPUT_DIR}/json"
  for collection in users products articles bookings settings; do
    mongoexport --uri="${URI}" --collection="${collection}" --out="${OUTPUT_DIR}/json/${collection}.json" --jsonArray 2>/dev/null
  done

  # Create tar.gz archive
  tar -czf "${OUTPUT_DIR}.tar.gz" "${OUTPUT_DIR}"

  echo ""
  echo "✓ Експортът е готов!"
  echo "  Папка:  ${OUTPUT_DIR}/"
  echo "  Архив:  ${OUTPUT_DIR}.tar.gz"
  echo ""
  echo "  BSON (за mongorestore): ${OUTPUT_DIR}/areti/"
  echo "  JSON (за четене):       ${OUTPUT_DIR}/json/"
  echo ""
  echo "═══ Импорт на друг сървър ═══"
  echo "  mongorestore --uri=\"mongodb://USER:PASS@HOST:27017/areti\" ${OUTPUT_DIR}/areti/"
  echo ""
else
  echo "✗ Грешка при експорт. Уверете се че mongodump е инсталиран:"
  echo "  brew install mongodb-database-tools"
fi
