@echo off
set GIT="C:\Program Files\Git\cmd\git.exe"
%GIT% add .
%GIT% commit -m "feat: delete node with confirmation dialog + falling flowers animation"
%GIT% push
echo Done!
