#!/bin/bash

# FrontEnd - reporter-ui composition
nvm use 12
nebulae compose-ui development --shell-type=FUSE_REACT --shell-repo=https://github.com/nebulae-u/reporter-ui.git --frontend-id=reporter-ui --output-dir=reporter-ui  --setup-file=../etc/mfe-setup.json

# API - GateWay composition
nvm use 10
nebulae compose-api development --api-type=NEBULAE_GATEWAY --api-repo=https://github.com/nebulae-u/reporter-ui-gateway.git --api-id=reporter-ui-gateway --output-dir=reporter-ui-gateway  --setup-file=../etc/mapi-setup.json