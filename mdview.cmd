@echo off
rem Opens a Markdown file in mdview via the local server (starts it minimized if it isn't running).
rem Usage: mdview.cmd C:\path\to\file.md
start "mdview server" /min python "%~dp0serve.py" %*
