@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "fix: proxy outbound SMTP through Vercel serverless to bypass Render blocking"
%GIT% push origin main
