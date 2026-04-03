#!/bin/bash
set -e

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Populating database with initial data (users, regions, machines, inventory, etc.)..."
python manage.py populate_db || true

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

echo "Starting gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 4 --threads 2 --worker-class gthread --access-logfile - --error-logfile - codepop_backend.wsgi:application
