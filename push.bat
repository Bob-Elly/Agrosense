@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "feat: implement 6-digit email verification flow for password reset and sign up"
%GIT% push origin main
