/// <reference lib="webworker" />

import { PrecacheController } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

console.log(PrecacheController);
console.log(self.__WB_MANIFEST);
