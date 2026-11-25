#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
RunDBtoJson.py

Exporta los productos actualizados desde 2026-01-01 de la tabla MS_GOODLIST
(SQL Server - base MS2011) hacia public/productos.json para la pagina web.

Compatible con Python 3.8.6 en Windows 7 (soporta pyodbc y pymssql).
"""

import argparse
import datetime
import decimal
import json
import os
import shutil
import sys
import tempfile
from typing import Any, Dict, List, Optional, Tuple


# Configuracion por defecto de la base de datos SQL Server
DEFAULT_HOST = "localhost"
DEFAULT_PORT = 1433
DEFAULT_DATABASE = "MS2011"
DEFAULT_USER = "sa"
DEFAULT_PASSWORD = "1111"
DEFAULT_SINCE_DATE = "2026-01-01"

# Orden de preferencia de drivers ODBC disponibles en Windows (incluyendo Windows 7)
PREFERRED_ODBC_DRIVERS = [
    "ODBC Driver 18 for SQL Server",
    "ODBC Driver 17 for SQL Server",
    "ODBC Driver 13 for SQL Server",
    "ODBC Driver 11 for SQL Server",
    "SQL Server Native Client 11.0",
    "SQL Server Native Client 10.0",
    "SQL Server",
]

SQL_QUERY = """
SELECT
    GBarcode,
    GNameX,
    GNameC,
    GSalePrice,
    GUpdateTime
FROM MS_GOODLIST
WHERE GUpdateTime >= CONVERT(datetime, ?, 112)
ORDER BY GNameX ASC
"""

SQL_QUERY_PYMSSQL = """
SELECT
    GBarcode,
    GNameX,
    GNameC,
    GSalePrice,
    GUpdateTime
FROM MS_GOODLIST
WHERE GUpdateTime >= CONVERT(datetime, %s, 112)
ORDER BY GNameX ASC
"""


def get_project_root() -> str:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(script_dir)


def get_default_output_path() -> str:
    return os.path.join(get_project_root(), "public", "productos.json")


def parse_since_yyyymmdd(date_str: str) -> str:
    try:
        parsed = datetime.datetime.strptime(date_str.strip(), "%Y-%m-%d")
    except ValueError:
        raise ValueError(
            "La fecha debe tener formato YYYY-MM-DD (por ejemplo: 2026-01-01)."
        )
    return parsed.strftime("%Y%m%d")


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        for encoding in ("utf-8", "cp1252", "latin-1"):
            try:
                return value.decode(encoding).strip()
            except UnicodeDecodeError:
                continue
        return value.decode("latin-1", errors="replace").strip()
    return str(value).strip()


def clean_price(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (decimal.Decimal, int, float)):
        return round(float(value), 2)
    try:
        return round(float(str(value).replace(",", ".").strip()), 2)
    except ValueError:
        return 0.0


def clean_datetime(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime.datetime):
        return value.strftime("%Y-%m-%dT%H:%M:%S")
    if isinstance(value, datetime.date):
        return value.strftime("%Y-%m-%dT00:00:00")
    return str(value).strip()


def load_existing_photos(json_path: str) -> Dict[str, str]:
    """
    Si productos.json ya existe, conserva las rutas/URLs del campo Foto
    asociadas a cada GBarcode para no perderlas al actualizar precios.
    """
    if not os.path.isfile(json_path):
        return {}

    try:
        with open(json_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception as exc:
        print(
            "[AVISO] No se pudieron leer fotos previas de {}: {}".format(
                json_path, exc
            )
        )
        return {}

    if not isinstance(data, list):
        return {}

    photo_map: Dict[str, str] = {}
    for item in data:
        if not isinstance(item, dict):
            continue
        barcode = clean_text(item.get("GBarcode"))
        foto = clean_text(item.get("Foto"))
        if barcode and foto:
            photo_map[barcode] = foto
    return photo_map


def select_odbc_driver(installed_drivers: List[str], requested: Optional[str]) -> str:
    if requested:
        return requested

    installed_set = {drv.lower(): drv for drv in installed_drivers}
    for candidate in PREFERRED_ODBC_DRIVERS:
        match = installed_set.get(candidate.lower())
        if match:
            return match

    for drv in installed_drivers:
        if "sql server" in drv.lower():
            return drv

    return "SQL Server"


def fetch_with_pyodbc(
    host: str,
    port: int,
    database: str,
    user: str,
    password: str,
    since_yyyymmdd: str,
    odbc_driver: Optional[str],
) -> Tuple[str, List[Tuple[Any, ...]]]:
    import pyodbc  # type: ignore

    installed = list(pyodbc.drivers())
    driver = select_odbc_driver(installed, odbc_driver)

    conn_parts = [
        "DRIVER={{{}}}".format(driver),
        "SERVER={},{}".format(host, port),
        "DATABASE={}".format(database),
        "UID={}".format(user),
        "PWD={}".format(password),
    ]

    driver_lower = driver.lower()
    if "driver 18" in driver_lower:
        conn_parts.append("Encrypt=no")
        conn_parts.append("TrustServerCertificate=yes")
    elif "driver 17" in driver_lower:
        conn_parts.append("TrustServerCertificate=yes")

    conn_str = ";".join(conn_parts) + ";"
    print("[INFO] Conectando via pyodbc con driver: {}".format(driver))

    conn = pyodbc.connect(conn_str, timeout=15)
    try:
        cursor = conn.cursor()
        cursor.execute(SQL_QUERY, (since_yyyymmdd,))
        rows = [tuple(row) for row in cursor.fetchall()]
        cursor.close()
        return "pyodbc ({})".format(driver), rows
    finally:
        conn.close()


def fetch_with_pymssql(
    host: str,
    port: int,
    database: str,
    user: str,
    password: str,
    since_yyyymmdd: str,
) -> Tuple[str, List[Tuple[Any, ...]]]:
    import pymssql  # type: ignore

    print("[INFO] Conectando via pymssql a {}:{}".format(host, port))
    conn = pymssql.connect(
        server=host,
        port=str(port),
        user=user,
        password=password,
        database=database,
        login_timeout=15,
        timeout=30,
        charset="UTF-8",
    )
    try:
        cursor = conn.cursor()
        cursor.execute(SQL_QUERY_PYMSSQL, (since_yyyymmdd,))
        rows = [tuple(row) for row in cursor.fetchall()]
        cursor.close()
        return "pymssql", rows
    finally:
        conn.close()


def fetch_rows(
    host: str,
    port: int,
    database: str,
    user: str,
    password: str,
    since_yyyymmdd: str,
    odbc_driver: Optional[str],
) -> Tuple[str, List[Tuple[Any, ...]]]:
    pyodbc_error: Optional[Exception] = None
    pymssql_error: Optional[Exception] = None

    try:
        import pyodbc  # noqa: F401
        has_pyodbc = True
    except ImportError:
        has_pyodbc = False

    if has_pyodbc:
        try:
            return fetch_with_pyodbc(
                host, port, database, user, password, since_yyyymmdd, odbc_driver
            )
        except Exception as exc:
            pyodbc_error = exc
            print("[AVISO] Fallo la conexion con pyodbc: {}".format(exc))

    try:
        import pymssql  # noqa: F401
        has_pymssql = True
    except ImportError:
        has_pymssql = False

    if has_pymssql:
        try:
            return fetch_with_pymssql(
                host, port, database, user, password, since_yyyymmdd
            )
        except Exception as exc:
            pymssql_error = exc
            print("[AVISO] Fallo la conexion con pymssql: {}".format(exc))

    if not has_pyodbc and not has_pymssql:
        raise RuntimeError(
            "No se encontro 'pyodbc' ni 'pymssql' instalado.\n"
            "Instale pyodbc en Python 3.8.6 ejecutando:\n"
            "  pip install pyodbc==4.0.39"
        )

    last_err = pymssql_error or pyodbc_error
    raise RuntimeError("No se pudo conectar a SQL Server: {}".format(last_err))


def write_json_atomic(output_path: str, payload: List[Dict[str, Any]]) -> None:
    parent_dir = os.path.dirname(os.path.abspath(output_path))
    os.makedirs(parent_dir, exist_ok=True)

    fd, temp_path = tempfile.mkstemp(
        prefix="productos_", suffix=".tmp", dir=parent_dir
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as tmp_file:
            json.dump(payload, tmp_file, ensure_ascii=False, indent=2)
            tmp_file.write("\n")
        os.replace(temp_path, output_path)
    except Exception:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Exporta productos de MS_GOODLIST (SQL Server) a public/productos.json."
        )
    )
    parser.add_argument("--host", default=os.environ.get("DB_HOST", DEFAULT_HOST))
    parser.add_argument(
        "--port", type=int, default=int(os.environ.get("DB_PORT", str(DEFAULT_PORT)))
    )
    parser.add_argument(
        "--database", default=os.environ.get("DB_NAME", DEFAULT_DATABASE)
    )
    parser.add_argument("--user", default=os.environ.get("DB_USER", DEFAULT_USER))
    parser.add_argument(
        "--password", default=os.environ.get("DB_PASSWORD", DEFAULT_PASSWORD)
    )
    parser.add_argument(
        "--since",
        default=DEFAULT_SINCE_DATE,
        help="Fecha minima de GUpdateTime en formato YYYY-MM-DD (por defecto: 2026-01-01).",
    )
    parser.add_argument(
        "--output",
        default=get_default_output_path(),
        help="Ruta del archivo productos.json de salida.",
    )
    parser.add_argument(
        "--driver",
        default=None,
        help="Nombre exacto del driver ODBC (opcional, se detecta automaticamente).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        since_yyyymmdd = parse_since_yyyymmdd(args.since)
    except ValueError as exc:
        print("[ERROR] {}".format(exc), file=sys.stderr)
        return 1

    print("=== RunDBtoJson ===")
    print("Servidor : {}:{}".format(args.host, args.port))
    print("Base     : {}".format(args.database))
    print("Desde    : {} (GUpdateTime >= {})".format(args.since, since_yyyymmdd))
    print("Salida   : {}".format(args.output))

    existing_photos = load_existing_photos(args.output)
    if existing_photos:
        print(
            "[INFO] Se preservaran {} rutas de Foto existentes.".format(
                len(existing_photos)
            )
        )

    try:
        connector_used, rows = fetch_rows(
            host=args.host,
            port=args.port,
            database=args.database,
            user=args.user,
            password=args.password,
            since_yyyymmdd=since_yyyymmdd,
            odbc_driver=args.driver,
        )
    except Exception as exc:
        print("[ERROR] {}".format(exc), file=sys.stderr)
        return 1

    products: List[Dict[str, Any]] = []
    preserved_count = 0

    for row in rows:
        barcode = clean_text(row[0])
        name = clean_text(row[1])
        category = clean_text(row[2])
        price = clean_price(row[3])
        updated_at = clean_datetime(row[4])
        foto = existing_photos.get(barcode, "")
        if foto:
            preserved_count += 1

        products.append(
            {
                "GBarcode": barcode,
                "GNameX": name,
                "GNameC": category,
                "GSalePrice": price,
                "GUpdateTime": updated_at,
                "Foto": foto,
            }
        )

    try:
        write_json_atomic(args.output, products)
    except Exception as exc:
        print("[ERROR] No se pudo escribir {}: {}".format(args.output, exc), file=sys.stderr)
        return 1

    # Si existe una build previa en /dist, tambien se actualiza dist/productos.json
    dist_dir = os.path.join(get_project_root(), "dist")
    if os.path.isdir(dist_dir) and os.path.abspath(args.output) == os.path.abspath(
        get_default_output_path()
    ):
        dist_json = os.path.join(dist_dir, "productos.json")
        try:
            shutil.copy2(args.output, dist_json)
            print("[INFO] Tambien se actualizo {}".format(dist_json))
        except Exception as exc:
            print("[AVISO] No se pudo copiar a {}: {}".format(dist_json, exc))

    print("[OK] Conector usado     : {}".format(connector_used))
    print("[OK] Productos exportados: {}".format(len(products)))
    print("[OK] Fotos preservadas  : {}".format(preserved_count))
    print("[OK] Archivo generado   : {}".format(args.output))
    return 0


if __name__ == "__main__":
    sys.exit(main())
