$(document).ready(function () {
	var maxTimestamp;
	var key;
	var sign;
	var nonce = Date.now();

	init = function () {
		//setLocalStorage('maxTimestamp', null);
		chrome.storage.local.get('maxTimestamp', function (dataTimestamp) {
			maxTimestamp = (dataTimestamp.maxTimestamp == null) ? Math.round(new Date(new Date().setDate(new Date().getDate()-1)).getTime()) : dataTimestamp.maxTimestamp;

			chrome.storage.local.get('keys', function (keys) {
				if (keys.keys.key == null || keys.keys.sign == null)
					return;
				key = keys.keys.key;
				sign = keys.keys.sign;
				updateTransaction();
			});
		});
	}

	updateTransaction = function () {
		var params = {
			command: "returnTradeHistory",
			nonce: getNonce(),
			currencyPair: "all",
			start: (maxTimestamp / 1000) + 1
		}

		hash = CryptoJS.HmacSHA512(jQuery.param(params), sign);

		$.ajax({
			url: 'https://poloniex.com/tradingApi',
			type: 'post',
			data: params,
			headers: {
				Key: key,
				Sign: hash
			},
			dataType: 'json',
			success: function (data) {
				coinsAlerts = 0;
				for (var coin in data) {
					data[coin].forEach(function (e) {
						coinsAlerts++;
						var type = (e.type == "sell") ? _("Sell") : _("Buy");
						showNotification(_("Polo Ticker Alert"), "[" + coin + "] " + _("Your %s order has been executed!").sprintf(_(type)));

						var timestamp = (new Date(Date.parse(e.date)).getUTCTime());
						if (timestamp > maxTimestamp) {
							maxTimestamp = timestamp;
						}

						setLocalStorage('maxTimestamp', maxTimestamp);
					});
				}
				incrementBadge(coinsAlerts);
				updateTimeOut = setTimeout(updateTransaction, 10000);
			},
			error: function (data) {
				if (data.status == 422) {
					updateTimeOut = setTimeout(updateTransaction, 10000);
					return;
				} if (data.status == 403) {
					showNotification(_("Polo Ticker Alert"), _("Could not connect to poloniex server, check your credentials, and try again!").sprintf(_(type)));
				}
			}
		});
	};

	init();

	getNonce = function () {
		nonce++;
		return nonce;
	}

});







