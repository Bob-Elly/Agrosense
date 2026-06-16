@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% add .
%GIT% commit -m "feat: add comprehensive Notification System, Resend email alerts, and telemetry thresholds"
%GIT% push origin main
