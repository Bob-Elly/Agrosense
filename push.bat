@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "feat: make core alerts compulsory and simplify delivery method preferences"
%GIT% push origin main
