"""JV Estética Automotiva booking site and API."""
from datetime import date, datetime, timezone
from pathlib import Path
import os
import re
import sqlite3
import uuid
from zoneinfo import ZoneInfo

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("DB_PATH", str(ROOT / "data" / "bookings.sqlite3")))
OPEN_DAYS = {1, 2, 3, 4, 5, 6}  # terça a domingo; segunda fechado
TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
SERVICES = {"Lavagem completa", "Lavagem detalhada", "Lavagem premium"}
ENGINES = {"150cc – 400cc", "400cc – 900cc", "Mais de 900cc"}
BR_TZ = ZoneInfo("America/Sao_Paulo")

app = Flask(__name__)
# Render terminates HTTPS at its trusted proxy and supplies forwarded headers.
if os.environ.get("RENDER"):
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)


def connect_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


def init_db():
    with connect_db() as connection:
        connection.execute("""CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            motorcycle TEXT NOT NULL,
            service TEXT NOT NULL,
            engine TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            UNIQUE(date, time)
        )""")


init_db()


@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; style-src 'self' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; connect-src 'self'; "
        "img-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    )
    response.headers["Cache-Control"] = "no-store" if request.path.startswith("/api/") else "no-cache"
    if os.environ.get("RENDER"):
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.get("/")
def home():
    return send_from_directory(ROOT, "index.html")


@app.get("/css/<path:filename>")
def css_file(filename):
    return send_from_directory(ROOT / "css", filename)


@app.get("/js/<path:filename>")
def js_file(filename):
    return send_from_directory(ROOT / "js", filename)


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.get("/api/availability")
def availability():
    try:
        chosen = date.fromisoformat(request.args.get("date", ""))
    except ValueError:
        return jsonify(error="Informe uma data válida."), 400
    today = datetime.now(BR_TZ).date()
    if chosen < today or chosen.weekday() not in OPEN_DAYS:
        return jsonify(slots=[])
    with connect_db() as connection:
        rows = connection.execute(
            "SELECT time FROM bookings WHERE date = ? AND status != 'cancelled'",
            (chosen.isoformat(),),
        ).fetchall()
    booked = {row["time"] for row in rows}
    return jsonify(slots=[{"time": slot, "available": slot not in booked} for slot in TIMES])


@app.post("/api/bookings")
def create_booking():
    if request.content_length is not None and request.content_length > 8000:
        return jsonify(error="Dados inválidos."), 413
    if not request.is_json:
        return jsonify(error="Formato de pedido inválido."), 415
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Não foi possível ler os dados enviados."), 400
    if str(data.get("website", "")).strip():  # honeypot for basic form spam
        return jsonify(error="Não foi possível enviar o pedido."), 400
    if data.get("consent") != "yes":
        return jsonify(error="Confirme a autorização de uso dos dados para este agendamento."), 400
    fields = {key: str(data.get(key, "")).strip() for key in
              ("name", "phone", "motorcycle", "service", "engine", "date", "time", "notes")}
    if any(not fields[key] for key in ("name", "phone", "motorcycle", "service", "engine", "date", "time")):
        return jsonify(error="Preencha todos os campos obrigatórios."), 400
    if (fields["service"] not in SERVICES or fields["engine"] not in ENGINES
            or fields["time"] not in TIMES):
        return jsonify(error="Serviço, cilindrada ou horário inválido."), 400
    if (len(fields["name"]) > 80 or len(fields["phone"]) > 20
            or len(fields["motorcycle"]) > 80 or len(fields["notes"]) > 500):
        return jsonify(error="Revise os campos: um deles excede o tamanho permitido."), 400
    digits = re.sub(r"\D", "", fields["phone"])
    if not 10 <= len(digits) <= 13:
        return jsonify(error="Informe um número de WhatsApp válido."), 400
    try:
        chosen = date.fromisoformat(fields["date"])
    except ValueError:
        return jsonify(error="Informe uma data válida."), 400
    today = datetime.now(BR_TZ).date()
    if chosen < today or chosen.weekday() not in OPEN_DAYS:
        return jsonify(error="A data escolhida não está disponível. Selecione outro dia."), 400

    booking_id = uuid.uuid4().hex[:8].upper()
    try:
        with connect_db() as connection:
            connection.execute(
                """INSERT INTO bookings
                (id, name, phone, motorcycle, service, engine, date, time, notes, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)""",
                (booking_id, fields["name"], fields["phone"], fields["motorcycle"],
                 fields["service"], fields["engine"], fields["date"], fields["time"],
                 fields["notes"], datetime.now(timezone.utc).isoformat(timespec="seconds")),
            )
    except sqlite3.IntegrityError:
        return jsonify(error="Esse horário acabou de ser reservado. Escolha outro."), 409
    return jsonify(booking={"id": booking_id, "status": "pending"}), 201


if __name__ == "__main__":
    app.run(host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "8000")), debug=False)
