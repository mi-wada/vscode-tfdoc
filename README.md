# tfdoc

A VS Code extension to open Terraform Provider documentation in your browser.

![tfdoc demo](./assets/tfdoc.gif)

## Features

- Open the documentation of the Terraform resource or data source at the cursor position.

## Usage

1. Place your cursor on a Terraform resource or data source
2. Open the command palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
3. Run the command "tfdoc: Open Terraform Provider Docs"

Alternatively, you can use the default keyboard shortcut `Ctrl+; Ctrl+T` (Mac: `Cmd+; Cmd+T`).

### Customizing Keyboard Shortcut

If you prefer a different shortcut, you can customize it in your `keybindings.json`:

```json
[
  {
    "key": "cmd+k cmd+d",
    "command": "tfdoc.openDocs",
    "when": "editorTextFocus && (editorLangId == terraform || editorLangId == hcl)"
  }
]
```

## Requirements

- Visual Studio Code 1.106.1 or later.

## Install

```shell
code --install-extension mi-wada.tfdoc
```

## Known Issues

- When a resource or data source has multiple parameters with the same name, the extension cannot navigate to the correct parameter's documentation. Currently, it will navigate to the first occurrence of that parameter.
  - Example: <https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instance#device_name-2>
