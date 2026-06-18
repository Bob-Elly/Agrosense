@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "chore: migrate email transport from resend to nodemailer (gmail smtp)"
%GIT% push origin main
