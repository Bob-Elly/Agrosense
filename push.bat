@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "feat: add Hamburger Menu, Crop Library, and secure Settings page"
%GIT% push origin main
