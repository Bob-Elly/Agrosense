@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "feat: add forgot password flow to settings lock screen"
%GIT% push origin main
