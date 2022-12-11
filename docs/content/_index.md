---
title: Home
---

**Live2D mascot 🪆 on your website!**

Live2D Companion is a utility for webmasters like you to display your favorite live2D model on your website.

---

## Screenshots

![Screenshot1]()

![Screenshot2]()

# Features

- zip archive
- drag by mouse
- arbitary words by Json or Yaml

## Technically
- use cache for faster load
- OffscreenCanvas

# Usage

{{< warning >}}
!! Models **NOT** included !!

You need to have one or create your own to fully utilize this.

Included models in `assets/models` are for demonstration purpose.

After you have managed to obtain one, export it, and you will have `<model name>.model3.json` and other files.
{{< /warning >}}

```html
<!-- add some config as you need and insert it **before** the library -->
<script>
  const companionOption = {
    models: [
      "assets/models/Mao/Mao.model3.json",
      "assets/models/Hiyori/Hiyori.model3.json",
    ],
    wordsPosition: "bottom",
  };
</script>

<!-- and load the library via CDN -->
<script src="https://cdn.jsdelivr.net/gh/mo-san/live2d-companion/dist/indes.js"></script>
```


## Config

### Required property

You need to specify what to show by `models` property.

#### simple
```typescript
const companionOption = {
  models: [
    "assets/models/Mao/Mao.model3.json",
    "assets/models/Hiyori/Hiyori.model3.json"
  ],
}
```

#### detailed
```typescript
const companionOption = {
  models: [
    {
      path: "assets/models/Mao/Mao.zip",
      words: "assets/messages.example.yaml",
    },
    {
      path: "assets/models/Hiyori.zip",
      words: "assets/messages.example.json",
    },
  ],
}
```

{{< note >}}
# Tips
- It is recommended to use as smaller texture as you can. Texture has significant impact on filesaize, and thus users' bandwidth and loading speed.
{{< /note >}}
