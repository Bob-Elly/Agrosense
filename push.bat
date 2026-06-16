@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "chore: remove profile picture storage dependencies and add leaf favicon"
%GIT% push origin main
