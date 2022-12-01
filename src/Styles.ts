// noinspection CssUnresolvedCustomProperty

/* =====================
 * Configurations for CSS Styles
   ===================== */
import { MessageDurationSeconds } from "./Constants";

/** CSS class name of the app's DOM element */
export const clsAppRoot = `live2d-companion` as const;
export const clsAppRootMini = `${clsAppRoot}-mini` as const;
/** CSS class name of the app when it is being dragged */
export const clsDragging = `${clsAppRoot}__dragging` as const;

export const clsContent = `${clsAppRoot}__content` as const;
export const clsMenuButton = `${clsContent}__menu` as const;
/** CSS class name for the message window */

export const clsMessage = `${clsContent}__message` as const;
/** CSS class name for the message window when visible */
export const clsMessageVisible = `${clsMessage}-visible` as const;

export const clsSheet = `${clsContent}__sheet` as const;
export const clsSwitcher = `${clsSheet}__switch` as const;
export const clsCredit = `${clsSheet}__credit` as const;
export const clsHider = `${clsSheet}__hide` as const;
export const clsToggleMessage = `${clsSheet}__toggle-message` as const;
export const clsLanguage = `${clsSheet}__language` as const;
export const clsToast = `${clsLanguage}__toast` as const;
export const clsToastVisible = `${clsToast}__visible` as const;

export const clsRevealer = `${clsAppRoot}__reveal` as const;

/** The long string of the CSS which is applied to the app. */
const CssString = `<style>
.${clsAppRoot} {
  --msg-bgcolor: rgba(236, 217, 188, 1);
  --msg-line-height: 1.2;
  --msg-padding-topbottom: 10px;
  --msg-text-shadow: rgba(104, 104, 104, 0.3);
  --revealer-text-shadow-color: rgb(244, 244, 244);

  position: fixed;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255);

  touch-action: none;
  user-select: none;

  color: rgb(0, 0, 0);
  font-family: "Palatino Linotype", "UD Digi Kyokasho NK-R", "DengXian", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

.${clsAppRootMini} {
  font-size: small;
}

.${clsAppRoot} * {
  box-sizing: border-box;
}

.${clsAppRoot}.${clsDragging} {
  cursor: grabbing;
}

.${clsAppRoot} canvas {
  width: 100%;
  height: 100%;
}

.${clsAppRoot} canvas:hover {
  cursor: grab;
}

.${clsContent} {
  display: grid;
  justify-items: center;
  overflow: hidden;
}

.${clsMenuButton} {
  display: none;
  transition: all 0.4s;
  position: absolute;
  top: 0;
  right: 0;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  appearance: none;
  cursor: pointer;
  padding: 0;
}

.${clsMenuButton} div, .${clsMenuButton} div::before, .${clsMenuButton} div::after {
  transition: all 0.4s;
  position: absolute;
  height: 1px;
  background-color: rgb(255, 255, 255);
  border-radius: 4px;
  box-shadow: 0px 0px 0 1px rgb(0, 0, 0);
}

.${clsMenuButton} div {
  display: grid;
  top: 50%;
  left: 4px;
  width: 70%;
}

.${clsMenuButton} div::before {
  content: "";
  top: -8px;
  width: 100%;
}

.${clsMenuButton} div::after {
  content: "";
  top: 8px;
  width: 100%;
}

.${clsMenuButton}.open div {
  top: 0;
  width: 30px;
  height: 30px;
  background-color: transparent;
  border: 3px solid rgb(255, 255, 255);
}

.${clsMenuButton}.open div::before {
  transform: translateY(20px) rotate(-45deg) scale(0.8);
}

.${clsMenuButton}.open div::after {
  transform: translateY(4px) rotate(45deg) scale(0.8);
}

.${clsMessage} {
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--msg-padding-topbottom) 10px;
  width: clamp(100px, 250px, 80%);
  min-height: calc(var(--msg-padding-topbottom) * 2 + var(--msg-line-height) * 1rem);

  position: absolute;

  line-height: var(--msg-line-height);
  word-break: break-all;

  border-radius: 12px;
  background-color: var(--msg-bgcolor);
  box-shadow: 0 0 10px 5px rgba(191, 158, 118, 0.7);
  text-shadow: 1px 0 0 var(--msg-text-shadow), 0 1px 0 var(--msg-text-shadow);

  transition: opacity 0.2s;
  cursor: auto;
  user-select: text;
}

.${clsMessage}::before {
  content: "";
  display: block;
  height: 26px;
  width: 26px;
  position: absolute;
  border-radius: 0% 100% 100% 0% / 0% 100% 0% 100%;
  box-shadow: -14px -5px 0 0px var(--msg-bgcolor) inset;
}

.${clsMessage}-top {
  top: 0.6rem;
}

.${clsMessage}-bottom {
  bottom: 0.6rem;
}

.${clsMessage}-top::before {
  bottom: -15px;
  right: 20px;
  clip-path: polygon(5% 5%, 95% 5%, 95% 60%, 5% 60%);
  transform: scaleY(-1);
}

.${clsMessage}-bottom::before {
  top: -15px;
  left: 20px;
  transform: scaleX(-1);
  clip-path: polygon(5% 5%, 95% 5%, 95% 60%, 5% 60%);
}

.${clsMessageVisible} {
  animation: show-message ${MessageDurationSeconds}s ease-in-out;
}

@keyframes show-message {
  0% { opacity: 0; }
  5% { opacity: 1; }
  95% { opacity: 1; }
  100% { opacity: 0; }
}

.${clsSheet} {
  display: none;
  position: absolute;
  justify-self: center;
  align-self: flex-end;
  gap: 0.5em;
  padding: 1em;
  width: calc(100% - 32px * 2);
  height: calc(100% - 32px);
  overflow: hidden auto;

  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.5);
  box-shadow: 2px 0px 4px 0px rgba(0, 0, 0, 0.9);
}

.${clsAppRootMini} .${clsSheet} {
  padding: 0.3em;
}

.${clsSheet} > * {
  background-color: rgba(255, 255, 255, 80%);
  display: grid;
  align-items: center;
  text-align: center;
  border-radius: 8px;
  box-shadow: 2px 0px 4px 0px rgba(0, 0, 0, 0.9);
  min-height: 3em;
  height: max-content;
}

.${clsSheet} p {
  margin: 0;
}

.${clsSwitcher} {
  cursor: pointer;
}

.${clsHider} {
  cursor: pointer;
}

.${clsToggleMessage} {
  cursor: pointer;
} 

.${clsCredit} {
}

.${clsCredit} ul {
  all: unset;
  padding-inline-start: 1.5em;
  text-align: start;
}

.${clsLanguage} {
}

.${clsLanguage} select {
  min-height: 2rem;
}

.${clsLanguage} select option[selected][disabled] {
  display: none;
}

.${clsToast} {
  display: none;
  position: absolute;
  width: 5rem;;
  left: calc(50% - 2.5rem);
  padding: 0.3rem;
  border-radius: 8px;
  background-color: rgb(38,217,144);
}

.${clsToastVisible} {
  display: block;
  animation: show-toast 2s ease-out;
}

@keyframes show-toast {
  0% { transform: translateY(100%); }
  10% { transform: translateY(0); }
  90% { transform: translateY(0); }
  100% { transform: translateY(100%); }
}

.${clsRevealer} {
  display: none;
  position: fixed;
  padding: 0.4rem;
  width: 6rem;
  background-color: hsl(49deg, 98%, 60%);
  border: 2px solid rgb(0, 0, 0);
  border-radius: 10px;
  box-shadow: 0 0 0px 4px rgb(255, 255, 255);
  cursor: pointer;

  writing-mode: vertical-rl;
  white-space: nowrap;

  transition: transform 0.3s cubic-bezier(0, 0.78, 0.58, 1), text-shadow 0.5s ease-out;
}

.${clsRevealer} p {
  margin: 0;
}

.${clsRevealer}.bottomright {
  bottom: 3rem;
  right: 0.5rem;
  align-content: end;
  transform: translateX(calc(100% - 1.6rem));
}

.${clsRevealer}.bottomleft {
  bottom: 3rem;
  left: 0.5rem;
  align-content: start;
  transform: translateX(calc(-100% + 1.6rem));
}

.${clsRevealer}.topright {
  top: 3rem;
  right: 0.5rem;
  align-content: end;
  transform: translateX(calc(100% - 1.6rem));
}

.${clsRevealer}.topleft {
  top: 3rem;
  left: 0.5rem;
  align-content: start;
  transform: translateX(calc(-100% + 1.6rem));
}

.${clsRevealer}.bottomright:hover {
  transform: translateX(1rem);
  text-shadow: 8px -8px 0px var(--revealer-text-shadow-color);
}

.${clsRevealer}.bottomleft:hover {
  transform: translateX(-1rem);
  text-shadow: -8px 8px 0px var(--revealer-text-shadow-color);
}

.${clsRevealer}.topright:hover {
  transform: translateX(1rem);
  text-shadow: 8px -8px 0px var(--revealer-text-shadow-color);
}

.${clsRevealer}.topleft:hover {
  transform: translateX(-1rem);
  text-shadow: -8px 8px 0px var(--revealer-text-shadow-color);
}
</style>`;

export function addStyleIfNotExists(): void {
  if (document.querySelector(`.${clsAppRoot}`) == null) {
    document.head.insertAdjacentHTML("beforeend", CssString);
  }
}
