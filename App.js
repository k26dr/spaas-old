/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React from "react";
import {
    SafeAreaView,
    StyleSheet,
    ScrollView,
    View,
    Text,
    TextInput,
    StatusBar,
    Image,
    Button,
    TouchableOpacity,
    PermissionsAndroid
} from "react-native";
import {
    Header,
    LearnMoreLinks,
    Colors,
    DebugInstructions,
    ReloadInstructions
} from "react-native/Libraries/NewAppScreen";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";

const manager = new BleManager();

class App extends React.Component {
    constructor(props) {
        super(props);
        requestCoarseLocationPermission();

        this.state = {
            devices: [],
            connectedDevice: null,
            statusMessage: null
        }
    }

    render() {
        const deviceList = this.state.devices.map((device, index) => 
            <Text style={styles.deviceListItem} onPress={this.handleDeviceSelect.bind(this, device.name)} key={index}>{device.name}</Text>
        );
        const statusView = this.state.statusMessage ? <View style={styles.deviceList}>
            <Text style={styles.deviceListItem}>{this.state.statusMessage}</Text>
        </View> : null

        return (
            <>
                <SafeAreaView>
                    <ScrollView
                        contentInsetAdjustmentBehavior="automatic"
                        style={styles.scrollView}
                    >
                        <View style={styles.body}>
                            <TouchableOpacity
                                style={styles.buttonStyle}
                                onPress={this.scanHandler.bind(this)}
                            >
                                <Text style={styles.buttonTextStyle}>
                                    Scan For Devices
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.buttonStyle}
                                onPress={this.unlockHandler.bind(this)}
                            >
                                <Text style={styles.buttonTextStyle}>
                                    Unlock
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.deviceList}>
                            {deviceList}
                        </View>
                        {statusView}
                    </ScrollView>
                </SafeAreaView>
            </>
        );
    }

    scanHandler(e) {
        manager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                // Handle error (scanning will be stopped automatically)
                return;
            }
            if (device.name) {
                this.setState((state, props) => { 
                    const devices = state.devices;
                    const names = devices.map(d => d.name);
                    if (!names.includes(device.name))
                        devices.push(device);
                    return { devices }
                })
            }

            // Check if it is a device you are looking for based on advertisement data
            // or other criteria.
            //if (device.name === 'TI BLE Sensor Tag' || device.name === 'SensorTag') {
            //  // Stop scanning as it's not necessary if you are scanning for one device.
            //  this.manager.stopDeviceScan();

            //  // Proceed with connection.
            //}
        });
    }

    async handleDeviceSelect(devicename) {
        const device = this.state.devices.find(d => d.name == devicename);
        await device.connect()
            .then(device => device.discoverAllServicesAndCharacteristics() )
            .catch(console.error);

        await manager.stopDeviceScan();
        this.setState({ connectedDevice: device, devices: [], statusMessage: "Connected to " + device.name });
    }

    async unlockHandler (e) {
        const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
        const UART_TX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
        const UART_RX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
        const UNLOCK_PASSWORD = "wigglemelegs\n";
        const device = this.state.connectedDevice;
        console.log("Device ID: " + device.id);

        device.monitorCharacteristicForService(UART_SERVICE_UUID, UART_RX_UUID, (error, ch) => {
            if (error) { console.error(error); return; }
            const message = Buffer.from(ch.value, 'base64').toString('utf8');
            this.setState({ ...this.state, statusMessage: "Response: " + message });
            console.log("RX: " + message);
        });

        const message = Buffer.from(UNLOCK_PASSWORD, 'utf8').toString('base64');
        const tx_char = await device.writeCharacteristicWithoutResponseForService(UART_SERVICE_UUID, UART_TX_UUID, message);
        console.log("Sent TX: " + tx_char.value);

    }
    
}


async function requestCoarseLocationPermission() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      {
        title: 'SPAAS Coarse Location Permission',
        message:
          'SPAAS needs access to your coarse location ' +
          'so it can locate your helmet.',
        buttonNegative: 'Deny',
        buttonPositive: 'OK',
      },
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('You can use coarse location');
    } else {
      console.log('Coarse location permission denied');
    }
  } catch (err) {
    console.warn(err);
  }
}

const images = {};

const styles = StyleSheet.create({
    logo: {
        height: 100,
        width: 100,
        marginTop: 200
    },
    scrollView: {
    },
    body: {
        backgroundColor: Colors.white,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
    },
    sectionContainer: {
        marginTop: 100
    },
    smallText: {
        fontSize: 16
    },
    smallTextBold: {
        fontSize: 16,
        fontWeight: "bold"
    },
    textInputStyle: {
        borderColor: "gray",
        borderWidth: 1,
        borderRadius: 5,
        marginTop: 10,
        width: 300,
        paddingLeft: 20
    },
    buttonStyle: {
        backgroundColor: "#B4D037",
        width: 300,
        height: 50,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10
    },
    buttonTextStyle: {
        color: "black",
        fontSize: 16,
        fontWeight: "bold"
    },
    deviceList: {
        marginTop: 30,
        backgroundColor: Colors.white
    },
    deviceListItem: {
        padding: 10,
        paddingLeft: 20,
        fontSize: 18
    }
});

export default App;
