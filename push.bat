@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "fix: update CORS config to explicitly allow Vercel frontend"
%GIT% push origin main
