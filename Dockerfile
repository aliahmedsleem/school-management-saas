FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv/app
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt "gunicorn>=22,<24"
COPY backend/ ./
COPY --from=frontend /frontend/dist /srv/app/static_frontend
RUN useradd --system --create-home --uid 10001 school && mkdir -p /srv/data && chown -R school:school /srv/data /srv/app
USER school
EXPOSE 8000
CMD ["gunicorn","--bind","0.0.0.0:8000","--workers","2","--access-logfile","-","wsgi:app"]
