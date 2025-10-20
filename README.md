# Trip Advisor - Python Version

Aplikacja do planowania urlopu na podstawie analizy filmów YouTube. Aplikacja wykorzystuje AI do wyciągnięcia miejsc wartych zobaczenia z transkrypcji filmów i wyświetla je na mapie oraz w formie listy.

## Funkcje

- 🎬 Analiza filmów YouTube i wyciąganie miejsc turystycznych
- 🤖 Wykorzystanie OpenAI do analizy transkrypcji
- 🗺️ Wyświetlanie miejsc na mapie Google Maps
- 📋 Lista miejsc z filtrowaniem i sortowaniem
- 🌍 Geokodowanie miejsc za pomocą Google Maps API

## Wymagania

- Python 3.8+
- Klucze API:
  - OpenAI API (wymagane)
  - Google Maps API (wymagane)
  - YouTube API (opcjonalne)

## Instalacja

1. Sklonuj repozytorium:
```bash
git clone <repository-url>
cd trip-advisor
```

2. Utwórz środowisko wirtualne:
```bash
python -m venv venv
```

3. Aktywuj środowisko wirtualne:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. Zainstaluj zależności:
```bash
pip install -r requirements.txt
```

5. Skonfiguruj zmienne środowiskowe:
```bash
# Skopiuj plik konfiguracyjny
cp env_config.example .env

# Edytuj .env i dodaj swoje klucze API
```

## Konfiguracja API

### OpenAI API
1. Przejdź do [OpenAI Platform](https://platform.openai.com/api-keys)
2. Utwórz nowy klucz API
3. Dodaj go do pliku `.env` jako `OPENAI_API_KEY`

### Google Maps API
1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/)
2. Włącz następujące API:
   - Geocoding API
   - Maps JavaScript API
3. Utwórz klucz API
4. Dodaj go do pliku `.env` jako `GOOGLE_MAPS_API_KEY`

### YouTube API (opcjonalne)
1. Przejdź do [Google Developers Console](https://console.developers.google.com/)
2. Włącz YouTube Data API v3
3. Utwórz klucz API
4. Dodaj go do pliku `.env` jako `YOUTUBE_API_KEY`

## Uruchomienie

```bash
python app.py
```

Aplikacja będzie dostępna pod adresem: http://localhost:5000

## Użycie

1. Otwórz aplikację w przeglądarce
2. Wklej link do filmu YouTube
3. Kliknij "Analizuj film"
4. Poczekaj na analizę (może potrwać kilka sekund)
5. Przejrzyj znalezione miejsca na mapie lub liście

## Struktura projektu

```
trip-advisor/
├── app.py                 # Główna aplikacja Flask
├── requirements.txt       # Zależności Python
├── env_config.example    # Przykład konfiguracji
├── templates/
│   └── index.html        # Szablon HTML
├── static/
│   ├── css/              # Style CSS
│   └── js/
│       └── app.js        # JavaScript frontend
└── README.md             # Ten plik
```

## API Endpoints

- `GET /` - Strona główna
- `POST /api/analyze` - Analiza filmu YouTube
- `POST /api/transcript` - Pobieranie transkrypcji (legacy)
- `GET /api/health` - Sprawdzenie statusu

## Rozwiązywanie problemów

### Błąd "Nie można pobrać transkrypcji filmu"
- Sprawdź czy film ma włączone napisy
- Dodaj klucz YouTube API do pliku `.env`

### Błąd "Brak klucza OpenAI API"
- Dodaj klucz OpenAI API do pliku `.env`
- Sprawdź czy klucz jest poprawny

### Błąd "Brak klucza Google Maps API"
- Dodaj klucz Google Maps API do pliku `.env`
- Sprawdź czy API są włączone w Google Cloud Console

### Mapa się nie ładuje
- Sprawdź klucz Google Maps API
- Upewnij się, że Maps JavaScript API jest włączone

## Licencja

MIT License