# erpeel

## cek dulu:
0. buka terminal di mana aja
1. run `git -v`, kalo belom ada install git dulu
2. run `npm -v`, kalo belom ada install node.js dulu

## awal-awal:
1. di path yang mau jadi tempat project, klik kanan, buka terminal
2. run `git clone https://github.com/sam-is-grinding/erpeel.git`
3. kalo udah, run `cd erpeel`, _kalo ga intinya buka terminal di path `../erpeel/`_
4. run `code .` (supaya keren), _kalo ga intinya buka projectnya di code editor (misal vs code)_

##

## install tailwind css
1. di terminal code editor project, run `npm init -y`
2. kalo udah run `npm install tailwindcss @tailwindcss/postcss postcss postcss-cli`
3. kalo udah, cari file `package.json`, ubah `script` sama `type` jadi:
``` json
  "scripts": {
    "build": "postcss ./src/styles.css -o ./public/styles.css"
  },
 "type": "module",
```
4. kalo udah, run `npm run build`

## bikin databasenya
1. tanya tristan :D

## install-install buat backend
1. masih di terminal code editor, run `npm install express express-session bcrypt mysql2 body-parser dotenv ejs`
2. di root (`erpeel/`), buat file `.env`
3. di file `.env`-nya, copas
``` env
DB_HOST=<host>
DB_USER=<user>
DB_PASS=<password>
DB_NAME=<nama database>
DB_PORT=<port>
```
*itu yang di dalem `< >` diganti sesuai db yang dibuat tadi, **gausah pake `" "`, jangan pake spasi**
misal jadi kayak gini:
``` env
DB_HOST=localhost
DB_USER=root
DB_PASS=54321
DB_NAME=bimbingan_kampus
DB_PORT=3306
```

## beress
1. kalo mau jalanin, di terminal project, run `node server.js`, kalo ada tulisan `Server running on port 3000` berarti aman
2. terus buka browser, ke `http://localhost:3000/login`


#### *catatan:
- kalo `server.js`-nya diubah, mattin servernya dulu pake `ctrl+c`, terus jalanin lagi pake `node server.js` (sebenernya bisa lebih gampang pake `nodemon`, tapi mlz aj :v
- itu **halaman-halaman webnya ada `views/`**, di file-file yang extensionnya `.ejs`, tapi isinya sama aja kayak `html`
- kalo mau pake template dari `tailwind css`, jangan lupa di `<head>` `.ejs`-nya tambahin:
``` html
<head>
...
  <link href="/styles.css" rel="stylesheet">
...
</head>
```
- kalo di `.ejs` nya ada kayak `x-data` atau apapun yang ada `x-`nya, tambahin:
``` html
<head>
...
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
...
</head>
```
