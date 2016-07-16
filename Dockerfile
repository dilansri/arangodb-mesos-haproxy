FROM ubuntu

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        nodejs \
	haproxy \
    && \
    rm -rf /var/lib/apt/lists/*

COPY haproxy.cfg.template /haproxy.cfg.template
COPY configurator.js /configurator.js
