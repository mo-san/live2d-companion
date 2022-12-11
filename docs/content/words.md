---
title: Words (messages)
---

# Words

You can write messages or words.

You can write messages in YAML or JSON format.
I recommend YAML. 
- write comment
- merge feature
- less typing

## Schema

All you can include in the file is these property names:
- version (required)
    - Version number for this message config file.
    - Currently, "1" is the only valid value.
    - Reserved for future use.
- general
- datetime
    - To be spoken at the specific date-time
    - write in `cron`-style format
- touch
    - spoken whe the mouse cursor touches that part of body.
    - Head and Body are supported.
- IANA language tag
    - internationalization (i18n)
    - the string the browsers return in `navigator.language` or `navigator.languages` API
    - `default` is used when no other language tags match the user's preference


### one language

```yaml
version: 1

datetime:
# cron-style datetime format
# .------------ minute (0 - 59)
# | .---------- hour (0 - 23)
# | | .-------- day of month (1 - 31)
# | | | .------ month (1 - 12) OR jan,feb,mar,apr ...
# | | | | .---- day of week (0 - 6) (Sunday=0 or 7) OR sun,mon,tue,wed,thu,fri,sat
# | | | | |
# * * * * *: message
  1 2 * * *: hello
  "* * 31 12 1,6": # say something on 31st December
    - Wish you happy new year!
    - foo bar
    - blah blah
  0 2 4-8 * *:
    - once upon a time
  "* * * * *":
    - once upon a time
    - beta zero and time
    - queue -microtask es-abstract
touch:
  Head:
    - you touch my head?
    - another
    - yet another
  Body:
    - what?
    - foo bar
    - baz qux
general:
  - hello
  - world
  - |
    you can
    write
    multi lines
```

### multi-language

```yaml
version: 1

default:
  datetime:
#   cron-style datetime format
#   .------------ minute (0 - 59)
#   | .---------- hour (0 - 23)
#   | | .-------- day of month (1 - 31)
#   | | | .------ month (1 - 12) OR jan,feb,mar,apr ...
#   | | | | .---- day of week (0 - 6) (Sunday=0 or 7) OR sun,mon,tue,wed,thu,fri,sat
#   | | | | |
#   * * * * *: message
    1 2 * * *: hello
    0 2 * * 1,6:
      - lorem ipsum
    0 2 4-8 * *:
      - once upon a time
    "* * * * *": # quotes around asterisks!
      - once upon a time
      - beta zero and time
      - queue -microtask es-abstract
  touch:
    Head:
      - head 1
      - head 2
      - head 3
    Body:
      - body 1
      - body 2
      - body 3
  general:
    - hello
    - world
    - |
      multi
      line

ja: &jp # <- the anchor used below
  touch:
    Head:
      - you touched head (JP)
    Body:
      - you touched body (JP)
  general:
    - おはようございます

ja_JP:
  *jp # consuming the anchor defined above

ja-JP:
  *jp

kr:
  # merging and inserting new sentences
  <<: *jp
  general:
    - Make my way
```
