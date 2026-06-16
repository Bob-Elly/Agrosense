@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "fix: optimize profile picture upload with compression, resizing, timeouts, and spinner"
%GIT% push origin main
