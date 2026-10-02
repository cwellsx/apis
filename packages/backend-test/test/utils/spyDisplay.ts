import { DisplayApi, SecondDisplay } from "backend-app";
import { AppOptions, View, ViewDetails } from "backend-ui";

export class SpyDisplayApi implements DisplayApi {
  // Call logs
  public showViewCalls: View[] = [];
  public showDetailsCalls: ViewDetails[] = [];
  public showAppOptionsCalls: AppOptions[] = [];
  public showExceptionCalls: unknown[] = [];
  public showMessageCalls: { title: string | undefined; message: string }[] = [];
  public setTitleCalls: string[] = [];
  public createSecondDisplayCalls: SecondDisplay[] = [];
  public convertPathToUrlCalls: string[] = [];

  // Methods
  showView(view: View): void {
    this.showViewCalls.push(view);
  }

  showDetails(details: ViewDetails): void {
    this.showDetailsCalls.push(details);
  }

  showAppOptions(appOptions: AppOptions): void {
    this.showAppOptionsCalls.push(appOptions);
  }

  showException(error: unknown): void {
    this.showExceptionCalls.push(error);
  }

  showLoadingMessage(title: string | undefined, message: string): void {
    this.showMessageCalls.push({ title, message });
  }

  showTitle(title: string): void {
    this.setTitleCalls.push(title);
  }

  async createSecondDisplay(delegate: SecondDisplay): Promise<void> {
    this.createSecondDisplayCalls.push(delegate);
    await Promise.resolve(); // satisfies the linter
  }

  convertPathToUrl(path: string): string {
    this.convertPathToUrlCalls.push(path);
    return `mock://${path}`;
  }
}
