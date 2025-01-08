# AI Translation Workflow

Automate locale translations in `i18n` format for your Github Project, inside the **Pull Requests**, using OpenAI.

![image](https://github.com/user-attachments/assets/880f1158-6727-43c8-a5fb-f1f69e13d4a6)

**Features:**

- Generates any missing text from Sorce to Target locale files.
- Removes obsolete text in Target locale files when removed in Source.

💡 When you change a text that already exists in target locale files, those are intentionally **not** translated. In case you wish to apply those translations, please manually remove the corresponding texts from target locale files.

## Getting Started

This repository contains workflow file and script that can be imported into your own repository to get the AI Translation Workflow working. Please follow the instructions below to get your translation API and repository ready.

- Clone this repository and copy the `.github` folder into your project.
- Generate an secret key in [OpenAI Dashboard](https://platform.openai.com/api-keys).
- Add secret key to your github repository:
  1.  On GitHub, navigate to the main page of the repository.
  2.  Select "Settings" tab.
  3.  Expand "Secrets and variables" in sidebar and select "Actions".
  4.  Click "New repository secret" button
  5.  Add `OPENAI_SECRET_KEY` in "Name" field.
  6.  Paste the secret key in "Secret" field.
  7.  Click "Add secret" to save.
- Give permissions to `github-actions[bot]` to write in your repository.
  1. On GitHub, navigate to the main page of the repository.
  2. Select "Settings" tab.
  3. In the left sidebar, click "Actions", then click "General".
  4. Under "Workflow permissions", choose "Read and write permissions" and hit "Save".

## Usage

- Add your source translation json file into a locales folder. E.g. `locales/en.json`
- Update `.github/workflows/translate.yml` file with your settings:
  1. In `SOURCE_LANG`, add your source language locale that represents the translation file above.
  2. In `TARGET_LANGS`, add a `CSV` list of the target locales of the languages you wish to generate translations.
  3. If your `locales` folder is not placed in the root of your repository, update `LOCALES_ROOT_PATH` that represents where this folder is locales. E.g. If your locale files are in **web/src/locales/en.json**, write `web/src`.

## About

This repository was created by [Henrique Ferreira](https://github.com/henriquebf) under MIT license.
