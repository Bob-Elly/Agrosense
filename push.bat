@echo off
set GIT="C:\Program Files\Git\cmd\git.exe"
%GIT% add .
%GIT% commit -m "feat: Request Reading Now — baseline detection, 5-min timeout, toast on fresh data"
%GIT% push
echo Done!
