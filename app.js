#!/usr/bin/env node

var stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

var program = require("commander");
program
	.version("1.0.0")
	.option("-a, --address [AB:90:78:56:36:95]", "Connect to Bluetooth address")
	.option("-i, --interval [ms]",               "Data query interval (default 1000ms, min 500ms)")
	.option("-p, --print",                       "Print data on stdout")
	.option("-r, --remote",                      "Show remote control help")
	.option("-s, --server [port]",               "Start HTTP / WebSockets server")
	.parse(process.argv);

if(program.remote) {
	console.log("Press the following keys while the device is connected:");
	console.log("<right>: Switch to next screen");
	console.log(" <left>: Switch to previous screen");
	console.log("    <r>: Rotate screen Clockwise");
	console.log("    <g>: Toggle through groups");
	console.log("    <C>: Reset current group (shift+c)");
	console.log("    <b>: Change brightness");
	process.exit();
}

if(program.server) {
	var express = require("express");
	var app = express();
	var server = require("http").createServer(app);
	var io = require("socket.io")(server);

	app.use(express.static(__dirname + "/html", {index: "index.html"}));
	app.use(express.static(__dirname + "/bower_components"));
	if(program.server === true) {
		server.listen(8000);
	} else {
		server.listen(parseInt(program.server));
	}
}

var bluetooth = require("node-bluetooth");
var device = new bluetooth.DeviceINQ();

var data = {};
// Convert result data to object
var convertData = function(buffer) {
	var hex = buffer.toString("hex");
	// Charging modes (not all are known yet)
	var modes = {
		5: "APP1.0A",
		7: "DCP1.5A"
	}
	/* Data from device
	 *      4    8    12   16   20   24   28   32   36   40   44   48   52   56   60
	 * 0d4c 01f5 008e 0000 02c7 001b 0051 0001 0000 0000 0000 0000 0000 0007 0000 0027 
	 *      V___ A___ W________ tC__ tF__ grou mAh_0____ mWh_0____ mAh_1____ mWh_1____
	 * 
	 * 64   68   72   76   80   84   88   92   96   100  104  108  112  116  120  124
	 * 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000
	 * mAh_2____ mWh_2____ mAh_3____ mWh_3____ mAh_4____ mWh_4____ mAh_5____ mWh_5____ 
	 * 
	 * 128  132  136  140  144  148  152  156  160  164  168  172  176  180  184  188
	 * 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 
	 * mAh_6____ mWh_6____ mAh_7____ mWh_7____ mAh_8____ mWh_8____ mAh_9____ mWh_9____
	 * 
	 * 192  196  200  204  208  212  216  220  224  228  232  236  240  244  248  252  256
	 * 0002 0001 0007 0000 0007 0000 0025 0013 0000 0046 0000 0001 0004 0000 0160 0000 8068
	 * d+__ d-__ mode recA_____ recW_____ recT recTime__ con? tout brig ohm______ scre
	 */
	data = {
		timestamp  : new Date().getTime(),
		// Voltage in "V"
		voltage    : parseInt("0x" + hex[4]  + hex[5]  + hex[6]  + hex[7])  / 100,
		// Current in "A"
		current    : parseInt("0x" + hex[8]  + hex[9]  + hex[10] + hex[11]) / 1000,
		// Power in "W"
		power      : parseInt("0x" + hex[12] + hex[13] + hex[14] + hex[15] + hex[16] + hex[17] + hex[18] + hex[19]) / 1000,
		// Temperature
		temperature: {
			celsius   : parseInt("0x" + hex[20] + hex[21] + hex[22] + hex[23]),
			fahrenheit: parseInt("0x" + hex[24] + hex[25] + hex[26] + hex[27])
		},
		// Selected group
		group      : parseInt("0x" + hex[28] + hex[29] + hex[30] + hex[31]),
		// Data of all groups, will be filled later, in "mAh" and "mWh"
		groups     : [],
		// USB data line voltage in "V"
		dataline   : {
			plus : parseInt("0x" + hex[192] + hex[193] + hex[194] + hex[195]) / 100,
			minus: parseInt("0x" + hex[196] + hex[197] + hex[198] + hex[199]) / 100
		},
		// Charging mode, name is set if known
		mode       : {
			name  : modes[parseInt("0x" + hex[200] + hex[201] + hex[202] + hex[203])],
			number: parseInt("0x" + hex[200] + hex[201] + hex[202] + hex[203]),
		},
		// Record page
		record     : {
			// Current in "mAh"
			current  : parseInt("0x" + hex[204] + hex[205] + hex[206] + hex[207] + hex[208] + hex[209] + hex[210] + hex[211]),
			// Power in "mWh"
			power    : parseInt("0x" + hex[212] + hex[213] + hex[214] + hex[215] + hex[216] + hex[217] + hex[218] + hex[219]),
			// Threshold to record data in "A"
			threshold: parseInt("0x" + hex[220] + hex[221] + hex[222] + hex[223]) / 100,
			// Recorded time in seconds
			time     : parseInt("0x" + hex[224] + hex[225] + hex[226] + hex[227] + hex[228] + hex[229] + hex[230] + hex[231])
		},
		// Seems to be 1 if a device is connected
		connected  : Boolean(parseInt("0x" + hex[232] + hex[233] + hex[234] + hex[235])),
		settings   : {
			// Screen timeout in minutes
			timeout   : parseInt("0x" + hex[236] + hex[237] + hex[238] + hex[239]),
			// Brightness from 0 to 5
			brightness: parseInt("0x" + hex[240] + hex[241] + hex[242] + hex[243])
		},
		// Resistence in "Ohm"
		resistence : parseInt("0x" + hex[244] + hex[245] + hex[246] + hex[247] + hex[248] + hex[249] + hex[250] + hex[251]) / 10,
		// Currently selected screen
		screen     : parseInt("0x" + hex[252] + hex[253] + hex[254] + hex[255]),
		// No idea what what this value could be, is higher when a load is present
		unknown0   : parseInt("0x" + hex[256] + hex[257] + hex[258] + hex[259])
	}

	// Fill groups with data
	for(var g=0; g<10; g++) {
		data.groups[g] = {
			// Current in "mAh"
			current: parseInt("0x" + hex[32+16*g] + hex[33+16*g] + hex[34+16*g] + hex[35+16*g] + hex[36+16*g] + hex[37+16*g] + hex[38+16*g] + hex[39+16*g]),
			// Power in "mWh"
			power  : parseInt("0x" + hex[40+16*g] + hex[41+16*g] + hex[42+16*g] + hex[43+16*g] + hex[44+16*g] + hex[45+16*g] + hex[46+16*g] + hex[47+16*g])
		}
	}

	if(program.print) {
		//console.log(JSON.stringify(data, null, "\t"));
		console.log(JSON.stringify(data));
	}

	if(program.server) {
		io.sockets.emit("data", data);
	}

	// Debug output all data
	/*for(var i=0; i<hex.length; i++) {
		process.stderr.write(hex[i]);
		if(i%4 === 3) {	
			process.stderr.write(" ");
		}
		if(i%64 === 63) {
			console.error();
		}
	}
	console.error();*/
}

var connect = function(address, name) {
	device.findSerialPortChannel(address, function(channel) {
		console.error("Found RFCOMM channel for serial port on %s: ", name, channel);
		bluetooth.connect(address, channel, function(err, connection) {
			if(err) return console.error(err);
			console.error("Connection to device established")
			var dataCounter = 0;
			var dataBuffer = new Buffer(130);
			connection.on("data", function(buffer) {
				buffer.copy(dataBuffer, dataCounter);
				dataCounter += buffer.length;
				if(dataCounter === 130) {
					convertData(dataBuffer);
					dataCounter = 0;
				}
			});

			var interval = 1000;
			if(program.interval) {
				interval = parseInt(program.interval)
			}
			if(interval < 500) {
				interval = 500;
			}
			setInterval(function() {
				connection.write(new Buffer("f0", "hex"), function() {});
			}, interval);

			// Debug test all codes
			/*var toSend = 0;
			setInterval(function() {
				var hexToSend = toSend.toString(16);
				if(hexToSend.length === 1) {
					hexToSend = "0" + hexToSend;
				}
				console.error(hexToSend);
				connection.write(new Buffer(hexToSend, "hex"), function() {});
				toSend++;
			}, 500);*/

			/* Found commands:
				* 		a0-9: Select group 0-9
				* 		b0-ce: Set record current
				* 		d0-5: Set brightness to 0-5
				* 		e0-9: Set timeout 0-9 minutes
				* 		f0: Get Data
				* 		f1: Next
				* 		f2: Rotate Clockwise
				* 		f3: Prev
				* 		f4: Reset Group
				*/
			
			stdin.on("data", function(key) {
				switch(key) {
					case "\u0003": // ctrl-c
						process.exit();
						break;
					case "\u001B\u005B\u0043": // right
						connection.write(new Buffer("f1", "hex"), function() {});
						break;
					case "\u001B\u005B\u0044": // left
						connection.write(new Buffer("f3", "hex"), function() {});
						break;
					case "r":
						connection.write(new Buffer("f2", "hex"), function() {});
						break;
					case "C":
						connection.write(new Buffer("f4", "hex"), function() {});
						break;
					case "g":
						var g = data.group;
						g++;
						if(g>9) {
							g=0;
						}
						connection.write(new Buffer("a" + g, "hex"), function() {});
						break;
					case "b":
						var b = data.settings.brightness;
						b++;
						if(b>5) {
							b=0;
						}
						connection.write(new Buffer("d" + b, "hex"), function() {});
						break;
				}
			});
		});
	});
}

if(program.address) {
	connect(program.address, "");
} else {
	console.error("Searching for UM34C device...");
	device.on("found", function found(address, name) {
		if(name === "UM34C") {
			console.error("Found UM34C device with address: " + address);
			connect(address, name);
		}
	}).inquire();
}


