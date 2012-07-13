/**
	MagnetCursor
	
	Copyright 2011 Maripo GODA <goda.mariko@gmail.com>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */

var MagnetCursor = function() {
	this.keyDown = false;
	this.clickableElements = new Array();
	this.dummyCursor = document.createElement('IMG');
	this.dummyCursor.src = chrome.extension.getURL('/img/cursor.gif');
	with (this.dummyCursor.style) {
		position = 'absolute';
		width = '12px';
		zIndex = 1000;
		opacity = 0.6;
	}
	document.body.appendChild(this.dummyCursor);
	
	this.dummyFrame = document.createElement('DIV');
	with (this.dummyFrame.style)
	{
		zIndex = 1000;
		position = 'absolute';
		border = 'solid 1px blue';
	}
	document.body.appendChild(this.dummyFrame);
		
	this.measureNode = document.createElement('IMG');
	this.measureNode.style.overflow = 'overflow'
	this.measureNode.style.width = '0px'
	this.measureNode.style.height = '1px'
	this.measureNode.style.verticalAlign = 'top';
};

MagnetCursor.getImageMaps = function ()
{
	var imgs = document.getElementsByTagName('IMG');
	var map = new Array();
	for (var i=0; i<imgs.length; i++) 
	{
		if (imgs[i].useMap)
			map[imgs[i].useMap.replace('#','')] = imgs[i];
	}
	return map;
};

MagnetCursor.KEY_CODE_COMMAND = 91;
MagnetCursor.KEY_CODE_SHIFT = 16;
MagnetCursor.KEY_CODE_CTRL = 17;
MagnetCursor.KEY_CODE = MagnetCursor.KEY_CODE_COMMAND;
MagnetCursor.MAX_DISTANCE = 50;

MagnetCursor.getMaxZIndex = function () 
{
	var max = 1;
	var elements = document.getElementsByTagName('*');
	for (var i=0, l=elements.length; i<l; i++) 
	{
		var element = elements[i];
		var style = window.getComputedStyle(element);
		if (style && style.zIndex && 'auto'!=style.zIndex && style.zIndex>max)
			max = style.zIndex;
	}
	return max;
};
MagnetCursor.prototype.getEdgePositions = function (elm)
{
	if (elm.hidden)
		return new Array();
	if ('A'==elm.tagName && 'inline'==document.defaultView.getComputedStyle(elm, null).getPropertyValue('display'))
	{
		return this.getPositionsInline(elm);
	}
	else if ('AREA'==elm.tagName)
	{
		try {
			var parentBounds = this.getBounds(this.imageMaps[elm.parentNode.name]);
			var areaCoord = MagnetCursor.getAreaCoord(elm);
			return [{
				left:parentBounds.left+areaCoord[0],
				top:parentBounds.top+areaCoord[1],
				right:parentBounds.left+areaCoord[2],
				bottom:parentBounds.top+areaCoord[3],
			}];
		}
		catch (e)
		{
			console.log(e);
			return [];
		}
	}
	else
	{
		var bounds = this.getBounds(elm);
		return [{
				left:bounds.left,
				top:bounds.top,
				right:bounds.right,
				bottom:bounds.bottom,
			}];
	}
	
};
MagnetCursor.getAreaCoord = function (elm)
{
	var _coords = elm.coords.split(',');
	var coords = new Array();
	for (var i=0; i<_coords.length; i++) coords[i] = parseInt(_coords[i]);
	switch (elm.shape.toLowerCase()) 
	{
	case 'circle' : 
	{
		// circle (centerX, centerY, radius)
		var centerX = coords[0];
		var centerY = coords[1];
		var radius = coords[2];
		return [centerX-radius, centerY-radius, centerX+radius, centerY+radius];
		break;
	}
	case 'poly' : 
	{
		// poly (x,y,x,y,x,y.....)
		var minX, minY, maxX, maxY;
		for (var i=0; i<coords.length/2; i++) 
		{
			var x = coords[i*2];
			var y = coords[i*2+1];
			if (i==0) {
				minX = x;
				maxX = x;
				minY = y;
				maxY = y;
			}
			else {
				if (x<minX) minX = x;
				if (y<minY) minY = y;
				if (x>maxX) maxX = x;
				if (y>maxY) maxY = y;
			}
		}
		return [minX, minY, maxX, maxY];
		break;
	}
	default : 
	{
		// rect (left, top, right, bottom)
		return coords;
	}
	}
};
MagnetCursor.prototype.getBounds = function (elm)
{
	var bounds = elm.getBoundingClientRect();
	return {
		left: bounds.left + document.body.scrollLeft,
		right: bounds.right + document.body.scrollLeft,
		top: bounds.top + document.body.scrollTop,
		bottom: bounds.bottom + document.body.scrollTop,
	};
};
MagnetCursor.prototype.getPositionsInline = function (elm)
{
	var positions = new Array();
	var bounds = this.getBounds(elm);	
	elm.parentNode.insertBefore(this.measureNode, elm);
	var headBounds = this.getBounds(this.measureNode);
	elm.appendChild(this.measureNode);
	var tailBounds = this.getBounds(this.measureNode);
	var calcOffset = bounds.top-headBounds.top;
	var lineHeight = bounds.bottom - tailBounds.top - calcOffset;
	if (lineHeight<=0)
		lineHeight = parseInt(window.getComputedStyle(elm).lineHeight.replace('px'))
	
	if (headBounds.top == tailBounds.top)
	{
		// 1 line
		positions.push
		({
			left: bounds.left,
			top: bounds.top,
			right: bounds.right,
			bottom: bounds.bottom
		});
	}
	else if (lineHeight * 3 > bounds.bottom-bounds.top)
	{
		//2 lines
		positions.push
		({
			left: headBounds.left,top: bounds.top,
			right: bounds.right, bottom: bounds.top + lineHeight
		});
		positions.push ({ left: bounds.left, top: bounds.bottom - lineHeight, right: tailBounds.right, bottom: bounds.bottom});
	}
	else 
	{
		// 3 lines or more
		positions.push ({left: headBounds.left, top: bounds.top, right: bounds.right, bottom: bounds.top + lineHeight});
		positions.push ({left: bounds.left, top: bounds.top + lineHeight, right: bounds.right, bottom: bounds.bottom - lineHeight});
		positions.push ({left: bounds.left, top: bounds.bottom - lineHeight, right: tailBounds.right, bottom: bounds.bottom});
	}
	return positions;

}
MagnetCursor.prototype.emulateClick = function(target) {
	this.emulatedEvent = document.createEvent('MouseEvents');
	this.emulatedEvent.initEvent('click', false, false);
	target.dispatchEvent(this.emulatedEvent);
};
MagnetCursor.prototype.emulateMousedown = function(target) {
	this.emulatedEvent = document.createEvent('MouseEvents');
	this.emulatedEvent.initEvent('mousedown', false, false);
	target.dispatchEvent(this.emulatedEvent);
};
MagnetCursor.prototype.emulateMouseup = function(target) {
	this.emulatedEvent = document.createEvent('MouseEvents');
	this.emulatedEvent.initEvent('mouseup', false, false);
	target.dispatchEvent(this.emulatedEvent);
};
MagnetCursor.prototype.init = function() {
	document.body.addEventListener('mousemove', this.getMouseMoveAction(), true);
	document.body.addEventListener('keydown', this.getKeyDownAction(), true);
	document.body.addEventListener('keyup', this.getKeyUpAction(), true);
	document.body.addEventListener('click', this.getClickAction(), true);
	document.body.addEventListener('mouseup', this.getMouseupAction(), true);
	document.body.addEventListener('mousedown', this.getMousedownAction(), true);
};
MagnetCursor.prototype.getClickAction = function() {
	var self = this;
	return function(event) {
		if (event == self.emulatedEvent)
			return;
		if (self.keyDown && self.targetElement)
			self.emulateClick(self.targetElement);
	};
};
MagnetCursor.prototype.getMousedownAction = function() {
	var self = this;
	return function(event) {
		if (event == self.emulatedEvent)
			return;
		if (self.keyDown && self.targetElement)
			self.emulateMousedown(self.targetElement);
	};
};
MagnetCursor.prototype.getMouseupAction = function() {
	var self = this;
	return function(event) {
		if (event == self.emulatedEvent)
			return;
		if (self.keyDown && self.targetElement)
			self.emulateMouseup(self.targetElement);
	};
};

MagnetCursor.prototype.getMouseMoveAction = function() {
	var self = this;
	return function(event) {
		if (self.keyDown) {
			self.targetElement = null;
			var targetElement = null;
			var result = null;
			for ( var i = 0, l = self.clickableElements.length; i < l; i++) {
				var tmpResult = self.getDistance(event, self.clickableElements[i]);
				if (result==null || (tmpResult && result.distance > tmpResult.distance)) {
					targetElement = self.clickableElements[i];
					result = tmpResult;
				}
			}
			if (targetElement && result && result.distance < MagnetCursor.MAX_DISTANCE) {
				with (self.dummyCursor.style) {
					left = result.x + 'px';
					top = result.y + 'px';
					display = 'block';
				}
				with (self.dummyFrame.style)
				{
					left = (result.region.left) + 'px';
					top = (result.region.top) + 'px';
					width = (result.region.right-result.region.left) + 'px';
					height = (result.region.bottom-result.region.top) + 'px';
					display = 'block';
				}
			} else {
				self.dummyCursor.style.display = 'none';
				self.dummyFrame.style.display = 'none';
			}
			self.targetElement = targetElement;
		}
	}
};

MagnetCursor.prototype.findElements = function() {
	this.imageMaps = MagnetCursor.getImageMaps();
	this.clickableElements = new Array();

	this.addClickableElements(document.getElementsByTagName('A'));
	this.addClickableElements(document.getElementsByTagName('INPUT'));
	this.addClickableElements(document.getElementsByTagName('AREA'));
	this.addClickableElements(document.getElementsByTagName('TEXTAREA'));
	this.addClickableElements(document.getElementsByTagName('BUTTON'));
	this.addClickableElements(document.getElementsByTagName('SELECT'));
	
	for ( var i = 0, l = this.clickableElements.length; i < l; i++) {
		var elm = this.clickableElements[i];
		elm.positions = this.getEdgePositions(elm);
	}
};
MagnetCursor.prototype.addClickableElements = function (elements)
{
	for ( var i = 0, l = elements.length; i < l; i++)
		this.clickableElements.push(elements[i]);
};
MagnetCursor.prototype.getKeyDownAction = function() {
	var self = this;
	return function(event) {
		if (MagnetCursor.KEY_CODE == event.keyCode) {
			self.dummyFrame.style.zIndex = MagnetCursor.getMaxZIndex();
			self.dummyCursor.style.display = 'block';
			self.keyDown = true;
			self.findElements();
		}
	}
};
MagnetCursor.prototype.getKeyUpAction = function() {
	var self = this;
	return function(event) {
		if (MagnetCursor.KEY_CODE == event.keyCode) {
			self.dummyFrame.style.display = 'none';
			self.dummyCursor.style.display = 'none';
			self.keyDown = false;
		}
	}
};
MagnetCursor.prototype.getDistance = function(event, elm) {
	var positions = elm.positions;
	var result = null;
	for (var i=0, l=positions.length; i<l; i++)
	{
		var tmpResult = this.getPartialDistance (event, positions[i]);
		if (result==null || (tmpResult && result.distance > tmpResult.distance ))
		{
			result = tmpResult;
			result.region = positions[i];
		}
	}
	return result;
};
MagnetCursor.prototype.getPartialDistance = function(event, position) {
	var x = event.pageX;
	var y = event.pageY;

	if (x < position.left) {
		if (y < position.top)
			return {distance:MagnetCursor.getSqDistance(position.top - y, position.left - x), x:position.left, y:position.top};
		else if (y <= position.bottom)
			return {distance:position.left - x, x:position.left, y:y};
		else
			return {distance:MagnetCursor.getSqDistance(y - position.bottom,position.left - x), x:position.left, y:position.bottom};
	} else if (x <= position.right) {
		if (y < position.top)
			return {distance:position.top - y, x:x, y:position.top};
		else if (y <= position.bottom)
			return {distance:0, x:x, y:y};
		else
			return {distance:y - position.bottom, x:x, y:position.bottom};
	} else {
		if (y < position.top)
			return {distance:MagnetCursor.getSqDistance(position.top - y, x - position.right), x:position.right, y:position.top};
		else if (y <= position.bottom)
			return {distance:x - position.right, x:position.right, y:y};
		else
			return {distance:MagnetCursor.getSqDistance(y - position.bottom, x - position.right), x:position.right, y:position.bottom};
	}

}
MagnetCursor.getSqDistance = function(x, y) {
	return Math.sqrt(x * x + y * y);
};
var cursor = new MagnetCursor();
cursor.init();