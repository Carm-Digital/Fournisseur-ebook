FROM python:3.12-slim

WORKDIR /app

COPY server/requirements.txt ./server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

COPY . .

ENV PORT=8080
ENV PROTECT_DOWNLOADS=true
ENV FLASK_DEBUG=false

EXPOSE 8080

CMD ["gunicorn", "server.app:app", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "120"]
