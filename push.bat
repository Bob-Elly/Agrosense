@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add -A
%GIT% commit -m "feat: AI suggestions caching, SMS fallback, no-markdown fix"
%GIT% push origin main
