# Aurora Borealis Notifier

Every 3 hours checks for Kp-index and sends an email notification if it's over 5 - meaning it's likely aurora visible.

## Development
```sh
cp .env.example .env
# Then insert values to .env
npm i
node worker.js
```

## Production
```
docker build -t dalvsmerk/aurora-borealis .
docker run -d dalvsmerk/aurora-borealis
```
