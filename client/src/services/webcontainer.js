import { WebContainer } from "@webcontainer/api";

let webcontainerInstance = null;
let bootPromise = null;

export async function getWebContainer() {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = WebContainer.boot();

  webcontainerInstance = await bootPromise;

  return webcontainerInstance;
}