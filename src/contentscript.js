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

MagnetCursor.KEY_CODE_COMMAND = 91;
MagnetCursor.KEY_CODE_SHIFT = 16;
MagnetCursor.KEY_CODE_CTRL = 17;
MagnetCursor.KEY_CODE = MagnetCursor.KEY_CODE_COMMAND;
MagnetCursor.MAX_DISTANCE = 40;

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
	
	if (headBounds.top == tailBounds.top)
	{
		positions.push
		({
			left: bounds.left,
			top: bounds.top,
			right: bounds.right,
			bottom: bounds.bottom
		});
	}
	else if (lineHeight * 3 > bounds.height)
	{
		positions.push
		({
			left: headBounds.left,top: bounds.top,
			right: bounds.right, bottom: bounds.top + lineHeight
		});
		positions.push ({ left: bounds.left, top: bounds.bottom - lineHeight, right: tailBounds.right, bottom: bounds.bottom});
	}
	else 
	{
		positions.push ({left: headBounds.left, top: bounds.top, right: bounds.right, bottom: bounds.top + lineHeight});
		positions.push ({left: bounds.left, top: bounds.top + lineHeight, right: bounds.right, bottom: bounds.bottom - lineHeight});
		positions.push ({left: bounds.left, top: bounds.bottom - lineHeight, right: tailBounds.right, bottom: bounds.bottom});
	}
	return positions;

}
MagnetCursor.prototype.emulateClick = function(target) {
	this.emulatedClickEvent = document.createEvent('MouseEvents');
	this.emulatedClickEvent.initEvent('click', false, false);
	target.dispatchEvent(this.emulatedClickEvent);
};
MagnetCursor.prototype.init = function() {
	document.body.addEventListener('mousemove', this.getMouseMoveAction(), true);
	document.body.addEventListener('keydown', this.getKeyDownAction(), true);
	document.body.addEventListener('keyup', this.getKeyUpAction(), true);
	document.body.addEventListener('click', this.getClickAction(), true);
};
MagnetCursor.prototype.getClickAction = function() {
	var self = this;
	return function(event) {
		if (event == self.emulatedClickEvent)
			return;
		if (self.keyDown && self.targetElement)
			self.emulateClick(self.targetElement);
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
	this.clickableElements = new Array();
	var aList = document.getElementsByTagName('A');
	for ( var i = 0, l = aList.length; i < l; i++)
		this.clickableElements.push(aList[i]);
	var inputList = document.getElementsByTagName('INPUT');
	for ( var i = 0, l = inputList.length; i < l; i++)
		this.clickableElements.push(inputList[i]);

	for ( var i = 0, l = this.clickableElements.length; i < l; i++) {
		var elm = this.clickableElements[i];
		elm.positions = this.getEdgePositions(elm);
	}
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