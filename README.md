# Live2D Companion

**Live2D mascot 🪆 on your website!**

You can display your Live2D model(s) on your website.

---

## [Demo and documentation][Demo]

## Screenshots

![Screenshot1]()

![Screenshot2]()

# Features

- By using zip archive and caching to save bandwidth and lead for faster load
- drag by mouse
- arbitary words by Json or Yaml

## Technically
- OffscreenCanvas

# Usage

> **Note**
> !! Models **NOT** included !!
>
> You need to have one or create your own to fully utilize this.
>
> Included models in `assets/models` are for demonstration purpose.
>
> After you have managed to obtain one, export it, and you will have `<model name>.model3.json` and other files.

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

### [For other options, see document][Options]

# Words

You can let the model say something.

[For details, see document][Words]

# License

- MIT License (for this entire repository except for files inside [`Live2dSdk/Core`](Live2dSdk/Core), [`Live2dSdk/Framework`](Live2dSdk/Framework), and models inside [`assets/models/*`](docs/static/models))
- **[Live2D Cubism Core](https://www.live2d.com/en/download/cubism-sdk/download-web/)** is under [Live2D Proprietary Software License Agreement](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html).
- **[Cubism Web Framework](https://github.com/Live2D/CubismWebFramework)** is under [Live2D Open Software License Agreement](https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html).
- Live2D models used in this demo are available under [Live2D Free Material License](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html).

[Demo]: https://mo-san.github.io/live2d-companion/
[Options]: https://mo-san.github.io/live2d-companion/options
[Words]: https://mo-san.github.io/live2d-companion/words
