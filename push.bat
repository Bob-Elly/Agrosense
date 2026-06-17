@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "style: update hamburger menu sign out button to match ghost button theme"
%GIT% push origin main
