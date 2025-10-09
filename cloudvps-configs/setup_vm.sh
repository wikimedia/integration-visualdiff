#!/bin/bash

echo "Adding user testreduce"
sudo adduser testreduce
sudo adduser testreduce testreduce

# Basic packages needed for testreduce & visualdiff
sudo apt-get install nodejs npm nginx mariadb-server uprightdiff

# Font packages for rendering wikis in different languages
sudo apt-get install fonts-alee fonts-arabeyes fonts-arphic-ukai fonts-arphic-uming fonts-beng fonts-beng-extra fonts-crosextra-caladea fonts-crosextra-carlito fonts-dejavu-core fonts-dejavu-extra fonts-deva fonts-deva-extra fonts-farsiweb fonts-gargi fonts-gubbi fonts-gujr fonts-gujr-extra fonts-guru fonts-guru-extra fonts-hosny-amiri fonts-ipafont-gothic fonts-ipafont-mincho fonts-kalapi fonts-khmeros fonts-knda fonts-lao fonts-lato fonts-liberation fonts-linuxlibertine fonts-lklug-sinhala fonts-lohit-beng-assamese fonts-lohit-beng-bengali fonts-lohit-deva fonts-lohit-gujr fonts-lohit-guru fonts-lohit-knda fonts-lohit-mlym fonts-lohit-orya fonts-lohit-taml fonts-lohit-taml-classical fonts-lohit-telu fonts-lyx fonts-manchufont fonts-mlym fonts-nafees fonts-nakula fonts-navilu fonts-noto-cjk fonts-noto-core fonts-noto-hinted fonts-noto-ui-core fonts-noto-unhinted fonts-orya fonts-orya-extra fonts-sahadeva fonts-samyak-deva fonts-samyak-gujr fonts-samyak-mlym fonts-samyak-taml fonts-sil-abyssinica fonts-sil-ezra fonts-sil-lateef fonts-sil-nuosusil fonts-sil-padauk fonts-sil-scheherazade fonts-smc fonts-smc-anjalioldlipi fonts-smc-chilanka fonts-smc-dyuthi fonts-smc-gayathri fonts-smc-karumbi fonts-smc-keraleeyam fonts-smc-manjari fonts-smc-meera fonts-smc-rachana fonts-smc-raghumalayalamsans fonts-smc-suruma fonts-smc-uroob fonts-takao-gothic fonts-takao-mincho fonts-taml fonts-taml-tscu fonts-telu fonts-telu-extra fonts-teluguvijayam fonts-thai-tlwg fonts-tibetan-machine fonts-tlwg-garuda fonts-tlwg-garuda-ttf fonts-tlwg-kinnari fonts-tlwg-kinnari-ttf fonts-tlwg-laksaman fonts-tlwg-laksaman-ttf fonts-tlwg-loma fonts-tlwg-loma-ttf fonts-tlwg-mono fonts-tlwg-mono-ttf fonts-tlwg-norasi fonts-tlwg-norasi-ttf fonts-tlwg-purisa fonts-tlwg-purisa-ttf fonts-tlwg-sawasdee fonts-tlwg-sawasdee-ttf fonts-tlwg-typewriter fonts-tlwg-typewriter-ttf fonts-tlwg-typist fonts-tlwg-typist-ttf fonts-tlwg-typo fonts-tlwg-typo-ttf fonts-tlwg-umpush fonts-tlwg-umpush-ttf fonts-tlwg-waree fonts-tlwg-waree-ttf fonts-unfonts-core fonts-unfonts-extra fonts-vlgothic fonts-wqy-zenhei fonts-yrsa-rasa fonts-indic

# Import databases
sudo mysql < $MYSQL_DUMP_FILE

# Drop existing 'testreduce' user since alter / grant privileges didn't seem to work otherwise
echo "drop user 'testreduce'@'localhost'" | sudo mysql

# Recreate testreduce user
echo "create user 'testreduce'@'localhost' identified by $DB_PASSWORD; grant all privileges on %.% to 'testreduce'@'localhost';" | sudo mysql

# For Chrome / puppeteer
sudo apt-get install libatk-bridge2.0-0 libxkbcommon0 libgbm-dev libgtk-3-0 libxshmfence-dev libasound2

# Copy over service config files
cd /srv/visualdiff
sudo cp cloudvps-configs/lib-systemd-system/* /lib/systemd/system/
sudo chown ssastry:wikidev /lib/systemd/system/pars*
sudo mkdir /etc/testreduce /etc/visualdiff
sudo chown ssastry:wikidev /etc/testreduce/ /etc/visualdiff/
cp cloudvps-configs/etc-testreduce/parsoid* /etc/testreduce/
cp cloudvps-configs/etc-visualdiff/parsoid* /etc/visualdiff/
sudo cp cloudvps-configs/etc-nginx/sites-available/parsoid* /etc/nginx/sites-available/
sudo chown ssastry:wikidev /etc/nginx/sites-available/parsoid*
sudo ln -s /etc/nginx/sites-available/parsoid-vs-core-vd /etc/nginx/sites-enabled

# EDIT /etc/testreduce/* files to enter $DB_PASSWORD

## This below fails because of ssh-key reasons
## Will copy the token over to /srv and when we mount that volume,
## we will get the key
## scp parsing-qa-02:/home/testreduce/.mw-api-access-token /home/testreduce/

# access tokens
sudo mv /srv/testreduce-mw-api-access-token /home/testreduce/.mw-api-access-token
sudo chown testreduce:testreduce /home/testreduce/.mw-api-access-token

sudo chown -R testreduce:testreduce /srv/visualdiff/pngs

# reload services
sudo systemctl daemon-reload

# start parsoid-vs-core-vd
sudo service parsoid-vs-core-vd start

# Verify everything and start clients
# sudo service parsoid-vs-core-vd-client start
