#!/usr/bin/env bash
set -euo pipefail

CONFIG="${BACKUP_CONFIG:-/etc/arm-backup.conf}"
[ -f "$CONFIG" ] && source "$CONFIG"

: "${DATABASE_URL:?не задан DATABASE_URL}"
: "${RCLONE_REMOTE:?не задан RCLONE_REMOTE, например s3:arm-backups}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/www/uploads}"
KEEP_DAYS="${KEEP_DAYS:-14}"
TMP_DIR="${TMP_DIR:-/var/tmp/arm-backup}"
LOG_FILE="${LOG_FILE:-/var/log/arm-backup.log}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

STAMP="$(date +%Y-%m-%d_%H-%M)"
DUMP_FILE="$TMP_DIR/db_$STAMP.dump"

log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG_FILE"; }

fail() {
  log "ОШИБКА: резервное копирование не выполнено (строка $1)"
  if [ -n "$ALERT_EMAIL" ] && command -v mail >/dev/null 2>&1; then
    echo "Резервное копирование АРМ не выполнено. Подробности: $LOG_FILE" | mail -s "Ошибка бэкапа АРМ" "$ALERT_EMAIL"
  fi
  rm -rf "$TMP_DIR"
  exit 1
}
trap 'fail $LINENO' ERR

mkdir -p "$TMP_DIR"
log "Старт резервного копирования"

pg_dump "$DATABASE_URL" -Fc --no-owner -f "$DUMP_FILE"
pg_restore --list "$DUMP_FILE" >/dev/null
log "Дамп базы создан: $(du -h "$DUMP_FILE" | cut -f1)"

rclone copy "$DUMP_FILE" "$RCLONE_REMOTE/db/" --quiet
log "Дамп загружен в хранилище"

if [ -d "$UPLOAD_DIR" ]; then
  rclone copy "$UPLOAD_DIR" "$RCLONE_REMOTE/uploads/" --quiet
  log "Фото синхронизированы (удалённые файлы в копии сохраняются)"
fi

rclone delete "$RCLONE_REMOTE/db/" --min-age "${KEEP_DAYS}d" --quiet
log "Удалены дампы старше $KEEP_DAYS дней"

rm -rf "$TMP_DIR"
log "Готово"
