# Overview

The "[stylus](./)" directory contains Stylus files for generating the Preference Framework stylesheets.

## How to add a new theme

Define your own theme variables in `utils/Themes.styl` using the following approach.

```stylus
    // The CSS class that the Preferences Framework uses to enable this contrast theme.
    // The convention is to give the theme a descriptive name (e.g. 'bw' for black on white)
    // and prefix it with 'fl-theme-'.
    .fl-theme-mytheme {
        --fl-fgColor: #000000; // General foreground colour (used for text and borders).
        --fl-bgColor: #ffffff; // General background colour.
        --fl-linkColor: #000000; // Optional, defaults to --fl-fgColor.
        --fl-disabledColor: #cc0000; // Optional, ignored if not supplied.
        --fl-selectedFgColor: #ffffff; // Optional, ignored if not supplied.
        --fl-selectedBgColor: #008000; // Optional, ignored if not supplied.
        --fl-buttonFgColor: #ffffff; // Optional, defaults to --fl-fgColor.
        --fl-buttonBgColor: #000000; // Optional, defaults to --fl-bgColor.
    }
```

## How to prevent grunt from compiling utility Stylus files

Some Stylus files may only contain mixins or functions for other Stylus files to import. Those files should not be
compiled into CSS. To prevent the grunt task `grunt buildStylus` from compiling them, place these files in the
"[utils](./utils)" directory.
