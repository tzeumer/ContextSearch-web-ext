// unique object to reference globally
var quickMenuObject = { 
	delay: 250, // how long to hold right-click before translating in ms
	keyDownTimer: 0,
	mouseDownTimer: 0,
	mouseCoords: {x:0, y:0},
	screenCoords: {x:0, y:0},
	mouseCoordsInit: {x:0, y:0},
	mouseLastClickTime: 0,
	mouseDragDeadzone: 4,
	lastSelectTime: 0
};

var userOptions = {};

document.addEventListener('keydown', (ev) => {
	
	if (ev.repeat) return false;
	if (!userOptions.quickMenu) return false;
	if (ev.which === 27) {
		browser.runtime.sendMessage({action: "closeQuickMenuRequest"});
		return false;
	}
	if (!userOptions.quickMenuOnKey) return false;
	if (ev.which !== userOptions.quickMenuKey) return false;
	if (getSelectedText(ev.target) === "") return false;

	quickMenuObject.keyDownTimer = Date.now();
	
	return false;
});

document.addEventListener('keyup', (ev) => {
	
	if (ev.repeat) return false;
	if (!userOptions.quickMenu) return false; 
	if (!userOptions.quickMenuOnKey) return false;
	if (ev.which !== userOptions.quickMenuKey) return false;
	
	if (Date.now() - quickMenuObject.keyDownTimer < 250) {
		openQuickMenu(ev);
	}
	
	quickMenuObject.keyDownTimer = 0;
	
	return false;
});

document.addEventListener('mousedown', (ev) => {

	if (!userOptions.quickMenu) return false;
	if (!userOptions.quickMenuOnMouse) return false; 
	if (ev.which !== userOptions.quickMenuMouseButton) return false;
	if (getSelectedText(ev.target) === "") return false;

	quickMenuObject.mouseCoordsInit = {x: ev.clientX, y: ev.clientY};
	
	// timer for right mouse down
	quickMenuObject.mouseDownTimer = setTimeout(() => {

		if (Math.abs(quickMenuObject.mouseCoords.x - quickMenuObject.mouseCoordsInit.x) > quickMenuObject.mouseDragDeadzone || Math.abs(quickMenuObject.mouseCoords.y - quickMenuObject.mouseCoordsInit.y) > quickMenuObject.mouseDragDeadzone ) return false;

		if (ev.which === 1) {
			// prevent losing text selection		
			document.addEventListener('mouseup', (evv) => {
				if (evv.which !== 1) return;
				evv.preventDefault();
				quickMenuObject.mouseLastClickTime = Date.now();
			}, {once: true}); // parameter to run once, then delete
		
		} else if (ev.which === 3) {
			// Disable the default context menu once
			document.addEventListener('contextmenu', (evv) => {
				evv.preventDefault();
			}, {once: true}); // parameter to run once, then delete
		}
		
		openQuickMenu(ev);
		
	}, quickMenuObject.delay);

	return false;
});

document.addEventListener('mouseup', (ev) => {

	if (!userOptions.quickMenu) return false;
	if (userOptions.quickMenuAuto && getSelectedText(ev.target) !== "" && ev.which === 1 && ev.target.id !== 'hover_div' && ev.target.parentNode.id !== 'hover_div' ) {
		if (Date.now() - quickMenuObject.lastSelectTime > 1000 && ev.target.type !== 'text' && ev.target.type !== 'textarea' ) return false;
		quickMenuObject.mouseLastClickTime = Date.now();
		clearTimeout(quickMenuObject.mouseDownTimer);
		openQuickMenu(ev);
		return false;
	}

	if (!userOptions.quickMenuOnMouse) return false; 
	if (ev.which !== userOptions.quickMenuMouseButton) return false;
	
	clearTimeout(quickMenuObject.mouseDownTimer);

	return false;
});

function openQuickMenu(ev) {
//	console.log(window.getSelection());
//	console.log(window.getSelection().getRangeAt(0));
//	console.log(window.getSelection().getRangeAt(0).getBoundingClientRect());
	
	
	browser.runtime.sendMessage({action: "openQuickMenuRequest", screenCoords: {x: quickMenuObject.screenCoords.x, y: quickMenuObject.screenCoords.y}, searchTerms: getSelectedText(ev.target)});
}

function main(coords, searchTerms) {
	
	console.log(userOptions.quickMenuOffset);
	userOptions.quickMenuOffset = userOptions.quickMenuOffset || {x:0, y:0};
	userOptions.quickMenuOffset.x = userOptions.quickMenuOffset.x || 0;
	userOptions.quickMenuOffset.y = userOptions.quickMenuOffset.y || 0;
	
	if (isNaN(userOptions.quickMenuOffset.x)) userOptions.quickMenuOffset.x = 0;
	if (isNaN(userOptions.quickMenuOffset.y)) userOptions.quickMenuOffset.y = 0;

	var xOffset=Math.max(document.documentElement.scrollLeft,document.body.scrollLeft);	
	var yOffset=Math.max(document.documentElement.scrollTop,document.body.scrollTop);
	
	var hover_div = document.createElement('quickmenu');
	hover_div.style.top = coords.y + yOffset - 2 + userOptions.quickMenuOffset.y + "px";
	hover_div.style.left = coords.x + xOffset - 2 + userOptions.quickMenuOffset.x + "px";
	hover_div.style.minWidth = Math.min(userOptions.quickMenuColumns,userOptions.quickMenuItems,userOptions.searchEngines.length) * (16 + 16 + 2) + "px"; //icon width + padding + border

	hover_div.id = 'hover_div';
	hover_div.onclick = () => {
		hover_div.parentNode.removeChild(hover_div);
	};
	
	// remove old popup
	var old_hover_div = document.getElementById(hover_div.id);
	if (old_hover_div !== null && old_hover_div.parentNode) old_hover_div.parentNode.removeChild(old_hover_div);

	for (var i=0;i<userOptions.searchEngines.length && i < userOptions.quickMenuItems;i++) {

		var span = document.createElement('DIV');
		
		span.style.backgroundImage = 'url(' + userOptions.searchEngines[i].icon_base64String + ')';
		span.style.clear = (i % userOptions.quickMenuColumns === 0) ? "left" : "none";	
		span.index = i;
		span.title = userOptions.searchEngines[i].title;

		function openLink(e) {
			e.preventDefault();			

			browser.runtime.sendMessage({
				action: "openTab", 
				info: {
					modifiers: [
						(e.shiftKey) ? "Shift" : null,
						(e.ctrlKey) ? "Ctrl": null
					],
					menuItemId: this.index,
					selectionText: searchTerms
				}
			});
		}

		span.addEventListener('click', openLink);	

		hover_div.appendChild(span);
	}
	
	if (userOptions.searchEngines.length === 0 || typeof userOptions.searchEngines[0].icon_base64String === 'undefined') {
		var div = document.createElement('div');
		div.style='clear:both;font-size:8pt;text-align:center;line-height:1;padding:10px 0px;height:auto';
			div.style.minWidth = hover_div.style.minWidth;
		div.innerText = 'Where are my icons?';
		div.onclick = function() {
			alert('If you are seeing this message, reload your search settings file\r\nIf an icon cannot be loaded, it will given a color');
			
			browser.runtime.sendMessage({action: "openOptions"});	
		}
		
		hover_div.appendChild(div);
	}
	
	var els = hover_div.getElementsByTagName('*');

	for (var i in els) {
		if (els[i].nodeType === undefined || els[i].nodeType !== 1) continue;
		if (hover_div.ownerDocument.defaultView.getComputedStyle(els[i], null).getPropertyValue("display") === 'none' || hover_div.ownerDocument.defaultView.getComputedStyle(hover_div, null).getPropertyValue("display") === 'none') {
			console.log('quick menu hidden by external script (adblocker?).  Enabling context menu');
			browser.runtime.sendMessage({action: 'enableContextMenu'}).then(() => {
				let mev = new MouseEvent('contextmenu', {
					view: window,
					bubbles: true,
					cancelable: true
				});
				document.elementFromPoint(x, y).dispatchEvent(mev);
			});
			break;
		}
	}
	
	document.body.appendChild(hover_div);
	
	scaleQuickMenu(hover_div);

	// move if offscreen
	var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
	var scrollbarHeight = window.innerHeight - document.documentElement.clientHeight;

	var rect = hover_div.getBoundingClientRect();
	if (rect.x + rect.width > window.innerWidth)
		hover_div.style.left = parseInt(hover_div.style.left) - ((rect.x + rect.width) - window.innerWidth) - scrollbarWidth + "px";
	if (rect.y + rect.height > window.innerHeight)
		hover_div.style.top = parseInt(hover_div.style.top) - ((rect.y + rect.height) - window.innerHeight) - scrollbarHeight + "px";

	hover_div.style.opacity=1;
	return false;
}

function scaleQuickMenu(hover_div) {
	userOptions.quickMenuScaleOnZoom = userOptions.quickMenuScaleOnZoom || true;
	userOptions.quickMenuScale = userOptions.quickMenuScale || 1;
	
	if (isNaN(userOptions.quickMenuScale)) userOptions.quickMenuScale = 1;
	
	let scale = window.devicePixelRatio;
	let new_scale = (userOptions.quickMenuScaleOnZoom) ? (userOptions.quickMenuScale / scale) : userOptions.quickMenuScale;
	
	hover_div.style.transformOrigin = "top left";
	hover_div.style.transform = "scale(" + new_scale + ")";
}

function getSelectedText(el) {
	
	var text = "";
	if (typeof window.getSelection != "undefined") {
		text = window.getSelection().toString();
	} else if (typeof document.selection != "undefined" && document.selection.type == "Text") {
		text = document.selection.createRange().text;
	}

	if (el && typeof el.selectionStart !== 'undefined') {
		var start = el.selectionStart;
		var finish = el.selectionEnd;
		text = el.value.substring(start, finish);
	}

	return text;
}

function closeQuickMenu() {
	var hover_div = document.getElementById('hover_div');
	if (hover_div !== null) {
		hover_div.style.opacity=0;
		setTimeout(()=> {
			if (hover_div !== null && hover_div.parentNode !== null)
				hover_div.parentNode.removeChild(hover_div);
		},100);
	}
}

document.addEventListener("click", (ev) => {

	if (Date.now() - quickMenuObject.mouseLastClickTime < 100) return false;
	
	browser.runtime.sendMessage({action: "closeQuickMenuRequest"});

});

document.addEventListener("mousemove", (ev) => {
	quickMenuObject.mouseCoords = {x: ev.clientX, y: ev.clientY};
	quickMenuObject.screenCoords = {x: ev.screenX, y: ev.screenY};
});

document.addEventListener("drag", (ev) => {
	clearTimeout(quickMenuObject.mouseDownTimer);
});

document.addEventListener("selectionchange", (ev) => {
	quickMenuObject.lastSelectTime = Date.now();
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {

	if (typeof message.userOptions !== 'undefined')
		userOptions = message.userOptions || {};
	if (typeof message.action !== 'undefined') {
		switch (message.action) {
			
			case "closeQuickMenu":
				closeQuickMenu();
				break;
				
			case "openQuickMenu":
				let x = (message.screenCoords.x - (quickMenuObject.screenCoords.x - quickMenuObject.mouseCoords.x * window.devicePixelRatio)) / window.devicePixelRatio;
				let y = (message.screenCoords.y - (quickMenuObject.screenCoords.y - quickMenuObject.mouseCoords.y * window.devicePixelRatio)) / window.devicePixelRatio;

				main({'x': x,'y': y}, message.searchTerms);
				break;
		}
	}
});

browser.runtime.sendMessage({action: "getUserOptions"}).then((message) => {
	userOptions = message.userOptions || {};
});