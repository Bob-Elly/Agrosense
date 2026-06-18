@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "feat: small UX fixes including layout adjustments, system theme support, and default avatar display"
%GIT% push origin main
