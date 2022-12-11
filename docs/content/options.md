---
title: Options
---

# Options

## For Models

You can specify URLs of your models in `models` property. This can be absolute path or relative path.

If you want to load models from any online storage, make sure the service is accesible from your website's domain.
If you are unclear about that, serach with Google "<the service name> CORS".

### Type 1: single model

```typescript
const companionOption = {
  models: ["assets/models/Mao/Mao.model3.json"], // beware of unsing [] !
  // other options go here...
}
```

### Type 2: multi models with common messages

```typescript
const companionOption = {
  models: [
    "assets/models/Mao/Mao.zip",
    "assets/models/Hiyori.zip",
  ],
  words: "assets/messages.example.yaml",
  // other options go here...
}
```

### Type 3: multi models with words for each

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
  // other options go here...
}
```

### Extra: Hit Test Area

Official models have "Head" or "Body" for hit test areas, which is used for test if the mouse cursor has contact with the part of body.

If your models have other names than those, you can specify them with extra option.

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
  // other options go here...
}
const hitTest: HitTestAreasNotNull = {
  head: { name: HitAreaName.Head },
  body: { name: HitAreaName.Body, group: MotionGroup.TapBody },
};
```

The default values for them are as follows:

```typescript
const hitTest: HitTestAreasNotNull = {
  head: { name: "Head" },
  body: { name: "Body", group: "TapBody" },
};
```

## Other Options

```typescript
const companionOption = {
  /**
   * Width of the widget in pixels.
   *
   * [Options]: number
   * [Default value]: 300
   */
  width: 300,

  /**
   * Height of the widget in pixels.
   *
   * [Options]: number
   * [Default value]: 300
   */
  height: 400,

  /**
   * Whether the widget is shown visible on start up.
   * If set false, the widget first appears invisible, and a knob is shown instead.
   * When the knob is clicked, the widget come into the screen.
   *
   * [Options]: true | false
   * [Default value]: true
   */
  modelVisible: true,

  /**
   * In which corner the widget should be located.
   *
   * [Options]: { "topleft" | "topright" | "bottomleft" | "bottomright" }
   * [Default value]: "bottomright"
   */
  modelPosition: "bottomright",

  /**
   * From which edge the widget show up.
   * You can specify any combination of `modelPosition` and `slideInFrom`.
   *
   * [Options]: { "top" | "bottom" | "left" | "right" }
   * [Default value]: "bottom"
   */
  slideInFrom: "bottom",

  /**
   * How far from the edge the widget stands (in pixels).
   * Numbers can be 0~1 (both inclusive), then they will be interpreted as a percentage.
   * 
   * Tips:
   * If you want to put the widget in the middle of any axis, you can use Jaavscript code
   *
   * [Options]: {x: number, y: number}
   * [Default value]: { x: 0, y: 0 }
   */
  modelDistance: { x: 0.5, y: 0.5 },

  /**
   * Whether users can drag the widget.
   * The wideget cannot be moved outside the screen.
   *
   * [Options]: true | false
   * [Default value]: true
   */
  draggable: true,

  /**
   * Messages that the character says. For details, see `words` page.
   *
   * [Options]: one string (i.e. the URL to the YAML or JSON)
   *            or an array of strings (i.e. a set of words)
   * [Default value]: []
   */
  words: [],

  /**
   * Whether the message window is visible on start up.
   * Users can toggle visibility in the config panel from topright button.
   *
   * [Options]: true | false
   * [Default value]: true
   */
  wordsVisible: true,

  /**
   * Where to position the message window.
   *
   * [Options]: { "top" | "bottom" }
   * [Default value]: "top"
   */
  wordsPosition: "top",

  /**
   * Whether we can cache the data.
   * Setting this false is useful during authoring and testing your live2d model.
   *
   * [Options]: true | false
   * [Default value]: true
   */
  useCache: true,

  /**
   * The version number of the models.
   * This number is used as a cache bucket inside the viewers' browser,
   * and old caches having lower number than it will be removed.
   *
   * You can specify major-minor-patch version like `1.2.3`,
   * but keep in mind that version comparison is done by alphabetically, not numerically.
   *
   * [Options]: { string | number }
   * [Default value]: "1"
   */
  version: "1",
};
```
