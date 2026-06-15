@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "chore: add vercel.json for SPA routing"
%GIT% push origin main
