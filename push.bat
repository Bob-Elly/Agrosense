@echo off
set GIT="C:\Program Files\Git\cmd\git.exe"
%GIT% add .
%GIT% commit -m "feat: updated crop profiles (9 crops, N-fixing flag, Rice split into Lowland/Upland)"
%GIT% push
echo Done!
