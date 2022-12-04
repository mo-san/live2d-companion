// noinspection CssUnresolvedCustomProperty

/* =====================
 * Configurations for CSS Styles
   ===================== */
/** CSS class name of the app's DOM element */
export const clsAppRoot = `live2d-companion` as const;
export const clsAppRootMini = `${clsAppRoot}-mini` as const;
/** CSS class name of the app when it is being dragged */
export const clsDragging = `${clsAppRoot}__dragging` as const;

export const clsContent = `${clsAppRoot}__content` as const;
export const clsToggleMenu = `${clsContent}__toggle-menu` as const;
/** CSS class name for the message window */

export const clsMessage = `${clsContent}__message` as const;
/** CSS class name for the message window when visible */
export const clsMessageVisible = `${clsMessage}-visible` as const;

export const clsMenu = `${clsContent}__menu` as const;
export const clsSwitcher = `${clsMenu}__switch` as const;
export const clsLicense = `${clsMenu}__license` as const;
export const clsHider = `${clsMenu}__hide` as const;
export const clsToggleMessage = `${clsMenu}__toggle-message` as const;
export const clsLanguage = `${clsMenu}__language` as const;
export const clsToast = `${clsLanguage}__toast` as const;
export const clsToastVisible = `${clsToast}__visible` as const;

export const clsRevealer = `${clsAppRoot}__reveal` as const;
