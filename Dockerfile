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
RUN apt-get -y install cron

CMD cron && tail -f /var/log/cron.log


# Run cron in background mode
# RUN cron

# RUN ["node", "worker.js"]

# EXPOSE $PORT

# CMD ["node", "server.js"]
