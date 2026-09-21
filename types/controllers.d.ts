interface DomQueries {
  $(selector: string, scope?: ParentNode): HTMLElement;
  $$(selector: string, scope?: ParentNode): HTMLElement[];
}
interface PageHelpers extends DomQueries {
  escapeHtml(value: unknown): string;
  prefersReducedMotion(): boolean;
}
interface SelectedImage { id: string; file: File; previewUrl: string }
interface ChatDependencies extends DomQueries {
  escapeHtml(value: unknown): string;
  renderMarkdown(value: string): string;
  showToast(message: string): void;
  aiService: AiService;
  sessionStorageKey: string;
}
interface CourseDependencies extends PageHelpers {
  safeResourceUrl(value: unknown): string;
  mediaConfig: MediaConfig;
}
interface MapDependencies extends DomQueries {
  apiService: ApiService;
  getVisibleSites(): Site[];
  renderSites(sites: Site[]): void;
  updateSitePanel(site: Site, index: number): void;
  openCurrentSiteArchive(id: number): void;
}
interface InterfaceConfig {
  clockLocale: string;
  clockRefreshInterval: number;
  clockFormat: Intl.DateTimeFormatOptions;
}
interface NavigationDependencies extends DomQueries {
  prefersReducedMotion(): boolean;
  interfaceConfig: InterfaceConfig;
}
interface DisplaySettings {
  themeMode: string;
  motionIntensity: number;
  tiltDegrees: number;
  dustQuantity: number;
  dustSpeed: number;
}
interface SettingRange { min: number; max: number; step: number; defaultValue: number; initialValue?: number; unit: string }
interface MotionRanges { pageMotion: SettingRange; cardTilt: SettingRange; backgroundDust: SettingRange; backgroundDustSpeed: SettingRange }
interface SettingsDependencies {
  $(selector: string, scope?: ParentNode): HTMLElement;
  getSettings(): DisplaySettings;
  updateSetting(name: string, value: string | number): void;
  resetSettings(): void;
  defaults: DisplaySettings;
  ranges: MotionRanges;
  openingKey: string;
  reducedMotion: boolean;
  applySettings(): void;
  showToast(message: string): void;
  dispatchReset(): void;
}
interface ArchiveLink { query?: string; siteId?: number }
interface ArchiveDependencies {
  $(selector: string, scope?: ParentNode): HTMLElement;
  sourceDialog: HTMLDialogElement;
  sourceDialogPanel: HTMLElement;
  sourceDialogSearch: HTMLInputElement;
  clearSourceDialogSearch: HTMLElement;
  renderSourceDialogIndex(query?: string): void;
  cacheSourceSupplementHeights(element: HTMLElement): void;
  animateSourceSupplementDetails(element: HTMLDetailsElement, open: boolean): void;
  getRelicArchiveLink(id: string): ArchiveLink;
  prefersReducedMotion(): boolean;
  openModalAnimation(panel: HTMLElement): Animation;
  closeModalAnimation(panel: HTMLElement): Animation;
  showToast(message: string): void;
  getVisibleSites(): Site[];
  navigateToMapIndex(id: string | number): void;
  setMenuOpen(open: boolean): void;
}
interface SearchDependencies {
  $(selector: string, scope?: ParentNode): HTMLElement;
  escapeHtml(value: unknown): string;
  prefersReducedMotion(): boolean;
  renderSourceDialogIndex(query?: string): void;
  sourceDialog: HTMLDialogElement;
  sourceDialogPanel: HTMLElement;
  openModalAnimation(panel: HTMLElement): Animation;
  closeModalAnimation(panel: HTMLElement): Animation;
  findKnowledgeSites(query: string): Site[];
  revealTarget(element: HTMLElement): void;
  showToast(message: string): void;
  apiService: ApiService;
}
interface VisualEffects {
  rippleLifetime: number;
  searchFocusDelay: number;
  searchHighlightLifetime: number;
  cardTiltDegrees: number;
  cardPerspective: number;
  cardLift: number;
  dustSpeedScale: number;
  dustMaxParticles: number;
  dustSizeMin: number;
  dustSizeRange: number;
  dustBaseSpeedScale: number;
  dustHorizontalSpeed: number;
  dustVerticalSpeedMin: number;
  dustVerticalSpeedRange: number;
  dustOpacityMin: number;
  dustOpacityRange: number;
  dustPrimaryColor: string;
  dustAccentColor: string;
  dustPrimaryRatio: number;
  dustFrameIntervalMs: number;
}
interface EffectsDependencies extends DomQueries {
  prefersReducedMotion(): boolean;
  getSettings(): DisplaySettings;
  visualEffects: VisualEffects;
  motionSettingRanges: MotionRanges;
}
