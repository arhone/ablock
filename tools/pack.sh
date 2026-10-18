#!/usr/bin/env bash
# Сборка zip для Chrome Web Store: содержимое папки src/ — всё, что входит в расширение.
# Запуск: tools/pack.sh → dist/ablock-<версия>.zip
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/src"

version=$(node -p "require('./manifest.json').version")
out="$root/dist/ablock-${version}.zip"

# Манифест и переводы должны разбираться, иначе магазин отклонит архив
for file in manifest.json data/*.json rules/*.json _locales/*/messages.json; do
    node -e "JSON.parse(require('fs').readFileSync('$file', 'utf8'))" || { echo "Ошибка в $file" >&2; exit 1; }
done

# Счётчики основных правил в rules/lists.json: по ним sw.js решает, сколько региональных наборов поместится
node -e '
const fs = require("fs");
const {declarative_net_request: {rule_resources}} = require("./manifest.json");
const {base} = require("./rules/lists.json");
const rules = rule_resources.filter((r) => r.enabled).flatMap((r) => JSON.parse(fs.readFileSync(r.path, "utf8")));
const regex = rules.filter((r) => r.condition.regexFilter).length;
if (base.rules !== rules.length || base.regex !== regex) {
    console.error(`rules/lists.json: base ${base.rules}/${base.regex}, на самом деле ${rules.length}/${regex}`);
    process.exit(1);
}' || exit 1

mkdir -p "$root/dist"
rm -f "$out"
# _metadata Chrome создаёт сам при загрузке распакованного расширения
zip -qr -X "$out" . -x '_metadata/*' -x '*/.DS_Store' -x '.DS_Store' -x '*~'

echo "dist/$(basename "$out") — $(du -h "$out" | cut -f1), файлов: $(unzip -Z1 "$out" | grep -vc '/$')"
