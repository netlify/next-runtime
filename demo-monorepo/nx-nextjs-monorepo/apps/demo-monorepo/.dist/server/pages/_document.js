"use strict";
(() => {
var exports = {};
exports.id = 660;
exports.ids = [660];
exports.modules = {

/***/ 29:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({
    value: true
}));
exports["default"] = initHeadManager;
exports.DOMAttributeNames = void 0;
const DOMAttributeNames = {
    acceptCharset: 'accept-charset',
    className: 'class',
    htmlFor: 'for',
    httpEquiv: 'http-equiv',
    noModule: 'noModule'
};
exports.DOMAttributeNames = DOMAttributeNames;
function reactElementToDOM({ type , props  }) {
    const el = document.createElement(type);
    for(const p in props){
        if (!props.hasOwnProperty(p)) continue;
        if (p === 'children' || p === 'dangerouslySetInnerHTML') continue;
        // we don't render undefined props to the DOM
        if (props[p] === undefined) continue;
        const attr = DOMAttributeNames[p] || p.toLowerCase();
        if (type === 'script' && (attr === 'async' || attr === 'defer' || attr === 'noModule')) {
            el[attr] = !!props[p];
        } else {
            el.setAttribute(attr, props[p]);
        }
    }
    const { children , dangerouslySetInnerHTML  } = props;
    if (dangerouslySetInnerHTML) {
        el.innerHTML = dangerouslySetInnerHTML.__html || '';
    } else if (children) {
        el.textContent = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
    }
    return el;
}
function updateElements(type, components) {
    const headEl = document.getElementsByTagName('head')[0];
    const headCountEl = headEl.querySelector('meta[name=next-head-count]');
    if (false) {}
    const headCount = Number(headCountEl.content);
    const oldTags = [];
    for(let i = 0, j = headCountEl.previousElementSibling; i < headCount; i++, j = j.previousElementSibling){
        if (j.tagName.toLowerCase() === type) {
            oldTags.push(j);
        }
    }
    const newTags = components.map(reactElementToDOM).filter((newTag)=>{
        for(let k = 0, len = oldTags.length; k < len; k++){
            const oldTag = oldTags[k];
            if (oldTag.isEqualNode(newTag)) {
                oldTags.splice(k, 1);
                return false;
            }
        }
        return true;
    });
    oldTags.forEach((t)=>t.parentNode.removeChild(t)
    );
    newTags.forEach((t)=>headEl.insertBefore(t, headCountEl)
    );
    headCountEl.content = (headCount - oldTags.length + newTags.length).toString();
}
function initHeadManager() {
    let updatePromise = null;
    return {
        mountedInstances: new Set(),
        updateHead: (head)=>{
            const promise = updatePromise = Promise.resolve().then(()=>{
                if (promise !== updatePromise) return;
                updatePromise = null;
                const tags = {
                };
                head.forEach((h)=>{
                    if (// it won't be inlined. In this case revert to the original behavior
                    h.type === 'link' && h.props['data-optimized-fonts']) {
                        if (document.querySelector(`style[data-href="${h.props['data-href']}"]`)) {
                            return;
                        } else {
                            h.props.href = h.props['data-href'];
                            h.props['data-href'] = undefined;
                        }
                    }
                    const components = tags[h.type] || [];
                    components.push(h);
                    tags[h.type] = components;
                });
                const titleComponent = tags.title ? tags.title[0] : null;
                let title = '';
                if (titleComponent) {
                    const { children  } = titleComponent.props;
                    title = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
                }
                if (title !== document.title) document.title = title;
                [
                    'meta',
                    'base',
                    'link',
                    'style',
                    'script'
                ].forEach((type)=>{
                    updateElements(type, tags[type] || []);
                });
            });
        }
    };
} //# sourceMappingURL=head-manager.js.map


/***/ }),

/***/ 71:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({
    value: true
}));
exports.cancelIdleCallback = exports.requestIdleCallback = void 0;
const requestIdleCallback = typeof self !== 'undefined' && self.requestIdleCallback && self.requestIdleCallback.bind(window) || function(cb) {
    let start = Date.now();
    return setTimeout(function() {
        cb({
            didTimeout: false,
            timeRemaining: function() {
                return Math.max(0, 50 - (Date.now() - start));
            }
        });
    }, 1);
};
exports.requestIdleCallback = requestIdleCallback;
const cancelIdleCallback = typeof self !== 'undefined' && self.cancelIdleCallback && self.cancelIdleCallback.bind(window) || function(id) {
    return clearTimeout(id);
};
exports.cancelIdleCallback = cancelIdleCallback; //# sourceMappingURL=request-idle-callback.js.map


/***/ }),

/***/ 747:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({
    value: true
}));
exports.initScriptLoader = initScriptLoader;
exports["default"] = void 0;
var _react = _interopRequireWildcard(__webpack_require__(689));
var _headManagerContext = __webpack_require__(281);
var _headManager = __webpack_require__(29);
var _requestIdleCallback = __webpack_require__(71);
function _defineProperty(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
        return obj;
    } else {
        var newObj = {
        };
        if (obj != null) {
            for(var key in obj){
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {
                    };
                    if (desc.get || desc.set) {
                        Object.defineProperty(newObj, key, desc);
                    } else {
                        newObj[key] = obj[key];
                    }
                }
            }
        }
        newObj.default = obj;
        return newObj;
    }
}
function _objectSpread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {
        };
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
        }
        ownKeys.forEach(function(key) {
            _defineProperty(target, key, source[key]);
        });
    }
    return target;
}
function _objectWithoutProperties(source, excluded) {
    if (source == null) return {
    };
    var target = _objectWithoutPropertiesLoose(source, excluded);
    var key, i;
    if (Object.getOwnPropertySymbols) {
        var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
        for(i = 0; i < sourceSymbolKeys.length; i++){
            key = sourceSymbolKeys[i];
            if (excluded.indexOf(key) >= 0) continue;
            if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
            target[key] = source[key];
        }
    }
    return target;
}
function _objectWithoutPropertiesLoose(source, excluded) {
    if (source == null) return {
    };
    var target = {
    };
    var sourceKeys = Object.keys(source);
    var key, i;
    for(i = 0; i < sourceKeys.length; i++){
        key = sourceKeys[i];
        if (excluded.indexOf(key) >= 0) continue;
        target[key] = source[key];
    }
    return target;
}
const ScriptCache = new Map();
const LoadCache = new Set();
const ignoreProps = [
    'onLoad',
    'dangerouslySetInnerHTML',
    'children',
    'onError',
    'strategy', 
];
const loadScript = (props)=>{
    const { src , id , onLoad =()=>{
    } , dangerouslySetInnerHTML , children ='' , strategy ='afterInteractive' , onError ,  } = props;
    const cacheKey = id || src;
    // Script has already loaded
    if (cacheKey && LoadCache.has(cacheKey)) {
        return;
    }
    // Contents of this script are already loading/loaded
    if (ScriptCache.has(src)) {
        LoadCache.add(cacheKey);
        // Execute onLoad since the script loading has begun
        ScriptCache.get(src).then(onLoad, onError);
        return;
    }
    const el = document.createElement('script');
    const loadPromise = new Promise((resolve, reject)=>{
        el.addEventListener('load', function(e) {
            resolve();
            if (onLoad) {
                onLoad.call(this, e);
            }
        });
        el.addEventListener('error', function(e) {
            reject(e);
        });
    }).catch(function(e) {
        if (onError) {
            onError(e);
        }
    });
    if (src) {
        ScriptCache.set(src, loadPromise);
    }
    LoadCache.add(cacheKey);
    if (dangerouslySetInnerHTML) {
        el.innerHTML = dangerouslySetInnerHTML.__html || '';
    } else if (children) {
        el.textContent = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
    } else if (src) {
        el.src = src;
    }
    for (const [k, value] of Object.entries(props)){
        if (value === undefined || ignoreProps.includes(k)) {
            continue;
        }
        const attr = _headManager.DOMAttributeNames[k] || k.toLowerCase();
        el.setAttribute(attr, value);
    }
    el.setAttribute('data-nscript', strategy);
    document.body.appendChild(el);
};
function handleClientScriptLoad(props) {
    const { strategy ='afterInteractive'  } = props;
    if (strategy === 'afterInteractive') {
        loadScript(props);
    } else if (strategy === 'lazyOnload') {
        window.addEventListener('load', ()=>{
            (0, _requestIdleCallback).requestIdleCallback(()=>loadScript(props)
            );
        });
    }
}
function loadLazyScript(props) {
    if (document.readyState === 'complete') {
        (0, _requestIdleCallback).requestIdleCallback(()=>loadScript(props)
        );
    } else {
        window.addEventListener('load', ()=>{
            (0, _requestIdleCallback).requestIdleCallback(()=>loadScript(props)
            );
        });
    }
}
function initScriptLoader(scriptLoaderItems) {
    scriptLoaderItems.forEach(handleClientScriptLoad);
}
function Script(props) {
    const { src ='' , onLoad =()=>{
    } , dangerouslySetInnerHTML , strategy ='afterInteractive' , onError  } = props, restProps = _objectWithoutProperties(props, [
        "src",
        "onLoad",
        "dangerouslySetInnerHTML",
        "strategy",
        "onError"
    ]);
    // Context is available only during SSR
    const { updateScripts , scripts , getIsSsr  } = (0, _react).useContext(_headManagerContext.HeadManagerContext);
    (0, _react).useEffect(()=>{
        if (strategy === 'afterInteractive') {
            loadScript(props);
        } else if (strategy === 'lazyOnload') {
            loadLazyScript(props);
        }
    }, [
        props,
        strategy
    ]);
    if (strategy === 'beforeInteractive') {
        if (updateScripts) {
            scripts.beforeInteractive = (scripts.beforeInteractive || []).concat([
                _objectSpread({
                    src,
                    onLoad,
                    onError
                }, restProps), 
            ]);
            updateScripts(scripts);
        } else if (getIsSsr && getIsSsr()) {
            // Script has already loaded during SSR
            LoadCache.add(restProps.id || src);
        } else if (getIsSsr && !getIsSsr()) {
            loadScript(props);
        }
    }
    return null;
}
var _default = Script;
exports["default"] = _default; //# sourceMappingURL=script.js.map


/***/ }),

/***/ 785:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "DocumentContext", ({
    enumerable: true,
    get: function() {
        return _utils.DocumentContext;
    }
}));
Object.defineProperty(exports, "DocumentInitialProps", ({
    enumerable: true,
    get: function() {
        return _utils.DocumentInitialProps;
    }
}));
Object.defineProperty(exports, "DocumentProps", ({
    enumerable: true,
    get: function() {
        return _utils.DocumentProps;
    }
}));
exports.Html = Html;
exports.Main = Main;
exports["default"] = void 0;
var _react = _interopRequireWildcard(__webpack_require__(689));
var _constants = __webpack_require__(724);
var _utils = __webpack_require__(232);
var _getPageFiles = __webpack_require__(140);
var _utils1 = __webpack_require__(368);
var _htmlescape = __webpack_require__(716);
var _script = _interopRequireDefault(__webpack_require__(747));
var _isError = _interopRequireDefault(__webpack_require__(274));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
        return obj;
    } else {
        var newObj = {
        };
        if (obj != null) {
            for(var key in obj){
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {
                    };
                    if (desc.get || desc.set) {
                        Object.defineProperty(newObj, key, desc);
                    } else {
                        newObj[key] = obj[key];
                    }
                }
            }
        }
        newObj.default = obj;
        return newObj;
    }
}
function getDocumentFiles(buildManifest, pathname, inAmpMode) {
    const sharedFiles = (0, _getPageFiles).getPageFiles(buildManifest, '/_app');
    const pageFiles = inAmpMode ? [] : (0, _getPageFiles).getPageFiles(buildManifest, pathname);
    return {
        sharedFiles,
        pageFiles,
        allFiles: [
            ...new Set([
                ...sharedFiles,
                ...pageFiles
            ])
        ]
    };
}
function getPolyfillScripts(context, props) {
    // polyfills.js has to be rendered as nomodule without async
    // It also has to be the first script to load
    const { assetPrefix , buildManifest , devOnlyCacheBusterQueryString , disableOptimizedLoading ,  } = context;
    return buildManifest.polyfillFiles.filter((polyfill)=>polyfill.endsWith('.js') && !polyfill.endsWith('.module.js')
    ).map((polyfill)=>/*#__PURE__*/ _react.default.createElement("script", {
            key: polyfill,
            defer: !disableOptimizedLoading,
            nonce: props.nonce,
            crossOrigin: props.crossOrigin || undefined,
            noModule: true,
            src: `${assetPrefix}/_next/${polyfill}${devOnlyCacheBusterQueryString}`
        })
    );
}
function getPreNextScripts(context, props) {
    const { scriptLoader , disableOptimizedLoading  } = context;
    return (scriptLoader.beforeInteractive || []).map((file, index)=>{
        const { strategy , ...scriptProps } = file;
        return(/*#__PURE__*/ _react.default.createElement("script", Object.assign({
        }, scriptProps, {
            key: scriptProps.src || index,
            defer: !disableOptimizedLoading,
            nonce: props.nonce,
            "data-nscript": "beforeInteractive",
            crossOrigin: props.crossOrigin || undefined
        })));
    });
}
function getDynamicChunks(context, props, files) {
    const { dynamicImports , assetPrefix , isDevelopment , devOnlyCacheBusterQueryString , disableOptimizedLoading ,  } = context;
    return dynamicImports.map((file)=>{
        if (!file.endsWith('.js') || files.allFiles.includes(file)) return null;
        return(/*#__PURE__*/ _react.default.createElement("script", {
            async: !isDevelopment && disableOptimizedLoading,
            defer: !disableOptimizedLoading,
            key: file,
            src: `${assetPrefix}/_next/${encodeURI(file)}${devOnlyCacheBusterQueryString}`,
            nonce: props.nonce,
            crossOrigin: props.crossOrigin || undefined
        }));
    });
}
function getScripts(context, props, files) {
    var ref;
    const { assetPrefix , buildManifest , isDevelopment , devOnlyCacheBusterQueryString , disableOptimizedLoading ,  } = context;
    const normalScripts = files.allFiles.filter((file)=>file.endsWith('.js')
    );
    const lowPriorityScripts = (ref = buildManifest.lowPriorityFiles) === null || ref === void 0 ? void 0 : ref.filter((file)=>file.endsWith('.js')
    );
    return [
        ...normalScripts,
        ...lowPriorityScripts
    ].map((file)=>{
        return(/*#__PURE__*/ _react.default.createElement("script", {
            key: file,
            src: `${assetPrefix}/_next/${encodeURI(file)}${devOnlyCacheBusterQueryString}`,
            nonce: props.nonce,
            async: !isDevelopment && disableOptimizedLoading,
            defer: !disableOptimizedLoading,
            crossOrigin: props.crossOrigin || undefined
        }));
    });
}
class Document extends _react.Component {
    /**
   * `getInitialProps` hook returns the context object with the addition of `renderPage`.
   * `renderPage` callback executes `React` rendering logic synchronously to support server-rendering wrappers
   */ static getInitialProps(ctx) {
        return ctx.defaultGetInitialProps(ctx);
    }
    render() {
        return(/*#__PURE__*/ _react.default.createElement(Html, null, /*#__PURE__*/ _react.default.createElement(Head, null), /*#__PURE__*/ _react.default.createElement("body", null, /*#__PURE__*/ _react.default.createElement(Main, null), /*#__PURE__*/ _react.default.createElement(NextScript, null))));
    }
}
exports["default"] = Document;
function Html(props) {
    const { inAmpMode , docComponentsRendered , locale  } = (0, _react).useContext(_utils.HtmlContext);
    docComponentsRendered.Html = true;
    return(/*#__PURE__*/ _react.default.createElement("html", Object.assign({
    }, props, {
        lang: props.lang || locale || undefined,
        amp: inAmpMode ? '' : undefined,
        "data-ampdevmode": inAmpMode && 'production' !== 'production' ? 0 : undefined
    })));
}
function AmpStyles({ styles  }) {
    if (!styles) return null;
    // try to parse styles from fragment for backwards compat
    const curStyles = Array.isArray(styles) ? styles : [];
    if (styles.props && Array.isArray(styles.props.children)) {
        const hasStyles = (el)=>{
            var ref, ref1;
            return el === null || el === void 0 ? void 0 : (ref = el.props) === null || ref === void 0 ? void 0 : (ref1 = ref.dangerouslySetInnerHTML) === null || ref1 === void 0 ? void 0 : ref1.__html;
        };
        // @ts-ignore Property 'props' does not exist on type ReactElement
        styles.props.children.forEach((child)=>{
            if (Array.isArray(child)) {
                child.forEach((el)=>hasStyles(el) && curStyles.push(el)
                );
            } else if (hasStyles(child)) {
                curStyles.push(child);
            }
        });
    }
    /* Add custom styles before AMP styles to prevent accidental overrides */ return(/*#__PURE__*/ _react.default.createElement("style", {
        "amp-custom": "",
        dangerouslySetInnerHTML: {
            __html: curStyles.map((style)=>style.props.dangerouslySetInnerHTML.__html
            ).join('').replace(/\/\*# sourceMappingURL=.*\*\//g, '').replace(/\/\*@ sourceURL=.*?\*\//g, '')
        }
    }));
}
class Head extends _react.Component {
    getCssLinks(files6) {
        const { assetPrefix , devOnlyCacheBusterQueryString , dynamicImports  } = this.context;
        const cssFiles = files6.allFiles.filter((f)=>f.endsWith('.css')
        );
        const sharedFiles = new Set(files6.sharedFiles);
        // Unmanaged files are CSS files that will be handled directly by the
        // webpack runtime (`mini-css-extract-plugin`).
        let unmangedFiles = new Set([]);
        let dynamicCssFiles = Array.from(new Set(dynamicImports.filter((file)=>file.endsWith('.css')
        )));
        if (dynamicCssFiles.length) {
            const existing = new Set(cssFiles);
            dynamicCssFiles = dynamicCssFiles.filter((f)=>!(existing.has(f) || sharedFiles.has(f))
            );
            unmangedFiles = new Set(dynamicCssFiles);
            cssFiles.push(...dynamicCssFiles);
        }
        let cssLinkElements = [];
        cssFiles.forEach((file)=>{
            const isSharedFile = sharedFiles.has(file);
            if (true) {
                cssLinkElements.push(/*#__PURE__*/ _react.default.createElement("link", {
                    key: `${file}-preload`,
                    nonce: this.props.nonce,
                    rel: "preload",
                    href: `${assetPrefix}/_next/${encodeURI(file)}${devOnlyCacheBusterQueryString}`,
                    as: "style",
                    crossOrigin: this.props.crossOrigin || undefined
                }));
            }
            const isUnmanagedFile = unmangedFiles.has(file);
            cssLinkElements.push(/*#__PURE__*/ _react.default.createElement("link", {
                key: file,
                nonce: this.props.nonce,
                rel: "stylesheet",
                href: `${assetPrefix}/_next/${encodeURI(file)}${devOnlyCacheBusterQueryString}`,
                crossOrigin: this.props.crossOrigin || undefined,
                "data-n-g": isUnmanagedFile ? undefined : isSharedFile ? '' : undefined,
                "data-n-p": isUnmanagedFile ? undefined : isSharedFile ? undefined : ''
            }));
        });
        if (true) {
            cssLinkElements = this.makeStylesheetInert(cssLinkElements);
        }
        return cssLinkElements.length === 0 ? null : cssLinkElements;
    }
    getPreloadDynamicChunks() {
        const { dynamicImports , assetPrefix , devOnlyCacheBusterQueryString  } = this.context;
        return dynamicImports.map((file)=>{
            if (!file.endsWith('.js')) {
                return null;
            }
            return(/*#__PURE__*/ _react.default.createElement("link", {
                rel: "preload",
                key: file,
                href: `${assetPrefix}/_next/${encodeURI(file)}${devOnlyCacheBusterQueryString}`,
                as: "script",
                nonce: this.props.nonce,
                crossOrigin: this.props.crossOrigin || undefined
            }));
        }) // Filter out nulled scripts
        .filter(Boolean);
    }
    getPreloadMainLinks(files1) {
        const { assetPrefix , devOnlyCacheBusterQueryString , scriptLoader  } = this.context;
        const preloadFiles = files1.allFiles.filter((file)=>{
            return file.endsWith('.js');
        });
        return [
            ...(scriptLoader.beforeInteractive || []).map((file)=>/*#__PURE__*/ _react.default.createElement("link", {
                    key: file.src,
                    nonce: this.props.nonce,
                    rel: "preload",
                    href: file.src,
                    as: "script",
                    crossOrigin: this.props.crossOrigin || undefined
                })
            ),
            ...preloadFiles.map((file)=>/*#__PURE__*/ _react.default.createElement("link", {
                    key: file,
                    nonce: this.props.nonce,
                    rel: "preload",
                    href: `${assetPrefix}/_next/${encodeURI(file)}${devOnlyCacheBusterQueryString}`,
                    as: "script",
                    crossOrigin: this.props.crossOrigin || undefined
                })
            ), 
        ];
    }
    getDynamicChunks(files2) {
        return getDynamicChunks(this.context, this.props, files2);
    }
    getPreNextScripts() {
        return getPreNextScripts(this.context, this.props);
    }
    getScripts(files3) {
        return getScripts(this.context, this.props, files3);
    }
    getPolyfillScripts() {
        return getPolyfillScripts(this.context, this.props);
    }
    handleDocumentScriptLoaderItems(children) {
        const { scriptLoader  } = this.context;
        const scriptLoaderItems = [];
        const filteredChildren = [];
        _react.default.Children.forEach(children, (child)=>{
            if (child.type === _script.default) {
                if (child.props.strategy === 'beforeInteractive') {
                    scriptLoader.beforeInteractive = (scriptLoader.beforeInteractive || []).concat([
                        {
                            ...child.props
                        }, 
                    ]);
                    return;
                } else if ([
                    'lazyOnload',
                    'afterInteractive'
                ].includes(child.props.strategy)) {
                    scriptLoaderItems.push(child.props);
                    return;
                }
            }
            filteredChildren.push(child);
        });
        this.context.__NEXT_DATA__.scriptLoader = scriptLoaderItems;
        return filteredChildren;
    }
    makeStylesheetInert(node) {
        return _react.default.Children.map(node, (c)=>{
            if (c.type === 'link' && c.props['href'] && _constants.OPTIMIZED_FONT_PROVIDERS.some(({ url  })=>c.props['href'].startsWith(url)
            )) {
                const newProps = {
                    ...c.props || {
                    }
                };
                newProps['data-href'] = newProps['href'];
                newProps['href'] = undefined;
                return(/*#__PURE__*/ _react.default.cloneElement(c, newProps));
            } else if (c.props && c.props['children']) {
                c.props['children'] = this.makeStylesheetInert(c.props['children']);
            }
            return c;
        });
    }
    render() {
        const { styles , ampPath , inAmpMode , hybridAmp , canonicalBase , __NEXT_DATA__ , dangerousAsPath , headTags , unstable_runtimeJS , unstable_JsPreload , disableOptimizedLoading , useMaybeDeferContent ,  } = this.context;
        const disableRuntimeJS = unstable_runtimeJS === false;
        const disableJsPreload = unstable_JsPreload === false || !disableOptimizedLoading;
        this.context.docComponentsRendered.Head = true;
        let { head  } = this.context;
        let cssPreloads = [];
        let otherHeadElements = [];
        if (head) {
            head.forEach((c)=>{
                if (c && c.type === 'link' && c.props['rel'] === 'preload' && c.props['as'] === 'style') {
                    cssPreloads.push(c);
                } else {
                    c && otherHeadElements.push(c);
                }
            });
            head = cssPreloads.concat(otherHeadElements);
        }
        let children = _react.default.Children.toArray(this.props.children).filter(Boolean);
        // show a warning if Head contains <title> (only in development)
        if (false) {}
        if ( true && !inAmpMode) {
            children = this.makeStylesheetInert(children);
        }
        children = this.handleDocumentScriptLoaderItems(children);
        let hasAmphtmlRel = false;
        let hasCanonicalRel = false;
        // show warning and remove conflicting amp head tags
        head = _react.default.Children.map(head || [], (child)=>{
            if (!child) return child;
            const { type , props  } = child;
            if (inAmpMode) {
                let badProp = '';
                if (type === 'meta' && props.name === 'viewport') {
                    badProp = 'name="viewport"';
                } else if (type === 'link' && props.rel === 'canonical') {
                    hasCanonicalRel = true;
                } else if (type === 'script') {
                    // only block if
                    // 1. it has a src and isn't pointing to ampproject's CDN
                    // 2. it is using dangerouslySetInnerHTML without a type or
                    // a type of text/javascript
                    if (props.src && props.src.indexOf('ampproject') < -1 || props.dangerouslySetInnerHTML && (!props.type || props.type === 'text/javascript')) {
                        badProp = '<script';
                        Object.keys(props).forEach((prop)=>{
                            badProp += ` ${prop}="${props[prop]}"`;
                        });
                        badProp += '/>';
                    }
                }
                if (badProp) {
                    console.warn(`Found conflicting amp tag "${child.type}" with conflicting prop ${badProp} in ${__NEXT_DATA__.page}. https://nextjs.org/docs/messages/conflicting-amp-tag`);
                    return null;
                }
            } else {
                // non-amp mode
                if (type === 'link' && props.rel === 'amphtml') {
                    hasAmphtmlRel = true;
                }
            }
            return child;
        });
        const files = getDocumentFiles(this.context.buildManifest, this.context.__NEXT_DATA__.page, inAmpMode);
        // Must use nested component to allow use of a custom hook
        const DeferrableHead = ()=>{
            const getDynamicHeadContent = ()=>{
                return(/*#__PURE__*/ _react.default.createElement(_react.default.Fragment, null, head, /*#__PURE__*/ _react.default.createElement("meta", {
                    name: "next-head-count",
                    content: _react.default.Children.count(head || []).toString()
                })));
            };
            const getDynamicScriptPreloads = ()=>{
                return(/*#__PURE__*/ _react.default.createElement(_react.default.Fragment, null, !disableRuntimeJS && !disableJsPreload && this.getPreloadDynamicChunks(), !disableRuntimeJS && !disableJsPreload && this.getPreloadMainLinks(files)));
            };
            const getDynamicScriptContent = ()=>{
                return(/*#__PURE__*/ _react.default.createElement(_react.default.Fragment, null, !disableOptimizedLoading && !disableRuntimeJS && this.getPreNextScripts(), !disableOptimizedLoading && !disableRuntimeJS && this.getDynamicChunks(files), !disableOptimizedLoading && !disableRuntimeJS && this.getScripts(files)));
            };
            const [isDeferred] = useMaybeDeferContent('HEAD', ()=>{
                return(/*#__PURE__*/ _react.default.createElement(_react.default.Fragment, null, getDynamicHeadContent(), getDynamicScriptPreloads(), getDynamicScriptContent()));
            });
            var _nonce, _nonce1;
            return(/*#__PURE__*/ _react.default.createElement("head", Object.assign({
            }, this.props), this.context.isDevelopment && /*#__PURE__*/ _react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/ _react.default.createElement("style", {
                "data-next-hide-fouc": true,
                "data-ampdevmode": inAmpMode ? 'true' : undefined,
                dangerouslySetInnerHTML: {
                    __html: `body{display:none}`
                }
            }), /*#__PURE__*/ _react.default.createElement("noscript", {
                "data-next-hide-fouc": true,
                "data-ampdevmode": inAmpMode ? 'true' : undefined
            }, /*#__PURE__*/ _react.default.createElement("style", {
                dangerouslySetInnerHTML: {
                    __html: `body{display:block}`
                }
            }))), children,  true && /*#__PURE__*/ _react.default.createElement("meta", {
                name: "next-font-preconnect"
            }), !isDeferred && getDynamicHeadContent(), inAmpMode && /*#__PURE__*/ _react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/ _react.default.createElement("meta", {
                name: "viewport",
                content: "width=device-width,minimum-scale=1,initial-scale=1"
            }), !hasCanonicalRel && /*#__PURE__*/ _react.default.createElement("link", {
                rel: "canonical",
                href: canonicalBase + (0, _utils1).cleanAmpPath(dangerousAsPath)
            }), /*#__PURE__*/ _react.default.createElement("link", {
                rel: "preload",
                as: "script",
                href: "https://cdn.ampproject.org/v0.js"
            }), /*#__PURE__*/ _react.default.createElement(AmpStyles, {
                styles: styles
            }), /*#__PURE__*/ _react.default.createElement("style", {
                "amp-boilerplate": "",
                dangerouslySetInnerHTML: {
                    __html: `body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}`
                }
            }), /*#__PURE__*/ _react.default.createElement("noscript", null, /*#__PURE__*/ _react.default.createElement("style", {
                "amp-boilerplate": "",
                dangerouslySetInnerHTML: {
                    __html: `body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}`
                }
            })), /*#__PURE__*/ _react.default.createElement("script", {
                async: true,
                src: "https://cdn.ampproject.org/v0.js"
            })), !inAmpMode && /*#__PURE__*/ _react.default.createElement(_react.default.Fragment, null, !hasAmphtmlRel && hybridAmp && /*#__PURE__*/ _react.default.createElement("link", {
                rel: "amphtml",
                href: canonicalBase + getAmpPath(ampPath, dangerousAsPath)
            }),  true && this.getCssLinks(files),  true && /*#__PURE__*/ _react.default.createElement("noscript", {
                "data-n-css": (_nonce = this.props.nonce) !== null && _nonce !== void 0 ? _nonce : ''
            }),  false && /*#__PURE__*/ 0, !isDeferred && getDynamicScriptPreloads(), !disableOptimizedLoading && !disableRuntimeJS && this.getPolyfillScripts(), !isDeferred && getDynamicScriptContent(),  false && 0,  false && /*#__PURE__*/ 0, this.context.isDevelopment && // ordering matches production
            // (by default, style-loader injects at the bottom of <head />)
            /*#__PURE__*/ _react.default.createElement("noscript", {
                id: "__next_css__DO_NOT_USE__"
            }), styles || null), /*#__PURE__*/ _react.default.createElement(_react.default.Fragment, {
            }, ...headTags || [])));
        };
        return(/*#__PURE__*/ _react.default.createElement(DeferrableHead, null));
    }
}
exports.Head = Head;
Head.contextType = _utils.HtmlContext;
function Main() {
    const { inAmpMode , docComponentsRendered  } = (0, _react).useContext(_utils.HtmlContext);
    docComponentsRendered.Main = true;
    if (inAmpMode) return(/*#__PURE__*/ _react.default.createElement(_react.default.Fragment, null, _constants.BODY_RENDER_TARGET));
    return(/*#__PURE__*/ _react.default.createElement("div", {
        id: "__next"
    }, _constants.BODY_RENDER_TARGET));
}
class NextScript extends _react.Component {
    getDynamicChunks(files4) {
        return getDynamicChunks(this.context, this.props, files4);
    }
    getPreNextScripts() {
        return getPreNextScripts(this.context, this.props);
    }
    getScripts(files5) {
        return getScripts(this.context, this.props, files5);
    }
    getPolyfillScripts() {
        return getPolyfillScripts(this.context, this.props);
    }
    static getInlineScriptSource(context) {
        const { __NEXT_DATA__  } = context;
        try {
            const data = JSON.stringify(__NEXT_DATA__);
            if (false) {}
            return (0, _htmlescape).htmlEscapeJsonString(data);
        } catch (err) {
            if ((0, _isError).default(err) && err.message.indexOf('circular structure')) {
                throw new Error(`Circular structure in "getInitialProps" result of page "${__NEXT_DATA__.page}". https://nextjs.org/docs/messages/circular-structure`);
            }
            throw err;
        }
    }
    render() {
        const { assetPrefix , inAmpMode , buildManifest , unstable_runtimeJS , docComponentsRendered , devOnlyCacheBusterQueryString , disableOptimizedLoading , useMaybeDeferContent ,  } = this.context;
        const disableRuntimeJS = unstable_runtimeJS === false;
        docComponentsRendered.NextScript = true;
        // Must nest component to use custom hook
        const DeferrableNextScript = ()=>{
            const [, content] = useMaybeDeferContent('NEXT_SCRIPT', ()=>{
                if (inAmpMode) {
                    const ampDevFiles = [
                        ...buildManifest.devFiles,
                        ...buildManifest.polyfillFiles,
                        ...buildManifest.ampDevFiles, 
                    ];
                    return(/*#__PURE__*/ _react.default.createElement(_react.default.Fragment, null, disableRuntimeJS ? null : /*#__PURE__*/ _react.default.createElement("script", {
                        id: "__NEXT_DATA__",
                        type: "application/json",
                        nonce: this.props.nonce,
                        crossOrigin: this.props.crossOrigin || undefined,
                        dangerouslySetInnerHTML: {
                            __html: NextScript.getInlineScriptSource(this.context)
                        },
                        "data-ampdevmode": true
                    }), ampDevFiles.map((file)=>/*#__PURE__*/ _react.default.createElement("script", {
                            key: file,
                            src: `${assetPrefix}/_next/${file}${devOnlyCacheBusterQueryString}`,
                            nonce: this.props.nonce,
                            crossOrigin: this.props.crossOrigin || undefined,
                            "data-ampdevmode": true
                        })
                    )));
                }
                if (false) {}
                const files = getDocumentFiles(this.context.buildManifest, this.context.__NEXT_DATA__.page, inAmpMode);
                return(/*#__PURE__*/ _react.default.createElement(_react.default.Fragment, null, !disableRuntimeJS && buildManifest.devFiles ? buildManifest.devFiles.map((file)=>/*#__PURE__*/ _react.default.createElement("script", {
                        key: file,
                        src: `${assetPrefix}/_next/${encodeURI(file)}${devOnlyCacheBusterQueryString}`,
                        nonce: this.props.nonce,
                        crossOrigin: this.props.crossOrigin || undefined
                    })
                ) : null, disableRuntimeJS ? null : /*#__PURE__*/ _react.default.createElement("script", {
                    id: "__NEXT_DATA__",
                    type: "application/json",
                    nonce: this.props.nonce,
                    crossOrigin: this.props.crossOrigin || undefined,
                    dangerouslySetInnerHTML: {
                        __html: NextScript.getInlineScriptSource(this.context)
                    }
                }), disableOptimizedLoading && !disableRuntimeJS && this.getPolyfillScripts(), disableOptimizedLoading && !disableRuntimeJS && this.getPreNextScripts(), disableOptimizedLoading && !disableRuntimeJS && this.getDynamicChunks(files), disableOptimizedLoading && !disableRuntimeJS && this.getScripts(files)));
            });
            if (inAmpMode && 'production' === 'production') {
                return null;
            }
            return content;
        };
        return(/*#__PURE__*/ _react.default.createElement(DeferrableNextScript, null));
    }
}
exports.NextScript = NextScript;
NextScript.contextType = _utils.HtmlContext;
NextScript.safariNomoduleFix = '!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()},!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();';
function getAmpPath(ampPath, asPath) {
    return ampPath || `${asPath}${asPath.includes('?') ? '&' : '?'}amp=1`;
} //# sourceMappingURL=_document.js.map


/***/ }),

/***/ 274:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({
    value: true
}));
exports["default"] = isError;
function isError(err) {
    return typeof err === 'object' && err !== null && 'name' in err && 'message' in err;
}

//# sourceMappingURL=is-error.js.map

/***/ }),

/***/ 140:
/***/ ((module) => {

module.exports = require("next/dist/server/get-page-files.js");

/***/ }),

/***/ 716:
/***/ ((module) => {

module.exports = require("next/dist/server/htmlescape.js");

/***/ }),

/***/ 368:
/***/ ((module) => {

module.exports = require("next/dist/server/utils.js");

/***/ }),

/***/ 724:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/constants.js");

/***/ }),

/***/ 281:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/head-manager-context.js");

/***/ }),

/***/ 232:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/utils.js");

/***/ }),

/***/ 689:
/***/ ((module) => {

module.exports = require("react");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__(785));
module.exports = __webpack_exports__;

})();