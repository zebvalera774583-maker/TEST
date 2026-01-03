# Инструкция по миграции на Yandex Cloud

## Шаг 1: Создание виртуальной машины в Yandex Cloud

### 1.1. Регистрация и вход
1. Перейдите на [cloud.yandex.ru](https://cloud.yandex.ru)
2. Зарегистрируйтесь или войдите в аккаунт
3. Создайте новый каталог (или используйте существующий)

### 1.2. Создание VM
1. Перейдите в раздел **Compute Cloud → Виртуальные машины**
2. Нажмите **"Создать ВМ"**
3. Настройки:
   - **Имя:** `ashot-zebelyan-server`
   - **Зона доступности:** выберите ближайшую (например, `ru-central1-a`)
   - **Образ:** Ubuntu 22.04 LTS
   - **Платформа:** Intel Broadwell
   - **vCPU:** 2
   - **RAM:** 4 GB (для начала, можно увеличить позже)
   - **Диск:** 20 GB SSD
   - **Сеть:** создайте новую или используйте существующую
   - **Публичный IP:** включить
4. Нажмите **"Создать ВМ"**

### 1.3. Настройка доступа
1. После создания ВМ, нажмите на неё
2. Перейдите во вкладку **"SSH-ключи"**
3. Добавьте свой SSH-ключ (или используйте логин/пароль при создании)

## Шаг 2: Подключение к серверу

### 2.1. SSH подключение
```bash
ssh ubuntu@<IP_адрес_вашей_VM>
```

Или если использовали логин/пароль:
```bash
ssh <ваш_логин>@<IP_адрес_вашей_VM>
```

## Шаг 3: Настройка сервера

### 3.1. Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2. Установка Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Проверка версии (должно быть v20.x.x)
```

### 3.3. Установка Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3.4. Установка PM2
```bash
sudo npm install -g pm2
pm2 startup  # Следуйте инструкциям на экране
```

### 3.5. Установка Certbot (для SSL)
```bash
sudo apt install certbot python3-certbot-nginx -y
```

## Шаг 4: Клонирование и настройка проекта

### 4.1. Клонирование репозитория
```bash
cd /var/www
sudo git clone https://github.com/zebvalera774583-maker/TEST.git ashot-zebelyan
sudo chown -R $USER:$USER /var/www/ashot-zebelyan
cd ashot-zebelyan
```

### 4.2. Установка зависимостей
```bash
npm install
```

### 4.3. Создание файла .env
```bash
nano .env
```

Добавьте следующие переменные (замените на свои значения):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ADMIN_PASSWORD=your_admin_password
NODE_ENV=production
PORT=3000
```

Сохраните файл (Ctrl+O, Enter, Ctrl+X)

### 4.4. Сборка проекта
```bash
npm run build
```

### 4.5. Запуск через PM2
```bash
pm2 start ecosystem.config.js
pm2 save
```

## Шаг 5: Настройка Nginx

### 5.1. Создание конфигурации Nginx
```bash
sudo nano /etc/nginx/sites-available/ashot-zebelyan
```

Добавьте следующую конфигурацию:
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

Сохраните файл (Ctrl+O, Enter, Ctrl+X)

### 5.2. Активация конфигурации
```bash
sudo ln -s /etc/nginx/sites-available/ashot-zebelyan /etc/nginx/sites-enabled/
sudo nginx -t  # Проверка конфигурации
sudo systemctl reload nginx
```

## Шаг 6: Настройка SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d ashot-zebelyan.ru -d www.ashot-zebelyan.ru
```

Следуйте инструкциям на экране. Certbot автоматически обновит конфигурацию Nginx.

## Шаг 7: Настройка DNS в nic.ru

### 7.1. Получение IP-адреса ВМ
В Yandex Cloud найдите публичный IP-адрес вашей ВМ.

### 7.2. Изменение DNS-записей в nic.ru
1. Войдите в [nic.ru](https://www.nic.ru)
2. Перейдите к домену `ashot-zebelyan.ru`
3. Откройте раздел **"DNS-зона"** или **"Ресурсные записи"**
4. Измените A-запись для `@` на IP-адрес вашей ВМ:
   - **Тип:** A
   - **Хост:** @
   - **Значение:** `<IP_адрес_вашей_VM>`
5. Измените CNAME для `www`:
   - **Тип:** CNAME
   - **Хост:** www
   - **Значение:** `ashot-zebelyan.ru.` (с точкой в конце)
6. Нажмите **"Выгрузить зону"**

Подождите 10-30 минут для распространения DNS.

## Шаг 8: Проверка работы

1. Откройте в браузере: `http://ashot-zebelyan.ru`
2. Проверьте, что сайт работает
3. Проверьте SSL: `https://ashot-zebelyan.ru`

## Шаг 9: Автоматический деплой (опционально)

Для автоматического деплоя при изменениях в Git:

1. Настройте SSH-ключи для доступа к GitHub
2. Используйте скрипт `deploy.sh`:
```bash
chmod +x deploy.sh
./deploy.sh
```

Или настройте GitHub Actions для автоматического деплоя.

## Полезные команды PM2

```bash
pm2 list              # Список процессов
pm2 logs ashot-zebelyan  # Логи приложения
pm2 restart ashot-zebelyan  # Перезапуск
pm2 stop ashot-zebelyan     # Остановка
pm2 delete ashot-zebelyan   # Удаление
```

## Мониторинг и логи

```bash
# Логи Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Логи приложения
pm2 logs ashot-zebelyan

# Мониторинг системы
htop
df -h  # Диск
free -h  # Память
```

## Масштабирование (для будущего)

Когда проект вырастет, можно:
1. Увеличить ресурсы ВМ (CPU, RAM)
2. Настроить балансировщик нагрузки
3. Добавить несколько инстансов
4. Использовать Yandex Object Storage для файлов
5. Настроить CDN для статических файлов

