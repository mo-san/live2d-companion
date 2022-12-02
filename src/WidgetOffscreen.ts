import { ModelManagerWorker } from "./index.offscreen";
import { WidgetBase } from "./WidgetBase";

export class WidgetOffscreen extends WidgetBase {
  override async main(): Promise<void> {
    await super.main();
    ModelManagerWorker.postMessage([{ task: "loop", args: {} }]);
  }

  override init(releaseInstance: boolean = false): void {
    const { clientWidth: width, clientHeight: height } = this.elemAppRoot;

    ModelManagerWorker.postMessage([
      { task: "resizeCanvas", args: { width, height } },
      releaseInstance && { task: "release" }, // release resources
      { task: "load", args: { model: this.models[this.currentModelIndex], version: this.version } },
    ]);
  }

  async onModelLoad(): Promise<void> {
    this.refreshViewpointMatrix(this.modelCoordInitial);
    this.bringBackAppIntoWindow();
    await this.main();
  }

  override registerEvents(): void {
    document.addEventListener("pointermove", (event) => this.onPointerMove(event));
    super.registerEvents();
  }

  override switchModel(event: PointerEvent): void {
    // ignore clicks or touches except for the left button click or the primary touch
    if (event.button !== 0) return;

    this.toggleMenu(event);
    this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;

    this.init(true);
  }

  override onPointerMove(event: PointerEvent): void {
    const viewX: number = this.transformViewX(event.x);
    const viewY: number = this.transformViewY(event.y);

    ModelManagerWorker.postMessage([
      { task: "look", args: { viewX, viewY } },
      { task: "touch", args: { viewX, viewY } },
    ]);

    super.onPointerMove(event);
  }

  override onPointerLeave(): void {
    ModelManagerWorker.postMessage([{ task: "look", args: { viewX: 0, viewY: 0 } }]);
  }

  override onWindowResize(): void {
    const { clientWidth: width, clientHeight: height } = this.elemAppRoot;

    ModelManagerWorker.postMessage([{ task: "resizeCanvas", args: { width, height } }]);
    super.onWindowResize();
  }
}