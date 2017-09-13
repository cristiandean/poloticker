
function _(s) {
    if (typeof (i18n) != 'undefined' && i18n[s]) {
        return i18n[s];
    }
    return s;
}

function showNotification(title, message) {
    // Now create the notification
    chrome.notifications.create("Notification" + Math.random(), {
        type: 'basic',
        iconUrl: 'img/128.png',
        title: title,
        message: message
    }, function (notificationId) { });
}

setLocalStorage = function (att, val) {
    var obj = {};
    obj[att] = val;
    chrome.storage.local.set(obj);
}

String.prototype.sprintf = function () {
    var counter = 0;
    var args = arguments;

    return this.replace(/%s/g, function () {
        return args[counter++];
    });
};


showBadge = function (text, color0 = 50, color1 = 120, color2 = 183, alpha = 255) {
    text = (text == null) ? '' : text + "";
    chrome.browserAction.setBadgeText({ text: text });
    chrome.browserAction.setBadgeBackgroundColor({ color: [color0, color1, color2, alpha] });
}

incrementBadge = function (increment=1,color0 = 50, color1 = 120, color2 = 183, alpha = 255) {
    chrome.browserAction.getBadgeText({}, function (result) {
        if(result==null || isNaN(parseInt(result)))
            result = 0;
        result = (parseInt(result) + increment)+'';
        result = result=='0' ? '' : result;
        chrome.browserAction.setBadgeText({ text: result });
        chrome.browserAction.setBadgeBackgroundColor({ color: [color0, color1, color2, alpha] });
    });
}


Date.prototype.getUTCTime = function () {
    return this.getTime() - (this.getTimezoneOffset() * 60000);
};



