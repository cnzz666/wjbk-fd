addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  thisProxyServerUrlHttps = `${url.protocol}//${url.hostname}/`;
  thisProxyServerUrl_hostOnly = url.host;
  event.respondWith(handleRequest(event.request))
})

// ===================== 密码验证配置 =====================
const PASSWORD = 'wjbk';                 // 访问密码
const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 86400;            // 1 天

// ===================== 反爬虫配置 =====================
const BLOCKED_UA = [
  'Bytespider', 'AhrefsBot', 'SemrushBot', 'DotBot', 'MJ12bot',
  'DataForSeoBot', 'BLEXBot', 'ChatGPT-User', 'GPTBot',
  'CCBot', 'DuckDuckBot', 'Baiduspider', 'YandexBot',
  'Sogou', 'Exabot', 'facebookexternalhit', 'Facebot',
  'Googlebot', 'GoogleOther', 'Mediapartners-Google',
  'AdsBot-Google', 'APIs-Google', 'Google-Site-Verification',
  'bingbot', 'Slurp', 'DuckDuckGo', 'Yahoo! Slurp',
  'YandexAccessibilityBot', 'YandexMobileBot', 'YandexDirect',
  'YandexScreenshotBot', 'YandexImages', 'YandexVideo',
  'YandexMedia', 'YandexBlogs', 'YandexFavicons',
  'YandexWebmaster', 'YandexPagechecker', 'YandexMetrika',
  'Mail.Ru', 'Sputnik', 'Qwantify', 'Pinterestbot',
  'Twitterbot', 'WhatsApp', 'TelegramBot', 'Slackbot',
  'Discordbot', 'SkypeUriPreview', 'Viber',
  'Headless', 'PhantomJS', 'Selenium', 'Puppeteer',
  'Curl', 'wget', 'python-requests', 'Go-http-client',
  'Java', 'Jakarta', 'HttpClient', 'OkHttp',
  'Nuclei', 'ZAP', 'Nikto', 'Arachni', 'W3C_Validator'
];

// ===================== 干扰响应生成器 =====================
function getRandomDecoyResponse() {
  const types = [
    { status: 500, body: 'Internal Server Error' },
    { status: 502, body: 'Bad Gateway' },
    { status: 503, body: 'Service Unavailable' },
    { status: 404, body: 'Not Found' },
    { status: 403, body: 'Forbidden' },
    { status: 200, body: '<html><head><title>Just a moment...</title></head><body>Please wait while we verify your connection...</body></html>' },
    { status: 200, body: '{}' },
    { status: 200, body: 'null' }
  ];
  const pick = types[Math.floor(Math.random() * types.length)];
  return new Response(pick.body, {
    status: pick.status,
    headers: {
      'Content-Type': pick.status === 200 && pick.body.includes('html') ? 'text/html' : 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

// ===================== 登录页面 HTML =====================
function getLoginPage() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>维基百科镜像站访问验证</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f4f6f9;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .login-card {
      background: #fff;
      padding: 40px 30px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    h1 { font-size: 22px; color: #1a73e8; margin-bottom: 10px; }
    p { color: #5f6368; font-size: 14px; margin-bottom: 25px; }
    input[type="password"] {
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #dadce0;
      border-radius: 6px;
      font-size: 16px;
      margin-bottom: 15px;
      transition: border 0.2s;
    }
    input[type="password"]:focus {
      outline: none;
      border-color: #1a73e8;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #1a73e8;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #1557b0; }
    .error { color: #d93025; font-size: 13px; margin-top: 12px; display: none; }
  </style>
</head>
<body>
<div class="login-card">
  <h1>访问验证</h1>
  <p>请输入访问密码以继续使用维基百科镜像站</p>
  <form id="loginForm">
    <input type="password" id="passwordInput" placeholder="请输入密码" autofocus>
    <button type="submit">确认</button>
    <div id="errorMsg" class="error">密码错误，请重试</div>
  </form>
</div>
<script>
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const pwd = document.getElementById('passwordInput').value;
  const errorDiv = document.getElementById('errorMsg');
  const resp = await fetch('/?auth=check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'password=' + encodeURIComponent(pwd)
  });
  if (resp.ok) {
    window.location.reload();
  } else {
    errorDiv.style.display = 'block';
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordInput').focus();
  }
});
</script>
</body>
</html>
  `;
}

// ========== 代理代码（在其前插入验证和反爬） ==========
const str = "/";
const lastVisitProxyCookie = "__PROXY_VISITEDSITE__";
const replaceUrlObj = "__location__yproxy__";

var thisProxyServerUrlHttps;
var thisProxyServerUrl_hostOnly;

// ========== 状态栏注入 ==========
const statusBarInjection = `
(function() {
  function injectBar() {
    if (document.getElementById('__WIKI_MIRROR_STATUS_BAR__')) return;
    const bar = document.createElement('div');
    bar.id = '__WIKI_MIRROR_STATUS_BAR__';
    bar.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:32px;line-height:32px;background:#202124;color:#f1f3f4;text-align:center;font-size:13px;z-index:2147483647;box-shadow:0 2px 6px rgba(0,0,0,0.3);user-select:none;font-family:sans-serif;font-weight:bold;letter-spacing:0.5px;border-bottom:1px solid #3c4043;';
    bar.innerHTML = '维基百科镜像站 w.sakcn.icu 提供知识搜索，请勿用于非法用途。';
    
    const style = document.createElement('style');
    style.innerHTML = 'html, body { margin-top: 32px !important; }';
    document.head.appendChild(style);
    
    document.body.insertAdjacentElement('afterbegin', bar);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    injectBar();
  } else {
    window.addEventListener('DOMContentLoaded', injectBar);
    window.addEventListener('load', injectBar);
  }
})();
`;

// ========== 代理拦截脚本（增强图片转换） ==========
const httpRequestInjection = `
var nowURL = new URL(window.location.href);
var proxy_host = nowURL.host; 
var proxy_protocol = nowURL.protocol; 
var proxy_host_with_schema = proxy_protocol + "//" + proxy_host + "/"; 

Object.defineProperty(window, 'original_website_url_str', {
    get: function() { return window.location.href.substring(proxy_host_with_schema.length); }
});
Object.defineProperty(window, 'original_website_url', {
    get: function() { return new URL(original_website_url_str); }
});
Object.defineProperty(window, 'original_website_host', {
    get: function() {
        var h = original_website_url_str.substring(original_website_url_str.indexOf("://") + "://".length);
        return h.split('/')[0];
    }
});
Object.defineProperty(window, 'original_website_host_with_schema', {
    get: function() { return original_website_url_str.substring(0, original_website_url_str.indexOf("://")) + "://" + original_website_host + "/"; }
});

function changeURL(relativePath) {
    if (relativePath == null) return null;
    let relativePath_str = relativePath instanceof URL ? relativePath.href : relativePath.toString();
    try {
        if (relativePath_str.startsWith("data:") || relativePath_str.startsWith("mailto:") || relativePath_str.startsWith("javascript:") || relativePath_str.startsWith("chrome") || relativePath_str.startsWith("edge")) return relativePath_str;
    } catch { return relativePath_str; }

    var pathAfterAdd = "";
    if (relativePath_str.startsWith("blob:")) {
        pathAfterAdd = "blob:";
        relativePath_str = relativePath_str.substring("blob:".length);
    }
    try {
        let startWithLs = [proxy_host_with_schema, proxy_host + "/", proxy_host]
        startWithLs.forEach(x => { if (relativePath_str.startsWith(x)) relativePath_str = relativePath_str.substring(x.length); });
        startWithLs.forEach(x => { x = "/" + x; if (relativePath_str.startsWith(x)) relativePath_str = relativePath_str.substring(x.length); });
        let enhancedStartRm = [original_website_host_with_schema.substring(0, original_website_host_with_schema.length - 1), original_website_host]
        enhancedStartRm.forEach(x => { x = "/" + x; if (relativePath_str.startsWith(x)) relativePath_str = relativePath_str.substring(x.length); });
    } catch {}
    try {
        var absolutePath = new URL(relativePath_str, original_website_url_str).href; 
        absolutePath = absolutePath.replaceAll(window.location.href, original_website_url_str); 
        absolutePath = absolutePath.replaceAll(encodeURI(window.location.href), encodeURI(original_website_url_str));
        absolutePath = absolutePath.replaceAll(encodeURIComponent(window.location.href), encodeURIComponent(original_website_url_str));
        absolutePath = absolutePath.replaceAll(proxy_host, original_website_host);
        absolutePath = absolutePath.replaceAll(encodeURI(proxy_host), encodeURI(original_website_host));
        absolutePath = absolutePath.replaceAll(encodeURIComponent(proxy_host), encodeURIComponent(original_website_host));
        return pathAfterAdd + proxy_host_with_schema + absolutePath;
    } catch (e) { return relativePath_str; }
}

function getOriginalUrl(url) {
    if (url == null) return null;
    if (url.startsWith(proxy_host_with_schema)) return url.substring(proxy_host_with_schema.length);
    return url;
}

function networkInject() {
    var originalOpen = XMLHttpRequest.prototype.open;
    var originalFetch = window.fetch;
    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        url = changeURL(url);
        return originalOpen.apply(this, arguments);
    };
    window.fetch = function (input, init) {
        var url = (typeof input === 'string') ? input : (input instanceof Request ? input.url : input);
        url = changeURL(url);
        if (typeof input === 'string') { return originalFetch(url, init); } 
        else { return originalFetch(new Request(url, input), init); }
    };
}

function windowOpenInject() {
    const originalOpen = window.open;
    window.open = function (url, name, specs) { return originalOpen.call(window, changeURL(url), name, specs); };
}

function appendChildInject() {
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function (child) {
        try {
            if (child.src) child.src = changeURL(child.src);
            if (child.href) child.href = changeURL(child.href);
        } catch {}
        return originalAppendChild.call(this, child);
    };
}

function elementPropertyInject() {
    const originalSetAttribute = HTMLElement.prototype.setAttribute;
    HTMLElement.prototype.setAttribute = function (name, value) {
        // 扩展处理 srcset 和 style
        if (name === "src" || name === "href" || name === "action") {
            value = changeURL(value);
        } else if (name === "srcset") {
            // 处理 srcset 多值
            let parts = value.split(',').map(part => part.trim());
            let newParts = parts.map(part => {
                let tokens = part.split(/\\s+/);
                if (tokens.length > 0) {
                    let url = tokens[0];
                    let newUrl = changeURL(url);
                    if (newUrl !== url) tokens[0] = newUrl;
                    return tokens.join(' ');
                }
                return part;
            });
            value = newParts.join(', ');
        } else if (name === "style") {
            // 处理 style 中的 url()
            value = value.replace(/url\\(["']?([^"')]+)["']?\\)/g, (match, url) => {
                let newUrl = changeURL(url);
                return 'url("' + newUrl + '")';
            });
        }
        originalSetAttribute.call(this, name, value);
    };
    const originalGetAttribute = HTMLElement.prototype.getAttribute;
    HTMLElement.prototype.getAttribute = function (name) {
        const val = originalGetAttribute.call(this, name);
        if (name == "src" || name == "href" || name == "action") return getOriginalUrl(val);
        return val;
    };

    const setList = [
        [HTMLAnchorElement, "href"], [HTMLScriptElement, "src"], [HTMLImageElement, "src"],
        [HTMLLinkElement, "href"], [HTMLIFrameElement, "src"], [HTMLVideoElement, "src"],
        [HTMLAudioElement, "src"], [HTMLSourceElement, "src"], [HTMLObjectElement, "data"], [HTMLFormElement, "action"],
        // 添加 srcset 和 style 的劫持（仅当浏览器支持这些属性时）
        [HTMLImageElement, "srcset"], [HTMLElement, "style"], // 注意 style 是特殊属性
    ];
    for (const [whichElement, whichProperty] of setList) {
        if (!whichElement || !whichElement.prototype) continue;
        const descriptor = Object.getOwnPropertyDescriptor(whichElement.prototype, whichProperty);
        if (!descriptor) continue;
        Object.defineProperty(whichElement.prototype, whichProperty, {
            get: function () { 
                let val = descriptor.get.call(this);
                if (whichProperty === "srcset") {
                    // 需要还原原始URL？对于srcset，我们可能不需要get转换，因为set已经转换了，get直接返回转换后的值即可，但为了保持一致，我们返回原始URL？这里我们选择直接返回存储的值（已经是代理URL），所以不做处理。
                    return val;
                } else if (whichProperty === "style") {
                    // style 内容复杂，此处不处理 get
                    return val;
                }
                return getOriginalUrl(val);
            },
            set: function (val) { 
                if (whichProperty === "srcset") {
                    // 转换 srcset
                    let parts = val.split(',').map(part => part.trim());
                    let newParts = parts.map(part => {
                        let tokens = part.split(/\\s+/);
                        if (tokens.length > 0) {
                            let url = tokens[0];
                            let newUrl = changeURL(url);
                            if (newUrl !== url) tokens[0] = newUrl;
                            return tokens.join(' ');
                        }
                        return part;
                    });
                    val = newParts.join(', ');
                } else if (whichProperty === "style") {
                    val = val.replace(/url\\(["']?([^"')]+)["']?\\)/g, (match, url) => {
                        let newUrl = changeURL(url);
                        return 'url("' + newUrl + '")';
                    });
                } else {
                    val = changeURL(val);
                }
                descriptor.set.call(this, val);
            },
            configurable: true,
        });
    }
}

class ProxyLocation {
    constructor(originalLocation) { this.originalLocation = originalLocation; }
    reload(forcedReload) { this.originalLocation.reload(forcedReload); }
    replace(url) { this.originalLocation.replace(changeURL(url)); }
    assign(url) { this.originalLocation.assign(changeURL(url)); }
    get href() { return original_website_url_str; }
    set href(url) { this.originalLocation.href = changeURL(url); }
    get protocol() { return original_website_url.protocol; }
    set protocol(value) { original_website_url.protocol = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get host() { return original_website_url.host; }
    set host(value) { original_website_url.host = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get hostname() { return original_website_url.hostname; }
    set hostname(value) { original_website_url.hostname = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get port() { return original_website_url.port; }
    set port(value) { original_website_url.port = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get pathname() { return original_website_url.pathname; }
    set pathname(value) { original_website_url.pathname = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get search() { return original_website_url.search; }
    set search(value) { original_website_url.search = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get hash() { return original_website_url.hash; }
    set hash(value) { original_website_url.hash = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get origin() { return original_website_url.origin; }
    toString() { return this.originalLocation.href; }
}

function documentLocationInject() {
    Object.defineProperty(document, 'URL', { get: function () { return original_website_url_str; }, set: function (url) { document.URL = changeURL(url); } });
    Object.defineProperty(document, '${replaceUrlObj}', { get: function () { return new ProxyLocation(window.location); }, set: function (url) { window.location.href = changeURL(url); } });
}

function windowLocationInject() {
    Object.defineProperty(window, '${replaceUrlObj}', { get: function () { return new ProxyLocation(window.location); }, set: function (url) { window.location.href = changeURL(url); } });
}

function historyInject() {
    const originalPushState = History.prototype.pushState;
    const originalReplaceState = History.prototype.replaceState;
    History.prototype.pushState = function (state, title, url) {
        if (!url) return;
        if (url.startsWith("/" + original_website_url.href)) url = url.substring(("/" + original_website_url.href).length);
        if (url.startsWith("/" + original_website_url.href.substring(0, original_website_url.href.length - 1))) url = url.substring(("/" + original_website_url.href).length - 1);
        return originalPushState.apply(this, [state, title, changeURL(url)]);
    };
    History.prototype.replaceState = function (state, title, url) {
        if (!url) return;
        let url_str = url.toString();
        if (url_str.startsWith("/" + original_website_url.href)) url_str = url_str.substring(("/" + original_website_url.href).length);
        if (url_str.startsWith("/" + original_website_url.href.substring(0, original_website_url.href.length - 1))) url_str = url_str.substring(("/" + original_website_url.href).length - 1);
        return originalReplaceState.apply(this, [state, title, changeURL(url_str)]);
    };
}

function obsPage() {
    var yProxyObserver = new MutationObserver(function (mutations) { mutations.forEach(function (mutation) { traverseAndConvert(mutation); }); });
    yProxyObserver.observe(document.body, { attributes: true, childList: true, subtree: true });
}

function traverseAndConvert(node) {
    if (node instanceof HTMLElement) {
        removeIntegrityAttributesFromElement(node);
        covToAbs(node);
        node.querySelectorAll('*').forEach(function (child) { removeIntegrityAttributesFromElement(child); covToAbs(child); });
    }
}

// 增强版 covToAbs，支持 srcset 和 style 中的 url()
function covToAbs(element) {
    if (!(element instanceof HTMLElement)) return;
    const attrs = ["href", "src", "action", "poster", "data"];
    attrs.forEach(attr => {
        if (element.hasAttribute(attr)) {
            try { element.setAttribute(attr, changeURL(element.getAttribute(attr))); } catch {}
        }
    });
    // 处理 srcset
    if (element.hasAttribute('srcset')) {
        let srcset = element.getAttribute('srcset');
        let newSrcset = srcset.split(',').map(part => {
            let trimmed = part.trim();
            let tokens = trimmed.split(/\\s+/);
            if (tokens.length > 0) {
                let url = tokens[0];
                let newUrl = changeURL(url);
                if (newUrl !== url) {
                    tokens[0] = newUrl;
                    return tokens.join(' ');
                }
            }
            return trimmed;
        }).join(', ');
        element.setAttribute('srcset', newSrcset);
    }
    // 处理 style 属性中的 url()
    if (element.hasAttribute('style')) {
        let style = element.getAttribute('style');
        let newStyle = style.replace(/url\\(["']?([^"')]+)["']?\\)/g, (match, url) => {
            let newUrl = changeURL(url);
            return 'url("' + newUrl + '")';
        });
        if (newStyle !== style) element.setAttribute('style', newStyle);
    }
}

function removeIntegrityAttributesFromElement(element) { if (element.hasAttribute('integrity')) element.removeAttribute('integrity'); }
function loopAndConvertToAbs() { for (var ele of document.querySelectorAll('*')) { removeIntegrityAttributesFromElement(ele); covToAbs(ele); } }
function covScript() { var scripts = document.getElementsByTagName('script'); for (var i = 0; i < scripts.length; i++) { covToAbs(scripts[i]); } setTimeout(covScript, 3000); }

networkInject(); windowOpenInject(); elementPropertyInject(); appendChildInject(); documentLocationInject(); windowLocationInject(); historyInject();

window.addEventListener('load', () => { loopAndConvertToAbs(); obsPage(); covScript(); });
window.addEventListener('error', event => {
    var element = event.target || event.srcElement;
    if (element.tagName === 'SCRIPT' && !element.alreadyChanged) {
        removeIntegrityAttributesFromElement(element); covToAbs(element);
        var newScript = document.createElement("script");
        newScript.src = element.src; newScript.async = element.async; newScript.defer = element.defer; newScript.alreadyChanged = true;
        document.head.appendChild(newScript);
    }
}, true);
`;

// ========== HTML 路径替换函数（通用） ==========
const htmlCovPathInjectFuncName = "parseAndInsertDoc";
const htmlCovPathInject = `
function ${htmlCovPathInjectFuncName}(htmlString) {
  const parser = new DOMParser();
  const tempDoc = parser.parseFromString(htmlString, 'text/html');
  tempDoc.querySelectorAll('*').forEach(element => {
    covToAbs(element);
    removeIntegrityAttributesFromElement(element);
    if ((element.tagName === 'SCRIPT' || element.tagName === 'STYLE') && element.textContent && !element.src) {
        element.textContent = replaceContentPaths(element.textContent);
    }
  });
  let modifiedHtml = tempDoc.documentElement.outerHTML;
  let charset = modifiedHtml.match(/content="text\\/html;\\s*charset=[^"]*"/);
  if(charset != null && charset.length !== 0){ modifiedHtml = modifiedHtml.replace(charset[0], "content='text/html;charset=utf-8'"); }
  document.open(); document.write('<!DOCTYPE html>' + modifiedHtml); document.close();
}

function replaceContentPaths(content){
  let regex = new RegExp(\`(https?:\\\\/\\\\/[^\s'"]+)\`, 'g');
  return content.replaceAll(regex, (match) => {
    if (match.startsWith("http://www.w3.org/") || match.startsWith("https://www.w3.org/")) return match;
    return match.startsWith("http") ? proxy_host_with_schema + match : proxy_host + "/" + match;
  });
}
`;

// ========== 主控面板（维基百科镜像导航） ==========
const mainPage = `
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>维基百科镜像站</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f4f6f9; color: #333; padding: 20px; display: flex; flex-direction: column; align-items: center; }
        .card { background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); width: 100%; max-width: 500px; margin-top: 40px; }
        h1 { font-size: 20px; color: #1a73e8; text-align: center; margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; font-size: 13px; font-weight: bold; margin-bottom: 6px; color: #5f6368; }
        input[type="text"], select, textarea { width: 100%; padding: 10px; border: 1px solid #dadce0; border-radius: 6px; font-size: 14px; background: #fafafa; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #1a73e8; background: #fff; }
        textarea { resize: vertical; height: 60px; font-family: monospace; font-size: 12px; }
        button { width: 100%; padding: 12px; background: #1a73e8; color: #fff; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; transition: background 0.2s; margin-top: 10px; box-shadow: 0 2px 4px rgba(26,115,232,0.2); }
        button:hover { background: #1557b0; }
        .tips { max-width: 500px; margin-top: 25px; font-size: 13px; color: #70757a; line-height: 1.6; }
        .tips strong { color: #d93025; }
    </style>
</head>
<body>
<div class="card">
    <h1>维基百科镜像站</h1>
    <div class="form-group">
        <label>1. 选择目标站点</label>
        <select id="targetNode">
            <option value="zh.wikipedia.org">zh.wikipedia.org (中文维基百科)</option>
            <option value="en.wikipedia.org">en.wikipedia.org (英文维基百科)</option>
            <option value="tw.wikipedia.org"> tw.wikipedia.org (繁体维基百科)</option>
            <option value="www.wikipedia.org">www.wikipedia.org (维基百科门户)</option>
            <option value="commons.wikimedia.org">commons.wikimedia.org (维基共享资源)</option>
        </select>
    </div>
    <div class="form-group">
        <label>2. 伪装 User-Agent（已默认适配）</label>
        <input type="text" id="uaInput" value="">
    </div>
    <div class="form-group">
        <label>3. 目标地区语言 (Accept-Language)</label>
        <select id="langInput">
            <option value="zh-CN,zh;q=0.9,en;q=0.8">zh-CN (简体中文)</option>
            <option value="zh-TW,zh;q=0.9,en;q=0.8">zh-TW (繁体中文)</option>
            <option value="en-US,en;q=0.9">en-US (英文)</option>
        </select>
    </div>
    <div class="form-group">
        <label>4. 自定义 Cookie 注入（留空则不注入）</label>
        <textarea id="cookieInput" placeholder="例如: enwiki_session=xxx; centralauth_User=yyy"></textarea>
    </div>
    <button onclick="saveAndJump()">保存配置并进入维基百科</button>
</div>

<div class="tips">
    <p><strong>重要声明：</strong> 本站为 <strong>w.sakcn.icu 维基百科镜像站</strong>，提供的服务仅限用于合法的知识获取与学术研究，严禁用于任何违法违规用途。</p>
</div>

<script>
function saveAndJump() {
    const node = document.getElementById('targetNode').value;
    const ua = document.getElementById('uaInput').value.trim();
    const lang = document.getElementById('langInput').value;
    const cookieInject = document.getElementById('cookieInput').value.trim();

    const expiry = new Date();
    expiry.setTime(expiry.getTime() + (30 * 24 * 60 * 60 * 1000));
    const expStr = "; expires=" + expiry.toUTCString() + "; path=/";

    document.cookie = "__CF_PROXY_UA__=" + encodeURIComponent(ua) + expStr;
    document.cookie = "__CF_PROXY_LANG__=" + encodeURIComponent(lang) + expStr;
    document.cookie = "__CF_PROXY_INJECT_COOKIE__=" + encodeURIComponent(cookieInject) + expStr;

    window.open(window.location.origin + '/https://' + node, '_blank');
}
function loadSaved() {
    const getC = (k) => { var m = RegExp(k + "=[^;]+").exec(document.cookie); return m ? decodeURIComponent(m[0].replace(/^[^=]+./, "")) : ""; };
    let ua = getC("__CF_PROXY_UA__");
    if(ua) document.getElementById('uaInput').value = ua;
    else document.getElementById('uaInput').value = navigator.userAgent;
    if(getC("__CF_PROXY_LANG__")) document.getElementById('langInput').value = getC("__CF_PROXY_LANG__");
    if(getC("__CF_PROXY_INJECT_COOKIE__")) document.getElementById('cookieInput').value = getC("__CF_PROXY_INJECT_COOKIE__");
}
loadSaved();
</script>
</body>
</html>
`;

// ========== 核心请求处理（插入验证和反爬，原有代理逻辑保留） ==========
async function handleRequest(request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';
  const cookie = request.headers.get('Cookie') || '';

  // ---------- 1. 优先处理根路径（登录/控制台） ----------
  if (url.pathname === '/' && !url.search) {
    if (cookie.includes(`${COOKIE_NAME}=1`)) {
      return getHTMLResponse(mainPage);
    } else {
      return getHTMLResponse(getLoginPage());
    }
  }

  // ---------- 2. 登录验证 POST ----------
  if (url.pathname === '/' && url.searchParams.get('auth') === 'check' && request.method === 'POST') {
    const formData = await request.formData();
    const password = formData.get('password') || '';
    if (password === PASSWORD) {
      const response = new Response('OK', { status: 200 });
      response.headers.set('Set-Cookie', `${COOKIE_NAME}=1; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax`);
      return response;
    } else {
      return new Response('Forbidden', { status: 403 });
    }
  }

  // ---------- 3. 反爬虫检测（仅对非根路径，且未登录用户） ----------
  if (!cookie.includes(`${COOKIE_NAME}=1`)) {
    const isBot = BLOCKED_UA.some(bot => userAgent.includes(bot));
    const isScanner = request.headers.get('Accept')?.includes('application/xml') ||
                      request.headers.get('Accept')?.includes('application/json') ||
                      request.headers.get('Accept')?.includes('text/plain') ||
                      request.headers.get('Accept') === '*/*' ||
                      request.headers.get('Accept-Language') === '*' ||
                      !request.headers.get('Accept-Language');
    if (isBot || isScanner) {
      const delay = Math.floor(Math.random() * 500);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getRandomDecoyResponse();
    }
  }

  // ---------- 4. 有代理逻辑 ----------
  // 注意：原代码中检查 Bytespider 的语句已合并到上面的黑名单中，故删除原单独判断
  var siteCookie = cookie;  // 复用已有的 cookie 变量
  // 原有的 favicon 和 robots 处理保留
  if (request.url.endsWith("favicon.ico")) {
    return Response.redirect("https://www.wikipedia.org/favicon.ico", 301);
  }
  if (request.url.endsWith("robots.txt")) {
    return new Response(`User-Agent: *\nDisallow: /`, { headers: { "Content-Type": "text/plain" } });
  }

  var actualUrlStr = url.pathname.substring(url.pathname.indexOf(str) + str.length) + url.search + url.hash;
  if (actualUrlStr == "") {
    // 此分支理论上不会触发，因为根路径已在前面处理，但保留以防万一
    if (cookie.includes(`${COOKIE_NAME}=1`)) {
      return getHTMLResponse(mainPage);
    } else {
      return getHTMLResponse(getLoginPage());
    }
  }

  try {
    var test = actualUrlStr;
    if (!test.startsWith("http")) test = "https://" + test;
    var u = new URL(test);
    const host = u.host.toLowerCase();
    // 仅允许维基媒体相关域名
    const isWiki = host.endsWith('wikipedia.org') || 
                   host.endsWith('wikimedia.org') || 
                   host.endsWith('wikibooks.org') ||
                   host.endsWith('wikidata.org') ||
                   host.endsWith('wikinews.org') ||
                   host.endsWith('wikiquote.org') ||
                   host.endsWith('wikisource.org') ||
                   host.endsWith('wikiversity.org') ||
                   host.endsWith('wikivoyage.org') ||
                   host.endsWith('wiktionary.org') ||
                   host.endsWith('mediawiki.org') ||
                   host.endsWith('wmflabs.org') ||
                   host.endsWith('tw.wikipadia.org') ||
                   host.endsWith('wikimediafoundation.org');
    if (!isWiki) {
      return getHTMLResponse("<h1>403 Forbidden</h1><br>本镜像代理站仅允许访问维基百科及其姊妹项目，拒绝代理其他站点。");
    }
  }
  catch {
    var lastVisit = getCook(lastVisitProxyCookie, siteCookie);
    if (lastVisit) {
      return Response.redirect(thisProxyServerUrlHttps + lastVisit + "/" + actualUrlStr, 302);
    }
    return getHTMLResponse("无法解析该目标请求。");
  }

  if (!actualUrlStr.startsWith("http") && !actualUrlStr.includes("://")) {
    return Response.redirect(thisProxyServerUrlHttps + "https://" + actualUrlStr, 301);
  }

  const actualUrl = new URL(actualUrlStr);
  if (actualUrlStr != actualUrl.href) return Response.redirect(thisProxyServerUrlHttps + actualUrl.href, 301);

  // 获取自定义 UA：优先从 Cookie，若无则使用请求头中的 User-Agent（即用户的真实 UA）
  let customUA = getCook("__CF_PROXY_UA__", siteCookie) || request.headers.get('User-Agent') || "";
  let customLang = getCook("__CF_PROXY_LANG__", siteCookie) || "zh-CN,zh;q=0.9,en;q=0.8";
  let customInjectCookie = getCook("__CF_PROXY_INJECT_COOKIE__", siteCookie) || "";

  let clientHeaderWithChange = new Headers();
  request.headers.forEach((value, key) => {
    var newValue = value.replaceAll(thisProxyServerUrlHttps + "http", "http");
    newValue = newValue.replaceAll(thisProxyServerUrlHttps, `${actualUrl.protocol}//${actualUrl.hostname}/`);
    newValue = newValue.replaceAll(thisProxyServerUrlHttps.substring(0, thisProxyServerUrlHttps.length - 1), `${actualUrl.protocol}//${actualUrl.hostname}`);
    newValue = newValue.replaceAll(thisProxyServerUrl_hostOnly, actualUrl.host);
    clientHeaderWithChange.set(key, newValue);
  });

  clientHeaderWithChange.set('User-Agent', customUA);
  clientHeaderWithChange.set('Accept-Language', customLang);
  if (customInjectCookie) {
    let baseCookie = clientHeaderWithChange.get('Cookie') || "";
    clientHeaderWithChange.set('Cookie', baseCookie ? `${baseCookie}; ${customInjectCookie}` : customInjectCookie);
  }

  let clientRequestBodyWithChange;
  if (request.body) {
    const [body1, body2] = request.body.tee();
    try {
      const bodyText = await new Response(body1).text();
      if (bodyText.includes(thisProxyServerUrlHttps) || bodyText.includes(thisProxyServerUrl_hostOnly)) {
        clientRequestBodyWithChange = bodyText
          .replaceAll(thisProxyServerUrlHttps, actualUrlStr)
          .replaceAll(thisProxyServerUrl_hostOnly, actualUrl.host);
      } else {
        clientRequestBodyWithChange = body2;
      }
    } catch (e) {
      clientRequestBodyWithChange = body2;
    }
  }

  const modifiedRequest = new Request(actualUrl, {
    headers: clientHeaderWithChange,
    method: request.method,
    body: (request.body) ? clientRequestBodyWithChange : request.body,
    redirect: "manual"
  });

  const response = await fetch(modifiedRequest);
  
  if (response.status.toString().startsWith("3") && response.headers.get("Location") != null) {
    try {
      return getRedirect(thisProxyServerUrlHttps + new URL(response.headers.get("Location"), actualUrlStr).href, response, actualUrl);
    } catch {
      return getHTMLResponse("重定向解析发生错误。");
    }
  }

  var modifiedResponse;
  var bd;
  const contentType = response.headers.get("Content-Type") || "";
  var isHTML = false;

  if (response.body) {
    let isText = false;
    let isTextDetectingKeyword = ["text/", "application/json", "application/javascript"];
    isTextDetectingKeyword.forEach(x => { if(contentType.includes(x)) isText = true; })
    
    if (isText) {
      const rawBytes = await response.arrayBuffer();
      let encoding = 'utf-8';
      let m = contentType.match(/charset=([^\s;]+)/i);
      if (m) { encoding = m[1]; } 
      else if (contentType.includes("text/html")) {
        let preview = new TextDecoder('utf-8').decode(rawBytes.slice(0, 2048));
        let metaMatch = preview.match(/charset\s*=\s*["']?\s*([^\s"';>]+)/i);
        if (metaMatch) encoding = metaMatch[1];
      }
      
      try { bd = new TextDecoder(encoding).decode(rawBytes); } 
      catch(ex) { bd = new TextDecoder('utf-8').decode(rawBytes); }

      isHTML = contentType.includes("text/html") && bd.includes("<html");

      if (contentType.includes("html") || contentType.includes("javascript")) {
        bd = bd.replaceAll("window.location", "window." + replaceUrlObj)
               .replaceAll("document.location", "document." + replaceUrlObj)
               .replaceAll("location.href", replaceUrlObj + ".href")
               .replaceAll("location.replace(", replaceUrlObj + ".replace(")
               .replaceAll("location.assign(", replaceUrlObj + ".assign(");
      }

      // ===== 所有 HTML 页面统一注入 =====
      if (isHTML) {
        var hasBom = bd.charCodeAt(0) === 0xFEFF;
        if (hasBom) bd = bd.substring(1);

        // 使用 Base64 编码确保中文不乱码
        const originalHtmlBase64 = btoa(unescape(encodeURIComponent(bd)));

        const inject = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body>
        <script>
        ${statusBarInjection}
        (function () {
          ${httpRequestInjection}
          ${htmlCovPathInject}
          const rawHtml = decodeURIComponent(escape(atob("${originalHtmlBase64}")));
          ${htmlCovPathInjectFuncName}(rawHtml);
        })();
        </script>
        </body>
        </html>
        `;
        bd = (hasBom ? "\uFEFF" : "") + inject;
        modifiedResponse = new Response(bd, response);
        modifiedResponse.headers.set("Content-Type", contentType.replace(/charset=([^\s;]+)/i, "charset=utf-8"));
      } else {
        // 非 HTML 文本（JS、CSS、JSON）仅替换链接
        let regex = new RegExp(`(https?:\\/\\/[^\\s'"]+)`, 'g');
        bd = bd.replaceAll(regex, (match) => {
          if (match.startsWith("http://www.w3.org/") || match.startsWith("https://www.w3.org/")) return match;
          return match.startsWith("http") ? thisProxyServerUrlHttps + match : thisProxyServerUrl_hostOnly + "/" + match;
        });
        modifiedResponse = new Response(bd, response);
        modifiedResponse.headers.set("Content-Type", contentType.replace(/charset=([^\s;]+)/i, "charset=utf-8"));
      }
    } else {
      modifiedResponse = new Response(response.body, response);
    }
  } else {
    modifiedResponse = new Response(response.body, response);
  }

  // 确保有响应对象
  if (!modifiedResponse) {
    modifiedResponse = new Response(response.body, response);
  }

  handleCookieHeader(modifiedResponse, isHTML, response, actualUrlStr, actualUrl);

  modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
  modifiedResponse.headers.set("X-Frame-Options", "ALLOWALL");

  var listHeaderDel = ["Content-Security-Policy", "Permissions-Policy", "Cross-Origin-Embedder-Policy", "Cross-Origin-Resource-Policy"];
  listHeaderDel.forEach(element => {
    modifiedResponse.headers.delete(element);
    modifiedResponse.headers.delete(element + "-Report-Only");
  });

  return modifiedResponse;
}

// ========== 辅助函数（完全未变） ==========
function handleCookieHeader(modifiedResponse, isHTML, response, actualUrlStr, actualUrl) {
  let headers = modifiedResponse.headers;
  let rawCookies = [];
  try { rawCookies = headers.getAll('Set-Cookie'); } catch {
    const val = headers.get('Set-Cookie');
    if (val) rawCookies = [val];
  }

  if (rawCookies.length > 0) {
    headers.delete('Set-Cookie');
    rawCookies.forEach(singleCookie => {
      let parts = singleCookie.split(';').map(part => part.trim());
      let pathIndex = parts.findIndex(part => part.toLowerCase().startsWith('path='));
      let originalPath = pathIndex !== -1 ? parts[pathIndex].substring("path=".length) : "/";
      let absolutePath = "/" + new URL(originalPath, actualUrlStr).href;

      if (pathIndex !== -1) { parts[pathIndex] = `Path=${absolutePath}`; } 
      else { parts.push(`Path=${absolutePath}`); }

      let domainIndex = parts.findIndex(part => part.toLowerCase().startsWith('domain='));
      if (domainIndex !== -1) { parts[domainIndex] = `domain=${thisProxyServerUrl_hostOnly}`; } 
      else { parts.push(`domain=${thisProxyServerUrl_hostOnly}`); }

      headers.append('Set-Cookie', parts.join('; '));
    });
  }

  if (isHTML && response.status == 200) {
    let cookieValue = lastVisitProxyCookie + "=" + actualUrl.origin + "; Path=/; Domain=" + thisProxyServerUrl_hostOnly;
    headers.append("Set-Cookie", cookieValue);
  }
}

function getCook(cookiename, cookies) {
  var cookiestring = RegExp(cookiename + "=[^;]+").exec(cookies);
  return decodeURIComponent(!!cookiestring ? cookiestring.toString().replace(/^[^=]+./, "") : "");
}

function getHTMLResponse(html) {
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function getRedirect(url, originalResponse, actualUrl) {
  if (originalResponse) {
    var res = new Response(null, originalResponse);
    handleCookieHeader(res, false, originalResponse, actualUrl.toString(), actualUrl);
    res.headers.set("Location", url);
    return res;
  }
  return Response.redirect(url, 301);
}
