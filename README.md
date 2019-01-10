# Description
UM34C is a small NodeJS tool to read out and control the UM34C (an probably also the UM24C / UM25C, untested!) USB analyzer via Bluetooth. Get the UM34C device here: [Banggood](https://www.banggood.com/RUIDENG-UM34-UM34C-For-APP-USB-3_0-Type-C-DC-Voltmeter-Ammeter-Voltage-Current-Meter-Tester-p-1297185.html)

![](/um34c_small.jpg?raw=true)

# Install
Just run: `npm install`

Make sure that bluetooth dev libs are installed. Currently this tool is only tested on Linux.
# Usage
When started without command line options the tool will search for a device named "UM34C" and connect to it. The following command line arguments are available:
```
> ./app.js -h

  Usage: app [options]

  Options:

    -V, --version                      output the version number
    -a, --address [AB:90:78:56:36:95]  Connect to Bluetooth address
    -i, --interval [ms]                Data query interval (default 1000ms, min 500ms)
    -p, --print                        Print data on stdout
    -r, --remote                       Show remote control help
    -s, --server [port]                Start HTTP / WebSockets server
    -h, --help                         output usage information
```

## Address
When you know the Bluetooth address of your device you can connect to it directly. This will speed up the process of connecting and allows connecting to the device when it is not visible anymore.

## Interval
The interval the program will query data from the UM34C in ms. Default interval is 1000ms.

## Print
Add this command line argument to print the data values on stdout. Use [JQ](https://github.com/stedolan/jq) to pretty print or to filter the data:

Pretty print:

`./app.js -a AB:90:78:56:36:95 -p | while read D; do echo $D | jq .; done`

Show voltage only:

`./app.js -a AB:90:78:56:36:95 -p | while read D; do echo $D | jq .voltage; done`

## Remote
When running commands can be send to the device to control it:
```
./app.js -r
Press the following keys while the device is connected:
<right>: Switch to next screen
 <left>: Switch to previous screen
    <r>: Rotate screen Clockwise
    <g>: Toggle through groups
    <C>: Reset current group (shift+c)
    <b>: Change brightness
```

## Server
This will start a HTTP / WebSocket server which currently does not much but showing the data in the console of the browser. Optionally add the listening port, default is 8000.

# Data
The following data can be received from the device:
```
{
        // Timestamp of the current data in ms
        "timestamp": 1532519945850,
        // Voltage in "V"
        "voltage": 5.03,
        // Current in "A"
        "current": 0,
        // Power in "W"
        "power": 0,
        // Temperature
        "temperature": {
                "celsius": 24,
                "fahrenheit": 75
        },
        // Selected group
        "group": 0,
        // Data of all groups, will be filled later, in "mAh" and "mWh"
        "groups": [
                {
                        "current": 0,
                        "power": 0
                },
                {
                        "current": 0,
                        "power": 0
                },
                {
                        "current": 0,
                        "power": 0
                },
                {
                        "current": 0,
                        "power": 0
                },
                {
                        "current": 0,
                        "power": 0
                },
                {
                        "current": 0,
                        "power": 0
                },
                {
                        "current": 0,
                        "power": 0
                },
                {
                        "current": 0,
                        "power": 0
                },
                {
                        "current": 0,
                        "power": 0
                },
                {
                        "current": 0,
                        "power": 0
                }
        ],
        // USB data line voltage in "V"
        "dataline": {
                "plus": 0.01,
                "minus": 0.01
        },
        // Charging mode, name is set if known
        "mode": {
                "name": "DCP1.5A",
                "number": 7
        },
        // Record page
        "record": {
                // Current in "mAh"
                "current": 0,
                // Power in "mWh"
                "power": 0,
                // Threshold to record data in "A"
                "threshold": 0.29,
                // Recorded time in seconds
                "time": 0
        },
        // Seems to be 1 if a device is connected
        "connected": false,
        "settings": {
                // Screen timeout in minutes
                "timeout": 1,
                // Brightness from 0 to 5
                "brightness": 5
        },
        // Resistence in "Ohm"
        "resistence": 9999.9,
        // Currently selected screen
        "screen": 0,
        // No idea what what this value could be, is higher when a load is present
        "unknown0": 26786
}
```

# License
Copyright (c) 2019 Sebastian Hammerl

Licensed under the GPLV3 License
