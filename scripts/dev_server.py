#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Daily Stock Analysis - 开发服务器启动脚本
使用 uv 工具管理依赖和虚拟环境

使用方法:
    python scripts/dev_server.py          # 启动开发服务器（web2.0前端）
    python scripts/dev_server.py --build  # 启动前先构建前端
    python scripts/dev_server.py --web2   # 使用web2.0前端（默认）
    python scripts/dev_server.py --dsa-web # 使用dsa-web前端
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path


def check_uv_installed():
    """检查 uv 是否已安装"""
    try:
        result = subprocess.run(
            ["uv", "--version"],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            print(f"✓ uv 已安装: {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    
    print("✗ uv 未安装，请先安装 uv:")
    print("  Windows: pip install uv")
    print("  macOS/Linux: curl -LsSf https://astral.sh/uv/install.sh | sh")
    return False


def sync_dependencies():
    """使用 uv 同步依赖"""
    print("\n正在同步依赖...")
    result = subprocess.run(
        ["uv", "sync"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"✗ 依赖同步失败: {result.stderr}")
        return False
    print("✓ 依赖同步完成")
    return True


def start_server(frontend_type: str, port: int, host: str):
    """启动开发服务器"""
    os.environ["WEBUI_FRONTEND"] = frontend_type
    
    print(f"\n正在启动开发服务器...")
    print(f"  前端类型: {frontend_type}")
    print(f"  监听地址: http://{host}:{port}")
    print(f"  API 文档: http://{host}:{port}/docs")
    print("\n按 Ctrl+C 停止服务器\n")
    
    result = subprocess.run(
        ["uv", "run", "uvicorn", "server:app", "--reload", "--host", host, "--port", str(port)],
    )
    return result.returncode


def main():
    parser = argparse.ArgumentParser(
        description="Daily Stock Analysis 开发服务器",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--build",
        action="store_true",
        help="启动前先构建前端（仅 dsa-web）",
    )
    parser.add_argument(
        "--web2",
        action="store_true",
        default=True,
        help="使用 web2.0 前端（默认）",
    )
    parser.add_argument(
        "--dsa-web",
        action="store_true",
        help="使用 dsa-web 前端（需要构建）",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="服务器端口（默认 8000）",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="服务器监听地址（默认 127.0.0.1）",
    )
    parser.add_argument(
        "--no-sync",
        action="store_true",
        help="跳过依赖同步",
    )
    
    args = parser.parse_args()
    
    if not check_uv_installed():
        sys.exit(1)
    
    if not args.no_sync:
        if not sync_dependencies():
            sys.exit(1)
    
    frontend_type = "web2.0" if not args.dsa_web else "dsa-web"
    
    if args.build and frontend_type == "dsa-web":
        print("\n正在构建 dsa-web 前端...")
        dsa_web_dir = Path(__file__).parent.parent / "apps" / "dsa-web"
        if dsa_web_dir.exists():
            result = subprocess.run(
                ["npm", "install"],
                cwd=str(dsa_web_dir),
            )
            if result.returncode != 0:
                print("✗ npm install 失败")
                sys.exit(1)
            
            result = subprocess.run(
                ["npm", "run", "build"],
                cwd=str(dsa_web_dir),
            )
            if result.returncode != 0:
                print("✗ 前端构建失败")
                sys.exit(1)
            print("✓ 前端构建完成")
        else:
            print("✗ dsa-web 目录不存在")
            sys.exit(1)
    
    exit_code = start_server(frontend_type, args.port, args.host)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
