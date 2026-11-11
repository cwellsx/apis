This is a copy and paste of `contributes.configuration` section of https://code.visualstudio.com/api/references/contribution-points.md

---

## contributes.configuration

Contribute settings that will be exposed to the user. The user will be able to set these configuration options in the Settings editor or by editing a settings.json file directly.

This section can either be a single object, representing a single category of settings, or an array of objects, representing multiple categories of settings. If there are multiple categories of settings, the Settings editor will show a submenu in the table of contents for that extension, and the title keys will be used for the submenu entry names.

### Configuration example

```json
{
  "contributes": {
    "configuration": {
      "title": "Settings Editor Test Extension",
      "type": "object",
      "properties": {
        "settingsEditorTestExtension.booleanExample": {
          "type": "boolean",
          "default": true,
          "description": "Boolean Example"
        },
        "settingsEditorTestExtension.stringExample": {
          "type": "string",
          "default": "Hello World",
          "description": "String Example"
        }
      }
    }
  }
}
```

![configuration extension point example](images/contribution-points/configuration-2.png)

You can read these values from your extension using `vscode.workspace.getConfiguration('myExtension')`.

### Configuration schema

Your configuration entry is used both to provide intellisense when editing your settings in the JSON editor, and to define the way they appear in the settings UI.

![settings UI screenshot with numbers](images/contribution-points/settings-ui.png)

#### title

The `title` 1️⃣️ of a category is the heading used for that category.

```json
{ "configuration": { "title": "GitMagic" } }
```

For an extension with multiple categories of settings, if the title of one of the categories is the same as the extension's display name, then the settings UI will treat that category as a "default category", ignoring the `order` field for that category and placing its settings below the main extension heading.

For both the `title` and `displayName` fields, words like "Extension", "Configuration", and "Settings" are redundant.

- ✔ `"title": "GitMagic"`
- ❌ `"title": "GitMagic Extension"`
- ❌ `"title": "GitMagic Configuration"`
- ❌ `"title": "GitMagic Extension Configuration Settings"`

#### properties

The `properties` 2️⃣ in your `configuration` object will form a dictionary where the keys are setting IDs and the values give more information on the setting. Though an extension can contain multiple categories of settings, each setting of the extension must still have its own unique ID. A setting ID cannot be a complete prefix of another setting ID.

Properties without an explicit `order` field will appear in lexicographical order in the settings UI (**not** the order in which they're listed in the manifest).

### Setting titles

In the settings UI, multiple fields will be used to construct a display title for each setting. Capital letters in your key are used to indicate word breaks.

#### Display titles for single-category and default category configurations

If the configuration has a single category of settings, or if the category has the same title as the extension's display name, then for settings within that category, the settings UI will use the settings ID and the extension `name` field to determine the display title.

As an example, for settings ID `gitMagic.blame.dateFormat` and extension name `authorName.gitMagic`, because the prefix of the settings ID matches with the suffix of the extension name, the `gitMagic` part of the settings ID will be removed in the display title: "Blame: **Date Format**".

#### Display titles for multi-category configurations

If the configuration has multiple categories of settings, and the category does not have the same title as the extension's display name, then for settings within that category, the settings UI will use the settings ID and the category `id` field to determine the display title.

As an example, for settings ID `css.completion.completePropertyWithSemicolon` and category ID `css`, because the prefix of the settings ID matches with the suffix of the category ID, the `css` part of the settings ID will be removed in the settings UI, and the generated title for the setting will be "Completion: **Complete Property With Semicolon**".

### Configuration property schema

Configuration keys are defined using a superset of [JSON
Schema](https://json-schema.org/overview/what-is-jsonschema).

#### description / markdownDescription

Your `description` 3️⃣ appears after the title and before the input field, except for booleans, where the description is used as the label for the checkbox. 6️⃣

```json
{
  "gitMagic.blame.heatMap.enabled": {
    "description": "Specifies whether to provide a heatmap indicator in the gutter blame annotations"
  }
}
```

If you use `markdownDescription` instead of `description`, your setting description will be parsed as Markdown in the settings UI.

```json
{
  "gitMagic.blame.dateFormat": {
    "markdownDescription": "Specifies how to format absolute dates (e.g. using the `${date}` token) in gutter blame annotations. See the [Moment.js docs](https://momentjs.com/docs/#/displaying/format/) for valid formats"
  }
}
```

For `markdownDescription`, in order to add newlines or multiple paragraphs, use the string `\n\n` to separate the paragraphs instead of just `\n`.

#### type

Entries of type `number` 4️⃣ , `string` 5️⃣ , `boolean` 6️⃣ can be edited directly in the settings UI.

```json
{
  "gitMagic.views.pageItemLimit": {
    "type": "number",
    "default": 20,
    "markdownDescription": "Specifies the number of items to show in each page when paginating a view list. Use 0 to specify no limit"
  }
}
```

A string setting can be rendered with a multiline text input if it sets `"editPresentation": "multilineText"` on the configuration entry.

For `boolean` entries, the `markdownDescription` (or `description` if `markdownDescription` is not specified) will be used as the label next to the checkbox.

```json
{
  "gitMagic.blame.compact": {
    "type": "boolean",
    "description": "Specifies whether to compact (deduplicate) matching adjacent gutter blame annotations"
  }
}
```

Some `object` and `array` type settings will be rendered in the settings UI. Simple arrays of `number`, `string`, or `boolean` will be rendered as editable lists. Objects that have properties of type `string`, `number`, `integer`, and/or `boolean` will be rendered as editable grids of keys and values. Object settings should also have `additionalProperties` set to either `false`, or an object with an appropriate `type` property, to render in the UI.

If an `object` or `array` type setting can also contain other types like nested objects, arrays, or null, then the value won't be rendered in the settings UI and can only be modified by editing the JSON directly. Users will see a link to **Edit in settings.json** as shown in the screenshot above. 8️⃣

#### order

Both categories and the settings within those categories can take an integer `order` type property, which gives a reference to how they should be sorted relative to other categories and/or settings.

If two categories have `order` properties, the category with the lower order number comes first. If a category is not given an `order` property, it appears after categories that were given that property.

If two settings within the same category have `order` properties, the setting with the lower order number comes first. If another setting within that same category is not given an `order` property, it will appear after settings in that category that were given that property.

If two categories have the same `order` property value, or if two settings within the same category have the same `order` property value, then they will be sorted in increasing lexicographical order within the settings UI.

#### enum / enumDescriptions / markdownEnumDescriptions / enumItemLabels

If you provide an array of items under the `enum` 7️⃣ property, the settings UI will render a dropdown menu of those items.

You can also provide an `enumDescriptions` property, an array of strings of the same length as the `enum` property. The `enumDescriptions` property provides a description in the settings UI at the bottom of the dropdown menu corresponding to each `enum` item. \
You can also use `markdownEnumDescriptions` instead of `enumDescriptions`, and your descriptions will be parsed as Markdown. `markdownEnumDescriptions` takes precedence over `enumDescriptions`. \
To customize the dropdown option names in the settings UI, you can use `enumItemLabels`.

Example:

```json
{
  "settingsEditorTestExtension.enumSetting": {
    "type": "string",
    "enum": ["first", "second", "third"],
    "markdownEnumDescriptions": ["The *first* enum", "The *second* enum", "The *third* enum"],
    "enumItemLabels": ["1st", "2nd", "3rd"],
    "default": "first",
    "description": "Example setting with an enum"
  }
}
```

![settings UI screenshot of example enum setting above](images/contribution-points/settings-ui-enum-example.png)

#### deprecationMessage / markdownDeprecationMessage

If you set `deprecationMessage`, or `markdownDeprecationMessage`, the setting will get a warning underline with your specified message. Also, the setting will be hidden from the settings UI unless it is configured by the user. If you set `markdownDeprecationMessage`, the markdown will not be rendered in the setting hover or the problems view. If you set both properties, `deprecationMessage` will be shown in the hover and the problems view, and `markdownDeprecationMessage` will be rendered as Markdown in the settings UI.

Example:

```json
{
  "json.colorDecorators.enable": {
    "type": "boolean",
    "description": "Enables or disables color decorators",
    "markdownDeprecationMessage": "**Deprecated**: Please use `#editor.colorDecorators#` instead.",
    "deprecationMessage": "Deprecated: Please use editor.colorDecorators instead."
  }
}
```

#### Other JSON Schema properties

You can use any of the validation JSON Schema properties to describe other constraints on configuration values:

- `default` for defining the default value of a property
- `minimum` and `maximum` for restricting numeric values
- `maxLength`, `minLength` for restricting string length
- `pattern` for restricting strings to a given regular expression
- `patternErrorMessage` for giving a tailored error message when a pattern does not match.
- `format` for restricting strings to well-known formats, such as `date`, `time`, `ipv4`, `email`,
  and `uri`
- `maxItems`, `minItems` for restricting array length
- `editPresentation` for controlling whether a single-line inputbox or multi-line textarea is rendered for the string setting in the Settings editor

#### Unsupported JSON Schema properties

Not supported in the configuration section are:

- `$ref` and `definition`: The configuration schemas needs to be self-contained and cannot make assumptions how the aggregated settings JSON schema document looks like.

For more details on these and other features, see the [JSON Schema Reference](https://json-schema.org/overview/what-is-jsonschema).

#### scope

Configuration scopes determine when a setting is available to the user through the Settings editor and whether the setting is applicable. If no `scope` is declared, the default is `window`.

A configuration setting can have one of the following possible scopes:

- `application` - Settings that apply to all instances of VS Code and can only be configured in user settings.
- `machine` - Machine specific settings that can be set only in user settings or only in remote settings. For example, an installation path which shouldn't be shared across machines. The value of these settings will not be synchronized.
- `machine-overridable` - Machine specific settings that can be overridden by workspace or folder settings. The value of these settings will not be synchronized.
- `window` - Windows (instance) specific settings which can be configured in user, workspace, or remote settings.
- `resource` - Resource settings, which apply to files and folders, and can be configured in all settings levels, even folder settings.
- `language-overridable` - Resource settings that can be overridable at a language level.

The following table summarizes how each scope behaves with respect to overrides, multi-root workspaces, remote environments, and language-specific configuration:

| Scope                  | Overridable in workspace | Overridable in workspace folder (multiroot) | Remote inherits local user settings | Overridable remotely               | Overridable at language level |
| ---------------------- | ------------------------ | ------------------------------------------- | ----------------------------------- | ---------------------------------- | ----------------------------- |
| `application`          | No                       | No                                          | Yes                                 | No                                 | No                            |
| `machine`              | No                       | No                                          | No                                  | Yes (implicitly, as not inherited) | No                            |
| `machine-overridable`  | Yes                      | Yes                                         | No                                  | Yes (implicitly, as not inherited) | No                            |
| `window`               | Yes                      | No                                          | Yes                                 | Yes                                | No                            |
| `resource`             | Yes                      | Yes                                         | Yes                                 | Yes                                | No                            |
| `language-overridable` | Yes                      | Yes                                         | Yes                                 | Yes                                | Yes                           |

Column details:

- **Overridable in workspace:** Whether the setting can be configured or overridden in workspace settings (or in folder settings for single-root workspaces).
- **Overridable in workspace folder (multiroot):** Whether the setting can be customized per folder in a multi-root workspace scenario.
- **Remote inherits local user settings:** Whether a remote window inherits the local user settings value when no remote value is set.
- **Overridable remotely:** Whether the setting can be configured in remote settings.
- **Overridable at language level:** Whether the setting supports language-specific overrides (for example, `"[typescript]": { ... }`).
- **Settings Sync:** Settings marked with `machine` or `machine-overridable` scope are machine specific and excluded from Settings Sync by default.

Below are example configuration scopes from the built-in Git extension:

```json
{
  "contributes": {
    "configuration": {
      "title": "Git",
      "properties": {
        "git.alwaysSignOff": {
          "type": "boolean",
          "scope": "resource",
          "default": false,
          "description": "%config.alwaysSignOff%"
        },
        "git.ignoredRepositories": {
          "type": "array",
          "default": [],
          "scope": "window",
          "description": "%config.ignoredRepositories%"
        },
        "git.autofetch": {
          "type": ["boolean", "string"],
          "enum": [true, false, "all"],
          "scope": "resource",
          "markdownDescription": "%config.autofetch%",
          "default": false,
          "tags": ["usesOnlineServices"]
        }
      }
    }
  }
}
```

You can see that `git.alwaysSignOff` has `resource` scope and can be set per user, workspace, or folder, while the ignored repositories list with `window` scope applies more globally for the VS Code window or workspace (which might be multi-root).

#### ignoreSync

You can set `ignoreSync` to `true` to prevent the setting from being synchronized with the user's settings. This is useful for settings that are not user-specific. For example, the `remoteTunnelAccess.machineName` setting is not user-specific and should not be synchronized. Please note that if you have set the `scope` to `machine` or `machine-overridable`, the setting will not be synchronized regardless of the value of `ignoreSync`.

```json
{
  "contributes": {
    "configuration": {
      "properties": { "remoteTunnelAccess.machineName": { "type": "string", "default": "", "ignoreSync": true } }
    }
  }
}
```

#### Linking to settings

You can insert a link to another setting, which will be rendered as a clickable link in the settings UI, by using this special syntax in the markdown-type properties: `` `#target.setting.id#` ``. This will work in `markdownDescription`, `markdownEnumDescriptions`, and `markdownDeprecationMessage`. Example:

```json
  "files.autoSaveDelay": {
    "markdownDescription": "Controls the delay in ms after which a dirty editor is saved automatically. Only applies when `#files.autoSave#` is set to `afterDelay`.",
    // ...
  }
```

In the settings UI, this is rendered as:

![setting link example](images/contribution-points/setting-link.png)
