# ![img](extension/icons/32.png) Roblox Creator Docs Search

This repository contains two parts:

1. Data aggregation in relation to the Roblox Creator Docs
2. Browser extension

## Data Aggregation

Data aggregation is automated through a daily workflow, which creates a release of the aggregated data. This process is done through the Python scripts in the `scripts` directory.

This process helps ensure that the extension is using up-to-date metadata for search.

## Extension

Links:
- [Chrome & Edge](https://chromewebstore.google.com/detail/roblox-docs-search/mejgpalbcgoooijaoomkcmcjeihhlehf)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/roblox-docs-search/)

The extension code can be found in the `extension` and `src` directories. The `extension` directory contains the core extension code. The search algorithm has been moved over to WASM to speed up the process, which can be found in the `src` directory.

### WASM Compilation

To generate the WASM code, run the `build.sh` file. This will compile the code and output it within the relevant extension directory (`extension/popup/pkg`).

### Package Extension

Run the `package.sh` file to package the extension file.
