# Инструкция по деплою на VPS от РУЦЕНТР (nic.ru)

## Шаг 1: Заказ VPS

1. В панели РУЦЕНТР выберите тариф **"SSD-1"** (или выше, если нужно больше RAM)
2. При заказе выберите ОС: **Ubuntu 22.04 LTS** (или Ubuntu 20.04)
3. Сохраните IP-адрес сервера и данные для доступа (логин/пароль или SSH ключ)

## Шаг 2: Подключение к серверу

### 2.1. SSH подключение

Если у вас Windows, используйте:
- **PuTTY** (скачать: https://www.putty.org/)
- Или **Windows Terminal** с SSH (встроен в Windows 10/11)

```bash
ssh root@<IP_адрес_вашего_сервера>
```

Или если логин другой:
```bash
ssh ваш_логин@<IP_адрес_вашего_сервера>
```

## Шаг 3: Настройка сервера

### 3.1. Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2. Установка Node.js 20

```bash
# Установка Node.js через NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка установки
node --version  # Должно быть v20.x.x
npm --version
```

### 3.3. Установка Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3.4. Установка PM2 (процесс-менеджер для Node.js)

```bash
sudo npm install -g pm2
```

### 3.5. Установка Git

```bash
sudo apt install git -y
```

## Шаг 4: Клонирование и сборка проекта

### 4.1. Клонирование репозитория

```bash
cd /var/www
sudo git clone https://github.com/zebvalera774583-maker/TEST.git ashot-furniture-gallery
cd ashot-furniture-gallery/test
```

### 4.2. Установка зависимостей

```bash
npm install
```

### 4.3. Настройка переменных окружения

Создайте файл `.env.local`:

```bash
sudo nano .env.local
```

Добавьте переменные:

```env
NEXT_PUBLIC_SUPABASE_URL=ваш_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
ADMIN_PASSWORD=ваш_пароль_админа
NODE_ENV=production
```

Сохраните (Ctrl+O, Enter, Ctrl+X)

### 4.4. Сборка проекта

```bash
npm run build
```

## Шаг 5: Запуск приложения через PM2

### 5.1. Создание файла конфигурации PM2

Создайте файл `ecosystem.config.js` в корне проекта (test/):

```bash
sudo nano ecosystem.config.js
```

Добавьте:

```javascript
module.exports = {
  apps: [
    {
      name: 'ashot-furniture-gallery',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

### 5.2. Запуск через PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Выполните команду, которую покажет `pm2 startup`, чтобы PM2 запускался при перезагрузке сервера.

## Шаг 6: Настройка Nginx

### 6.1. Создание конфигурации Nginx

```bash
sudo nano /etc/nginx/sites-available/ashot-furniture-gallery
```

Добавьте:

```nginx
server {
    listen 80;
    server_name ashot-zebelyan.ru www.ashot-zebelyan.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.2. Активация конфигурации

```bash
sudo ln -s /etc/nginx/sites-available/ashot-furniture-gallery /etc/nginx/sites-enabled/
sudo nginx -t  # Проверка конфигурации
sudo systemctl restart nginx
```

## Шаг 7: Настройка DNS в nic.ru

1. Войдите в панель управления доменом в nic.ru
2. Перейдите в настройки DNS
3. Добавьте/измените записи:

**A запись:**
- Имя: `@` или `ashot-zebelyan.ru`
- Значение: `<IP_адрес_вашего_VPS>`
- TTL: 3600

**A запись для www:**
- Имя: `www`
- Значение: `<IP_адрес_вашего_VPS>`
- TTL: 3600

Или используйте CNAME для www:
- Имя: `www`
- Значение: `ashot-zebelyan.ru`
- TTL: 3600

## Шаг 8: Настройка SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d ashot-zebelyan.ru -d www.ashot-zebelyan.ru
```

Следуйте инструкциям. Сертификат обновится автоматически.

## Шаг 9: Проверка

1. Откройте сайт: `http://ashot-zebelyan.ru` (должен перенаправить на HTTPS)
2. Проверьте работу админки: `/admin`
3. Проверьте загрузку фото

## Полезные команды

```bash
# Просмотр логов PM2
pm2 logs ashot-furniture-gallery

# Перезапуск приложения
pm2 restart ashot-furniture-gallery

# Статус приложения
pm2 status

# Обновление проекта
cd /var/www/ashot-furniture-gallery/test
git pull
npm install
npm run build
pm2 restart ashot-furniture-gallery
```

## Если что-то не работает

1. Проверьте, что PM2 запущен: `pm2 status`
2. Проверьте логи: `pm2 logs ashot-furniture-gallery`
3. Проверьте Nginx: `sudo systemctl status nginx`
4. Проверьте порт 3000: `sudo netstat -tlnp | grep 3000`

## Примечания

- **RAM 1 ГБ** - это минимум, но для начала будет работать
- Если сайт будет медленно работать, рассмотрите тариф с большим объемом RAM
- Регулярно обновляйте систему: `sudo apt update && sudo apt upgrade`

