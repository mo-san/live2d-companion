import { CubismDefaultParameterId as Params } from "@framework/cubismdefaultparameterid";
import { CubismModelSettingJson } from "@framework/cubismmodelsettingjson";
import { BreathParameterData, CubismBreath } from "@framework/effect/cubismbreath";
import { CubismEyeBlink } from "@framework/effect/cubismeyeblink";
import { CubismId, CubismIdHandle } from "@framework/id/cubismid";
import { CubismFramework, LogLevel } from "@framework/live2dcubismframework";
import { CubismMatrix44 } from "@framework/math/cubismmatrix44";
import { CubismUserModel } from "@framework/model/cubismusermodel";
import { ACubismMotion, FinishedMotionCallback } from "@framework/motion/acubismmotion";
import { CubismMotion } from "@framework/motion/cubismmotion";
import {
  CubismMotionQueueEntryHandle,
  InvalidMotionQueueEntryHandleValue,
} from "@framework/motion/cubismmotionqueuemanager";
import { csmMap } from "@framework/type/csmmap";
import { csmVector } from "@framework/type/csmvector";
import { unzipSync } from "fflate";
import { cacheBucketNameRoot, HitTestAreasNotNull, ModelInfoNotNull, MotionGroup, Priority } from "./Constants";

const Time: { currentFrame: number; lastFrame: number; deltaTime: number } = {
  currentFrame: Date.now(),
  lastFrame: 0,
  deltaTime: 0,
};

function stripQueryString(str: string): string {
  return str.replace(/[?#][^/]*$/, "");
}

/** find the longest common path element */
function findLongestCommonPath(mapping: Map<string, ArrayBuffer>): string {
  const paths = Array.from(mapping.keys()).map((item) => item.split("/"));
  let i = 0;
  let parentElement = "";
  while (true) {
    const currentElement = paths[0][i];
    if (!paths.every((path) => path[i] === currentElement)) {
      return parentElement;
    }
    i += 1;
    parentElement = currentElement;
  }
}

/** Decompress a zip file */
async function unzip(zipFile: Uint8Array): Promise<Map<string, Uint8Array>> {
  const unzipped = unzipSync(zipFile, { filter: (file) => !file.name.endsWith("/") });
  return new Map<string, Uint8Array>(Object.entries(unzipped));
}

export class ModelManager extends CubismUserModel {
  /* @ts-expect-error */ /** represents the contents in .model3.json */
  protected settings: CubismModelSettingJson;
  /* @ts-expect-error */
  protected glContext: WebGLRenderingContext;
  /** a mapping of expression's names and their property */
  protected expresssionsMap = new csmMap<string, ACubismMotion>();
  /** stores IDs of parameters for eyeblinking of a model */
  protected eyeblinkIds = new csmVector<CubismIdHandle>();
  /** stores IDs of parameters for lip-syncing of a model */
  protected lipsyncIds = new csmVector<CubismIdHandle>();
  /** a mapping of motion's names and their property */
  protected motionsMap = new csmMap<string, ACubismMotion>();
  /** a mapping of file names and their contents */
  protected contentBufferMap = new Map<string, ArrayBuffer>();
  /**
   * The parent directory from .model3.json file.
   * If JSON is specified this is the absolute path to the json,
   * if Zip, this is the path from the root of the archive.
   */
  protected parentDir: string = "";
  /** The properties of the currently playing motion. If set, starting another motion is suppressed. */
  protected motionHandle: CubismMotionQueueEntryHandle | null = null;
  protected cacheBucketName: string = "";
  protected hitTest: HitTestAreasNotNull | undefined;
  isRunning: boolean = false;

  /** Prohibit a direct construction to force construct asynchronously. */
  private constructor() {
    super();
  }

  /**
   * Initialization. Actual constructor for this class.
   * @param path The file path or URL of the config JSON file or the archive file containing the model.
   * @param hitTest specify this if your model has other name than "Head" or "Body" for hit detectable areas
   * @param version the version of the model(s) to be used for cache deletion
   * @param glContext
   */
  static async init(
    { path, hitTest }: ModelInfoNotNull,
    version: string,
    glContext: WebGLRenderingContext
  ): Promise<ModelManager> {
    CubismFramework.startUp({
      logFunction: (_message: string) => {},
      loggingLevel: LogLevel.LogLevel_Off,
    });
    CubismFramework.initialize();

    const modelManager = new ModelManager();
    modelManager.cacheBucketName = `${cacheBucketNameRoot}-v${version}`;
    await modelManager.deleteOldCaches();

    modelManager.glContext = glContext;
    modelManager.setupWebglFeatures();
    modelManager.hitTest = hitTest;

    let buffer;

    if (stripQueryString(path).endsWith(".json")) {
      modelManager.parentDir = stripQueryString(path).replace(/\/[^/]*$/, "");
      buffer = await modelManager.getBuffer(path, true);
    } else {
      await modelManager.fetchZip(path);
      modelManager.parentDir = findLongestCommonPath(modelManager.contentBufferMap);
      const json = Array.from(modelManager.contentBufferMap.keys()).filter((key) => key.endsWith(".model3.json"))[0];
      buffer = await modelManager.getBuffer(json, true);
    }

    modelManager.settings = new CubismModelSettingJson(buffer, buffer.byteLength);
    return modelManager;
  }

  flushWebglContext(): void {
    this.glContext.flush();
  }

  setupWebglFeatures(): void {
    this.glContext.clearColor(0.0, 0.0, 0.0, 1.0);
    this.glContext.enable(this.glContext.DEPTH_TEST);
    this.glContext.depthFunc(this.glContext.LEQUAL);
    this.glContext.clear(this.glContext.COLOR_BUFFER_BIT | this.glContext.DEPTH_BUFFER_BIT);
    this.glContext.clearDepth(1.0);
    this.glContext.enable(this.glContext.BLEND);
    this.glContext.blendFunc(this.glContext.SRC_ALPHA, this.glContext.ONE_MINUS_SRC_ALPHA);
  }

  async load(): Promise<void> {
    await this.loadModelImpl();
    await this.loadExpressionImpl();
    await this.loadPhysicsImpl();
    await this.loadPoseImpl();
    this.setupEyeblinking();
    this.setupBreathing();
    this.setupEyeblinkIds();
    this.setupLayout();
    super.createRenderer();
    await this.setupTextures();
    this.getRenderer().setIsPremultipliedAlpha(true); // use premultipliedAlpha for better alpha quality on iPhone
    this.getRenderer().startUp(this.glContext);
  }

  /**
   * Deletes all old cached files if they have lower version number than given one in their name.
   */
  protected async deleteOldCaches(): Promise<void> {
    const oldKeys = (await caches.keys())
      .filter((key) => key.startsWith(cacheBucketNameRoot))
      .filter((key) => key < this.cacheBucketName);
    // noinspection ES6MissingAwait
    oldKeys.forEach(async (key) => await caches.delete(key));
  }

  /**
   * Returns the ArrayBuffer of the specified file name.
   * @param fileName A file name you want to get the contents of.
   * @param _raw Set this True if the file name should not be prefixed with parent directory.
   * @return {Promise<ArrayBuffer>} An ArrayBuffer represents the content of the file.
   */
  protected async getBuffer(fileName: string, _raw: boolean = false): Promise<ArrayBuffer> {
    const filePath = _raw ? fileName : `${this.parentDir}/${fileName}`;
    const data = this.contentBufferMap.get(filePath);

    if (data != null) return data; // if the user specified zip, return its contents here

    // in case of json, we need to load the contents from cache
    const myCache = await caches.open(this.cacheBucketName);
    const cachedFile = await myCache.match(filePath);

    if (cachedFile == null) {
      await myCache.add(filePath);
      this.contentBufferMap.set(filePath, await ((await myCache.match(filePath)) as Response).arrayBuffer());
    } else if (this.contentBufferMap.get(filePath) == null) {
      this.contentBufferMap.set(filePath, await cachedFile.arrayBuffer());
    }

    return this.contentBufferMap.get(filePath) as ArrayBuffer;
  }

  protected async fetchZip(filePath: string): Promise<void> {
    const myCache = await caches.open(this.cacheBucketName);
    const cachedFile = await myCache.match(filePath);
    if (cachedFile == null) {
      await myCache.add(filePath);
      const zipFile = (await myCache.match(filePath)) as Response;
      this.contentBufferMap = await unzip(new Uint8Array(await zipFile.arrayBuffer()));
    } else {
      if (Object.keys(this.contentBufferMap).length === 0) {
        this.contentBufferMap = await unzip(new Uint8Array(await cachedFile.arrayBuffer()));
      }
    }
  }

  protected async loadModelImpl(): Promise<void> {
    const fileName = this.settings.getModelFileName();
    if (fileName === "") return;

    const buffer = await this.getBuffer(fileName);
    super.loadModel(buffer);
  }

  protected async loadExpressionImpl(): Promise<void> {
    const expressionCount = this.settings.getExpressionCount();
    if (expressionCount < 1) return;

    for (let i = 0; i < expressionCount; i++) {
      const expressionName = this.settings.getExpressionName(i);
      const fileName = this.settings.getExpressionFileName(i);

      const buffer = await this.getBuffer(fileName);
      const mottion = this.loadExpression(buffer, buffer.byteLength, expressionName);
      this.expresssionsMap.setValue(expressionName, mottion);
    }
  }

  protected async loadPhysicsImpl(): Promise<void> {
    const fileName = this.settings.getPhysicsFileName();
    if (fileName === "") return;

    const buffer = await this.getBuffer(fileName);
    super.loadPhysics(buffer, buffer.byteLength);
  }

  protected async loadPoseImpl(): Promise<void> {
    const fileName = this.settings.getPoseFileName();
    if (fileName === "") return;

    const buffer = await this.getBuffer(fileName);
    super.loadPose(buffer, buffer.byteLength);
  }

  protected setupEyeblinking(): void {
    if (this.settings.getEyeBlinkParameterCount() < 1) return;
    this._eyeBlink = CubismEyeBlink.create(this.settings);
  }

  protected setupBreathing(): void {
    const getParamId = (name: string): CubismId => CubismFramework.getIdManager().getId(name);

    const breathParameters = new csmVector<BreathParameterData>();
    [
      { id: Params.ParamAngleX, offset: 0.0, peak: 15.0, cycle: 6.5345, weight: 0.5 },
      { id: Params.ParamAngleY, offset: 0.0, peak: 8.0, cycle: 3.5345, weight: 0.5 },
      { id: Params.ParamAngleZ, offset: 0.0, peak: 10.0, cycle: 5.5345, weight: 0.5 },
      { id: Params.ParamBodyAngleX, offset: 0.0, peak: 4.0, cycle: 15.5345, weight: 0.5 },
      { id: Params.ParamBreath, offset: 0.5, peak: 0.5, cycle: 3.2345, weight: 1.0 },
    ].forEach(({ id, offset, peak, cycle, weight }) =>
      breathParameters.pushBack(new BreathParameterData(getParamId(id), offset, peak, cycle, weight))
    );
    this._breath = CubismBreath.create();
    this._breath.setParameters(breathParameters);
  }

  protected setupEyeblinkIds(): void {
    const blinkParameterCount = this.settings.getEyeBlinkParameterCount();

    for (let i = 0; i < blinkParameterCount; i++) {
      Object.defineProperty(this.eyeblinkIds, i, this.settings.getEyeBlinkParameterId(i));
    }
  }

  protected setupLayout(): void {
    const layout = new csmMap<string, number>();

    if (this._modelMatrix == null) return;

    this.settings.getLayoutMap(layout);
    this._modelMatrix.setupFromLayout(layout);
  }

  /**
   * Starts the specified motion.
   * @param group the name of the motion group which the motion belongs to
   * @param motionIndex its index number within the motion group
   * @param priority
   * @param callbackOnFinish a callback function called when the motion finished
   * @return Returns an identifier for the fired motion. This is used as an argument for 'isFinished' which tests
   *   whether the indicvidual motion is finished. Returns -1 if failed to start the motion.
   */
  async startMotion(
    group: string,
    motionIndex: number,
    priority: number,
    callbackOnFinish?: FinishedMotionCallback
  ): Promise<CubismMotionQueueEntryHandle> {
    if (priority === Priority.Force) {
      this._motionManager.setReservePriority(priority);
    } else if (!this._motionManager.reserveMotion(priority)) {
      // console.debug(`[APP]can't start motion: ${group} ${motionIndex}`);
      return InvalidMotionQueueEntryHandleValue;
    }

    const name = `${group}_${motionIndex}`; // like "Idle_0"
    let motion = this.motionsMap.getValue(name) as CubismMotion | null;

    // when the motion is already loaded
    if (motion != null && callbackOnFinish != null) {
      motion.setFinishedMotionHandler(callbackOnFinish);
      return this._motionManager.startMotionPriority(motion, false, priority);
    }

    // when the motion is not yet loaded
    const fileName = this.settings.getMotionFileName(group, motionIndex);
    const buffer = await this.getBuffer(fileName);

    motion = CubismMotion.create(buffer, buffer.byteLength, callbackOnFinish);

    const fadeInTime: number = this.settings.getMotionFadeInTimeValue(group, motionIndex);
    if (fadeInTime >= 0.0) motion.setFadeInTime(fadeInTime);

    const fadeOutTime = this.settings.getMotionFadeOutTimeValue(group, motionIndex);
    if (fadeOutTime >= 0.0) motion.setFadeOutTime(fadeOutTime);

    motion.setEffectIds(this.eyeblinkIds, this.lipsyncIds);
    return this._motionManager.startMotionPriority(motion, false, priority);
  }

  /**
   * Starts a random motion
   * @param group the name of the motion group
   * @param priority
   * @param callbackOnFinish a callback function called when the motion finished
   * @return Returns an identifier for the fired motion. This is used as an argument for 'isFinished' which tests
   *   whether the indicvidual motion is finished. Returns -1 if failed to start the motion.
   */
  async startRandomMotion(
    group: string,
    priority: number,
    callbackOnFinish?: FinishedMotionCallback
  ): Promise<CubismMotionQueueEntryHandle> {
    if (this.settings.getMotionCount(group) === 0) return InvalidMotionQueueEntryHandleValue;

    const motionIndex: number = Math.floor(Math.random() * this.settings.getMotionCount(group));
    return await this.startMotion(group, motionIndex, priority, callbackOnFinish);
  }

  /** load textures onto texture units */
  protected async setupTextures(): Promise<void> {
    const textureCount: number = this.settings.getTextureCount();

    for (let i = 0; i < textureCount; i++) {
      const fileName = this.settings.getTextureFileName(i);
      if (fileName === "") continue;

      await this.createTextureFromPngFile(fileName, i);
    }
  }

  /**
   * Loads textures from image file
   *
   * @param fileName an image file path to be loaded
   * @param i index of the image
   * @return null if failed to load image information
   */
  protected async createTextureFromPngFile(fileName: string, i: number): Promise<void> {
    const textureFrom = (img: ImageBitmap): WebGLTexture => {
      // Create a new empty texture
      const texture = this.glContext.createTexture() as WebGLTexture;

      this.glContext.bindTexture(this.glContext.TEXTURE_2D, texture);

      // Write the texture into the pixels
      this.glContext.texParameteri(
        this.glContext.TEXTURE_2D,
        this.glContext.TEXTURE_MIN_FILTER,
        this.glContext.LINEAR_MIPMAP_LINEAR
      );
      this.glContext.texParameteri(this.glContext.TEXTURE_2D, this.glContext.TEXTURE_MAG_FILTER, this.glContext.LINEAR);

      // Use premultiplication
      this.glContext.pixelStorei(this.glContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);

      this.glContext.texImage2D(
        this.glContext.TEXTURE_2D, // target
        0, // level
        this.glContext.RGBA, // internal format
        this.glContext.RGBA, // format
        this.glContext.UNSIGNED_BYTE, // type
        img // pixels
      );

      this.glContext.generateMipmap(this.glContext.TEXTURE_2D);
      // Unset the bound texture
      this.glContext.bindTexture(this.glContext.TEXTURE_2D, null);

      return texture;
    };

    const buffer = await this.getBuffer(fileName);
    const blob = new Blob([new Uint8Array(buffer)], { type: "image/png" });
    this.getRenderer().bindTexture(i, textureFrom(await createImageBitmap(blob)));
  }

  setExpression(expressionName: string): CubismMotionQueueEntryHandle {
    const motion: ACubismMotion = this.expresssionsMap.getValue(expressionName);
    if (motion == null) return -1;

    return this._expressionManager.startMotionPriority(motion, false, Priority.Force);
  }

  setRandomExpression(): CubismMotionQueueEntryHandle {
    if (this.expresssionsMap.getSize() === 0) return -1;

    const index: number = Math.floor(Math.random() * this.expresssionsMap.getSize());

    const name: string = this.expresssionsMap._keyValues[index].first;
    return this.setExpression(name);
  }

  getDefaultExpressionName(): string | undefined {
    if (this.expresssionsMap.getSize() === 0) return;
    return this.expresssionsMap._keyValues[0].first;
  }

  /**
   * Tests whether the pointer is above the body parts (currently supports "Head" and "Body").
   * @param x X position in the viewport coordinate (-1 ~ 1)
   * @param y Y position in the viewport coordinate (-1 ~ 1)
   */
  async touchAt(x: number, y: number): Promise<string | undefined> {
    // do nothing while a motion is still active
    if (this.motionHandle != null) return;

    if (this.hitTest == null) return;
    const { head, body } = this.hitTest;

    if (this.didHitIn(head.name, x, y)) {
      this.motionHandle = this.setRandomExpression();

      // reset to the default expression
      setTimeout(() => {
        const name = this.getDefaultExpressionName();
        if (name != null) this.setExpression(name);
        this.motionHandle = null;
      }, 2000);
      return head.name;
    }

    if (this.didHitIn(body.name, x, y)) {
      this.motionHandle = await this.startRandomMotion(body.group, Priority.Normal, () => (this.motionHandle = null));
      return body.name;
    }
    return; // eslint-disable-line no-useless-return
  }

  didHitIn(hitArenaName: string, x: number, y: number): boolean {
    // does not hit if the part is transparent
    if (this._opacity < 1) return false;

    for (let i = 0; i < this.settings.getHitAreasCount(); i++) {
      if (this.settings.getHitAreaName(i) === hitArenaName) {
        return super.isHit(this.settings.getHitAreaId(i), x, y);
      }
    }

    return false;
  }

  async startLoop(): Promise<void> {
    this.isRunning = true;
    await this.loop(0);
  }

  stopLoop(): void {
    this.isRunning = false;
  }

  async loop(time: number): Promise<void> {
    if (!this.isRunning) return;

    // prepare the next frame
    requestAnimationFrame(async (time) => await this.loop(time));

    // proceed time
    Time.currentFrame = time;
    Time.deltaTime = (Time.currentFrame - Time.lastFrame) / 1000;
    Time.lastFrame = Time.currentFrame;

    this.flushWebglContext();

    const projection: CubismMatrix44 = new CubismMatrix44();

    const { width, height } = this.glContext.canvas;
    if ((this.getModel().getCanvasWidth() ?? 1.0) > 1.0 && width < height) {
      // Calculate the scale by the horizontal length of the model when displaying a horizontally long model in a portrait window.
      this.getModelMatrix().setWidth(2.0);
      projection.scale(1.0, width / height);
    } else {
      projection.scale(height / width, 1.0);
    }
    this.draw(projection, { width, height });
    await this.update(Time.deltaTime);
  }

  draw(matrix: CubismMatrix44, { width, height }: { width: number; height: number }): void {
    const renderer = super.getRenderer();

    matrix.multiplyByMatrix(this._modelMatrix);
    renderer.setMvpMatrix(matrix);

    const frameBuffer: WebGLFramebuffer = this.glContext.getParameter(this.glContext.FRAMEBUFFER_BINDING);
    const viewport = [0, 0, width, height];
    renderer.setRenderState(frameBuffer, viewport);
    renderer.drawModel();
  }

  /**
   * About updating the parameters of the models, refer to:
   * https://docs.live2d.com/cubism-sdk-manual/use-framework-web/#update
   */
  async update(deltaTime: number): Promise<void> {
    await this._updateParameters(deltaTime);
    // make sure 'update()' is called at the end
    this._model.update();
  }

  addParameterValueById(name: string, value: number): void {
    return this._model.addParameterValueById(CubismFramework.getIdManager().getId(name), value);
  }

  async _updateParameters(deltaTime: number): Promise<void> {
    this._dragManager.update(deltaTime);
    this._dragX = this._dragManager.getX();
    this._dragY = this._dragManager.getY();

    // --------------------------------------------------------------------------
    /**
     * cited and translated from https://docs.live2d.com/cubism-sdk-manual/parameters/
     *
     * As APIs, saveParameters() and loadParameters() are used to save and load values,
     * but the actual use within LAppModel::update() is that we call saveParameters()
     * after calling loadParameters() to reset to the previous state and apply the motion playback.
     *
     * The purpose of this method is to provide a basis for additive and multiplicative calculations
     * by overwriting parameters that have not been played or have not been specified
     * by the motion playback with values prior to any other operations in the update.
     *
     * Without this feature, an addition to an unspecified parameter in a motion will
     * cause the value to be added on each update, resulting in an out-of-range value.
     *
     * Although you can provide a basis for additive/multiplicative even if you only
     * use Load before motion playback, Save after motion playback allows the last
     * state of the motion to be retained.
     */
    this._model.loadParameters(); // 前回セーブされた状態をロード
    if (this._motionManager.isFinished()) {
      // モーションの再生がない場合、待機モーションの中からランダムで再生する
      await this.startRandomMotion(MotionGroup.Idle, Priority.Idle);
    } else {
      // モーションによるパラメータ更新の有無
      const motionUpdated = this._motionManager.updateMotion(this._model, deltaTime);
      // メインモーションの更新がないとき、 まばたき
      if (!motionUpdated && this._eyeBlink != null) {
        this._eyeBlink.updateParameters(this._model, deltaTime);
      }
    }
    this._model.saveParameters(); // 状態を保存
    // --------------------------------------------------------------------------

    this._expressionManager?.updateMotion(this._model, deltaTime); // 表情でパラメータ更新（相対変化）

    // マウス移動による顔の向きの調整: -30から30の値を加える
    this.addParameterValueById(Params.ParamAngleX, this._dragX * 30);
    this.addParameterValueById(Params.ParamAngleY, this._dragY * 30);
    this.addParameterValueById(Params.ParamAngleZ, this._dragX * this._dragY * 30);

    // マウス移動による体の向きの調整: -10から10の値を加える
    this.addParameterValueById(Params.ParamBodyAngleX, this._dragX * 10);

    // マウス移動による目の向きの調整: -1から1の値を加える
    this.addParameterValueById(Params.ParamEyeBallX, this._dragX);
    this.addParameterValueById(Params.ParamEyeBallY, this._dragY);

    // 呼吸など
    this._breath?.updateParameters(this._model, deltaTime);

    // 物理演算の設定
    this._physics?.evaluate(this._model, deltaTime);

    // ポーズの設定
    this._pose?.updateParameters(this._model, deltaTime);
  }
}
