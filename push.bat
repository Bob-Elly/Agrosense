@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "revert: preference bypass in node-linked route"
%GIT% push origin main
