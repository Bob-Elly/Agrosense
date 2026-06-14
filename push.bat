@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "fix: use env vars for Firebase Admin instead of service account file"
%GIT% push origin main
