# Pi NAS — доступ из интернета через Vercel

Два компонента:

- **nas-gateway** — ставится на Raspberry Pi: API файлов + туннель Cloudflare (без статического IP).
- **nas-web** — деплоится на Vercel: веб-интерфейс с паролем и API-прокси к Pi.

Пользователь заходит на адрес Vercel, вводит пароль и работает с файлами на Pi с любого устройства.

---

## 0. Git и первый push в GitHub

На Raspberry Pi (если ещё нет git):

```bash
sudo apt update && sudo apt install -y git
```

Создайте репозиторий на GitHub: https://github.com/new → имя например `pi-nas` (без README).

В папке проекта:

```bash
cd /home/spacks/pi-nas
git init
git add .
git commit -m "Pi NAS: gateway + Vercel web"
git remote add origin https://github.com/ВАШ_ЛОГИН/pi-nas.git
git branch -M main
git push -u origin main
```

(Подставьте свой логин GitHub; при запросе пароля используйте Personal Access Token вместо пароля от аккаунта.)

---

## 1. Репозиторий и Vercel

1. [vercel.com](https://vercel.com) → New Project → Import Git → выберите `pi-nas`.
2. **Root Directory** укажите: `nas-web`.
3. Добавьте переменные окружения в Vercel (Settings → Environment Variables):
   - `NAS_PASSWORD` — пароль входа в веб-интерфейс.
   - `NAS_SECRET` — секрет для запросов к API на Pi (то же значение, что и `NAS_SECRET` на Pi).
   - `NAS_REGISTER_SECRET` — секрет для регистрации туннеля (то же, что `NAS_REGISTER_SECRET` на Pi).
4. Включите **Vercel KV**: Storage → Create Database → KV → привяжите к проекту. В настройках появятся `KV_REST_API_URL` и `KV_REST_API_TOKEN` (подставятся автоматически).
5. Деплой. После деплоя запомните URL приложения (например `https://pi-nas-xxx.vercel.app`).

---

## 2. Raspberry Pi — nas-gateway

### Монтирование диска (один раз)

Если диск ещё не смонтирован (например данные на разделе `/dev/sda2`):

```bash
sudo mkdir -p /srv/nas
sudo mount /dev/sda2 /srv/nas   # или нужный вам раздел
echo "/dev/sda2 /srv/nas ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
```

Путь `/srv/nas` должен указывать на каталог с файлами, которые нельзя удалять.

### Зависимости

```bash
sudo apt update
sudo apt install -y python3-pip python3-venv cloudflared
cd /home/spacks/pi-nas/nas-gateway
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Скачивание cloudflared (если нет в пакетах):

```bash
# Пример для arm64 (Pi 3B+ под 64-bit ОС)
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -O /tmp/cloudflared
chmod +x /tmp/cloudflared
sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
```

### Переменные окружения

Создайте файл с секретами (не коммитить в git):

```bash
export NAS_DATA_ROOT=/srv/nas
export NAS_SECRET=ваш_общий_секрет_как_на_vercel
export NAS_REGISTER_SECRET=секрет_регистрации_туннеля_как_на_vercel
export VERCEL_REGISTER_URL=https://ВАШ_ПРОЕКТ.vercel.app/api/register
```

Или настройте их в systemd (см. ниже).

### Запуск вручную (проверка)

```bash
cd /home/spacks/pi-nas/nas-gateway
source venv/bin/activate
export NAS_DATA_ROOT=/srv/nas
export NAS_SECRET=ваш_секрет
python -m gunicorn -w 1 -b 127.0.0.1:8080 app:app
```

В другом терминале:

```bash
export VERCEL_REGISTER_URL=https://ВАШ_ПРОЕКТ.vercel.app/api/register
export NAS_REGISTER_SECRET=ваш_register_секрет
./start_tunnel.sh
```

После появления в логе URL вида `https://xxx.trycloudflare.com` Pi зарегистрирует его в Vercel. Откройте сайт на Vercel, введите пароль — должен открыться список файлов с Pi.

### Автозапуск (systemd)

1. Отредактируйте пути и секреты в `nas-gateway.service` и `nas-tunnel.service`.
2. Установите сервисы:
   ```bash
   sudo cp /home/spacks/pi-nas/nas-gateway/nas-gateway.service /etc/systemd/system/
   sudo cp /home/spacks/pi-nas/nas-gateway/nas-tunnel.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now nas-gateway
   sudo systemctl enable --now nas-tunnel
   ```
3. В `nas-gateway.service` укажите `Environment=NAS_DATA_ROOT=/srv/nas` и `Environment=NAS_SECRET=...`.
4. В `nas-tunnel.service` укажите `VERCEL_REGISTER_URL` и `NAS_REGISTER_SECRET`.

После перезагрузки Pi туннель поднимется заново и зарегистрирует новый URL в Vercel — веб-интерфейс продолжит работать без смены адреса на Vercel.

---

## Переменные — сводка

| Переменная | Где | Назначение |
|------------|-----|------------|
| `NAS_PASSWORD` | Vercel | Пароль входа в веб-интерфейс. |
| `NAS_SECRET` | Vercel + Pi | Один и тот же секрет для запросов к API на Pi. |
| `NAS_REGISTER_SECRET` | Vercel + Pi | Секрет для вызова `/api/register` (обновление URL туннеля). |
| `VERCEL_REGISTER_URL` | Pi | Полный URL вида `https://ваш-проект.vercel.app/api/register`. |
| `NAS_DATA_ROOT` | Pi | Каталог с файлами на диске (например `/srv/nas`). |

---

## Безопасность

- Не коммитьте секреты в git. На Pi используйте `Environment=` в systemd или отдельный файл вне репозитория.
- Пароль и секреты задавайте длинными и случайными.
- Данные на диске API не удаляет — только список, скачивание и загрузка.
