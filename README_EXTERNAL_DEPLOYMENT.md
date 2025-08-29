# System Wynajmu Sprzętu - Deployment na Zewnętrznym Serwerze

Aplikacja została przygotowana do działania na zewnętrznym serwerze z standardową autentykacją email/hasło.

## Szybki Start

### 1. Przygotowanie środowiska

```bash
# Klonuj aplikację
git clone your-repo-url equipment-rental
cd equipment-rental

# Zainstaluj zależności
npm install --production

# Utwórz konfigurację
cp .env.example .env
nano .env  # Ustaw swoje wartości
```

### 2. Konfiguracja bazy danych

Ustaw `DATABASE_URL` w pliku `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/equipment_rental
```

Uruchom migracje:
```bash
npm run db:push
```

### 3. Utwórz pierwszego administratora

```bash
# Wygeneruj hash hasła
npm run generate:admin "twoje-haslo-admina"

# Użyj wygenerowanego hasha w SQL:
psql $DATABASE_URL
```

```sql
INSERT INTO users (
    id, email, first_name, last_name, password_hash, 
    auth_provider, role, is_active, is_approved
) VALUES (
    'admin_' || extract(epoch from now()),
    'admin@yourcompany.com',
    'Administrator',
    'System',
    'WKLEJ_TUTAJ_WYGENEROWANY_HASH',
    'standard',
    'admin',
    true,
    true
);
```

### 4. Budowanie i uruchomienie

```bash
# Zbuduj aplikację
npm run build

# Uruchom w produkcji
npm run start:external
```

### 5. Konfiguracja serwera web (Nginx)

Zobacz szczegółowe instrukcje w pliku `EXTERNAL_DEPLOYMENT.md`.

## Różnice od wersji Replit

- **Autentykacja**: Email/hasło zamiast OAuth Replit
- **Baza danych**: Zewnętrzna PostgreSQL zamiast wbudowanej Replit
- **Storage**: Lokalne pliki lub S3/GCS zamiast Replit Storage
- **Bezpieczeństwo**: CORS, helmet, SSL certificates

## Wsparcie

Szczegółowe instrukcje znajdziesz w `EXTERNAL_DEPLOYMENT.md`.