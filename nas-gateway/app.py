"""
Минимальный API для NAS на Raspberry Pi.
Доступ только по заголовку X-NAS-Secret.
Не удаляет файлы — только список, скачивание, загрузка.
"""
import os
from pathlib import Path
from flask import Flask, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024  # 1 GB max upload

# Корень данных: из переменной окружения или по умолчанию
DATA_ROOT = Path(os.environ.get("NAS_DATA_ROOT", "/srv/nas")).resolve()


def check_secret():
    secret = request.headers.get("X-NAS-Secret") or request.args.get("secret")
    expected = os.environ.get("NAS_SECRET", "")
    if not expected or not secret or secret != expected:
        return jsonify({"error": "Unauthorized"}), 401
    return None


def safe_path(relative: str) -> Path | None:
    """Проверка, что путь внутри DATA_ROOT (без симлинков за пределы)."""
    base = DATA_ROOT
    try:
        full = (base / relative).resolve()
        full.relative_to(base)
        return full if full.exists() else None
    except (ValueError, OSError):
        return None


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "data_root": str(DATA_ROOT)})


@app.route("/api/list")
def list_dir():
    err = check_secret()
    if err:
        return err
    path = request.args.get("path", "").strip().lstrip("/") or "."
    dir_path = DATA_ROOT / path if path != "." else DATA_ROOT
    dir_path = dir_path.resolve()
    try:
        if not dir_path.is_dir():
            return jsonify({"error": "Not a directory"}), 400
        dir_path.relative_to(DATA_ROOT)
    except (ValueError, OSError):
        return jsonify({"error": "Forbidden path"}), 403
    items = []
    try:
        for e in sorted(dir_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            stat = e.stat()
            items.append({
                "name": e.name,
                "dir": e.is_dir(),
                "size": stat.st_size if e.is_file() else None,
                "mtime": stat.st_mtime,
            })
    except OSError as e:
        return jsonify({"error": str(e)}), 500
    return jsonify({"path": path, "items": items})


@app.route("/api/download")
def download():
    err = check_secret()
    if err:
        return err
    path = request.args.get("path", "").strip().lstrip("/")
    if not path:
        return jsonify({"error": "path required"}), 400
    full = safe_path(path)
    if not full or not full.is_file():
        return jsonify({"error": "File not found"}), 404
    return send_file(full, as_attachment=True, download_name=full.name)


@app.route("/api/upload", methods=["POST"])
def upload():
    err = check_secret()
    if err:
        return err
    path = (request.args.get("path", "").strip().lstrip("/") or "").rstrip("/")
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No selected file"}), 400
    dir_path = (DATA_ROOT / path).resolve() if path else DATA_ROOT
    try:
        dir_path.relative_to(DATA_ROOT)
        if not dir_path.exists():
            dir_path.mkdir(parents=True, exist_ok=True)
        if not dir_path.is_dir():
            return jsonify({"error": "Path is not a directory"}), 400
    except (ValueError, OSError):
        return jsonify({"error": "Forbidden path"}), 403
    name = secure_filename(file.filename)
    if not name:
        name = "upload"
    target = dir_path / name
    try:
        file.save(str(target))
        return jsonify({"ok": True, "path": (path + "/" + name).lstrip("/")})
    except OSError as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    app.run(host="0.0.0.0", port=8080, debug=False)
