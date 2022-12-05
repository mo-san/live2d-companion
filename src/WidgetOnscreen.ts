import { ModelManager } from "./ModelManager";
import { WidgetBase } from "./WidgetBase";

export class WidgetOnscreen extends WidgetBase {
  modelManager?: ModelManager;

  override async init(releaseInstance: boolean = false): Promise<void> {
    const { clientWidth: width, clientHeight: height } = this.elemAppRoot;
    this.resizeCanvas(width, height);

    releaseInstance && this.release(); // release resources
    const glContext = this.CANVAS.getContext("webgl") as WebGLRenderingContext;
    this.modelManager = await ModelManager.init(this.models[this.currentModelIndex], this.version, glContext);
    await this.modelManager.load();
  }

  override async main(): Promise<void> {
    await this.init();
    this.refreshViewpointMatrix(this.modelCoordInitial);

    await super.main();

    await this.modelManager?.startLoop();
  }

  registerEvents(): void {
    document.addEventListener("pointermove", async (event) => await this.onPointerMove(event));
    super.registerEvents();
  }

  resizeCanvas(width: number, height: number): void {
    this.CANVAS.width = width;
    this.CANVAS.height = height;
  }

  release(): void {
    // release resources
    this.modelManager?.stopLoop();
    this.modelManager?.release();
    this.modelManager = undefined;
  }

  override async switchModel(event: PointerEvent): Promise<void> {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event.button !== 0) return;

    this.closeMenu();
    this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;

    await this.init(true);
  }

  override async onPointerMove(event: PointerEvent): Promise<void> {
    const viewX: number = this.transformViewX(event.x);
    const viewY: number = this.transformViewY(event.y);

    this.modelManager?.setDragging(viewX, viewY);
    const part = await this.modelManager?.touchAt(viewX, viewY);
    part != null && this.sayWhenTouched(part);

    super.onPointerMove(event);
  }

  override onPointerLeave(): void {
    this.modelManager?.setDragging(0, 0);
    super.onPointerLeave();
  }

  override onWindowResize(): void {
    const { clientWidth: width, clientHeight: height } = this.elemAppRoot;

    this.resizeCanvas(width, height);
    super.onWindowResize();
  }
}
