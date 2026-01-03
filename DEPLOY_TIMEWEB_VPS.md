# Инструкция по деплою на VPS от Timeweb

## Преимущества Timeweb VPS

- **Дешевле** - от 200-400 ₽/мес (зависит от тарифа)
- **Хорошая производительность** для небольших проектов
- **Простая панель управления**
- **Техподдержка на русском**

## Шаг 1: Заказ VPS в Timeweb

1. Зайдите на [timeweb.com](https://timeweb.com)
2. Перейдите в раздел **VPS**
3. Выберите подходящий тариф:
   - **Минимальный** (1 ГБ RAM, 1 ядро) - от ~200-300 ₽/мес
   - **Рекомендуемый** (2 ГБ RAM, 2 ядра) - от ~400-500 ₽/мес (лучше для Next.js)
4. При заказе выберите ОС: **Ubuntu 22.04 LTS** (или Ubuntu 20.04)
5. Сохраните IP-адрес сервера и пароль root

## Шаг 2: Подключение к серверу

### 2.1. SSH подключение

В Windows используйте:
- **PuTTY** (скачать: https://www.putty.org/)
- Или **Windows Terminal** (встроен в Windows 10/11)

```bash
ssh root@<IP_адрес_вашего_сервера>
```

Введите пароль root (который указали при создании VPS).

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
sudo chown -R $USER:$USER /var/www/ashot-furniture-gallery
```

### 4.2. Установка зависимостей

```bash
npm install
```

### 4.3. Настройка переменных окружения

Создайте файл `.env.local`:

```bash
nano .env.local
```

Добавьте переменные (замените на свои значения из Vercel):

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

Это может занять несколько минут.

## Шаг 5: Запуск приложения через PM2

### 5.1. Создание файла конфигурации PM2

Убедитесь, что файл `ecosystem.config.js` существует в папке `test/`:

```bash
nano ecosystem.config.js
```

Если файла нет, создайте его:

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

Выполните команду, которую покажет `pm2 startup` (она будет начинаться с `sudo env PATH=...`). Это нужно, чтобы PM2 запускался при перезагрузке сервера.

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
sudo nginx -t  # Проверка конфигурации (должно быть "syntax is ok")
sudo systemctl restart nginx
```

## Шаг 7: Настройка DNS в nic.ru

1. Войдите в панель управления доменом в nic.ru
2. Перейдите в **Управление DNS-записями**
3. Удалите старые записи для Vercel (A и CNAME записи)
4. Добавьте новые записи:

**A запись для основного домена:**
- **Тип:** A
- **Имя:** `@` (или `ashot-zebelyan.ru`)
- **Значение:** `<IP_адрес_вашего_VPS_Timeweb>`
- **TTL:** 3600

**A запись для www:**
- **Тип:** A
- **Имя:** `www`
- **Значение:** `<IP_адрес_вашего_VPS_Timeweb>`
- **TTL:** 3600

Или можно использовать CNAME для www:
- **Тип:** CNAME
- **Имя:** `www`
- **Значение:** `ashot-zebelyan.ru`
- **TTL:** 3600

5. Сохраните изменения
6. Подождите 5-15 минут для распространения DNS

## Шаг 8: Настройка SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d ashot-zebelyan.ru -d www.ashot-zebelyan.ru
```

Следуйте инструкциям:
- Введите email (для уведомлений о продлении сертификата)
- Согласитесь с условиями
- Выберите редирект с HTTP на HTTPS (рекомендуется: 2)

Сертификат обновится автоматически.

## Шаг 9: Проверка

1. Подождите 5-15 минут после изменения DNS
2. Откройте сайт: `https://ashot-zebelyan.ru`
3. Проверьте работу админки: `https://ashot-zebelyan.ru/admin`
4. Проверьте загрузку фото

## Полезные команды

```bash
# Просмотр логов PM2
pm2 logs ashot-furniture-gallery

# Просмотр последних 100 строк логов
pm2 logs ashot-furniture-gallery --lines 100

# Перезапуск приложения
pm2 restart ashot-furniture-gallery

# Статус приложения
pm2 status

# Остановка приложения
pm2 stop ashot-furniture-gallery

# Обновление проекта
cd /var/www/ashot-furniture-gallery/test
git pull
npm install
npm run build
pm2 restart ashot-furniture-gallery

# Просмотр использования ресурсов
pm2 monit
```

## Если что-то не работает

### Проверка PM2

```bash
pm2 status  # Должен показать "online"
pm2 logs ashot-furniture-gallery  # Посмотрите логи на ошибки
```

### Проверка Nginx

```bash
sudo systemctl status nginx  # Должен быть "active (running)"
sudo nginx -t  # Проверка конфигурации
```

### Проверка порта 3000

```bash
sudo netstat -tlnp | grep 3000  # Должен слушать порт 3000
```

### Проверка DNS

```bash
# С сервера
curl -I http://localhost:3000

# С вашего компьютера (после распространения DNS)
nslookup ashot-zebelyan.ru
```

## Примечания

- **Рекомендуемый тариф:** 2 ГБ RAM для более стабильной работы Next.js
- **Минимальный тариф:** 1 ГБ RAM тоже будет работать, но может быть медленнее
- Регулярно обновляйте систему: `sudo apt update && sudo apt upgrade`
- Резервное копирование: настройте автоматические бэкапы в панели Timeweb

## Поддержка Timeweb

Если возникнут проблемы с VPS:
- Техподдержка Timeweb: через панель управления или по телефону
- Они помогут с настройкой SSH, если нужно

