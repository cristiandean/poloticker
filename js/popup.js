$(document).ready(function (){
	
//	var key = "IPEHXWSR-BANMHJIN-WZQGUA5W-PKDEDARM" 
//	var sign = "a06f9b2f34fda8d6418a4d1cc0075f228d925236fbedec9d76a90109dea21b7ca0364cf563d2ebf3d32dc1b02683d0afa9b91ce5a50d63c5852a6cb097235c96";
var key;
var sign;
var updateTimeOut;
var balances;
var coins;
var orders;
var filterCoins = [];
var btc_qtd = 0;
var timeout = 10000;

init = function(){
	chrome.storage.local.get('keys', function(keys){
		key = keys.keys.key;
		sign = keys.keys.sign;

		$('#formApi #apiKey').val(key);
		$('#formApi #apiSecret').val(sign);
		updateCoins();
	});
	chrome.extension.getBackgroundPage().window.location.reload();		
	showBadge(null);
}

$('#formApi #apiSecret, #formApi #apiKey').on("keyup keydown", function(){
    key = $('#formApi #apiKey').val();
	sign = $('#formApi #apiSecret').val();
	setLocalStorage('keys', {key: key, sign:sign});
	clearTimeout(updateTimeOut);
	updateTimeOut =  setTimeout(init, timeout);
});

$('.btn_filters button').on('click', function(){
	$('.btn_filters button').removeClass('active');
	$(this).addClass('active');
	$('#markets-table_filter input[type="search"]').val($(this).attr('data-filter'));
	$( '#markets-table_filter input[type="search"]').trigger( "keyup");

});

$(document).on('click', '.cancel_order', function(){
	cancelOrder($(this).attr('data-id'));
})

updateBalances = function(){
	var params = { 
		command: "returnCompleteBalances",
		nonce: chrome.extension.getBackgroundPage().getNonce(),
	}

	hash = CryptoJS.HmacSHA512(jQuery.param(params), sign);
	
	$.ajax({
		url: 'https://poloniex.com/tradingApi',
		type: 'post',
		data:  params,
		headers: {
			Key: key,
			Sign: hash
		},
		dataType: 'json',
		success: function (data){
			balances = data;
			$('.balance-row').remove();

			addBalanceRows();
			addMarketRows();
			openOrders();
		},
		error: function (data){
			showNotification(_("Polo Ticker Alert"), _("Could not connect to poloniex server, check your credentials, and try again!"));
		}
	});
};

openOrders = function(){
	var params = { 
		command: "returnOpenOrders",
		nonce: chrome.extension.getBackgroundPage().getNonce(),
		currencyPair: 'all'
	}

	hash = CryptoJS.HmacSHA512(jQuery.param(params), sign);
	
	$.ajax({
		url: 'https://poloniex.com/tradingApi',
		type: 'post',
		data:  params,
		headers: {
			Key: key,
			Sign: hash
		},
		dataType: 'json',
		success: function (data){
			orders = data;
			addOpenOrdersRows();
			updateTimeOut = setTimeout(updateCoins, timeout);
		},
		error: function (data){
			showNotification(_("Polo Ticker Alert"), _("Could not connect to poloniex server, check your credentials, and try again!"));
		}
	});
};

cancelOrder = function(order_id){
	var params = { 
		command: "cancelOrder",
		nonce: Date.now(),
		orderNumber: order_id
	}

	hash = CryptoJS.HmacSHA512(jQuery.param(params), sign);
	
	$.ajax({
		url: 'https://poloniex.com/tradingApi',
		type: 'post',
		data:  params,
		headers: {
			Key: key,
			Sign: hash
		},
		dataType: 'json',
		success: function (data){
			if(data.success==1)
				return showNotification(_("Polo Ticker Alert"), _(data.message));	
			showNotification(_("Polo Ticker Alert"), _("There was an error while trying to complete your request!"));	
		},
		error: function (data){
			showNotification(_("Polo Ticker Alert"), _("Could not connect to poloniex server, check your credentials, and try again!"));
		}
	});
};



updateCoins = function(){
	$.ajax({
		url: 'https://poloniex.com/public?command=returnTicker',
		type: 'get',
		dataType: 'json',
		success: function (data){
			coins = data;
			updateBalances();
		},
		error: function (data){
			showNotification(_("Polo Ticker Alert"), _("Could not connect to poloniex server, check your credentials, and try again!"));
		}
	});
};




//Market
addMarketRows = function(){
	table = $('#markets-table').DataTable();
	table.clear();
	for(var coin in coins) { 
		myBtcValue = (balances[coin.replace('BTC_', '')]!=null) ? balances[coin.replace('BTC_', '')].btcValue : 0;
		var tr = table.row.add([coin, coins[coin].highestBid, coins[coin].baseVolume, "<span class='color-"+(coins[coin].percentChange>=0 ? 'green' : 'red')+"'>"+(coins[coin].percentChange>=0 ? '+' : '')+(parseFloat(coins[coin].percentChange).toFixed(3))+"</span>", parseFloat(myBtcValue).toFixed(8), (myBtcValue*coins['USDT_BTC'].highestBid).toFixed(2)]).draw( false ).node();
		$(tr).addClass('market-row');
	}
}

//Deposit e Withdrawls
addBalanceRows = function() {	
	table = $('#balances-table').DataTable();
	table.clear();
	btc_qtd = 0;
	for(var coin in balances) { 
		if(balances[coin].btcValue==0)
			continue;
		highestBid = (coins['BTC_'+coin]!=null) ? coins['BTC_'+coin].highestBid : 0;
		if(coin=='BTC')
			highestBid = balances[coin].btcValue;
		btc_qtd += parseFloat(balances[coin].btcValue);
		var tr = table.row.add([coin, (parseFloat(balances[coin].onOrders) + parseFloat(balances[coin].available)).toFixed(8), balances[coin].btcValue, highestBid, balances[coin].onOrders, balances[coin].available, (balances[coin].btcValue*coins['USDT_BTC'].highestBid).toFixed(2)]).draw( false ).node();
		$(tr).addClass('balance-row');
	}
	$('.btc_qtd').html(btc_qtd.toFixed(8));
	$('.usd_val').html((btc_qtd*coins['USDT_BTC'].highestBid).toFixed(2));
};


addOpenOrdersRows = function(){
	table = $('#open-orders-table').DataTable();
	table.clear();
	for(var order in orders) { 
		if(orders[order].length==0)
			continue;

		for(i=0;i<orders[order].length;i++){
			var tr = table.row.add([order, "<span class='color-"+(orders[order][i].type=='buy' ? 'green' : 'red')+"'>"+orders[order][i].type+"</span>", orders[order][i].rate, orders[order][i].startingAmount, (parseFloat(orders[order][i].rate) * parseFloat(orders[order][i].startingAmount)).toFixed(8),orders[order][i].date,'<a href="#" class="cancel_order" data-id="'+orders[order][i].orderNumber+'">Cancel</a>']).draw( false ).node();
		}
		$(tr).addClass('balance-row');
	}
}

$('.datatable').DataTable( {
	"paging":         false,
	"oLanguage": {
		"sSearch": ""
	}
} );


init();

});