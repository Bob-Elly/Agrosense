@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "fix: remove leftover resend import in notifications.js"
%GIT% push origin main
