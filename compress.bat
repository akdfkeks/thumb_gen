@echo off

setlocal EnableDelayedExpansion

set currentDir=%cd%

set excludeFile=%currentDir%\deploy.bat
set excludeDir=%currentDir%\.git

npm install --platform=linux && tar -cvzf thumb-gen.zip node_modules index.mjs package.json

echo Done!