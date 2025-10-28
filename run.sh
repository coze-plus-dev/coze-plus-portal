#!/bin/sh

# Create necessary directories for nginx
mkdir -p /run/nginx
mkdir -p /var/log/nginx
mkdir -p /var/lib/nginx/tmp

# Start Nginx in foreground mode
exec nginx -g "daemon off;"
