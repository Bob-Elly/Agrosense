@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "style: move forgot password button below input in settings"
%GIT% push origin main
