# TUI RetroArch thumbnail downloader

This script allows you to download thumbnails from Retroarch's servers with a search + list functionality.

## Why does it exist?

RetroArch usually downloads the game's thumbnails just fine but there are some edge cases where it doesn't detect the game but it does have an image related to it inside Retroarch's servers. This script aims at simplify the search of those images with a TUI.

## Installation

To install it you'll need installed:
- NodeJS;
- A terminal (Termux or whatever);

then type:
```bash
npm install -g tui-retroarch-thumbnail-downloader
```

Finally run:
```bash
tuiRetroarchTD --config
```
to configure the script with the correct path

### How to use it?

You'll need to either type `tuiRetroarchTD` in the terminal or `node tui-retroarch-thumbnail-downloader.mjs` in the same folder of where the package is installed

Read [COMMAND LINE PARAMETERS](COMMAND-LINE-PARAMETERS.md) for more information about the available parameters

## What changes have been made?

Check out the [CHANGELOG](CHANGELOG.md) file for more information.

It will include all changes being made in each version.