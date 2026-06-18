@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "feat: dispatch email notification on new node linked"
%GIT% push origin main
