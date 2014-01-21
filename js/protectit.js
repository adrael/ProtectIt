/*!
 * protectit.js
 * https://github.com/Adrael/ProtectIt
 *
 * A password generator with some interesting stuff in it.
 *
 * Designed and developed by Raphael MARQUES, "Protect It!" is a web-based solution
 * created for a Developpez.com project. The goal of this application is to help create
 * safe and secure passwords, while remembering them without having to write them down somewhere.
 * 
 * Copyright (C) 2013
 */

'use strict';

function ProtectIt() {

	// Local Variables
	var _W = 128; // Width of VisualHash and QRCodeHash
	var _H = _W; // Height of VisualHash and QRCodeHash
	var qrcode = undefined; // Holder

	// Create a charset with different classes depending of the user's choices
	this.buildCharset = function() {
		var alphaSet = "absdefghijklmnopqrstuvwxyz";
		var upperSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		var numbrSet = "0123456789";
		var symbsSet = "&€#/\\)($*!<>+-=";
		var charset = [];

		if(document.getElementById("symbols").checked)
			charset.push(symbsSet);

		if(document.getElementById("uppercase").checked)
			charset.push(upperSet);

		if(document.getElementById("numbers").checked)
			charset.push(numbrSet);

		if(document.getElementById("lowercase").checked || charset.length === 0)
			charset.push(alphaSet);

		return charset;
	};

	// Activate the actions to do when the user changes or generates a password
	this.rollActions = function() {
		var self = this;

		// Trick: we have to wait a bit for the system to include the newly typed char
		// else it will play with the existing chars and omit the new one
		setTimeout(function() {
			self.makeNormalQRCodeAndVisualHash();
			self.spellPassword(document.getElementById("userInput").value);
			self.calculatePasswordComplexityToCrack();
			self.updateLengthField();

		    $(function () {
		        $("#userInput").complexify({}, function (valid, complexity) {
		            if (!valid) {
		                $('#progress').css({'width':complexity + '%'}).removeClass('progressbarValid').removeClass('progressbarMiddle').addClass('progressbarInvalid');
		            } else if(Math.round(complexity) >= 40 && Math.round(complexity) <= 65) {
		                $('#progress').css({'width':complexity + '%'}).removeClass('progressbarInvalid').removeClass('progressbarValid').addClass('progressbarMiddle');
		            } else {
		            	$('#progress').css({'width':complexity + '%'}).removeClass('progressbarInvalid').removeClass('progressbarMiddle').addClass('progressbarValid');
		            }
		            $('#complexity').html(Math.round(complexity) + '%');
		        });
		    });

		    $('#userInput').keyup();

		}, 100);
	};

	// Link the password field's value changes with the length field in the options
	this.updateLengthField = function() {
		var length = document.getElementById("userInput").value.length;
		document.getElementById("spinbox").value = length > 0 ? length : 16;
	};

	// Launch the complexity calcul
	this.calculatePasswordComplexityToCrack = function() {
		strengthMeter("userInput", document.getElementById("nodes").value);
	};

	// Create a random password with the given options, and roll the actions needed
	this.generatePassword = function() {
		var field = document.getElementById("userInput");
		var length = document.getElementById("spinbox").value;
		var charset = this.buildCharset();
		var text = "", currentCharset = "";

		if(length < 0)
			length = 2;
		if(length > 128)
			length = 128;

	    for(var i = 0; i < length; ++i) {
	    	currentCharset = charset[Math.floor(Math.random() * charset.length)];
	        text += currentCharset.charAt(Math.floor(Math.random() * currentCharset.length));
	    }

		field.value = text;
		field.blur();

		this.rollActions();
	};

	// Spell the given password with words to be easily remembered
	// password - the password to spell
	this.spellPassword = function(password) {
		if(document.getElementById('spellPassword').checked && password.length > 0) {
			document.getElementById('spellerDiv').style.display = "initial";
			var upperSpeller = ["Apache", "Beach", "Colorado", "Dalton", "East", "Friend", "Glad", "Hipopotamus", "Illinois", "Jack", "Kilos", "Light", "March",
								"North", "Octal", "Pint", "Quantum", "Rare", "South", "Tim", "Upper", "Vibe", "West", "Xeno", "Yes", "Zebra"];

			var lowerSpeller = ["alabama", "bike", "cat", "done", "epic", "fail", "grocery", "high", "itchy", "john", "koala", "low", "man",
								"new", "off", "plural", "queue", "rich", "slow", "tiny", "use", "view", "wear", "xeno", "youth", "zebra"];

			var spelled = "";
			for(var i = 0; i < password.length; ++i) {
				var isFound = false;
				
				for(var j = 0; j < upperSpeller.length; ++j) {
					if(upperSpeller[j].charAt(0) === password.charAt(i)) {
						isFound = true;
						spelled += (spelled.length > 0 ? " " : "") + upperSpeller[j];
						break;
					}
				}

				if(isFound) {
					continue;
				}

				for(var k = 0; k < lowerSpeller.length; ++k) {
					if(lowerSpeller[k].charAt(0) === password.charAt(i)) {
						isFound = true;
						spelled += (spelled.length > 0 ? " " : "") + lowerSpeller[k];
						break;
					}
				}

				if(!isFound) {
					spelled += (spelled.length > 0 ? " " : "") + password.charAt(i);
				}
			}
				document.getElementById('spellerInput').value = spelled;
		} else {
			document.getElementById('spellerDiv').style.display = "none";
		}
	};

	// Allow the user to change the password field's display property
	this.displayOrHidePassword = function() {
		var field = document.getElementById("userInput");
		if(field.getAttribute("type") === "password") {
			field.setAttribute("type", "text");
		} else {
			field.setAttribute("type", "password");
		}
	};

	// Clear the password field so the user can type in again
	this.clearPassword = function() {
		var field = document.getElementById("userInput");
		field.value = "";
		this.rollActions();
		field.focus();
	};

	// Select the password field's value and warn the user to use a Ctrl+C
	this.copyToClipboard = function() {
		alert("After clicking \"OK\", all you have to do is pressing Ctrl + C !");
		var field = document.getElementById("userInput");
		field.setAttribute("type", "text");
		field.select();
		field.focus();
	};

	// Allow the user to change the password field's read/write property
	this.readOnlyOrWritePassword = function() {
		var field = document.getElementById("userInput");
		if(field.readOnly) {
			field.removeAttribute("readonly");
		} else {
			field.setAttribute("readonly");
		}
	};

	// Create a QRCode with a given data (here it is a SHA256 Hash of the password)
	// qrcodeElement - the DOM Node which contains the QRCode
	// isRequested - a boolean which indicates whether the user wants a QRCode or not
	this.makeQRCode = function(qrcodeElement, isRequested) {
		try {
			var pwd = Sha256.hash(document.getElementById("userInput").value);
			var hashes = document.getElementById('hashes');

			if(pwd.length > 0 && isRequested) {
				
				if(qrcodeElement && qrcodeElement.getAttribute('data_fail')) {
					hashes.removeChild(qrcodeElement);
					qrcodeElement = null;
				}
					
				if(!qrcodeElement) {
					qrcodeElement = document.createElement('div');
					qrcodeElement.id = "qrcode";

					qrcode = new QRCode(qrcodeElement, {
															width : _W,
															height : _H
														});

					hashes.appendChild(qrcodeElement);
				}

				qrcode.makeCode(pwd);
				qrcodeElement.style.display = "initial";
			} else if(qrcodeElement) {
				qrcodeElement.style.display = "none";
			}
		} catch (err) {
			hashes.removeChild(qrcodeElement);
			var failElement = document.createElement('div');
			failElement.id = "qrcode";
			failElement.setAttribute("data_fail");
			var failImage = document.createElement('img');
			failImage.setAttribute("src", "img/qrcode_failure.png");
			failElement.appendChild(failImage);
			hashes.appendChild(failElement);
			alert("QRCode error:\n" + err.message);
		}
	};

	// Create a VisualHash with a given data
	// visualHashElement - the DOM Node which contains the VisualHash
	// isRequested - a boolean which indicates whether the user wants a VisualHash or not
	this.makeVisualHash = function(visualHashElement, isRequested)
	{
		if (vizhash.supportCanvas()) {
				var pwd = document.getElementById("userInput").value;
				var hashes = document.getElementById('hashes');

			try {
				var vhash = vizhash.canvasHash(pwd, _W, _H);
				
				if(pwd.length > 0 && isRequested) {
					if(visualHashElement) {
						hashes.removeChild(visualHashElement);
					}
					vhash.canvas.id = 'visualhash';
					hashes.appendChild(vhash.canvas);
				} else if(visualHashElement) {
					visualHashElement.style.display = "none";
				}

			} catch (err) {
				alert("VizHash error:\n" + err.message);
			}
		}
	};

	// Launch the creation process for the QRCode and the VisualHash
	// while preparing their display
	this.makeNormalQRCodeAndVisualHash = function() {
		var qrcodeChecked = document.getElementById('qrcodehash').checked;
		var visualhashChecked = document.getElementById('vishash').checked;
		var pwd = document.getElementById("userInput").value;

		if((qrcodeChecked || visualhashChecked) && pwd.length > 0) {
			document.getElementById('hashes').style.display = "initial";
			document.getElementById('hashesLabel').style.display = "-webkit-inline-box";
			try {
				this.makeQRCode(document.getElementById('qrcode'), qrcodeChecked);
				this.makeVisualHash(document.getElementById('visualhash'), visualhashChecked);
			} catch (err) {
				alert(err.message);
			}
		} else {
			document.getElementById('hashes').style.display = "none";
			document.getElementById('hashesLabel').style.display = "none";
		}
	};

	// Initializes Protect It! by launching the requested functions/elements
	this.initialization = function() {
		document.getElementById('userInput').focus();
		document.getElementById('spellerDiv').style.display = "none";
		this.calculatePasswordComplexityToCrack();
	};
}

// PROTECT IT! INITIALIZATION
var PI = new ProtectIt();
PI.initialization();