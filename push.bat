@echo off
set GIT="C:\Program Files\Git\cmd\git.exe"
%GIT% add .
%GIT% commit -m "feat: irrigation command acknowledgment state machine + /api/command/ack endpoint"
%GIT% push
echo Done!
