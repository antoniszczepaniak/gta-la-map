# Los Santos → Los Angeles 🗺️

Projekt w fazie wstępej będzie dalej rozwijany 

Interaktywna mapa prawdziwego Los Angeles z zaznaczonymi miejscami, które zainspirowały mapę GTA V.

Projekt fanowski, niezwiązany z Rockstar Games.

## Struktura projektu

```
gta-la-map/
├── Dockerfile            # przepis na obraz Dockera (nginx + nasza strona)
├── docker-compose.yml    # jak uruchomić kontener (porty, wolumeny)
├── .dockerignore         # pliki, których nie kopiujemy do obrazu
├── .env.example          # wzór pliku z kluczem Google Maps
├── nginx/default.conf.template  # konfiguracja serwera (z kluczem API)
└── site/                 # sama strona internetowa
    ├── index.html
    ├── css/style.css
    ├── js/app.js         # logika mapy (biblioteka Leaflet)
    ├── data/places.json  # lista miejsc – tu dodajesz nowe!
    └── images/real/      # zdjęcia prawdziwych miejsc (Wikimedia Commons)
```

## Uruchomienie

```bash
docker compose up -d --build
```

Otwórz w przeglądarce: http://localhost:8080

Zatrzymanie:

```bash
docker compose down
```

## Mapa Google (opcjonalnie)

Bez klucza strona używa darmowych map Esri i OpenStreetMap. Żeby włączyć mapę Google:

1. Wejdź na https://console.cloud.google.com/, utwórz projekt i podepnij konto rozliczeniowe
   (Google wymaga karty, ale daje darmowy miesięczny limit – dla prywatnego projektu w zupełności wystarczy).
2. W „APIs & Services → Library” włącz **Maps JavaScript API**.
3. W „APIs & Services → Credentials” utwórz **API key**. Ogranicz go do
   „HTTP referrers” → `http://localhost:8080/*` oraz do Maps JavaScript API.
4. Skopiuj `.env.example` jako `.env` i wpisz klucz:
   ```
   GOOGLE_MAPS_API_KEY=AIza...
   ```
5. Uruchom kontener ponownie: `docker compose up -d --build`

Jak to działa: `docker compose` czyta plik `.env` i przekazuje klucz do kontenera jako
**zmienną środowiskową**. Przy starcie nginx wstawia ją do szablonu
`nginx/default.conf.template` i serwuje pod adresem `/config.js`, skąd czyta ją strona.
Plik `.env` jest w `.gitignore`, więc klucz nie trafi do repozytorium.

## Najważniejsze pojęcia Dockera

| Pojęcie | Co to jest |
|---|---|
| **Obraz (image)** | „Szablon” – system plików z programami. Tworzymy go z `Dockerfile`. |
| **Kontener** | Uruchomiona kopia obrazu. Można mieć wiele kontenerów z jednego obrazu. |
| **Dockerfile** | Przepis na obraz: `FROM` (od czego zaczynamy), `COPY` (co dokładamy) itd. |
| **Zmienna środowiskowa** | Ustawienie przekazywane do kontenera z zewnątrz (np. klucz API z `.env`). |
| **Port (`8080:80`)** | Ruch z portu 8080 Twojego komputera trafia na port 80 w kontenerze. |
| **Wolumen (`volumes`)** | Folder z Twojego dysku podpięty do kontenera – zmiany widać na żywo. |
| **docker compose** | Narzędzie do uruchamiania jednego lub wielu kontenerów z pliku YAML. |

Przydatne komendy:

```bash
docker compose ps          # jakie kontenery działają
docker compose logs -f     # logi serwera na żywo
docker images              # lista obrazów
docker exec -it gta-la-map sh   # wejście „do środka” kontenera
```

## Dodawanie miejsc

Dopisz obiekt do `site/data/places.json` i odśwież stronę:

```json
{
  "id": "unikalny-id",
  "gtaName": "Nazwa w GTA",
  "realName": "Prawdziwa nazwa",
  "category": "landmark",
  "lat": 34.0,
  "lng": -118.3,
  "description": "Opis"
}
```

Kategorie: `landmark`, `district`, `culture`, `transport`.
Współrzędne najłatwiej wziąć z Google Maps (prawy klik na mapie → kliknij liczby).

## Zdjęcia

Po kliknięciu kropki okienko pokazuje opis i zdjęcie prawdziwego miejsca.
Kliknięcie zdjęcia je powiększa (zamykasz kliknięciem albo klawiszem Esc).

Zdjęcia pochodzą z Wikimedia Commons (wolne licencje). Autor, licencja i link do źródła
są zapisane w `places.json` i wyświetlane pod zdjęciem – licencje CC tego wymagają.
Przy części miejsc zdjęcia są z 2025–2026, przy innych starsze (rok widać w podpisie).
Własne zdjęcie podmienisz, nadpisując plik w `site/images/real/` i zmieniając pola w `places.json`.

## Pomysły na rozwój

- Backend (np. Python/FastAPI lub Node) + baza danych PostgreSQL jako osobne kontenery w `docker-compose.yml`
- Panel do dodawania miejsc przez stronę
- Trasy misji z gry rysowane na mapie
