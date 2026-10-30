# Ежедневное резервное копирование

Скрипт `deploy/backup.sh` раз в сутки:
- сохраняет базу данных в файл и проверяет, что он читается;
- загружает его в российское облачное хранилище;
- докладывает в хранилище новые фото (старые не перекачиваются, удалённые на сервере в копии остаются);
- удаляет дампы базы старше 14 дней.

## Установка (один раз, под пользователем deploy)

1. Установить нужное (если не ставили при настройке сервера):
   ```
   sudo apt install -y rclone postgresql-client
   ```

2. Создать бакет в Yandex Object Storage или Selectel, создать сервисный аккаунт с правом записи в этот бакет, получить ключ доступа и секретный ключ.

3. Настроить доступ к хранилищу:
   ```
   rclone config
   ```
   - `n` (новое подключение), имя `s3`
   - тип `s3`, провайдер `Other` (S3-compatible)
   - ввести ключ доступа и секретный ключ
   - endpoint: для Yandex `storage.yandexcloud.net`, для Selectel `s3.ru-1.storage.selcloud.ru`
   - регион: для Yandex `ru-central1`, для Selectel `ru-1`

   Проверка: `rclone lsd s3:` покажет ваши бакеты.

4. Скопировать скрипт и сделать его исполняемым:
   ```
   sudo cp /opt/arm/deploy/backup.sh /usr/local/bin/arm-backup
   sudo chmod +x /usr/local/bin/arm-backup
   ```

5. Создать файл настроек:
   ```
   sudo nano /etc/arm-backup.conf
   ```
   Содержимое:
   ```
   DATABASE_URL="postgresql://arm:ПАРОЛЬ@localhost:5432/arm"
   RCLONE_REMOTE="s3:ИМЯ_ВАШЕГО_БАКЕТА"
   UPLOAD_DIR="/var/www/uploads"
   KEEP_DAYS=14
   ```
   Закрыть файл от посторонних:
   ```
   sudo chmod 600 /etc/arm-backup.conf
   sudo chown deploy:deploy /etc/arm-backup.conf
   sudo touch /var/log/arm-backup.log && sudo chown deploy:deploy /var/log/arm-backup.log
   ```
   Если rclone настроен под пользователем deploy, запускайте скрипт тоже под ним.

6. Запустить вручную и убедиться, что всё работает:
   ```
   arm-backup
   rclone ls s3:ИМЯ_ВАШЕГО_БАКЕТА
   ```
   В списке должны появиться файл `db/db_...dump` и папка `uploads/`.

7. Включить ежедневный запуск в 03:00:
   ```
   crontab -e
   ```
   Добавить строку:
   ```
   0 3 * * * /usr/local/bin/arm-backup >/dev/null 2>&1
   ```

## Как восстановиться из копии

Базу:
```
rclone ls s3:ИМЯ_ВАШЕГО_БАКЕТА/db
rclone copy s3:ИМЯ_ВАШЕГО_БАКЕТА/db/db_2026-11-01_03-00.dump /tmp/
pg_restore --clean --if-exists --no-owner -d "postgresql://arm:ПАРОЛЬ@localhost:5432/arm" /tmp/db_2026-11-01_03-00.dump
```

Фото:
```
rclone copy s3:ИМЯ_ВАШЕГО_БАКЕТА/uploads /var/www/uploads
```

## Регулярные проверки

- Раз в неделю: `tail -n 20 /var/log/arm-backup.log` — в конце должно быть «Готово» с вчерашней датой.
- Раз в месяц: восстановить копию на отдельной тестовой базе и убедиться, что данные на месте.
- Для писем об ошибках: установить `sudo apt install -y mailutils`, настроить отправку почты и указать `ALERT_EMAIL="ваш@адрес"` в `/etc/arm-backup.conf`. Без этого ошибки видны только в журнале.
- Проверять, что у ключа доступа хватает прав и не истёк срок действия.
