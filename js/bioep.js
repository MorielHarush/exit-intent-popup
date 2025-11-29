window.bioEp = {

    // Private variables
    bgEl: {},
    popupEl: {},
    closeBtnEl: {},
    shown: false,
    overflowDefault: "visible",
    transformDefault: "",

    // Popup options
    width: 400,
    height: 220,
    html: "",
    css: "",
    fonts: [],
    delay: 5,
    showOnDelay: false,
    cookieExp: 30,
    showOncePerSession: false,
    onPopup: null,

    // Secure: Load DOMPurify from CDN if missing
    ensureDOMPurifyLoaded: function (callback) {
        if (window.DOMPurify) return callback();

        var script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js";
        script.integrity = "sha512-JerwVCg2lqNvFq3NkwpN4T0z1JWL3lTr6nKDxOqjgdWciDlE4fyBAOnFYWfWgWwDx5Fwp6El0SLH7uK/o5pzSQ==";
        script.crossOrigin = "anonymous";
        script.referrerPolicy = "no-referrer";

        script.onload = callback;
        script.onerror = function () {
            console.error("bioep: Failed to load DOMPurify — HTML disabled for security.");
            callback();
        };

        document.head.appendChild(script);
    },

    // Cookie manager
    cookieManager: {
        create: function (name, value, days, sessionOnly) {
            var expires = "";
            if (sessionOnly)
                expires = "; expires=0";
            else if (days) {
                var date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = "; expires=" + date.toGMTString();
            }
            document.cookie = name + "=" + value + expires + "; path=/";
        },

        get: function (name) {
            var nameEQ = name + "=";
            var ca = document.cookie.split(";");
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) === " ") c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
            }
            return null;
        },

        erase: function (name) {
            this.create(name, "", -1);
        }
    },

    // Handle cookie
    checkCookie: function () {
        if (this.cookieExp <= 0) {
            if (this.showOncePerSession && this.cookieManager.get("bioep_shown_session") === "true")
                return true;
            this.cookieManager.erase("bioep_shown");
            return false;
        }
        if (this.cookieManager.get("bioep_shown") === "true")
            return true;
        return false;
    },

    // Inject CSS
    addCSS: function () {
        for (var i = 0; i < this.fonts.length; i++) {
            var font = document.createElement("link");
            font.href = this.fonts[i];
            font.type = "text/css";
            font.rel = "stylesheet";
            document.head.appendChild(font);
        }

        var css = document.createTextNode(
            "#bio_ep_bg {display:none;position:fixed;top:0;left:0;width:100%;height:100%;background-color:#000;opacity:0.3;z-index:10001;}" +
            "#bio_ep {display:none;position:fixed;width:" + this.width + "px;height:" + this.height +
            "px;font-family:'Titillium Web',sans-serif;font-size:16px;left:50%;top:50%;transform:translateX(-50%) translateY(-50%);" +
            "background-color:#fff;box-shadow:0px 1px 4px rgba(0,0,0,0.5);z-index:10002;}" +
            "#bio_ep_close {position:absolute;left:100%;margin:-8px 0 0 -12px;width:20px;height:20px;color:#fff;font-size:12px;" +
            "font-weight:bold;text-align:center;border-radius:50%;background-color:#5c5c5c;cursor:pointer;}" +
            this.css
        );

        var style = document.createElement("style");
        style.type = "text/css";
        style.appendChild(css);
        document.head.insertBefore(style, document.getElementsByTagName("style")[0]);
    },

    // Add popup to DOM
    addPopup: function () {
        this.bgEl = document.createElement("div");
        this.bgEl.id = "bio_ep_bg";
        document.body.appendChild(this.bgEl);

        if (document.getElementById("bio_ep"))
            this.popupEl = document.getElementById("bio_ep");
        else {
            this.popupEl = document.createElement("div");
            this.popupEl.id = "bio_ep";

            var self = this;

            // Secure: ensure DOMPurify before injecting HTML
            this.ensureDOMPurifyLoaded(function () {
                if (window.DOMPurify) {
                    self.popupEl.innerHTML = window.DOMPurify.sanitize(self.html);
                } else {
                    self.popupEl.innerHTML = "Popup content disabled - DOMPurify missing";
                }
            });

            document.body.appendChild(this.popupEl);
        }

        if (document.getElementById("bio_ep_close"))
            this.closeBtnEl = document.getElementById("bio_ep_close");
        else {
            this.closeBtnEl = document.createElement("div");
            this.closeBtnEl.id = "bio_ep_close";
            this.closeBtnEl.appendChild(document.createTextNode("X"));
            this.popupEl.insertBefore(this.closeBtnEl, this.popupEl.firstChild);
        }
    },

    // Show popup
    showPopup: function () {
        if (this.shown) return;
        this.bgEl.style.display = "block";
        this.popupEl.style.display = "block";
        this.scalePopup();
        this.overflowDefault = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        this.shown = true;

        this.cookieManager.create("bioep_shown", "true", this.cookieExp, false);
        this.cookieManager.create("bioep_shown_session", "true", 0, true);

        if (typeof this.onPopup === "function") {
            this.onPopup();
        }
    },

    // Hide popup
    hidePopup: function () {
        this.bgEl.style.display = "none";
        this.popupEl.style.display = "none";
        document.body.style.overflow = this.overflowDefault;
    },

    // Scale popup to window
    scalePopup: function () {
        var margins = { width: 40, height: 40 };
        var popupSize = { width: this.popupEl.offsetWidth, height: this.popupEl.offsetHeight };
        var windowSize = { width: window.innerWidth, height: window.innerHeight };
        var newSize = { width: 0, height: 0 };
        var aspectRatio = popupSize.width / popupSize.height;

        if (popupSize.width > (windowSize.width - margins.width)) {
            newSize.width = windowSize.width - margins.width;
            newSize.height = newSize.width / aspectRatio;
            if (newSize.height > (windowSize.height - margins.height)) {
                newSize.height = windowSize.height - margins.height;
                newSize.width = newSize.height * aspectRatio;
            }
        }

        if (newSize.height === 0) {
            if (popupSize.height > (windowSize.height - margins.height)) {
                newSize.height = windowSize.height - margins.height;
                newSize.width = newSize.height * aspectRatio;
            }
        }

        var scaleTo = newSize.width / popupSize.width;
        if (scaleTo <= 0 || scaleTo > 1) scaleTo = 1;

        if (this.transformDefault === "")
            this.transformDefault = window.getComputedStyle(this.popupEl).getPropertyValue("transform");

        this.popupEl.style.transform = this.transformDefault + " scale(" + scaleTo + ")";
    },

    // Add event listener
    addEvent: function (obj, event, callback) {
        if (obj.addEventListener)
            obj.addEventListener(event, callback, false);
        else if (obj.attachEvent)
            obj.attachEvent("on" + event, callback);
    },

    // Load event handlers
    loadEvents: function () {
        this.addEvent(document, "mouseout", function (e) {
            e = e ? e : window.event;
            if (e.target.tagName && e.target.tagName.toLowerCase() === "input") return;

            var vpWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            if (e.clientX >= (vpWidth - 50)) return;
            if (e.clientY >= 50) return;

            var from = e.relatedTarget || e.toElement;
            if (!from)
                bioEp.showPopup();
        }.bind(this));

        this.addEvent(this.closeBtnEl, "click", function () {
            bioEp.hidePopup();
        });

        this.addEvent(window, "resize", function () {
            bioEp.scalePopup();
        });
    },

    // Set options
    setOptions: function (opts) {
        this.width = opts.width !== undefined ? opts.width : this.width;
        this.height = opts.height !== undefined ? opts.height : this.height;
        this.html = opts.html !== undefined ? opts.html : this.html;
        this.css = opts.css !== undefined ? opts.css : this.css;
        this.fonts = opts.fonts !== undefined ? opts.fonts : this.fonts;
        this.delay = opts.delay !== undefined ? opts.delay : this.delay;
        this.showOnDelay = opts.showOnDelay !== undefined ? opts.showOnDelay : this.showOnDelay;
        this.cookieExp = opts.cookieExp !== undefined ? opts.cookieExp : this.cookieExp;
        this.showOncePerSession = opts.showOncePerSession !== undefined ? opts.showOncePerSession : this.showOncePerSession;
        this.onPopup = opts.onPopup !== undefined ? opts.onPopup : this.onPopup;
    },

    // DOM ready
    domReady: function (callback) {
        (document.readyState === "interactive" || document.readyState === "complete")
            ? callback()
            : this.addEvent(document, "DOMContentLoaded", callback);
    },

    // Init
    init: function (opts) {
        if (typeof opts !== "undefined")
            this.setOptions(opts);

        this.addCSS();

        this.domReady(function () {
            if (bioEp.checkCookie()) return;

            bioEp.addPopup();

            setTimeout(function () {
                bioEp.loadEvents();
                if (bioEp.showOnDelay)
                    bioEp.showPopup();
            }, bioEp.delay * 1000);
        });
    }
};

