@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "fix: update device ID placeholder to indicate MAC address in LinkDevice"
%GIT% push origin main
