# Instrukcje deploymentu na zewnętrznym serwerze

Aplikacja została przygotowana do działania na zewnętrznym serwerze z standardową autentykacją email/hasło zamiast systemu Replit.

## Wymagania systemowe

- Node.js 18+ lub 20+
- PostgreSQL 13+ lub kompatybilna baza danych (Neon, AWS RDS, itp.)
- Co najmniej 1GB RAM
- 2GB miejsca na dysku

## Zmienne środowiskowe

Utwórz plik `.env` w głównym katalogu projektu z następującymi zmiennymi:

```env
# === UWAGA: NIGDY NIE DODAWAJ TEGO PLIKU DO GIT! ===

# Baza danych (WYMAGANE)
DATABASE_URL=postgresql://username:password@host:port/database_name

# Autentykacja (WYMAGANE)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
SESSION_SECRET=your-session-secret-here-also-long-and-random

# Konfiguracja systemu autentykacji
AUTH_PROVIDER=standard
ALLOW_REGISTRATION=true
REQUIRE_APPROVAL=true

# Środowisko
NODE_ENV=production

# CORS (dla frontend na innej domenie)
CORS_ORIGIN=https://yourdomain.com
# lub dla wszystkich domen: CORS_ORIGIN=*

# Bezpieczeństwo (zalecane dla produkcji)
ENABLE_SECURITY_HEADERS=true

# Storage (opcjonalne - domyślnie pliki lokalne)
OBJECT_STORAGE_PROVIDER=local
# Dla AWS S3:
# OBJECT_STORAGE_PROVIDER=s3
# OBJECT_STORAGE_BUCKET=your-bucket-name
# OBJECT_STORAGE_REGION=eu-central-1
# OBJECT_STORAGE_ACCESS_KEY=your-access-key
# OBJECT_STORAGE_SECRET_KEY=your-secret-key
```

## Instrukcje instalacji

### 1. Przygotowanie serwera

```bash
# Aktualizacja systemu (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Instalacja Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Weryfikacja instalacji
node --version
npm --version
```

### 2. Klonowanie i instalacja aplikacji

```bash
# Sklonuj repozytorium lub przenieś pliki
cd /var/www/
sudo git clone your-repository-url equipment-rental
# lub
sudo cp -r /path/to/your/app equipment-rental

cd equipment-rental
sudo chown -R www-data:www-data .

# Instalacja zależności
npm install --production

# Budowanie aplikacji (jeśli wymagane)
npm run build
```

### 3. Konfiguracja bazy danych

```bash
# Utwórz bazę danych PostgreSQL
sudo -u postgres createdb equipment_rental
sudo -u postgres createuser equipment_user

# Ustaw hasło użytkownika
sudo -u postgres psql
postgres=# ALTER USER equipment_user PASSWORD 'your-secure-password';
postgres=# GRANT ALL PRIVILEGES ON DATABASE equipment_rental TO equipment_user;
postgres=# \\q

# Uruchom migracje bazy danych
npm run db:push
```

### 4. Konfiguracja zmiennych środowiskowych

```bash
# Skopiuj przykładowy plik konfiguracji
cp .env.example .env

# Edytuj plik .env
nano .env

# Ustaw odpowiednie uprawnienia
chmod 600 .env
```

### 5. Konfiguracja procesu (PM2)

```bash
# Zainstaluj PM2 globalnie
sudo npm install -g pm2

# Utwórz plik konfiguracji PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'equipment-rental',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/equipment-rental',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Utwórz katalog na logi
mkdir -p logs

# Uruchom aplikację
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Konfiguracja Nginx (reverse proxy)

```bash
# Zainstaluj Nginx
sudo apt install nginx -y

# Utwórz konfigurację
sudo nano /etc/nginx/sites-available/equipment-rental

# Wklej następującą konfigurację:
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Przekierowanie HTTP na HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificate (ustaw ścieżki do swoich certyfikatów)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_private_key /path/to/your/private.key;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Maksymalny rozmiar uploadu
    client_max_body_size 100M;

    # Proxy do aplikacji Node.js
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Statyczne pliki (jeśli są serwowane przez Nginx)
    location /assets {
        alias /var/www/equipment-rental/dist/assets;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

```bash
# Aktywuj konfigurację
sudo ln -s /etc/nginx/sites-available/equipment-rental /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Certificate (Let's Encrypt)

```bash
# Zainstaluj Certbot
sudo apt install certbot python3-certbot-nginx -y

# Uzyskaj certyfikat SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Automatyczne odnowienie
sudo crontab -e
# Dodaj linię:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Pierwszy administrator

Po uruchomieniu aplikacji, pierwszy użytkownik musi zostać utworzony i zatwierdzony ręcznie w bazie danych:

```sql
-- Połącz się z bazą danych
psql -h localhost -U equipment_user -d equipment_rental

-- Utwórz pierwszego administratora
INSERT INTO users (
    id, 
    email, 
    first_name, 
    last_name, 
    password_hash, 
    auth_provider, 
    role, 
    is_active, 
    is_approved
) VALUES (
    'admin_' || extract(epoch from now()) || '_' || substring(md5(random()::text) from 1 for 8),
    'admin@yourcompany.com',
    'Administrator',
    'System',
    '$2a$12$hash.from.bcrypt', -- Wygeneruj hash hasła używając bcrypt
    'standard',
    'admin',
    true,
    true
);
```

Aby wygenerować hash hasła:

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your-admin-password', 12));"
```

## Monitorowanie i logi

```bash
# Sprawdź status aplikacji
pm2 status
pm2 logs equipment-rental

# Sprawdź logi Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Sprawdź wykorzystanie zasobów
pm2 monit
```

## Backup bazy danych

Skonfiguruj automatyczne backupy:

```bash
# Utwórz skrypt backup
cat > /usr/local/bin/backup-equipment-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/equipment-rental"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="equipment_rental"
DB_USER="equipment_user"

mkdir -p $BACKUP_DIR
pg_dump -h localhost -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Usuń backupy starsze niż 30 dni
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-equipment-db.sh

# Dodaj do cron (codziennie o 2:00)
sudo crontab -e
# Dodaj linię:
0 2 * * * /usr/local/bin/backup-equipment-db.sh
```

## Aktualizacje

```bash
# Zatrzymaj aplikację
pm2 stop equipment-rental

# Zaktualizuj kod
git pull origin main

# Zainstaluj nowe zależności
npm install --production

# Uruchom migracje bazy danych (jeśli są)
npm run db:push

# Uruchom aplikację
pm2 start equipment-rental
```

## Rozwiązywanie problemów

### Aplikacja nie startuje
- Sprawdź logi: `pm2 logs equipment-rental`
- Sprawdź konfigurację bazy danych w `.env`
- Sprawdź czy port 5000 jest wolny: `netstat -tulpn | grep 5000`

### Błędy bazy danych
- Sprawdź połączenie: `psql $DATABASE_URL`
- Sprawdź uprawnienia użytkownika bazy danych
- Uruchom migracje ponownie: `npm run db:push --force`

### Problemy z autoryzacją
- Sprawdź czy `JWT_SECRET` jest ustawiony
- Sprawdź czy pierwszy admin został utworzony
- Sprawdź logi aplikacji pod kątem błędów autentykacji

### Problemy z SSL
- Sprawdź certyfikaty: `sudo certbot certificates`
- Odnów certyfikaty: `sudo certbot renew`
- Sprawdź konfigurację Nginx: `sudo nginx -t`

## Bezpieczeństwo

1. **Firewall**: Otwórz tylko porty 80, 443 i SSH
2. **Aktualizacje**: Regularnie aktualizuj system i zależności
3. **Monitoring**: Skonfiguruj monitoring dostępności
4. **Backupy**: Regularne backupy bazy danych i plików
5. **Logi**: Regularne przeglądanie logów pod kątem podejrzanych aktywności