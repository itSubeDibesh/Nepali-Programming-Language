# Proves the actual premise of this whole project (see CLAUDE.md): a
# real Next.js app, hosted on NepaliOS's real Debian base. Extends the
# real nepali-os:dev image (built from the repo root Dockerfile) rather
# than baking Node.js/npm into the core OS image permanently - the OS
# just needs to be ABLE to host this when asked, not ship a demo app in
# its base layer forever.
FROM nepali-os:dev

USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends nodejs npm && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install
COPY app ./app
RUN npm run build

EXPOSE 3000
ENTRYPOINT ["npm", "start"]
