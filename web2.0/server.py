#!/usr/bin/env python3
"""
Development server that starts both backend API and frontend static server.

Backend (FastAPI): http://127.0.0.1:8000
Frontend (Static): http://localhost:8080
"""

import http.server
import os
import signal
import socketserver
import subprocess
import sys
import threading
import time

BACKEND_PORT = 8000
FRONTEND_PORT = 8080


class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header(
            "Cache-Control", "no-store, no-cache, must-revalidate, max-age=0"
        )
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        if self.path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def log_message(self, format, *args):
        print(f"[Frontend] {args[0]}")


def start_backend():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    server_py = os.path.join(project_root, "server.py")

    print(f"[Backend] Starting FastAPI server on http://127.0.0.1:{BACKEND_PORT}")

    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "server:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(BACKEND_PORT),
            "--reload",
        ],
        cwd=project_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    def log_output():
        for line in iter(process.stdout.readline, ""):
            if line:
                print(f"[Backend] {line.rstrip()}")

    threading.Thread(target=log_output, daemon=True).start()
    return process


def start_frontend():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    print(f"[Frontend] Starting static server on http://localhost:{FRONTEND_PORT}")

    return socketserver.TCPServer(("", FRONTEND_PORT), NoCacheHTTPRequestHandler)


def main():
    backend_process = None

    def signal_handler(sig, frame):
        print("\n[Server] Shutting down...")
        if backend_process:
            backend_process.terminate()
            backend_process.wait()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    backend_process = start_backend()

    print("[Server] Waiting for backend to start...")
    time.sleep(2)

    httpd = start_frontend()

    print("\n" + "=" * 50)
    print("Development servers running:")
    print(f"  Backend API:  http://127.0.0.1:{BACKEND_PORT}")
    print(f"  Frontend:     http://localhost:{FRONTEND_PORT}")
    print("=" * 50 + "\n")
    print("Press Ctrl+C to stop both servers.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if backend_process:
            backend_process.terminate()
            backend_process.wait()
        httpd.shutdown()


if __name__ == "__main__":
    main()
