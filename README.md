# Roblox Creator Docs Search

Creates a new [release](https://github.com/Sleitnick/rbx-doc-search/releases/latest) every day (unless the source repo hasn't changed). The release contains a `files_metadata.json` file, which contains metadata regarding all articles within Roblox's [Creator Docs](https://github.com/Roblox/creator-docs) repo.

This data will eventually be used directly to feed the existing [Roblox Creator Docs Search](https://chrome.google.com/webstore/detail/roblox-devhub-search/mejgpalbcgoooijaoomkcmcjeihhlehf) browser extension.

This repository contains two parts:

1. Data aggregation in relation to the Roblox Creator Docs.
2. Browser extension

## Data Aggregation

Data aggregation is automated through a daily workflow, which creates a release of the aggregated data. This process is done through the Python scripts in the `scripts` directory.

## [Extension](https://chrome.google.com/webstore/detail/roblox-devhub-search/mejgpalbcgoooijaoomkcmcjeihhlehf)

The extension can be found in the `extension` and `src` directories. The `extension` directory contains the core extension code. The search algorithm has been moved over to WASM to speed up the process, which can be found in the `src` directory.

### WASM Compilation

To generate the WASM code, run the `build.sh` file. This will compile the code and output it within the relevant extension directory (`extension/popup/pkg`).

### Package Extension

Run the `package.sh` file to package the extension file.
