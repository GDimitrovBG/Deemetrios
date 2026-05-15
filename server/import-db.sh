#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Import MongoDB dump to production server
#  Usage: ./import-db.sh <dump_folder> [mongodb_uri]
#
#  Examples:
#    ./import-db.sh areti-dump-20260515_143022
#    ./import-db.sh areti-dump-20260515_143022 "mongodb+srv://user:pass@cluster.mongodb.net/areti"
# ═══════════════════════════════════════════════════════════════

DUMP_DIR="${1}"
URI="${2:-mongodb://127.0.0.1:27017/areti}"

if [ -z "$DUMP_DIR" ]; then
  echo "Употреба: ./import-db.sh <dump_папка> [mongodb_uri]"
  echo "Пример:   ./import-db.sh areti-dump-20260515_143022 \"mongodb+srv://user:pass@host/areti\""
  exit 1
fi

# Check if it's a tar.gz
if [[ "$DUMP_DIR" == *.tar.gz ]]; then
  echo "Разархивиране на ${DUMP_DIR}..."
  tar -xzf "$DUMP_DIR"
  DUMP_DIR="${DUMP_DIR%.tar.gz}"
fi

# Find the actual BSON folder (could be dump_dir/areti/ or dump_dir/)
BSON_DIR="${DUMP_DIR}/areti"
if [ ! -d "$BSON_DIR" ]; then
  BSON_DIR="${DUMP_DIR}"
fi

echo ""
echo "══ Импорт на база данни Арети ══"
echo "  Източник: ${BSON_DIR}"
echo "  Цел:      ${URI}"
echo ""

mongorestore --uri="${URI}" --db=areti --drop "${BSON_DIR}" 2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✓ Импортът е успешен!"
  echo ""
else
  echo ""
  echo "✗ Грешка при импорт. Проверете:"
  echo "  1. mongorestore е инсталиран (brew install mongodb-database-tools)"
  echo "  2. MongoDB URI е правилен"
  echo "  3. Dump папката съществува и съдържа .bson файлове"
fi
