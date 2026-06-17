@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "fix: resolve hamburger menu overlapping page headers by adding global padding to .page"
%GIT% push origin main
