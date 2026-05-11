#!/bin/bash
cd "$(dirname "$0")"
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 20
npm run dev &
sleep 2
open http://localhost:5173
wait
