@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "style: blend forgot password button with theme"
%GIT% push origin main
