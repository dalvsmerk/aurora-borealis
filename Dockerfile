FROM node:18

WORKDIR /usr/local/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production

# https://github.com/Ekito/docker-cron

# Add crontab file in the cron directory
ADD crontab /etc/cron.d/notify-cron

# Give execution rights on the cron job
RUN chmod 0644 /etc/cron.d/notify-cron

# Create the log file to be able to run tail
RUN touch /var/log/cron.log

RUN apt-get update
RUN apt-get -y install curl

# Install supercronic - a better replacement for cron
ENV SUPERCRONIC_URL=https://github.com/aptible/supercronic/releases/download/v0.2.2/supercronic-linux-386 \
    SUPERCRONIC=supercronic-linux-386 \
    SUPERCRONIC_SHA1SUM=5f984723554c59034b464110d393f1c2b2de3e8a

RUN curl -fsSLO "$SUPERCRONIC_URL" \
 && echo "${SUPERCRONIC_SHA1SUM}  ${SUPERCRONIC}" | sha1sum -c - \
 && chmod +x "$SUPERCRONIC" \
 && mv "$SUPERCRONIC" "/usr/local/bin/${SUPERCRONIC}" \
 && ln -s "/usr/local/bin/${SUPERCRONIC}" /usr/local/bin/supercronic

CMD supercronic /usr/local/app/crontab
