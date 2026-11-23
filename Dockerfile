# Obraz bazowy: lekki serwer WWW nginx na Alpine Linux
FROM nginx:1.27-alpine

# Szablon konfiguracji – nginx przy starcie podstawi w nim zmienne środowiskowe
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Kopiujemy naszą stronę do katalogu, z którego nginx serwuje pliki
COPY site/ /usr/share/nginx/html/

# Informacja, że kontener nasłuchuje na porcie 80
EXPOSE 80
