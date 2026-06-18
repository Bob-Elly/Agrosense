@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "fix: unconditionally send node linking email confirmation"
%GIT% push origin main
