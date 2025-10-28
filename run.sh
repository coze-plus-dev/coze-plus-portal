#!/bin/sh

# Start Nginx in foreground mode
exec nginx -g "daemon off;"
