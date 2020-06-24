'use strict';

import ImageTileBrowser from './tile_browser.js';

const e = React.createElement;

const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

// Initial zoom is half size - targeting 80% of width.
const initXLen = Math.floor(viewportWidth * 1.6);
const initYLen = Math.floor(viewportHeight * 1.6);

const domContainer = document.querySelector('#tile_browser_container');
ReactDOM.render(e(ImageTileBrowser, {
    host: "http://localhost:8080",
    getTilePath: "/v1/image/getTile",
    availableImagesPath: "/v1/image/availableImages",
    getPropsPath: "/v1/image/props",
    getPreviewPath: "/v1/image/preview",
    maxImageSide: 3500,
    initStartX: 5944,
    initStartY: 142,
    initXLen: initXLen,
    initYLen: initYLen,
    initImageId: 1
}), domContainer);
